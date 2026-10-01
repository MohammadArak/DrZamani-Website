"""Synthetic booking policy, real SQLite races, and durable worker recovery."""
import json
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import date, time, timedelta

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import select, func

from app import config, sms_automation as sms
from app.database import Base, SessionLocal, get_engine
from app.main import app
from app.models import (Patient, Service, ClinicSetting, Payment, BookingHold,
                        Appointment, SmsOutbox, SmsAutomationRule, SystemSetting, AuthSession)
from app.payments import PaymentVerifyResult, PaymentGatewayError
from app.routers import patient as routes
from app.security import utcnow, issue_session_token, patient_session_expiry
from test_roles import owner, headers


@pytest.fixture(autouse=True)
def isolated(monkeypatch, tmp_path):
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    bootstrap = config.get_settings()
    template = tmp_path / 'html'
    template.mkdir()
    (template / 'index.html').write_text('<html><head><script type="module" src="/assets/test.js"></script></head><body></body></html>')
    key = Fernet.generate_key().decode()
    monkeypatch.setattr(config, 'get_settings', lambda: replace(bootstrap,
        booking_enabled=False, public_html_dir=template,
        settings_encryption_keys=(key,)))
    # Non-secret-only settings tests do not depend on the generated key staying stable.
    monkeypatch.setattr(routes, 'list_available_slots', lambda *a, **k: [(time(10), time(10,30))])
    with SessionLocal.begin() as db:
        db.add(ClinicSetting(id=1))
        patient = Patient(phone='+989121234567', first_name='بیمار', last_name='آزمایشی', profile_completed=True)
        service = Service(title='خدمت آزمایشی', duration_minutes=30, price_toman=2000, payment_mode='full')
        db.add_all([patient,service]); db.flush()
        hold = BookingHold(id='test-hold', patient_id=patient.id, service_id=service.id,
            appointment_date=date.today()+timedelta(days=2), start_time=time(10), end_time=time(10,30),
            price_toman=2000, amount_toman=2000, payment_mode='full', status='pending_payment',
            expires_at=utcnow()+timedelta(minutes=10))
        db.add(hold); db.flush()
        db.add(Payment(hold_id=hold.id, authority='A' * 36, amount_toman=2000, status='redirected'))
        for event in ('payment_succeeded','appointment_created','payment_abandoned'):
            db.add(SmsAutomationRule(event_key=event, title=event, enabled=True, template_text='پیام آزمایشی {tracking_code}'))
    yield
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def callback(status='OK'):
    with SessionLocal() as db:
        return routes.zarinpal_callback(Authority='A'*36, Status=status, db=db)


def receipt(code=100, ref='123456'):
    return PaymentVerifyResult(code, ref, json.dumps({'code':code, 'ref_id':ref}))


def auth():
    with SessionLocal.begin() as db:
        token, digest = issue_session_token()
        patient = db.scalar(select(Patient).where(Patient.phone=='+989121234567'))
        db.add(AuthSession(token_hash=digest, patient_id=patient.id, expires_at=patient_session_expiry()))
        service = db.scalar(select(Service).where(Service.title=='خدمت آزمایشی'))
        return {'Authorization': f'Bearer {token}'}, service.id


def test_defaults_and_disabled_admission_preserve_records(client, monkeypatch):
    auth_headers, service_id = auth()
    monkeypatch.setattr(routes, 'request_payment', lambda **kw: pytest.fail('gateway must not be contacted'))
    with SessionLocal() as db:
        before = db.scalar(select(func.count(BookingHold.id)))
    for path, payload in [('/appointments', {'service_id':service_id, 'appointment_date':str(date.today()+timedelta(days=2)), 'start_time':'10:00', 'has_previous_visit':False}),
                          ('/waitlist', {'service_id':service_id})]:
        assert client.post('/api/v1'+path, headers=auth_headers, json=payload).status_code==409
    assert client.get('/api/v1/availability/dates').status_code==409
    for path in ('/me','/appointments','/waitlist'):
        assert client.get('/api/v1'+path, headers=auth_headers).status_code==200
    assert client.get('/api/v1/clinic').json()['booking_enabled'] is False
    assert 'رزرو آنلاین' in client.get('/appointment/').text
    with SessionLocal() as db:
        assert db.scalar(select(func.count(BookingHold.id)))==before


def test_owner_toggle_message_and_recheck_under_lock(client, monkeypatch):
    access = headers(owner()[2])
    path='/api/v1/staff/system-settings'
    revision=client.get(path,headers=access).json()['revision']
    response=client.put(path,headers=access,json={'revision':revision,'values':{'booking_enabled':True,'booking_disabled_message':'رزرو موقتاً بسته است؛ با مطب تماس بگیرید.'}})
    assert response.status_code==200,response.text
    assert client.get('/api/v1/clinic').json()['booking_enabled'] is True
    assert client.get('/api/v1/availability/dates').status_code==200
    response=client.put(path,headers=access,json={'revision':response.json()['revision'],'values':{'booking_enabled':False}})
    assert response.status_code==200
    assert 'رزرو موقتاً بسته' in client.get('/appointment/').text
    assert client.get('/api/v1/availability/dates').status_code==409
    # Stale identity-map state must not authorize booking after settings change.
    from app.booking_policy import admission_lock
    with SessionLocal() as stale:
        stale.get(SystemSetting,1)
        with pytest.raises(Exception) as failure:
            admission_lock(stale)
        assert failure.value.status_code==409


@pytest.mark.parametrize('code',[100,101])
def test_callback_after_disable_idempotent_and_never_sends_sms(monkeypatch, code):
    monkeypatch.setattr(routes,'verify_payment',lambda **kw:receipt(code))
    monkeypatch.setattr(sms,'get_sms_provider',lambda:pytest.fail('redirect must not deliver SMS'))
    first=callback(); assert first.status_code==303 and 'payment=success' in first.headers['location']
    assert callback('NOK').headers['location']==first.headers['location']
    assert callback().headers['location']==first.headers['location']
    with SessionLocal() as db:
        assert db.scalar(select(func.count(Appointment.id)))==1
        assert db.scalar(select(Payment)).status=='verified'
        assert [x.status for x in db.scalars(select(SmsOutbox))]==['pending','pending']


def test_concurrent_success_callbacks_same_appointment(monkeypatch):
    barrier=threading.Barrier(2)
    def verify(**kw): barrier.wait(timeout=10); return receipt()
    monkeypatch.setattr(routes,'verify_payment',verify)
    with ThreadPoolExecutor(2) as pool:
        responses=list(pool.map(lambda _:callback(),range(2)))
    assert responses[0].headers['location']==responses[1].headers['location']
    with SessionLocal() as db:
        assert db.scalar(select(func.count(Appointment.id)))==1
        assert db.scalar(select(func.count(SmsOutbox.id)))==2


@pytest.mark.parametrize('late',['failure','error','nok','expiry'])
def test_success_cannot_be_overwritten_by_late_callback_or_expiry(monkeypatch, late):
    waiting, release=threading.Event(),threading.Event()
    def verify(**kw):
        if threading.current_thread().name.startswith('late'):
            waiting.set(); assert release.wait(10)
            if late=='error': raise PaymentGatewayError('mock')
            return receipt(-21)
        return receipt()
    monkeypatch.setattr(routes,'verify_payment',verify)
    if late in ('failure','error'):
        with ThreadPoolExecutor(1,thread_name_prefix='late') as pool:
            future=pool.submit(callback); assert waiting.wait(10)
            success=callback(); release.set()
            assert future.result().headers['location']==success.headers['location']
    else:
        success=callback()
        if late=='nok': assert callback('NOK').headers['location']==success.headers['location']
        else:
            with SessionLocal() as db: assert sms.expire_unpaid_holds(db)==0
    with SessionLocal() as db:
        assert db.scalar(select(Payment)).status=='verified'
        assert db.scalar(select(func.count(Appointment.id)))==1


@pytest.mark.parametrize('conflict',['occupied','refund','expired_free','expired_occupied'])
def test_conflict_refund_and_expired_hold(monkeypatch, conflict):
    monkeypatch.setattr(routes,'verify_payment',lambda **kw:receipt())
    with SessionLocal.begin() as db:
        payment=db.scalar(select(Payment))
        if conflict=='refund': payment.refund_status='full'
        if conflict.startswith('expired'):
            payment.status='expired'; payment.hold.status='expired'; payment.hold.expires_at=utcnow()-timedelta(minutes=1)
    if conflict in ('occupied','expired_occupied'): monkeypatch.setattr(routes,'list_available_slots',lambda *a,**k:[])
    response=callback()
    expected='success' if conflict=='expired_free' else 'manual-review'
    assert f'payment={expected}' in response.headers['location']
    assert callback('NOK').headers['location']==response.headers['location']
    with SessionLocal() as db: assert db.scalar(select(func.count(Appointment.id)))==(expected=='success')


def test_failed_retry_deduplicates_and_network_error_recoverable(monkeypatch):
    monkeypatch.setattr(routes,'verify_payment',lambda **kw:receipt(-21))
    callback('NOK'); callback('NOK'); callback(); callback()
    with SessionLocal() as db: assert db.scalar(select(func.count(SmsOutbox.id)))==1
    def outage(**kw): raise PaymentGatewayError('mock')
    monkeypatch.setattr(routes,'verify_payment',outage)
    assert 'verification-error' in callback().headers['location']
    monkeypatch.setattr(routes,'verify_payment',lambda **kw:receipt(101))
    assert 'success' in callback().headers['location']
    with SessionLocal() as db:
        assert db.scalar(select(SmsOutbox).where(SmsOutbox.event_key=='payment_abandoned')).status=='cancelled'


def queue_job():
    with SessionLocal.begin() as db:
        item=SmsOutbox(event_key='appointment_created',phone='+989121234567',rendered_body='synthetic',status='pending')
        db.add(item);db.flush();return item.id


def test_worker_claim_prevents_parallel_delivery(monkeypatch):
    item_id=queue_job(); waiting,release=threading.Event(),threading.Event();calls=[]
    class Provider:
        def send_event(self,*a): calls.append(a);waiting.set();assert release.wait(10)
    monkeypatch.setattr(sms,'get_sms_provider',lambda:Provider())
    def run():
        with SessionLocal() as db:return sms.dispatch_pending_sms(db)
    with ThreadPoolExecutor(2) as pool:
        future=pool.submit(run); assert waiting.wait(10)
        assert pool.submit(run).result()==0
        release.set(); assert future.result()==1
    assert len(calls)==1
    with SessionLocal() as db:
        item=db.get(SmsOutbox,item_id);assert item.status=='sent' and item.attempts==1 and item.claim_token is None


def test_worker_retry_backoff_bounded_and_crash_recovery(monkeypatch):
    item_id=queue_job()
    class Provider:
        def send_event(self,*a): raise sms.SmsDeliveryError('secret must not appear')
    monkeypatch.setattr(sms,'get_sms_provider',lambda:Provider())
    with SessionLocal() as db: assert sms.dispatch_pending_sms(db)==0
    with SessionLocal() as db:
        item=db.get(SmsOutbox,item_id); assert item.attempts==1 and item.next_attempt_at and 'secret' not in item.last_error
        assert sms.dispatch_pending_sms(db)==0
        assert db.get(SmsOutbox,item_id).attempts==1
    for _ in range(2):
        with SessionLocal.begin() as db: db.get(SmsOutbox,item_id).next_attempt_at=utcnow()-timedelta(seconds=1)
        with SessionLocal() as db: assert sms.dispatch_pending_sms(db)==0
    with SessionLocal() as db: assert db.get(SmsOutbox,item_id).attempts==3
    second=queue_job()
    with SessionLocal.begin() as db:
        item=db.get(SmsOutbox,second);item.status='sending';item.attempts=1;item.claim_token='crash';item.claim_until=utcnow()-timedelta(seconds=1)
    with SessionLocal() as db:
        assert sms.dispatch_pending_sms(db)==0
        item=db.get(SmsOutbox,second); assert item.status=='failed' and item.claim_token is None and item.next_attempt_at>utcnow()


def test_reference_collision_requires_review_and_no_duplicate_appointment(monkeypatch):
    with SessionLocal.begin() as db:
        old=db.scalar(select(BookingHold))
        second=BookingHold(id='another-hold',patient_id=old.patient_id,service_id=old.service_id,
            appointment_date=old.appointment_date,start_time=time(11),end_time=time(11,30),
            price_toman=2000,amount_toman=2000,payment_mode='full',status='completed',expires_at=utcnow())
        db.add(second);db.flush()
        db.add(Payment(hold_id=second.id,authority='B'*36,amount_toman=2000,status='verified',ref_id='123456'))
    monkeypatch.setattr(routes,'verify_payment',lambda **kw:receipt())
    assert 'manual-review' in callback().headers['location']
    assert 'manual-review' in callback('NOK').headers['location']
    with SessionLocal() as db:
        current=db.scalar(select(Payment).where(Payment.authority=='A'*36))
        assert current.status=='verified_conflict' and current.ref_id is None
        assert '123456' in current.raw_response
        assert db.scalar(select(func.count(Appointment.id)))==0


def test_missing_receipt_and_unknown_callback_are_safe(monkeypatch):
    monkeypatch.setattr(routes,'verify_payment',lambda **kw:receipt(ref=None))
    assert 'verification-error' in callback().headers['location']
    with SessionLocal() as db:
        assert db.scalar(select(func.count(Appointment.id)))==0
        result=routes.zarinpal_callback(Authority='UNKNOWN123456',Status='OK',db=db)
        assert 'unknown' in result.headers['location']


def test_toggle_between_precheck_and_admission_closes_booking(client,monkeypatch):
    with SessionLocal.begin() as db:db.add(SystemSetting(id=1,overrides_json='{"booking_enabled":true}'))
    original=routes.admission_lock
    def close_then_lock(db):
        db.rollback()
        with SessionLocal.begin() as other: other.get(SystemSetting,1).overrides_json='{"booking_enabled":false}'
        original(db)
    monkeypatch.setattr(routes,'admission_lock',close_then_lock)
    access,service=auth()
    response=client.post('/api/v1/appointments',headers=access,json={
        'service_id':service,'appointment_date':str(date.today()+timedelta(days=2)),
        'start_time':'10:00','has_previous_visit':False})
    assert response.status_code==409,response.text
    with SessionLocal() as db:assert db.scalar(select(func.count(BookingHold.id)))==1


def test_closed_booking_disables_reschedule_and_offers_but_cancellation_works(client,monkeypatch):
    monkeypatch.setattr(routes,'verify_payment',lambda **kw:receipt())
    callback();access,_=auth()
    items=client.get('/api/v1/appointments',headers=access).json()
    item=items[0];assert item['can_patient_reschedule'] is False
    response=client.patch(f"/api/v1/appointments/{item['id']}/reschedule",headers=access,
        json={'appointment_date':str(date.today()+timedelta(days=3)),'start_time':'10:00'})
    assert response.status_code==409,response.text
    assert client.post(f"/api/v1/appointments/{item['id']}/cancel",headers=access).status_code==200


def test_payment_account_change_blocked_while_pending_but_disable_allowed(client):
    access=headers(owner()[2]);path='/api/v1/staff/system-settings'
    revision=client.get(path,headers=access).json()['revision']
    result=client.put(path,headers=access,json={'revision':revision,'values':{'zarinpal_merchant_id':'00000000-0000-0000-0000-000000000000'}})
    assert result.status_code==409,result.text
    result=client.put(path,headers=access,json={'revision':revision,'values':{'booking_enabled':False}})
    assert result.status_code==200,result.text


@pytest.mark.parametrize('payload',[[],{'data':[]},{'data':{'code':'100','ref_id':1}},
    {'data':{'code':100,'ref_id':None}},{'data':{'code':101,'ref_id':False}}])
def test_malformed_provider_response_never_confirms_payment(monkeypatch,payload):
    import httpx
    from app import payments
    monkeypatch.setattr(payments,'get_settings',lambda:replace(config.get_settings(),zarinpal_merchant_id='0'*36))
    monkeypatch.setattr(payments.httpx,'post',lambda url,**kw:httpx.Response(200,json=payload,request=httpx.Request('POST',url)))
    with pytest.raises(PaymentGatewayError):payments.verify_payment(authority='A'*36,amount_toman=2000)


def test_provider_contract_minimal_receipt_and_same_amount(monkeypatch):
    import httpx
    from app import payments
    calls=[]
    monkeypatch.setattr(payments,'get_settings',lambda:replace(config.get_settings(),zarinpal_merchant_id='0'*36))
    def post(url,**kw):
        calls.append((url,kw))
        data={'code':100,'authority':'A'*36} if 'request.json' in url else {'code':101,'ref_id':123456,'card_pan':'SENSITIVE-PAN','card_hash':'SENSITIVE-HASH'}
        return httpx.Response(200,json={'data':data},request=httpx.Request('POST',url))
    monkeypatch.setattr(payments.httpx,'post',post)
    request=payments.request_payment(amount_toman=2000,description='synthetic',callback_url='https://clinic.example/api/v1/payments/zarinpal/callback',mobile='+989121234567',email=None,order_id='hold')
    verify=payments.verify_payment(authority=request.authority,amount_toman=2000)
    assert verify.ref_id=='123456' and 'SENSITIVE' not in verify.raw_response
    assert calls[0][1]['json']['currency']=='IRT'
    assert all(kw['json']['amount']==2000 and kw['trust_env'] is False and kw['follow_redirects'] is False for _,kw in calls)


def test_disabled_sms_preserves_queue_and_attempt_budget(monkeypatch):
    item_id=queue_job();bootstrap=config.get_settings()
    monkeypatch.setattr(config,'get_settings',lambda:replace(bootstrap,sms_provider='disabled'))
    monkeypatch.setattr(sms,'get_sms_provider',lambda:pytest.fail('disabled provider must not be contacted'))
    with SessionLocal() as db:
        assert sms.dispatch_pending_sms(db)==0
        item=db.get(SmsOutbox,item_id);assert item.status=='pending' and item.attempts==0


def test_fresh_seed_uses_migrated_system_revision():
    from app.main import seed_defaults
    with SessionLocal.begin() as db:
        db.delete(db.get(ClinicSetting,1))
        db.add(SystemSetting(id=1,revision=2,overrides_json='{"booking_enabled":false}'))
    seed_defaults()
    with SessionLocal() as db:assert db.get(ClinicSetting,1).revision==db.get(SystemSetting,1).revision==2


def test_concurrent_reminder_producers_enqueue_once(monkeypatch):
    from app.appointment_operations import queue_scheduled_reminders
    from datetime import datetime
    from zoneinfo import ZoneInfo
    monkeypatch.setattr(routes,'verify_payment',lambda **kw:receipt())
    callback()
    future=datetime.now(ZoneInfo('Asia/Tehran'))+timedelta(hours=3)
    with SessionLocal.begin() as db:
        item=db.scalar(select(Appointment));item.appointment_date=future.date();item.start_time=future.time().replace(tzinfo=None)
        db.get(ClinicSetting,1).reminder_enabled=True
        db.add(SmsAutomationRule(event_key='appointment_reminder',title='synthetic',enabled=True,template_text='reminder'))
    def queue():
        with SessionLocal() as db:return queue_scheduled_reminders(db)
    with ThreadPoolExecutor(2) as pool:assert sorted(pool.map(lambda _:queue(),range(2)))==[0,1]
    with SessionLocal() as db:assert db.scalar(select(func.count(SmsOutbox.id)).where(SmsOutbox.event_key=='appointment_reminder'))==1
