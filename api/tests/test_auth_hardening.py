from __future__ import annotations

import base64
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import date, datetime, time, timedelta
from io import BytesIO
import secrets
import os
import subprocess
import sys
import struct
import zlib

from fastapi import HTTPException
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from PIL import Image
import pytest
from sqlalchemy import delete, func, select
from starlette.websockets import WebSocketDisconnect

from app import browser_sessions
from app.auth_limits import consume_limit
from app.config import get_settings
from app.consultations import optimize_consultation_image
from app.database import Base, SessionLocal, get_engine
from app.main import app
from app.models import (
    Appointment,
    AuthRateLimit,
    AuthSession,
    ConsultationMessage,
    OtpChallenge,
    Patient,
    Service,
    StaffUser,
)
from app.routers import auth
from app.security import hash_password, hash_session_token, issue_session_token, utcnow

ORIGIN = get_settings().frontend_url
COOKIE_HEADERS = {"Origin": ORIGIN, "X-Session-Transport": "cookie"}


@pytest.fixture(autouse=True)
def reset_auth_limits(security_schema):
    with SessionLocal.begin() as db:
        db.execute(delete(AuthRateLimit))
    yield
    with SessionLocal.begin() as db:
        db.execute(delete(AuthRateLimit))


@pytest.fixture(scope="module")
def security_schema():
    # Keep the new module independently runnable; do not rely on test_api's import setup.
    Base.metadata.create_all(bind=get_engine())


@pytest.fixture
def client():
    with TestClient(app) as item:
        yield item


@pytest.fixture
def staff():
    with SessionLocal.begin() as db:
        item = StaffUser(
            username=f"security-{secrets.token_hex(5)}",
            full_name="Security Test",
            role="admin",
            password_hash=hash_password("SecurityTestPassword123!"),
        )
        db.add(item)
        db.flush()
        return item.id, item.username


def staff_login(
    client, staff, *, cookie=False, password="SecurityTestPassword123!", headers=None
):
    captcha = client.get("/api/v1/staff/auth/captcha").json()
    return client.post(
        "/api/v1/staff/auth/login",
        headers=headers or (COOKIE_HEADERS if cookie else {}),
        json={
            "username": staff[1],
            "password": password,
            "captcha_id": captcha["captcha_id"],
            "captcha_answer": captcha["debug_answer"],
        },
    )


def request_code(client, phone="09199999111"):
    response = client.post("/api/v1/auth/otp/request", json={"phone": phone})
    assert response.status_code == 200, response.text
    return response.json()["debug_otp"]


def patient_cookie(client):
    code = request_code(client)
    response = client.post(
        "/api/v1/auth/otp/verify",
        headers=COOKIE_HEADERS,
        json={"phone": "09199999111", "code": code},
    )
    assert response.status_code == 200, response.text
    return response


def test_no_implicit_development(monkeypatch):
    for name in (
        "APP_ENV",
        "APP_DEBUG",
        "SECRET_KEY",
        "SMS_PROVIDER",
        "ZARINPAL_SANDBOX",
    ):
        monkeypatch.delenv(name, raising=False)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        get_settings.__wrapped__()
    monkeypatch.setenv("SECRET_KEY", "StandaloneProductionSecret123456789ABCDE")
    settings = get_settings.__wrapped__()
    assert settings.app_env == "production" and not settings.debug
    assert not settings.development_debug and settings.sms_provider == "disabled"
    assert not settings.zarinpal_sandbox and settings.patient_session_days == 7


def test_production_disables_query_string_access_logs():
    env = dict(
        os.environ, APP_ENV="production", APP_DEBUG="false",
        SECRET_KEY="StandaloneProductionSecret123456789ABCDE",
        SMS_PROVIDER="disabled", ZARINPAL_SANDBOX="false",
        FRONTEND_URL="https://clinic.test", ALLOWED_ORIGINS="",
    )
    result = subprocess.run(
        [sys.executable, "-c", "import app.main, logging; assert logging.getLogger('uvicorn.access').disabled; assert logging.getLogger('httpx').level >= logging.WARNING"],
        env=env, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize(
    "name,value",
    [
        ("APP_DEBUG", "true"),
        ("APP_DEBUG", "typo"),
        ("APP_ENV", "prodution"),
        ("SECRET_KEY", "CHANGE_ME_GENERATE_WITH_openssl_rand_hex_32"),
        ("SECRET_KEY", "a" * 64),
        ("SMS_PROVIDER", "console"),
        ("ZARINPAL_SANDBOX", "true"),
        ("PATIENT_SESSION_DAYS", "0"),
        ("OTP_MAX_ATTEMPTS", "100"),
        ("ALLOWED_ORIGINS", "*"),
        ("FRONTEND_URL", "http://example.test"),
    ],
)
def test_production_rejects_unsafe_configuration(monkeypatch, name, value):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.setenv("SECRET_KEY", "StandaloneProductionSecret123456789ABCDE")
    monkeypatch.setenv("SMS_PROVIDER", "disabled")
    monkeypatch.setenv("ZARINPAL_SANDBOX", "false")
    monkeypatch.setenv("FRONTEND_URL", "https://example.test")
    monkeypatch.setenv(name, value)
    with pytest.raises(RuntimeError):
        get_settings.__wrapped__()


def test_production_responses_and_logs_have_no_debug_secrets(
    client, monkeypatch, caplog
):
    settings = replace(get_settings(), app_env="production", debug=False)
    monkeypatch.setattr(auth, "get_settings", lambda: settings)
    delivered = []

    class FakeSms:
        def send_otp(self, phone, code):
            delivered.append(code)

    monkeypatch.setattr(auth, "get_sms_provider", FakeSms)
    response = client.post("/api/v1/auth/otp/request", json={"phone": "09199999112"})
    assert response.status_code == 200
    assert "debug_otp" not in response.json()
    assert delivered[0] not in caplog.text
    assert "09199999112" not in caplog.text
    captcha = client.get("/api/v1/staff/auth/captcha")
    assert "debug_answer" not in captcha.json()
    assert response.headers["cache-control"] == "no-store"


def test_console_does_not_log_code_or_recipient(client, caplog):
    code = request_code(client)
    assert code not in caplog.text
    assert "09199999111" not in caplog.text


def test_captcha_is_raster_and_not_reusable(client, staff):
    captcha = client.get("/api/v1/staff/auth/captcha").json()
    mime, data = captcha["image_data"].split(",")
    assert mime == "data:image/png;base64"
    raw = base64.b64decode(data)
    with Image.open(BytesIO(raw)) as image:
        assert image.format == "PNG" and not image.info
    assert b"<text" not in raw
    payload = {
        "username": staff[1],
        "password": "SecurityTestPassword123!",
        "captcha_id": captcha["captcha_id"],
        "captcha_answer": captcha["debug_answer"],
    }
    assert client.post("/api/v1/staff/auth/login", json=payload).status_code == 200
    assert client.post("/api/v1/staff/auth/login", json=payload).status_code == 400


def test_new_captcha_and_changed_ip_cannot_bypass_account_lock(client, staff):
    for _ in range(5):
        assert (
            staff_login(client, staff, password="WrongPassword123!").status_code == 401
        )
    # New client represents another source IP; account limit remains in the database.
    with TestClient(app, client=("198.51.100.23", 50000)) as other:
        response = staff_login(other, staff)
    assert response.status_code == 429 and int(response.headers["retry-after"]) > 0
    with SessionLocal.begin() as db:
        for item in db.scalars(select(AuthRateLimit)):
            item.resets_at = utcnow() - timedelta(seconds=1)
    assert staff_login(client, staff).status_code == 200


def test_forged_forwarded_header_cannot_bypass_ip_limit(client, monkeypatch):
    settings = replace(get_settings(), captcha_max_per_ip_hour=2)
    monkeypatch.setattr(auth, "get_settings", lambda: settings)
    for ip in ("1.1.1.1", "2.2.2.2"):
        assert (
            client.get(
                "/api/v1/staff/auth/captcha", headers={"X-Forwarded-For": ip}
            ).status_code
            == 200
        )
    assert (
        client.get(
            "/api/v1/staff/auth/captcha", headers={"X-Forwarded-For": "3.3.3.3"}
        ).status_code
        == 429
    )


def test_persistent_limit_is_atomic_across_sessions():
    def attempt(_):
        with SessionLocal() as db:
            try:
                consume_limit(db, "concurrent-test", "synthetic-identity", 5, 900)
                return 200
            except HTTPException as exc:
                return exc.status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        outcomes = list(pool.map(attempt, range(8)))
    assert outcomes.count(200) == 5 and outcomes.count(429) == 3


def test_otp_consumed_once_under_concurrency(client):
    code = request_code(client)
    with SessionLocal() as db:
        patient = db.scalar(select(Patient).where(Patient.phone == "+989199999111"))
        before = (
            db.scalar(
                select(func.count(AuthSession.id)).where(
                    AuthSession.patient_id == patient.id
                )
            )
            if patient
            else 0
        )

    def verify(_):
        with TestClient(app) as other:
            return other.post(
                "/api/v1/auth/otp/verify", json={"phone": "09199999111", "code": code}
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(verify, range(2)))
    assert sorted(outcomes) == [200, 400]
    with SessionLocal() as db:
        patient = db.scalar(select(Patient).where(Patient.phone == "+989199999111"))
        assert (
            db.scalar(
                select(func.count(AuthSession.id)).where(
                    AuthSession.patient_id == patient.id
                )
            )
            == before + 1
        )


def test_wrong_otp_attempts_do_not_race_past_maximum(client):
    code = request_code(client)
    wrong = "999999" if code != "999999" else "888888"

    def verify(_):
        with TestClient(app) as other:
            return other.post(
                "/api/v1/auth/otp/verify", json={"phone": "09199999111", "code": wrong}
            ).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        assert set(pool.map(verify, range(8))) == {400}
    assert (
        client.post(
            "/api/v1/auth/otp/verify", json={"phone": "09199999111", "code": code}
        ).status_code
        == 400
    )
    with SessionLocal() as db:
        latest = db.scalar(
            select(OtpChallenge)
            .where(OtpChallenge.phone == "+989199999111")
            .order_by(OtpChallenge.id.desc())
        )
        assert latest.attempts == 5 and latest.consumed_at is not None


def test_cookie_transport_csrf_audience_and_real_logout(client):
    response = patient_cookie(client)
    assert (
        response.json()["access_token"] == ""
        and response.json()["token_type"] == "cookie"
    )
    cookies = response.headers.get_list("set-cookie")
    assert any(
        "drz_patient_session" in item
        and "HttpOnly" in item
        and "SameSite=strict" in item
        for item in cookies
    )
    assert client.get("/api/v1/me").status_code == 200
    assert client.get("/api/v1/staff/dashboard").status_code == 401
    raw_session = client.cookies.get("drz_patient_session")
    assert client.post("/api/v1/auth/logout").status_code == 403
    csrf = client.cookies.get("drz_patient_csrf")
    assert (
        client.post(
            "/api/v1/auth/logout",
            headers={"Origin": "https://evil.test", "X-CSRF-Token": csrf},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/auth/logout", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}
        ).status_code
        == 200
    )
    assert client.get("/api/v1/me").status_code == 401
    assert (
        client.get(
            "/api/v1/me", headers={"Authorization": f"Bearer {raw_session}"}
        ).status_code
        == 401
    )


def test_cookie_login_rejects_missing_or_hostile_origin(client, staff):
    assert (
        staff_login(
            client, staff, headers={"X-Session-Transport": "cookie"}
        ).status_code
        == 403
    )
    assert (
        staff_login(
            client,
            staff,
            headers={"Origin": "https://evil.test", "X-Session-Transport": "cookie"},
        ).status_code
        == 403
    )


def test_production_cookie_flags(monkeypatch):
    from fastapi import Response

    settings = replace(get_settings(), app_env="production")
    monkeypatch.setattr(browser_sessions, "get_settings", lambda: settings)
    response = Response()
    browser_sessions.set_session_cookies(response, "staff", "synthetic-token", 3600)
    headers = response.headers.getlist("set-cookie")
    assert all(
        "__Host-" in value
        and "Secure" in value
        and "Path=/" in value
        and "Domain=" not in value
        for value in headers
    )
    assert "HttpOnly" in headers[0] and "HttpOnly" not in headers[1]


@pytest.mark.parametrize("change", ["role", "password", "disabled"])
def test_staff_state_change_revokes_session(client, staff, change):
    token = staff_login(client, staff).json()["access_token"]
    with SessionLocal.begin() as db:
        user = db.get(StaffUser, staff[0])
        if change == "role":
            user.role = "secretary"
        elif change == "password":
            user.password_hash = hash_password("ChangedTestPassword123!")
        else:
            user.is_active = False
    assert (
        client.get(
            "/api/v1/staff/dashboard", headers={"Authorization": f"Bearer {token}"}
        ).status_code
        == 401
    )
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(AuthSession).where(
                    AuthSession.token_hash == hash_session_token(token)
                )
            ).revoked_at
            is not None
        )


def test_staff_cookie_logout_invalidates_websocket(client, staff):
    assert staff_login(client, staff, cookie=True).status_code == 200
    with client.websocket_connect(
        "/api/v1/realtime", headers={"Origin": ORIGIN}
    ) as websocket:
        websocket.send_json({"audience": "staff"})
        assert websocket.receive_json()["type"] == "realtime.ready"
        assert (
            client.post(
                "/api/v1/staff/auth/logout",
                headers={
                    "Origin": ORIGIN,
                    "X-CSRF-Token": client.cookies.get("drz_staff_csrf"),
                },
            ).status_code
            == 200
        )
        websocket.send_text("ping")
        with pytest.raises(WebSocketDisconnect) as error:
            websocket.receive_json()
        assert error.value.code == 4401


def test_cookie_websocket_rejects_hostile_origin(client, staff):
    assert staff_login(client, staff, cookie=True).status_code == 200
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(
            "/api/v1/realtime", headers={"Origin": "https://evil.test"}
        ):
            pass


def test_session_policy_applies_to_older_patient_tokens(client):
    with SessionLocal.begin() as db:
        patient = Patient(
            phone=f"+989{secrets.randbelow(10**9):09d}", profile_completed=True
        )
        db.add(patient)
        db.flush()
        token, hashed = issue_session_token()
        db.add(
            AuthSession(
                patient_id=patient.id,
                token_hash=hashed,
                created_at=utcnow() - timedelta(days=8),
                expires_at=utcnow() + timedelta(days=22),
            )
        )
    assert (
        client.get(
            "/api/v1/me", headers={"Authorization": f"Bearer {token}"}
        ).status_code
        == 401
    )


def test_cross_patient_private_endpoints_and_staff_finance(client):
    with SessionLocal.begin() as db:
        owner = Patient(
            phone=f"+989{secrets.randbelow(10**9):09d}", profile_completed=True
        )
        intruder = Patient(
            phone=f"+989{secrets.randbelow(10**9):09d}", profile_completed=True
        )
        service = Service(
            title="Security fixture", duration_minutes=20, allows_media_chat=True
        )
        db.add_all([owner, intruder, service])
        db.flush()
        appointment = Appointment(
            tracking_code=secrets.token_hex(6),
            patient_id=owner.id,
            service_id=service.id,
            appointment_date=date.today() + timedelta(days=10),
            start_time=time(16),
            end_time=time(16, 20),
        )
        db.add(appointment)
        db.flush()
        message = ConsultationMessage(
            appointment_id=appointment.id,
            sender_type="patient",
            stored_file_name="fixture.webp",
            content_type="image/webp",
        )
        db.add(message)
        token, hashed = issue_session_token()
        db.add(
            AuthSession(
                patient_id=intruder.id,
                token_hash=hashed,
                expires_at=utcnow() + timedelta(days=1),
            )
        )
        aid = appointment.id
    headers = {"Authorization": f"Bearer {token}"}
    for suffix in (
        "calendar",
        "consultation",
        "consultation/images/999999",
        "reschedule/dates",
    ):
        assert client.get(
            f"/api/v1/appointments/{aid}/{suffix}", headers=headers
        ).status_code in {403, 404}
    assert client.post(
        f"/api/v1/appointments/{aid}/cancel", headers=headers
    ).status_code in {403, 404}
    assert client.get("/api/v1/staff/patients", headers=headers).status_code == 403
    assert (
        client.get("/api/v1/staff/finance/payments", headers=headers).status_code == 403
    )


def test_large_image_header_rejected_before_decode():
    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data))
        )

    raw = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 5000, 5000, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b""))
        + chunk(b"IEND", b"")
    )
    with pytest.raises(HTTPException) as error:
        optimize_consultation_image(raw)
    assert error.value.status_code == 413


def test_spreadsheet_exports_text_without_formula_execution():
    from types import SimpleNamespace
    from app.appointment_export import build_appointments_workbook

    item = SimpleNamespace(
        patient=SimpleNamespace(
            first_name="=1+1", last_name=None, phone="+989199999111"
        ),
        tracking_code="fixture",
        service=SimpleNamespace(
            title='=HYPERLINK("https://evil.test")', duration_minutes=20
        ),
        appointment_date=date.today(),
        start_time=time(16),
        end_time=time(16, 20),
        status="pending",
        has_previous_visit=False,
        patient_note="=1+1",
        staff_note="=2+2",
    )
    book = load_workbook(
        BytesIO(build_appointments_workbook([item], doctor_name="Test"))
    )
    assert all(cell.data_type != "f" for row in book.active for cell in row)
    assert book.active["C4"].value == "=1+1"


def test_calendar_text_cannot_inject_properties():
    from types import SimpleNamespace
    from app.calendar_export import appointment_ics

    clinic = SimpleNamespace(
        site_url="https://clinic.test",
        timezone_name="Asia/Tehran",
        doctor_name="Doctor\r\nBEGIN:VEVENT",
        address="Office\r\nATTENDEE:evil",
    )
    item = SimpleNamespace(
        id=1,
        tracking_code="fixture",
        appointment_date=date.today(),
        start_time=time(16),
        end_time=time(16, 20),
        updated_at=None,
        created_at=datetime.now(),
        patient_reschedule_count=0,
        service=SimpleNamespace(title="Visit\r\nDESCRIPTION:injected"),
    )
    content = appointment_ics(item, clinic).decode("utf-8")
    assert content.count("\r\nBEGIN:VEVENT\r\n") == 1
    assert "\r\nATTENDEE:" not in content
    assert "\r\nDESCRIPTION:injected" not in content
