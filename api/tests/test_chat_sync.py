"""Conversation windows, read boundaries, retry safety, ownership and fault pages."""
from datetime import date,datetime,time,timedelta
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy import event,select,func
from app.database import Base,SessionLocal,get_engine
from app.models import Appointment,AuthSession,ConsultationMessage,Patient,Service,SmsOutbox
from app.security import issue_session_token,utcnow
from test_roles import client,account,headers

@pytest.fixture(autouse=True)
def fresh():
    Base.metadata.drop_all(get_engine());Base.metadata.create_all(get_engine())

def thread(count=0,staff_id=None):
    with SessionLocal.begin() as db:
        service=db.scalar(select(Service).where(Service.allows_media_chat.is_(True)))
        patient=Patient(phone=f"000{db.scalar(select(func.count()).select_from(Patient))+1:08d}",first_name="Synthetic",last_name="Conversation")
        db.add(patient);db.flush()
        token,digest=issue_session_token()
        db.add(AuthSession(patient_id=patient.id,token_hash=digest,expires_at=utcnow()+timedelta(hours=1)))
        appointment=Appointment(tracking_code=issue_session_token()[0][:16],patient_id=patient.id,service_id=service.id,appointment_date=date.today(),start_time=time(16),end_time=time(17),status="confirmed")
        db.add(appointment);db.flush()
        stamp=datetime(2026,1,1,12)
        messages=[ConsultationMessage(appointment_id=appointment.id,sender_type="staff" if i%2 else "patient",sender_staff_id=staff_id if i%2 else None,body=f"Synthetic message {i}",created_at=stamp) for i in range(count)]
        db.add_all(messages);db.flush()
        return appointment.id,token,[item.id for item in messages]

def url(id,staff=False):return f"/api/v1{'/staff' if staff else ''}/appointments/{id}/consultation/sync"

def test_recent_window_is_bounded_ordered_and_can_reach_older_messages(client):
    id,token,ids=thread(151)
    result=client.get(url(id),headers=headers(token))
    assert result.status_code==200 and result.headers['cache-control']=='no-store'
    page=result.json()
    assert [item['id'] for item in page['items']]==ids[-50:]
    assert page['has_more'] is True
    older=client.get(url(id),params={'before_id':page['before_id'],'limit':100},headers=headers(token)).json()
    assert [item['id'] for item in older['items']]==ids[1:101]
    earliest=client.get(url(id),params={'before_id':older['before_id']},headers=headers(token)).json()
    assert [item['id'] for item in earliest['items']]==ids[:1] and not earliest['has_more']
    assert client.get(url(id),params={'after_id':page['after_id']},headers=headers(token)).json()['items']==[]

def test_forward_pages_acknowledge_only_returned_boundary(client):
    id,token,ids=thread(131)
    result=client.get(url(id),params={'after_id':ids[0],'limit':20},headers=headers(token)).json()
    assert [item['id'] for item in result['items']]==ids[1:21] and result['has_more']
    with SessionLocal() as db:
        rows=db.scalars(select(ConsultationMessage).where(ConsultationMessage.appointment_id==id).order_by(ConsultationMessage.id)).all()
        assert all(item.read_at for item in rows[1:21] if item.sender_type=='staff')
        assert all(item.read_at is None for item in rows[21:])
    next_page=client.get(url(id),params={'after_id':result['after_id'],'limit':20},headers=headers(token)).json()
    assert [item['id'] for item in next_page['items']]==ids[21:41]

def test_sync_is_owned_permission_checked_and_cursor_scoped(client):
    id,token,ids=thread(4);other,other_token,other_ids=thread(2)
    assert client.get(url(id),headers=headers(other_token)).status_code==404
    assert client.get(url(id),headers=headers(token),params={'after_id':other_ids[0]}).status_code==422
    for params in [{'limit':101},{'after_id':-1},{'after_id':ids[0],'before_id':ids[-1]}]:
        assert client.get(url(id),headers=headers(token),params=params).status_code==422
    forbidden=account([])[2]
    assert client.get(url(id,True),headers=headers(forbidden)).status_code==403
    viewer=account(['consultations.view'])[2]
    with SessionLocal.begin() as db:
        item=db.get(ConsultationMessage,ids[0]);item.stored_file_name='synthetic.webp';item.original_file_name='private-name.webp'
    result=client.get(url(id,True),headers=headers(viewer)).json()
    assert result['uploaded_requirement_ids']==[]
    assert all(not item['has_image'] and item['original_file_name'] is None for item in result['items'])

def test_read_receipt_and_realtime_notification_arrive_without_history_polling(client):
    staff_id,_,staff=account(['consultations.view']);id,patient,ids=thread(4,staff_id)
    with client.websocket_connect('/api/v1/realtime') as socket:
        socket.send_json({'token':patient});assert socket.receive_json()['type']=='realtime.ready'
        result=client.get(url(id,True),headers=headers(staff))
        assert result.status_code==200
        event=socket.receive_json();assert event['type']=='consultation.read' and event['appointment_id']==id
    page=client.get(url(id),headers=headers(patient)).json()
    assert page['peer_read_through']['id']==ids[2]
    assert page['peer_read_through']['read_at']

@pytest.mark.parametrize('sender',['patient','staff'])
def test_retried_text_is_one_message_and_one_sms_side_effect(client,sender):
    id,patient,_=thread();staff=account(['consultations.view','consultations.send'])[2]
    token=staff if sender=='staff' else patient
    path=url(id,sender=='staff').replace('/sync','/messages')
    payload={'body':'Synthetic retry message','client_nonce':'22222222-2222-4222-8222-222222222222'}
    first=client.post(path,json=payload,headers=headers(token));assert first.status_code==201,first.text
    with SessionLocal() as db: sms_before=db.scalar(select(func.count()).select_from(SmsOutbox))
    second=client.post(path,json=payload,headers=headers(token));assert second.status_code==201 and second.json()['id']==first.json()['id']
    different=client.post(path,json={**payload,'body':'Different message'},headers=headers(token));assert different.status_code==409
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(ConsultationMessage).where(ConsultationMessage.appointment_id==id))==1
        assert db.scalar(select(func.count()).select_from(SmsOutbox))==sms_before

def test_simultaneous_staff_retries_cannot_create_duplicates(client):
    id,_,_=thread();token=account(['consultations.view','consultations.send'])[2]
    payload={'body':'Concurrent synthetic retry','client_nonce':'33333333-3333-4333-8333-333333333333'}
    def post(_):return client.post(url(id,True).replace('/sync','/messages'),json=payload,headers=headers(token))
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(post,range(2)))
    assert all(item.status_code==201 for item in results),[item.status_code for item in results]
    assert len({item.json()['id'] for item in results})==1

def test_message_queries_remain_bounded_with_a_thousand_message_history(client):
    staff_id,_,token=account(['consultations.view']);id,_,ids=thread(1001,staff_id)
    queries=[]
    def capture(conn,cursor,statement,parameters,context,many):
        if 'consultation_messages' in statement.lower():queries.append(statement)
    event.listen(get_engine(),'before_cursor_execute',capture)
    try:response=client.get(url(id,True),params={'after_id':ids[-2]},headers=headers(token))
    finally:event.remove(get_engine(),'before_cursor_execute',capture)
    assert response.status_code==200 and len(response.json()['items'])==1
    assert len(queries)<=5
    history=[query for query in queries if query.lstrip().upper().startswith('SELECT') and 'consultation_messages.body' in query]
    assert len(history)==1 and 'LIMIT' in history[0].upper()

def test_fault_documents_are_themed_standalone_and_do_not_expose_configuration(client):
    for path,status,title in [('/404.html',404,'صفحه مورد نظر یافت نشد'),('/maintenance.html',503,'در حال به‌روزرسانی'),('/connection-lost.html',503,'ارتباط با سرور قطع شد')]:
        result=client.get(path)
        assert result.status_code==status and title in result.text
        assert 'site-status__symbol' in result.text and '<svg' in result.text
        assert '<script' not in result.text and '{{' not in result.text
        assert result.headers['cache-control']=='no-store' and 'noindex' in result.headers['x-robots-tag']
        assert ('x-drz-status' in result.headers)==(path=='/maintenance.html')
