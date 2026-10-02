"""Synthetic page summaries must retain privacy and a fixed query cost as page size grows."""

from datetime import time, timedelta
from zoneinfo import ZoneInfo
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, select

from app.database import Base, SessionLocal, get_engine
from app.main import app
from app.models import Appointment, Patient, Service
from test_roles import account, headers


@pytest.fixture
def client():
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    with TestClient(app) as value:
        today = datetime.now(ZoneInfo("Asia/Tehran")).date()
        with SessionLocal.begin() as db:
            service = db.scalar(select(Service))
            for index in range(20):
                patient = Patient(
                    phone=f"+989100006{index:03}",
                    first_name="Synthetic",
                    tags_json='["private-fixture"]',
                )
                db.add(patient)
                db.flush()
                for offset, state in [
                    (-1, "completed"),
                    (0, "cancelled"),
                    (2, "cancelled"),
                    (3, "confirmed"),
                ]:
                    db.add(
                        Appointment(
                            patient_id=patient.id,
                            service_id=service.id,
                            tracking_code=f"BUDGET-{index}-{offset}",
                            appointment_date=today + timedelta(days=offset),
                            start_time=time(17),
                            end_time=time(17, 20),
                            status=state,
                        )
                    )
        yield value
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())


def test_patient_page_query_count_is_constant_and_summaries_match(client):
    access = headers(
        account(["patients.view", "patients.records.view", "appointments.view"])[2]
    )
    statements = []

    def record(_connection, _cursor, statement, _parameters, _context, _many):
        statements.append(statement)

    engine = get_engine()
    event.listen(engine, "before_cursor_execute", record)
    try:
        counts = []
        for page_size in [5, 20]:
            statements.clear()
            response = client.get(
                f"/api/v1/staff/patients?page_size={page_size}", headers=access
            )
            assert response.status_code == 200
            counts.append(len(statements))
            today = datetime.now(ZoneInfo("Asia/Tehran")).date()
            rows = response.json()["items"]
            assert len(rows) == page_size
            assert all(
                row["appointment_count"] == 4 and row["completed_count"] == 1
                for row in rows
            )
            assert all(
                row["last_appointment_date"] == today.isoformat()
                and row["next_appointment_date"]
                == (today + timedelta(days=3)).isoformat()
                for row in rows
            )
        assert counts[0] == counts[1] and counts[1] <= 12
    finally:
        event.remove(engine, "before_cursor_execute", record)


def test_patient_reader_does_not_query_appointment_summaries_or_expose_tags(client):
    access = headers(account(["patients.view"])[2])
    statements = []

    def record(_connection, _cursor, statement, _parameters, _context, _many):
        statements.append(statement.lower())

    engine = get_engine()
    event.listen(engine, "before_cursor_execute", record)
    try:
        response = client.get("/api/v1/staff/patients", headers=access)
        assert response.status_code == 200
        assert not any("from appointments" in statement for statement in statements)
        assert response.json()["available_tags"] == []
        assert all(
            not row["tags"]
            and row["appointment_count"] == 0
            and row["next_appointment_date"] is None
            for row in response.json()["items"]
        )
        assert "private-fixture" not in response.text
    finally:
        event.remove(engine, "before_cursor_execute", record)
