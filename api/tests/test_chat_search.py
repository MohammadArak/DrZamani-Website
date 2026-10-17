"""Staff search is private, literal and permission bounded."""
from datetime import datetime
from app.database import SessionLocal
from app.models import Appointment, ConsultationMessage
from test_chat_sync import fresh, thread
from test_roles import account, client, headers


def test_search_matches_old_messages_names_and_persian_phone(client):
    aid, _, mids = thread(3)
    other, _, _ = thread(1)
    with SessionLocal.begin() as db:
        a = db.get(Appointment, aid)
        a.patient.first_name = "نام"
        a.patient.last_name = "آزمایشی"
        a.patient.phone = "09120000199"
        db.get(ConsultationMessage, mids[0]).body = "شناسه قدیمی 50%_exact"
        db.get(ConsultationMessage, mids[-1]).created_at = datetime(2026, 10, 17, 9, 30)
    token = account(["consultations.view"])[2]
    endpoint = "/api/v1/staff/consultations"
    for needle in ["نام آزمایشی", "۰۹۱۲۰۰۰۰۱۹۹", "شناسه قدیمی", "50%_exact"]:
        result = client.get(endpoint, params={"search": needle}, headers=headers(token))
        assert result.status_code == 200
        assert result.headers["cache-control"] == "no-store"
        assert [r["appointment_id"] for r in result.json()] == [aid]
        assert result.json()[0]["last_message_at"].endswith("Z")
    assert len(client.get(endpoint, headers=headers(token)).json()) == 2
    assert client.get(endpoint, params={"search": "absent%_"}, headers=headers(token)).json() == []
    assert client.get(endpoint, params={"search": "x" * 121}, headers=headers(token)).status_code == 422
    assert client.get(endpoint).status_code == 401
    assert client.get(endpoint, headers=headers(account([])[2])).status_code == 403


def test_national_id_search_requires_record_permission_and_never_returns_id(client):
    aid, _, _ = thread(1)
    with SessionLocal.begin() as db:
        db.get(Appointment, aid).patient.national_id = "9000019910"
    endpoint = "/api/v1/staff/consultations"
    viewer = account(["consultations.view"])[2]
    assert client.get(endpoint, params={"search": "9000019910"}, headers=headers(viewer)).json() == []
    records = account(["consultations.view", "patients.records.view"])[2]
    result = client.get(endpoint, params={"search": "۹۰۰۰۰۱۹۹۱۰"}, headers=headers(records))
    assert [r["appointment_id"] for r in result.json()] == [aid]
    assert "9000019910" not in result.text
    with SessionLocal.begin() as db:
        db.get(Appointment, aid).service.allows_media_chat = False
    assert client.get(endpoint, params={"search": "9000019910"}, headers=headers(records)).json() == []
