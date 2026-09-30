from __future__ import annotations

from datetime import datetime, time, timedelta
from io import BytesIO
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import select

from app.appointment_operations import queue_scheduled_reminders
from app.database import Base, SessionLocal, get_engine
from app.main import app
from app.models import (
    Appointment,
    AppointmentReminder,
    ClinicSetting,
    Patient,
    Service,
    SmsAutomationRule,
    StaffUser,
)
from app.payments import PaymentRequestResult, PaymentVerifyResult
from app.security import hash_password


Base.metadata.drop_all(bind=get_engine())
Base.metadata.create_all(bind=get_engine())


def test_debug_documentation_is_available() -> None:
    with TestClient(app) as client:
        docs = client.get("/api/docs")
        assert docs.status_code == 200
        assert "Swagger UI" in docs.text

        openapi = client.get("/api/openapi.json")
        assert openapi.status_code == 200
        assert openapi.json()["info"]["title"] == "Dr Zamani Appointment API"


def test_central_clinic_information_is_public_and_admin_only() -> None:
    with TestClient(app) as client:
        captcha = client.get("/api/v1/staff/auth/captcha").json()
        admin_login = client.post(
            "/api/v1/staff/auth/login",
            json={
                "username": "admin",
                "password": "TestAdminPassword123!",
                "captcha_id": captcha["captcha_id"],
                "captcha_answer": captcha["debug_answer"],
            },
        )
        assert admin_login.status_code == 200, admin_login.text
        admin_headers = {
            "Authorization": f"Bearer {admin_login.json()['access_token']}"
        }

        original_response = client.get(
            "/api/v1/staff/settings", headers=admin_headers
        )
        assert original_response.status_code == 200, original_response.text
        original = original_response.json()
        reminder_snapshot = {
            "reminder_enabled": original["reminder_enabled"],
            "first_reminder_hours": original["first_reminder_hours"],
            "final_reminder_hours": original["final_reminder_hours"],
        }
        updated_payload = {
            **original,
            "doctor_name": "دکتر نمونه مرکزی",
            "specialty": "متخصص آزمایشی",
            "medical_council_number": "12345",
            "office_phone": "08612345678",
            "consultation_phone": "09121234567",
            "email": "clinic@example.com",
            "address_region": "استان نمونه",
            "address_city": "شهر نمونه",
            "address": "شهر نمونه، خیابان نمونه، ساختمان مرکزی",
            "working_hours": "شنبه تا چهارشنبه، ۱۶ تا ۲۰",
            "site_url": "https://clinic.example.com/",
            "map_embed_url": "https://maps.example.com/embed/clinic/",
            "map_page_url": "https://maps.example.com/clinic/",
            "map_latitude": 34.1234,
            "map_longitude": 49.5678,
            "instagram_url": "https://instagram.com/clinic.example/",
            "eitaa_url": "https://eitaa.com/clinic_example/",
        }
        update_response = client.put(
            "/api/v1/staff/settings",
            headers=admin_headers,
            json=updated_payload,
        )
        assert update_response.status_code == 200, update_response.text
        updated = update_response.json()
        assert updated["doctor_name"] == updated_payload["doctor_name"]
        assert updated["office_phone"] == updated_payload["office_phone"]
        assert updated["address"] == updated_payload["address"]
        assert updated["site_url"] == "https://clinic.example.com"
        assert {key: updated[key] for key in reminder_snapshot} == reminder_snapshot

        public_response = client.get("/api/v1/clinic")
        assert public_response.status_code == 200, public_response.text
        public_settings = public_response.json()
        for field in (
            "doctor_name",
            "specialty",
            "medical_council_number",
            "office_phone",
            "consultation_phone",
            "email",
            "address_region",
            "address_city",
            "address",
            "working_hours",
            "site_url",
            "map_embed_url",
            "map_page_url",
            "map_latitude",
            "map_longitude",
            "instagram_url",
            "eitaa_url",
        ):
            assert public_settings[field] == updated[field]
        assert {
            key: public_settings[key] for key in reminder_snapshot
        } == reminder_snapshot

        with SessionLocal() as db:
            if not db.scalar(
                select(StaffUser).where(StaffUser.username == "secretary")
            ):
                db.add(
                    StaffUser(
                        username="secretary",
                        full_name="Clinic Secretary",
                        password_hash=hash_password(
                            "TestSecretaryPassword123!"
                        ),
                        role="secretary",
                        is_active=True,
                    )
                )
                db.commit()
        captcha = client.get("/api/v1/staff/auth/captcha").json()
        secretary_login = client.post(
            "/api/v1/staff/auth/login",
            json={
                "username": "secretary",
                "password": "TestSecretaryPassword123!",
                "captcha_id": captcha["captcha_id"],
                "captcha_answer": captcha["debug_answer"],
            },
        )
        assert secretary_login.status_code == 200, secretary_login.text
        secretary_headers = {
            "Authorization": f"Bearer {secretary_login.json()['access_token']}"
        }
        forbidden_update = client.put(
            "/api/v1/staff/settings",
            headers=secretary_headers,
            json=updated_payload,
        )
        assert forbidden_update.status_code == 403

        restore_response = client.put(
            "/api/v1/staff/settings",
            headers=admin_headers,
            json=original,
        )
        assert restore_response.status_code == 200, restore_response.text


def _patient_token(client: TestClient, phone: str) -> str:
    request = client.post("/api/v1/auth/otp/request", json={"phone": phone})
    assert request.status_code == 200, request.text
    code = request.json()["debug_otp"]
    assert code
    verify = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": code})
    assert verify.status_code == 200, verify.text
    return verify.json()["access_token"]


def test_complete_patient_and_booking_flow() -> None:
    with TestClient(app) as client:
        health = client.get("/api/health")
        assert health.status_code == 200

        captcha = client.get("/api/v1/staff/auth/captcha")
        assert captcha.status_code == 200, captcha.text
        staff_login = client.post(
            "/api/v1/staff/auth/login",
            json={
                "username": "admin",
                "password": "TestAdminPassword123!",
                "captcha_id": captcha.json()["captcha_id"],
                "captcha_answer": captcha.json()["debug_answer"],
            },
        )
        assert staff_login.status_code == 200, staff_login.text
        staff_headers = {"Authorization": f"Bearer {staff_login.json()['access_token']}"}

        settings = client.get("/api/v1/staff/settings", headers=staff_headers).json()
        settings.update(
            {
                "slot_duration_minutes": 20,
                "booking_horizon_days": 7,
                    "minimum_lead_hours": 0,
                    "cancellation_cutoff_hours": 0,
                    "reschedule_cutoff_hours": 0,
                    "max_patient_reschedules": 1,
                }
        )
        update_settings = client.put("/api/v1/staff/settings", headers=staff_headers, json=settings)
        assert update_settings.status_code == 200, update_settings.text

        schedule = [
            {
                "weekday": weekday,
                "enabled": True,
                "start_time": time(0, 0).isoformat(),
                "end_time": time(23, 40).isoformat(),
            }
            for weekday in range(7)
        ]
        update_schedule = client.put("/api/v1/staff/schedule", headers=staff_headers, json=schedule)
        assert update_schedule.status_code == 200, update_schedule.text

        token = _patient_token(client, "09120000000")
        patient_headers = {"Authorization": f"Bearer {token}"}
        profile = client.put(
            "/api/v1/me",
            headers=patient_headers,
            json={
                "first_name": "کاربر",
                "last_name": "آزمایشی",
                "birth_date_jalali": "1370/01/01",
                "email": "patient@example.com",
                "gender": "male",
                "national_id": "1000000001",
                "is_foreign_national": False,
            },
        )
        assert profile.status_code == 200, profile.text
        assert profile.json()["profile_completed"] is True

        services = client.get("/api/v1/services").json()
        assert len(services) >= 3
        service = next((item for item in services if item["allows_media_chat"]), services[0])
        assert service["duration_minutes"] >= 5
        service["weekly_schedules"] = schedule
        service["pre_visit_instructions"] = "مدارک و فهرست داروهای مصرفی را همراه داشته باشید."
        service["post_visit_instructions"] = "راهنمای عمومی پس از مراجعه را از مطب پیگیری کنید."
        service["intake_questions"] = [
            {
                "label": "آیا داروی خاصی مصرف می‌کنید؟",
                "field_type": "yes_no",
                "options": [],
                "is_required": True,
                "sort_order": 1,
            },
            {
                "label": "هدف اصلی شما از مراجعه چیست؟",
                "field_type": "single_choice",
                "options": ["مشاوره", "معاینه"],
                "is_required": True,
                "sort_order": 2,
            },
        ]
        service["consents"] = [
            {
                "title": "رضایت ثبت اطلاعات قبل از مراجعه",
                "body": "صحت اطلاعات واردشده را تأیید می‌کنم.",
                "is_required": True,
                "sort_order": 1,
            }
        ]
        service_update = client.put(
            f"/api/v1/staff/services/{service['id']}",
            headers=staff_headers,
            json={key: value for key, value in service.items() if key != "id"},
        )
        assert service_update.status_code == 200, service_update.text
        service = service_update.json()
        other_service = next(item for item in services if item["id"] != service["id"])
        other_dates = client.get(
            "/api/v1/availability/dates",
            params={"service_id": other_service["id"]},
        )
        assert other_dates.status_code == 200
        assert other_dates.json() == []
        dates = client.get(
            "/api/v1/availability/dates",
            params={"service_id": service["id"]},
        ).json()
        assert dates
        selected_date = dates[0]["date"]
        slots = client.get(
            f"/api/v1/availability/{selected_date}",
            params={"service_id": service["id"]},
        ).json()
        assert slots

        booking = client.post(
            "/api/v1/appointments",
            headers=patient_headers,
            json={
                "service_id": service["id"],
                "appointment_date": selected_date,
                "start_time": slots[0]["start_time"],
                "has_previous_visit": False,
                "patient_note": "تست جریان کامل رزرو",
            },
        )
        assert booking.status_code == 201, booking.text
        booking_result = booking.json()
        assert booking_result["requires_payment"] is False
        booked_appointment = booking_result["appointment"]
        assert booked_appointment["tracking_code"].startswith("DZ")
        assert booked_appointment["intake_required"] is True
        assert booked_appointment["intake_completed"] is False
        assert "فهرست دارو" in booked_appointment["pre_visit_instructions"]
        intake_form = booked_appointment["intake_form"]
        required_submission = client.put(
            f"/api/v1/appointments/{booked_appointment['id']}/intake",
            headers=patient_headers,
            json={"answers": {}, "accepted_consents": []},
        )
        assert required_submission.status_code == 422
        intake_submission = client.put(
            f"/api/v1/appointments/{booked_appointment['id']}/intake",
            headers=patient_headers,
            json={
                "answers": {
                    intake_form["questions"][0]["key"]: False,
                    intake_form["questions"][1]["key"]: "مشاوره",
                },
                "accepted_consents": [intake_form["consents"][0]["key"]],
            },
        )
        assert intake_submission.status_code == 200, intake_submission.text
        assert intake_submission.json()["intake_completed"] is True
        booked_appointment = intake_submission.json()

        if service["allows_media_chat"]:
            with client.websocket_connect("/api/v1/realtime") as websocket:
                websocket.send_json(
                    {"token": staff_login.json()["access_token"]}
                )
                assert websocket.receive_json()["type"] == "realtime.ready"
                message = client.post(
                    f"/api/v1/appointments/{booked_appointment['id']}/consultation/messages",
                    headers=patient_headers,
                    json={"body": "تصاویر را به‌زودی ارسال می‌کنم"},
                )
                realtime_event = websocket.receive_json()
                assert realtime_event["type"] == "consultation.message"
                assert realtime_event["appointment_id"] == booked_appointment["id"]
                assert realtime_event["sender_type"] == "patient"
            assert message.status_code == 201, message.text
            image_buffer = BytesIO()
            Image.new("RGB", (80, 80), color=(220, 180, 160)).save(
                image_buffer, format="PNG"
            )
            uploaded = client.post(
                f"/api/v1/appointments/{booked_appointment['id']}/consultation/images",
                headers=patient_headers,
                data={"image_requirement_id": service["image_requirements"][0]["id"]},
                files={"file": ("front.png", image_buffer.getvalue(), "image/png")},
            )
            assert uploaded.status_code == 201, uploaded.text
            assert uploaded.json()["has_image"] is True
            image_response = client.get(
                f"/api/v1/appointments/{booked_appointment['id']}/consultation/images/{uploaded.json()['id']}",
                headers=patient_headers,
            )
            assert image_response.status_code == 200
            assert image_response.headers["content-type"].startswith("image/webp")
            duplicate_image = client.post(
                f"/api/v1/appointments/{booked_appointment['id']}/consultation/images",
                headers=patient_headers,
                data={"image_requirement_id": service["image_requirements"][0]["id"]},
                files={"file": ("again.png", image_buffer.getvalue(), "image/png")},
            )
            assert duplicate_image.status_code == 409
            invalid_file = client.post(
                f"/api/v1/appointments/{booked_appointment['id']}/consultation/images",
                headers=patient_headers,
                data={"image_requirement_id": service["image_requirements"][1]["id"]},
                files={"file": ("notes.txt", b"not-an-image", "text/plain")},
            )
            assert invalid_file.status_code == 415

            staff_threads = client.get(
                "/api/v1/staff/consultations", headers=staff_headers
            )
            assert staff_threads.status_code == 200, staff_threads.text
            assert staff_threads.json()[0]["appointment_id"] == booked_appointment["id"]
            staff_reply = client.post(
                f"/api/v1/staff/appointments/{booked_appointment['id']}/consultation/messages",
                headers=staff_headers,
                json={"body": "تصاویر دریافت شد و بررسی می‌شود"},
            )
            assert staff_reply.status_code == 201, staff_reply.text

        staff_page = client.get(
            "/api/v1/staff/appointments",
            headers=staff_headers,
            params={"search": "09120000000"},
        )
        assert staff_page.status_code == 200, staff_page.text
        assert staff_page.json()["total"] == 1
        assert staff_page.json()["items"][0]["patient_phone"] == "+989120000000"
        assert staff_page.json()["items"][0]["intake_completed"] is True
        assert staff_page.json()["items"][0]["intake_submission"]["answers"]

        patient_list = client.get(
            "/api/v1/staff/patients",
            headers=staff_headers,
            params={"search": "09120000000"},
        )
        assert patient_list.status_code == 200, patient_list.text
        assert patient_list.json()["total"] == 1
        patient_id = patient_list.json()["items"][0]["id"]
        patient_record = client.get(
            f"/api/v1/staff/patients/{patient_id}",
            headers=staff_headers,
        )
        assert patient_record.status_code == 200, patient_record.text
        assert patient_record.json()["appointment_count"] == 1
        assert patient_record.json()["appointments"][0]["intake_completed"] is True
        updated_record = client.patch(
            f"/api/v1/staff/patients/{patient_id}",
            headers=staff_headers,
            json={
                "internal_note": "تماس برای پیگیری نتیجه معاینه",
                "tags": ["نیازمند تماس", "مشاوره بینی"],
                "needs_follow_up": True,
            },
        )
        assert updated_record.status_code == 200, updated_record.text
        assert updated_record.json()["needs_follow_up"] is True
        assert updated_record.json()["tags"] == ["نیازمند تماس", "مشاوره بینی"]
        follow_up_list = client.get(
            "/api/v1/staff/patients",
            headers=staff_headers,
            params={"needs_follow_up": True, "tag": "نیازمند تماس"},
        )
        assert follow_up_list.status_code == 200, follow_up_list.text
        assert follow_up_list.json()["total"] == 1
        patient_view = client.get("/api/v1/me", headers=patient_headers)
        assert patient_view.status_code == 200
        assert "internal_note" not in patient_view.json()

        campaign_filters = {
            "service_ids": [service["id"]],
            "gender": "male",
            "min_age": 30,
            "max_age": 80,
        }
        campaign_preview = client.post(
            "/api/v1/staff/sms/campaigns/preview",
            headers=staff_headers,
            json={"filters": campaign_filters},
        )
        assert campaign_preview.status_code == 200, campaign_preview.text
        assert campaign_preview.json()["recipient_count"] == 1
        campaign = client.post(
            "/api/v1/staff/sms/campaigns",
            headers=staff_headers,
            json={
                "title": "پیگیری بیماران خدمت آزمایشی",
                "message_text": "{patient_name} عزیز، پیگیری {service_title}",
                "provider_pattern_code": "campaign-pattern",
                "filters": campaign_filters,
                "expected_recipient_count": 1,
            },
        )
        assert campaign.status_code == 201, campaign.text
        assert campaign.json()["recipient_count"] == 1
        outbox = client.get("/api/v1/staff/sms/outbox", headers=staff_headers)
        assert outbox.status_code == 200, outbox.text
        campaign_items = [item for item in outbox.json() if item["campaign_id"] == campaign.json()["id"]]
        assert len(campaign_items) == 1
        assert "کاربر آزمایشی" in campaign_items[0]["rendered_body"]
        stale_confirmation = client.post(
            "/api/v1/staff/sms/campaigns",
            headers=staff_headers,
            json={
                "title": "تأیید تعداد قدیمی",
                "message_text": "پیام آزمایشی",
                "provider_pattern_code": "",
                "filters": campaign_filters,
                "expected_recipient_count": 2,
            },
        )
        assert stale_confirmation.status_code == 409
        malformed_template = client.post(
            "/api/v1/staff/sms/campaigns",
            headers=staff_headers,
            json={
                "title": "قالب نامعتبر",
                "message_text": "سلام {patient_name",
                "provider_pattern_code": "",
                "filters": campaign_filters,
                "expected_recipient_count": 1,
            },
        )
        assert malformed_template.status_code == 422

        export = client.get("/api/v1/staff/appointments/export", headers=staff_headers)
        assert export.status_code == 200, export.text
        assert export.content.startswith(b"PK")

        reschedule_dates = client.get(
            f"/api/v1/appointments/{booked_appointment['id']}/reschedule/dates",
            headers=patient_headers,
        )
        assert reschedule_dates.status_code == 200, reschedule_dates.text
        target_date = None
        target_time = None
        for available_date in reschedule_dates.json():
            reschedule_slots = client.get(
                f"/api/v1/appointments/{booked_appointment['id']}/reschedule/slots",
                headers=patient_headers,
                params={"day": available_date["date"]},
            )
            assert reschedule_slots.status_code == 200, reschedule_slots.text
            for available_slot in reschedule_slots.json():
                if (
                    available_date["date"] != booked_appointment["appointment_date"]
                    or available_slot["start_time"] != booked_appointment["start_time"]
                ):
                    target_date = available_date["date"]
                    target_time = available_slot["start_time"]
                    break
            if target_date:
                break
        assert target_date and target_time
        rescheduled = client.patch(
            f"/api/v1/appointments/{booked_appointment['id']}/reschedule",
            headers=patient_headers,
            json={"appointment_date": target_date, "start_time": target_time},
        )
        assert rescheduled.status_code == 200, rescheduled.text
        assert rescheduled.json()["appointment_date"] == target_date
        assert rescheduled.json()["patient_reschedule_count"] == 1
        assert rescheduled.json()["status"] == "pending"
        assert rescheduled.json()["can_patient_reschedule"] is False
        exhausted_policy = client.get(
            f"/api/v1/appointments/{booked_appointment['id']}/reschedule/dates",
            headers=patient_headers,
        )
        assert exhausted_policy.status_code == 409
        calendar = client.get(
            f"/api/v1/appointments/{booked_appointment['id']}/calendar",
            headers=patient_headers,
        )
        assert calendar.status_code == 200, calendar.text
        assert calendar.headers["content-type"].startswith("text/calendar")
        assert b"BEGIN:VCALENDAR" in calendar.content
        assert b"BEGIN:VALARM" in calendar.content

        appointments = client.get("/api/v1/appointments", headers=patient_headers)
        assert appointments.status_code == 200
        assert len(appointments.json()) == 1

        cancel = client.post(
            f"/api/v1/appointments/{booked_appointment['id']}/cancel",
            headers=patient_headers,
        )
        assert cancel.status_code == 200, cancel.text
        assert cancel.json()["status"] == "cancelled"
        cannot_reconfirm = client.patch(
            f"/api/v1/staff/appointments/{booked_appointment['id']}",
            headers=staff_headers,
            json={"status": "confirmed", "staff_note": None},
        )
        assert cannot_reconfirm.status_code == 409


def test_urgent_booking_requires_payment_before_appointment(monkeypatch) -> None:
    authority = "A" + "1" * 35

    monkeypatch.setattr(
        "app.routers.patient.request_payment",
        lambda **_kwargs: PaymentRequestResult(
            authority=authority,
            payment_url=f"https://sandbox.zarinpal.com/pg/StartPay/{authority}",
            raw_response='{"data":{"code":100}}',
        ),
    )
    monkeypatch.setattr(
        "app.routers.patient.verify_payment",
        lambda **_kwargs: PaymentVerifyResult(
            code=100,
            ref_id="987654",
            raw_response='{"data":{"code":100,"ref_id":987654}}',
        ),
    )

    with TestClient(app) as client:
        captcha = client.get("/api/v1/staff/auth/captcha").json()
        staff_login = client.post(
            "/api/v1/staff/auth/login",
            json={
                "username": "admin",
                "password": "TestAdminPassword123!",
                "captcha_id": captcha["captcha_id"],
                "captcha_answer": captcha["debug_answer"],
            },
        )
        staff_headers = {"Authorization": f"Bearer {staff_login.json()['access_token']}"}
        service_response = client.post(
            "/api/v1/staff/services",
            headers=staff_headers,
            json={
                "title": "ویزیت فوری آزمایشی",
                "description": "تست پرداخت نوبت فوری",
                "duration_minutes": 20,
                "icon_key": "medical",
                "allows_media_chat": True,
                "price_toman": 0,
                "payment_mode": "none",
                "deposit_toman": 0,
                "urgent_enabled": True,
                "urgent_extra_toman": 50_000,
                "image_requirements": [
                    {"title": "نمای روبه‌رو", "is_required": True, "sort_order": 1}
                ],
                "urgent_schedules": [
                    {
                        "weekday": weekday,
                        "enabled": True,
                        "start_time": "00:00:00",
                        "end_time": "23:40:00",
                    }
                    for weekday in range(7)
                ],
                "is_active": True,
                "sort_order": 99,
            },
        )
        assert service_response.status_code == 201, service_response.text
        service = service_response.json()

        repeated_update = client.put(
            f"/api/v1/staff/services/{service['id']}",
            headers=staff_headers,
            json={
                "title": service["title"],
                "description": service["description"],
                "duration_minutes": service["duration_minutes"],
                "icon_key": service["icon_key"],
                "allows_media_chat": service["allows_media_chat"],
                "price_toman": service["price_toman"],
                "payment_mode": service["payment_mode"],
                "deposit_toman": service["deposit_toman"],
                "urgent_enabled": service["urgent_enabled"],
                "urgent_extra_toman": service["urgent_extra_toman"],
                "image_requirements": service["image_requirements"],
                "weekly_schedules": service["weekly_schedules"],
                "urgent_schedules": service["urgent_schedules"],
                "is_active": service["is_active"],
                "sort_order": service["sort_order"],
            },
        )
        assert repeated_update.status_code == 200, repeated_update.text
        assert repeated_update.json()["image_requirements"][0]["id"] == service["image_requirements"][0]["id"]

        token = _patient_token(client, "09121111111")
        headers = {"Authorization": f"Bearer {token}"}
        profile = client.put(
            "/api/v1/me",
            headers=headers,
            json={
                "first_name": "بیمار",
                "last_name": "فوری",
                "birth_date_jalali": "1372/02/02",
                "email": None,
                "gender": "female",
                "national_id": "2000000002",
                "is_foreign_national": False,
            },
        )
        assert profile.status_code == 200, profile.text
        dates = client.get(
            "/api/v1/availability/dates",
            params={"service_id": service["id"], "urgent": True},
        ).json()
        assert dates
        slots = client.get(
            f"/api/v1/availability/{dates[0]['date']}",
            params={"service_id": service["id"], "urgent": True},
        ).json()
        assert slots
        started = client.post(
            "/api/v1/appointments",
            headers=headers,
            json={
                "service_id": service["id"],
                "appointment_date": dates[0]["date"],
                "start_time": slots[0]["start_time"],
                "has_previous_visit": False,
                "is_urgent": True,
            },
        )
        assert started.status_code == 201, started.text
        assert started.json()["requires_payment"] is True
        assert started.json()["amount_toman"] == 50_000
        before_payment = client.get("/api/v1/appointments", headers=headers).json()
        assert not any(item["service_id"] == service["id"] for item in before_payment)

        callback = client.get(
            "/api/v1/payments/zarinpal/callback",
            params={"Authority": authority, "Status": "OK"},
            follow_redirects=False,
        )
        assert callback.status_code == 303
        assert "payment=success" in callback.headers["location"]
        after_payment = client.get("/api/v1/appointments", headers=headers).json()
        urgent = next(item for item in after_payment if item["service_id"] == service["id"])
        assert urgent["is_urgent"] is True
        assert urgent["amount_paid_toman"] == 50_000
        assert urgent["payment_status"] == "paid"
        payments = client.get(
            "/api/v1/staff/finance/payments", headers=staff_headers
        )
        assert payments.status_code == 200, payments.text
        payment = next(
            item for item in payments.json() if item["appointment_id"] == urgent["id"]
        )
        refunded = client.patch(
            f"/api/v1/staff/finance/payments/{payment['id']}/refund",
            headers=staff_headers,
            json={
                "status": "refunded",
                "amount_toman": 50_000,
                "reference": "REFUND-TEST-1",
                "note": "بازپرداخت آزمایشی",
            },
        )
        assert refunded.status_code == 200, refunded.text
        assert refunded.json()["refund_status"] == "refunded"
        refreshed = client.get("/api/v1/appointments", headers=headers).json()
        assert next(item for item in refreshed if item["id"] == urgent["id"])[
            "payment_status"
        ] == "refunded"


def test_operational_capacity_waitlist_reschedule_and_audit() -> None:
    with TestClient(app) as client:
        captcha = client.get("/api/v1/staff/auth/captcha").json()
        login = client.post(
            "/api/v1/staff/auth/login",
            json={
                "username": "admin",
                "password": "TestAdminPassword123!",
                "captcha_id": captcha["captcha_id"],
                "captcha_answer": captcha["debug_answer"],
            },
        )
        staff_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        schedule = [
            {
                "weekday": weekday,
                "enabled": True,
                "start_time": "00:00:00",
                "end_time": "23:40:00",
            }
            for weekday in range(7)
        ]
        created = client.post(
            "/api/v1/staff/services",
            headers=staff_headers,
            json={
                "title": "خدمت ظرفیت آزمایشی",
                "description": "کنترل ظرفیت و فاصله",
                "duration_minutes": 20,
                "icon_key": "medical",
                "allows_media_chat": False,
                "price_toman": 0,
                "payment_mode": "none",
                "deposit_toman": 0,
                "urgent_enabled": False,
                "urgent_extra_toman": 0,
                "buffer_before_minutes": 5,
                "buffer_after_minutes": 5,
                "concurrent_capacity": 2,
                "image_requirements": [],
                "weekly_schedules": schedule,
                "urgent_schedules": [],
                "is_active": True,
                "sort_order": 120,
            },
        )
        assert created.status_code == 201, created.text
        service = created.json()
        assert service["concurrent_capacity"] == 2

        dates = client.get(
            "/api/v1/availability/dates", params={"service_id": service["id"]}
        ).json()
        selected_date = dates[0]["date"]
        slots = client.get(
            f"/api/v1/availability/{selected_date}",
            params={"service_id": service["id"]},
        ).json()
        selected_slot = slots[0]["start_time"]

        appointments: list[tuple[str, dict]] = []
        for index in range(2):
            token = _patient_token(client, f"0912333333{index}")
            headers = {"Authorization": f"Bearer {token}"}
            profile = client.put(
                "/api/v1/me",
                headers=headers,
                json={
                    "first_name": "بیمار",
                    "last_name": f"ظرفیت {index}",
                    "birth_date_jalali": "1370/01/01",
                    "email": None,
                    "gender": "male" if index == 0 else "female",
                    "national_id": None,
                    "is_foreign_national": True,
                    "foreign_identifier": f"CAPACITY-TEST-{index}",
                },
            )
            assert profile.status_code == 200, profile.text
            booking = client.post(
                "/api/v1/appointments",
                headers=headers,
                json={
                    "service_id": service["id"],
                    "appointment_date": selected_date,
                    "start_time": selected_slot,
                    "has_previous_visit": False,
                    "is_urgent": False,
                },
            )
            assert booking.status_code == 201, booking.text
            appointments.append((token, booking.json()["appointment"]))

        after_capacity = client.get(
            f"/api/v1/availability/{selected_date}",
            params={"service_id": service["id"]},
        ).json()
        assert selected_slot not in {slot["start_time"] for slot in after_capacity}

        waiter_token = _patient_token(client, "09124444444")
        waiter_headers = {"Authorization": f"Bearer {waiter_token}"}
        waiter_profile = client.put(
            "/api/v1/me",
            headers=waiter_headers,
            json={
                "first_name": "بیمار",
                "last_name": "منتظر",
                "birth_date_jalali": "1375/05/05",
                "email": None,
                "gender": "female",
                "national_id": None,
                "is_foreign_national": True,
                "foreign_identifier": "WAITLIST-TEST-1",
            },
        )
        assert waiter_profile.status_code == 200, waiter_profile.text
        joined = client.post(
            "/api/v1/waitlist",
            headers=waiter_headers,
            json={
                "service_id": service["id"],
                "desired_date": selected_date,
                "is_urgent": False,
            },
        )
        assert joined.status_code == 201, joined.text

        first_token, first_appointment = appointments[0]
        cancelled = client.post(
            f"/api/v1/appointments/{first_appointment['id']}/cancel",
            headers={"Authorization": f"Bearer {first_token}"},
        )
        assert cancelled.status_code == 200, cancelled.text
        waiter_entries = client.get("/api/v1/waitlist", headers=waiter_headers).json()
        assert waiter_entries[0]["status"] == "notified"
        assert waiter_entries[0]["offered_start_time"].startswith(selected_slot[:5])

        _second_token, second_appointment = appointments[1]
        available_again = client.get(
            f"/api/v1/availability/{selected_date}",
            params={"service_id": service["id"]},
        ).json()
        new_slot = next(slot for slot in available_again if slot["start_time"] != selected_slot)
        moved = client.patch(
            f"/api/v1/staff/appointments/{second_appointment['id']}/reschedule",
            headers=staff_headers,
            json={"appointment_date": selected_date, "start_time": new_slot["start_time"]},
        )
        assert moved.status_code == 200, moved.text
        assert moved.json()["rescheduled_at"]

        exception = client.post(
            f"/api/v1/staff/services/{service['id']}/exceptions",
            headers=staff_headers,
            json={"exception_date": selected_date, "is_closed": True, "note": "تعطیلی تست"},
        )
        assert exception.status_code == 201, exception.text
        closed_slots = client.get(
            f"/api/v1/availability/{selected_date}",
            params={"service_id": service["id"]},
        )
        assert closed_slots.status_code == 200
        assert closed_slots.json() == []

        audit = client.get("/api/v1/staff/audit-logs", headers=staff_headers)
        assert audit.status_code == 200, audit.text
        actions = {item["action"] for item in audit.json()}
        assert "appointment.rescheduled" in actions
        assert "service.exception.created" in actions

        finance = client.get("/api/v1/staff/finance/summary", headers=staff_headers)
        assert finance.status_code == 200, finance.text
        assert "collected_toman" in finance.json()


def test_appointment_reminders_remain_while_attendance_workflows_are_removed() -> None:
    with TestClient(app) as client:
        patient_token = _patient_token(client, "09125555555")
        patient_headers = {"Authorization": f"Bearer {patient_token}"}

        captcha = client.get("/api/v1/staff/auth/captcha")
        assert captcha.status_code == 200, captcha.text
        staff_login = client.post(
            "/api/v1/staff/auth/login",
            json={
                "username": "admin",
                "password": "TestAdminPassword123!",
                "captcha_id": captcha.json()["captcha_id"],
                "captcha_answer": captcha.json()["debug_answer"],
            },
        )
        assert staff_login.status_code == 200, staff_login.text
        staff_headers = {
            "Authorization": f"Bearer {staff_login.json()['access_token']}"
        }

        settings_response = client.get(
            "/api/v1/staff/settings", headers=staff_headers
        )
        assert settings_response.status_code == 200, settings_response.text
        settings_payload = settings_response.json()
        assert {
            "reminder_enabled",
            "first_reminder_hours",
            "final_reminder_hours",
        }.issubset(settings_payload)
        assert {
            "check_in_open_minutes",
            "no_show_grace_minutes",
            "auto_no_show_enabled",
        }.isdisjoint(settings_payload)

        settings_payload.update(
            {
                "reminder_enabled": True,
                "first_reminder_hours": 24,
                "final_reminder_hours": 2,
            }
        )
        update_settings = client.put(
            "/api/v1/staff/settings",
            headers=staff_headers,
            json=settings_payload,
        )
        assert update_settings.status_code == 200, update_settings.text

        rules = client.get("/api/v1/staff/sms/rules", headers=staff_headers)
        assert rules.status_code == 200, rules.text
        reminder_rule = next(
            (
                item
                for item in rules.json()
                if item["event_key"] == "appointment_reminder"
            ),
            None,
        )
        assert reminder_rule is not None

        local_now = datetime.now(ZoneInfo("Asia/Tehran")).replace(
            second=0, microsecond=0
        )
        reminder_at = local_now + timedelta(hours=3)

        with SessionLocal() as db:
            settings = db.get(ClinicSetting, 1)
            patient = db.scalar(select(Patient).order_by(Patient.id.desc()))
            service = db.scalar(select(Service).where(Service.is_active.is_(True)))
            rule = db.scalar(
                select(SmsAutomationRule).where(
                    SmsAutomationRule.event_key == "appointment_reminder"
                )
            )
            assert settings and patient and service and rule
            settings.reminder_enabled = True
            settings.first_reminder_hours = 24
            settings.final_reminder_hours = 2
            rule.enabled = True
            appointment = Appointment(
                tracking_code="OPSREMIND1",
                patient_id=patient.id,
                service_id=service.id,
                appointment_date=reminder_at.date(),
                start_time=reminder_at.time(),
                end_time=(reminder_at + timedelta(minutes=20)).time(),
                status="confirmed",
            )
            db.add(appointment)
            db.commit()
            appointment_id = appointment.id

        with SessionLocal() as db:
            assert queue_scheduled_reminders(db) >= 1
            reminder = db.scalar(
                select(AppointmentReminder).where(
                    AppointmentReminder.appointment_id == appointment_id,
                    AppointmentReminder.reminder_key == "first",
                )
            )
            assert reminder is not None
            assert queue_scheduled_reminders(db) == 0
            reminder_ids = list(
                db.scalars(
                    select(AppointmentReminder.id).where(
                        AppointmentReminder.appointment_id == appointment_id
                    )
                ).all()
            )
            assert len(reminder_ids) == 1

        operations = client.post(
            "/api/v1/staff/operations/run",
            headers=staff_headers,
        )
        assert operations.status_code == 200, operations.text
        assert set(operations.json()) == {"queued_reminders", "sms_sent"}
        assert operations.json()["sms_sent"] >= 1

        check_in = client.post(
            f"/api/v1/appointments/{appointment_id}/check-in",
            headers=patient_headers,
        )
        assert check_in.status_code == 404

        for removed_status in ("checked_in", "no_show"):
            response = client.patch(
                f"/api/v1/staff/appointments/{appointment_id}",
                headers=staff_headers,
                json={"status": removed_status, "staff_note": None},
            )
            assert response.status_code == 422, response.text

        with SessionLocal() as db:
            appointment = db.get(Appointment, appointment_id)
            assert appointment and appointment.status == "confirmed"


def test_clinic_public_information_is_managed_centrally() -> None:
    with TestClient(app) as client:
        captcha = client.get("/api/v1/staff/auth/captcha")
        assert captcha.status_code == 200, captcha.text
        staff_login = client.post(
            "/api/v1/staff/auth/login",
            json={
                "username": "admin",
                "password": "TestAdminPassword123!",
                "captcha_id": captcha.json()["captcha_id"],
                "captcha_answer": captcha.json()["debug_answer"],
            },
        )
        assert staff_login.status_code == 200, staff_login.text
        staff_headers = {
            "Authorization": f"Bearer {staff_login.json()['access_token']}"
        }

        original_response = client.get(
            "/api/v1/staff/settings",
            headers=staff_headers,
        )
        assert original_response.status_code == 200, original_response.text
        original = original_response.json()
        updated = {
            **original,
            "doctor_name": "دکتر نمونه آزمایشی",
            "specialty": "متخصص آزمایشی",
            "medical_council_number": "12345",
            "office_phone": "08632223344",
            "consultation_phone": "09125556677",
            "email": "clinic-test@example.com",
            "address_region": "استان مرکزی",
            "address_city": "اراک",
            "address": "اراک، خیابان آزمایشی، ساختمان نمونه، طبقه دوم",
            "working_hours": "شنبه تا چهارشنبه، ساعت ۱۶ تا ۲۰",
            "site_url": "https://clinic-test.example.com",
            "map_embed_url": "https://neshan.org/maps/iframe/test",
            "map_page_url": "https://neshan.org/maps/test",
            "map_latitude": 34.1,
            "map_longitude": 49.7,
            "instagram_url": "https://instagram.com/clinic.test",
            "eitaa_url": "https://eitaa.com/clinic_test",
        }

        try:
            saved = client.put(
                "/api/v1/staff/settings",
                headers=staff_headers,
                json=updated,
            )
            assert saved.status_code == 200, saved.text
            assert saved.json()["office_phone"] == updated["office_phone"]
            assert saved.json()["address"] == updated["address"]

            public = client.get("/api/v1/clinic")
            assert public.status_code == 200, public.text
            public_payload = public.json()
            for field in (
                "doctor_name",
                "specialty",
                "medical_council_number",
                "office_phone",
                "consultation_phone",
                "email",
                "address_region",
                "address_city",
                "address",
                "working_hours",
                "site_url",
                "map_embed_url",
                "map_page_url",
                "map_latitude",
                "map_longitude",
                "instagram_url",
                "eitaa_url",
            ):
                assert public_payload[field] == updated[field]

            audit = client.get("/api/v1/staff/audit-logs", headers=staff_headers)
            assert audit.status_code == 200, audit.text
            settings_events = [
                item
                for item in audit.json()
                if item["action"] == "clinic.settings_updated"
            ]
            assert settings_events
            assert "office_phone" in settings_events[0]["details"]["changed_fields"]
        finally:
            restored = client.put(
                "/api/v1/staff/settings",
                headers=staff_headers,
                json=original,
            )
            assert restored.status_code == 200, restored.text
