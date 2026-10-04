"""Pre-launch hardening: OTP budget ordering, hold expiry, booking/chat limits, refunds, audit, password change."""
import secrets
from datetime import date, datetime, time, timedelta

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select

from app.database import Base, SessionLocal, get_engine
from app.main import app
from app.models import (
    Appointment,
    AuditLog,
    AuthRateLimit,
    AuthSession,
    BookingHold,
    ClinicSetting,
    Patient,
    Payment,
    Service,
    StaffUser,
)
from app.routers import auth, patient as patient_router
from app.security import hash_password, issue_session_token, utcnow, verify_password
from app.browser_sessions import staff_state_hash
from app.sms_automation import expire_unpaid_holds
from test_roles import headers, owner  # noqa: F401  (also registers the shared schema fixtures)

TAG = secrets.token_hex(4)


@pytest.fixture(autouse=True)
def schema_and_limits():
    Base.metadata.create_all(bind=get_engine())
    with SessionLocal.begin() as db:
        db.execute(delete(AuthRateLimit))
    yield
    with SessionLocal.begin() as db:
        db.execute(delete(AuthRateLimit))


@pytest.fixture
def client():
    with TestClient(app) as value:
        yield value


def make_patient(_suffix=0):
    with SessionLocal.begin() as db:
        item = Patient(phone=f"+98{secrets.randbelow(10**10):010d}", first_name="آزمون", last_name="بیمار", profile_completed=True)
        db.add(item)
        db.flush()
        return item.id


def patient_headers(patient_id):
    token, digest = issue_session_token()
    with SessionLocal.begin() as db:
        db.add(AuthSession(token_hash=digest, patient_id=patient_id, expires_at=utcnow() + timedelta(hours=1)))
    return {"Authorization": f"Bearer {token}"}


def first_service():
    with SessionLocal() as db:
        return db.scalar(select(Service.id).where(Service.is_active.is_(True)).order_by(Service.id).limit(1))


def add_hold(patient_id, service_id, *, status="pending_payment", minutes=10, index=0):
    with SessionLocal.begin() as db:
        hold = BookingHold(
            id=f"h-{TAG}-{secrets.token_hex(6)}", patient_id=patient_id, service_id=service_id,
            appointment_date=date.today() + timedelta(days=3), start_time=time(10, index), end_time=time(10, index + 1),
            status=status, expires_at=utcnow() + timedelta(minutes=minutes), price_toman=1000, amount_toman=1000, payment_mode="full",
        )
        db.add(hold)
        db.flush()
        return hold.id


def add_appointment(patient_id, service_id, number, *, status="pending", days=5):
    with SessionLocal.begin() as db:
        item = Appointment(
            tracking_code=f"T{TAG}{number:03d}{secrets.token_hex(2)}"[:16], patient_id=patient_id, service_id=service_id,
            appointment_date=date.today() + timedelta(days=days), start_time=time(11, number % 50), end_time=time(11, number % 50 + 1),
            slot_key=f"{TAG}-{number}-{secrets.token_hex(3)}"[:32], status=status,
        )
        db.add(item)
        db.flush()
        return item.id


def test_phone_budget_is_not_spent_before_the_captcha_is_solved(client, monkeypatch):
    def refuse(*_args, **_kwargs):
        raise HTTPException(400, "تأیید امنیتی لازم است")

    phone = "09123000999"
    monkeypatch.setattr(auth.bot, "verify", refuse)
    for _ in range(8):  # more than the 5-per-hour phone budget
        assert client.post("/api/v1/auth/otp/request", json={"phone": phone}).status_code == 400
        assert client.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": "123456"}).status_code in {400, 422}
    monkeypatch.undo()
    assert client.post("/api/v1/auth/otp/request", json={"phone": phone}).status_code == 200  # the budget is intact


def test_expiring_holds_does_nothing_when_nothing_expired_and_expires_old_ones():
    patient_id = make_patient(11)
    service_id = first_service()
    with SessionLocal() as db:
        expire_unpaid_holds(db)  # clear leftovers of other tests
    with SessionLocal() as db:
        assert expire_unpaid_holds(db) == 0
    stale = add_hold(patient_id, service_id, minutes=-5)
    live = add_hold(patient_id, service_id, minutes=10, index=2)
    with SessionLocal() as db:
        assert expire_unpaid_holds(db) >= 1
    with SessionLocal() as db:
        assert db.get(BookingHold, stale).status == "expired"
        assert db.get(BookingHold, live).status == "pending_payment"


def test_one_patient_cannot_hoard_holds_or_future_appointments():
    patient_id = make_patient(12)
    service_id = first_service()
    with SessionLocal() as db:
        clinic = db.get(ClinicSetting, 1)
        patient_router._enforce_booking_limits(db, db.get(Patient, patient_id), clinic)  # nothing yet: allowed
    for index in range(patient_router.MAX_OPEN_HOLDS):
        add_hold(patient_id, service_id, index=index * 2)
    with SessionLocal() as db:
        with pytest.raises(HTTPException) as error:
            patient_router._enforce_booking_limits(db, db.get(Patient, patient_id), db.get(ClinicSetting, 1))
        assert error.value.status_code == 409
    other = make_patient(13)
    for number in range(patient_router.MAX_UPCOMING_APPOINTMENTS):
        add_appointment(other, service_id, number)
    add_appointment(other, service_id, 90, status="cancelled")  # cancelled ones do not count
    with SessionLocal() as db:
        with pytest.raises(HTTPException) as error:
            patient_router._enforce_booking_limits(db, db.get(Patient, other), db.get(ClinicSetting, 1))
        assert error.value.status_code == 409


def chat_service():
    with SessionLocal.begin() as db:
        service = Service(
            title=f"خدمت گفتگوی آزمون {TAG}", description="", duration_minutes=20, icon_key="medical",
            allows_media_chat=True, is_active=False, sort_order=999,
        )
        db.add(service)
        db.flush()
        return service.id


def test_consultation_chat_is_closed_for_cancelled_visits_and_rate_limited(client):
    service_id = chat_service()
    patient_id = make_patient(14)
    access = patient_headers(patient_id)
    cancelled = add_appointment(patient_id, service_id, 1, status="cancelled")
    active = add_appointment(patient_id, service_id, 2)
    url = "/api/v1/appointments/{}/consultation/messages"
    assert client.post(url.format(cancelled), headers=access, json={"body": "سلام"}).status_code == 409
    sent = [client.post(url.format(active), headers=access, json={"body": f"پیام {i}"}).status_code for i in range(patient_router.MESSAGES_PER_HOUR + 3)]
    assert sent.count(201) == patient_router.MESSAGES_PER_HOUR and sent.count(429) == 3


def paid_payment(patient_id, service_id, status="verified"):
    hold_id = add_hold(patient_id, service_id, status="completed")
    with SessionLocal.begin() as db:
        payment = Payment(hold=db.get(BookingHold, hold_id), amount_toman=50_000, status=status)
        db.add(payment)
        db.flush()
        return payment.id


def test_refund_workflow_rules(client):
    access = headers(owner()[2])
    patient_id = make_patient(15)
    service_id = first_service()
    unpaid = paid_payment(patient_id, service_id, status="created")
    url = "/api/v1/staff/finance/payments/{}/refund"
    assert client.patch(url.format(unpaid), headers=access, json={"status": "requested", "amount_toman": 50_000}).status_code == 409
    paid = paid_payment(patient_id, service_id)
    assert client.patch(url.format(paid), headers=access, json={"status": "requested", "amount_toman": 50_000}).status_code == 200
    assert client.patch(url.format(paid), headers=access, json={"status": "refunded", "amount_toman": 60_000}).status_code == 422  # more than paid
    done = client.patch(url.format(paid), headers=access, json={"status": "refunded", "amount_toman": 50_000, "reference": "R-1"})
    assert done.status_code == 200 and done.json()["refund_status"] == "refunded"
    assert client.patch(url.format(paid), headers=access, json={"status": "requested", "amount_toman": 50_000}).status_code == 409  # final


def audit_count(action):
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.action == action)) or 0


def test_reading_a_patient_record_and_exporting_leave_an_audit_trail(client):
    access = headers(owner()[2])
    patient_id = make_patient(16)
    before_view, before_export = audit_count("patient.record_viewed"), audit_count("appointments.exported")
    assert client.get(f"/api/v1/staff/patients/{patient_id}", headers=access).status_code == 200
    assert client.get("/api/v1/staff/appointments/export", headers=access).status_code == 200
    assert audit_count("patient.record_viewed") == before_view + 1
    assert audit_count("appointments.exported") == before_export + 1


def staff_with_password(password):
    with SessionLocal.begin() as db:
        item = StaffUser(username=f"pw-{secrets.token_hex(5)}", full_name="رمز آزمون", role="admin", password_hash=hash_password(password))
        db.add(item)
        db.flush()
        staff_id = item.id
    token, digest = issue_session_token()
    with SessionLocal.begin() as db:
        staff = db.get(StaffUser, staff_id)
        db.add(AuthSession(token_hash=digest, staff_id=staff_id, expires_at=utcnow() + timedelta(hours=1), staff_state_hash=staff_state_hash(staff)))
    return staff_id, {"Authorization": f"Bearer {token}"}


def test_staff_can_change_their_own_password_and_old_sessions_die(client):
    old, new = "OldPassword-12345!", "BrandNewPassword-67890!"
    staff_id, access = staff_with_password(old)
    url = "/api/v1/staff/auth/password"
    assert client.post(url, headers=access, json={"password": "wrong-password-1", "new_password": new}).status_code == 400
    assert client.post(url, headers=access, json={"password": old, "new_password": old}).status_code == 400
    assert client.post(url, headers=access, json={"password": old, "new_password": "short"}).status_code == 422
    changed = client.post(url, headers=access, json={"password": old, "new_password": new})
    assert changed.status_code == 200 and changed.json()["reauthenticate"] is True
    with SessionLocal() as db:
        assert verify_password(new, db.get(StaffUser, staff_id).password_hash)
    assert client.get("/api/v1/staff/me", headers=access).status_code == 401
    assert audit_count("staff.password_changed") >= 1
    assert client.post(url).status_code in {401, 422}
