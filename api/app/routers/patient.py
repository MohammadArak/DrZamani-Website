from __future__ import annotations

import json
import secrets
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..booking_policy import admission_lock, require_booking, public_clinic
from ..database import get_db
from ..activity import record_audit
from ..intake import (
    appointment_intake_form,
    appointment_intake_submission,
    service_intake_snapshot,
    validate_intake_submission,
)
from ..consultations import (
    attachment_path,
    consultation_message_read,
    optimize_consultation_image,
)
from ..calendar_export import appointment_ics
from ..runtime_settings import get_settings
from ..dependencies import get_current_patient
from ..models import (
    Appointment,
    BookingHold,
    ClinicSetting,
    ConsultationMessage,
    Patient,
    Payment,
    Service,
    ServiceImageRequirement,
    WaitlistEntry,
)
from ..payments import PaymentGatewayError, request_payment, verify_payment
from ..realtime import publish_consultation_event
from ..schemas import (
    ApiMessage,
    AppointmentCreate,
    AppointmentIntakeSubmission,
    AppointmentRead,
    AppointmentReschedule,
    BookingStartResponse,
    AvailableDate,
    AvailableSlot,
    ClinicSettingRead,
    ConsultationMessageCreate,
    ConsultationMessageRead,
    PatientProfile,
    PatientProfileUpdate,
    ServiceRead,
    WaitlistCreate,
    WaitlistEntryRead,
)
from ..scheduling import ensure_bookable_date, list_available_slots, slot_key_for_appointment
from ..security import utcnow
from ..sms_automation import expire_unpaid_holds, queue_sms_event, cancel_abandoned_notice
from ..waitlist import expire_waitlist_offers, offer_cancelled_slot


router = APIRouter(tags=["patient portal"])


def _settings(db: Session) -> ClinicSetting:
    settings = db.get(ClinicSetting, 1)
    if not settings:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="تنظیمات مطب تکمیل نشده است")
    return settings


def _patient_reschedule_reason(
    item: Appointment,
    settings: ClinicSetting,
) -> str | None:
    if not get_settings().booking_enabled:
        return get_settings().booking_disabled_message
    if item.status not in {"pending", "confirmed"}:
        return "این نوبت دیگر قابل جابه‌جایی نیست"
    if settings.max_patient_reschedules <= 0:
        return "جابه‌جایی آنلاین نوبت غیرفعال است"
    if item.patient_reschedule_count >= settings.max_patient_reschedules:
        return "سقف تعداد جابه‌جایی آنلاین این نوبت استفاده شده است"
    appointment_at = datetime.combine(
        item.appointment_date,
        item.start_time,
        tzinfo=ZoneInfo(settings.timezone_name),
    )
    if appointment_at - datetime.now(ZoneInfo(settings.timezone_name)) < timedelta(
        hours=settings.reschedule_cutoff_hours
    ):
        return "مهلت جابه‌جایی آنلاین این نوبت گذشته است"
    return None


def _appointment_read(
    item: Appointment,
    include_patient: bool = False,
    settings: ClinicSetting | None = None,
) -> AppointmentRead:
    patient_name = None
    patient_phone = None
    if include_patient:
        patient_name = " ".join(filter(None, [item.patient.first_name, item.patient.last_name])) or "تکمیل‌نشده"
        patient_phone = item.patient.phone
    intake_form = appointment_intake_form(item)
    intake_submission = appointment_intake_submission(item)
    return AppointmentRead(
        id=item.id,
        tracking_code=item.tracking_code,
        service_id=item.service_id,
        service_title=item.service.title,
        service_duration_minutes=item.service.duration_minutes,
        service_icon_key=item.service.icon_key,
        consultation_enabled=item.service.allows_media_chat,
        image_requirements=list(item.service.image_requirements),
        appointment_date=item.appointment_date,
        start_time=item.start_time,
        end_time=item.end_time,
        has_previous_visit=item.has_previous_visit,
        is_urgent=item.is_urgent,
        price_toman=item.price_toman,
        amount_paid_toman=item.amount_paid_toman,
        payment_status=item.payment_status,
        status=item.status,
        patient_note=item.patient_note,
        staff_note=item.staff_note,
        patient_name=patient_name,
        patient_phone=patient_phone,
        created_at=item.created_at,
        rescheduled_at=item.rescheduled_at,
        patient_reschedule_count=item.patient_reschedule_count,
        can_patient_reschedule=(
            _patient_reschedule_reason(item, settings) is None
            if settings
            else False
        ),
        patient_reschedule_reason=(
            _patient_reschedule_reason(item, settings) if settings else None
        ),
        intake_required=bool(intake_form["questions"] or intake_form["consents"]),
        intake_completed=item.intake_submitted_at is not None,
        intake_form=intake_form,
        intake_submission=intake_submission,
        intake_submitted_at=item.intake_submitted_at,
        pre_visit_instructions=item.service.pre_visit_instructions,
        post_visit_instructions=item.service.post_visit_instructions,
        reminder_count=len(item.reminder_dispatches),
    )


def _patient_consultation_appointment(
    db: Session,
    appointment_id: int,
    patient: Patient,
) -> Appointment:
    item = db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.patient_id == patient.id,
        )
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد")
    if not item.service.allows_media_chat:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="گفت‌وگوی تصویری برای این خدمت فعال نیست",
        )
    return item


@router.get("/clinic", response_model=ClinicSettingRead)
def clinic_settings(db: Session = Depends(get_db)) -> ClinicSetting:
    return public_clinic(_settings(db), db)


@router.get("/services", response_model=list[ServiceRead])
def services(db: Session = Depends(get_db)) -> list[Service]:
    return list(db.scalars(select(Service).where(Service.is_active.is_(True)).order_by(Service.sort_order, Service.id)))


@router.get("/me", response_model=PatientProfile)
def me(patient: Patient = Depends(get_current_patient)) -> Patient:
    return patient


@router.put("/me", response_model=PatientProfile)
def update_me(
    payload: PatientProfileUpdate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> Patient:
    for field, value in payload.model_dump().items():
        setattr(patient, field, value)
    patient.profile_completed = True
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="کد شناسایی قبلاً ثبت شده است") from exc
    db.refresh(patient)
    return patient


@router.get("/availability/dates", response_model=list[AvailableDate])
def available_dates(
    service_id: int | None = None,
    urgent: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[AvailableDate]:
    require_booking(db)
    expire_unpaid_holds(db)
    settings = _settings(db)
    service = db.get(Service, service_id) if service_id else None
    if service_id and (not service or not service.is_active):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="خدمت انتخاب‌شده فعال نیست")
    if urgent and not service:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="برای نوبت فوری انتخاب خدمت الزامی است")
    if urgent and service and not service.urgent_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="نوبت فوری برای این خدمت فعال نیست")
    duration = service.duration_minutes if service else settings.slot_duration_minutes
    today = datetime.now(ZoneInfo(settings.timezone_name)).date()
    result: list[AvailableDate] = []
    for offset in range(settings.booking_horizon_days + 1):
        day = today + timedelta(days=offset)
        slots = list_available_slots(db, day, settings, duration, service=service, is_urgent=urgent)
        if slots:
            result.append(AvailableDate(date=day, available_slots=len(slots)))
    return result


@router.get("/availability/{day}", response_model=list[AvailableSlot])
def available_slots(
    day: date,
    service_id: int | None = None,
    urgent: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[AvailableSlot]:
    require_booking(db)
    expire_unpaid_holds(db)
    settings = _settings(db)
    if not ensure_bookable_date(day, settings):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="تاریخ خارج از بازه رزرو است")
    service = db.get(Service, service_id) if service_id else None
    if service_id and (not service or not service.is_active):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="خدمت انتخاب‌شده فعال نیست")
    if urgent and not service:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="برای نوبت فوری انتخاب خدمت الزامی است")
    if urgent and service and not service.urgent_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="نوبت فوری برای این خدمت فعال نیست")
    duration = service.duration_minutes if service else settings.slot_duration_minutes
    return [
        AvailableSlot(start_time=start, end_time=end, is_urgent=urgent)
        for start, end in list_available_slots(
            db, day, settings, duration, service=service, is_urgent=urgent
        )
    ]


@router.get("/appointments", response_model=list[AppointmentRead])
def my_appointments(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> list[AppointmentRead]:
    items = db.scalars(
        select(Appointment)
        .where(Appointment.patient_id == patient.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
    ).all()
    settings = _settings(db)
    return [_appointment_read(item, settings=settings) for item in items]


@router.put(
    "/appointments/{appointment_id}/intake",
    response_model=AppointmentRead,
)
def submit_appointment_intake(
    appointment_id: int,
    payload: AppointmentIntakeSubmission,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> AppointmentRead:
    item = db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.patient_id == patient.id,
        )
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد")
    if item.status not in {"pending", "confirmed"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="فرم نوبت نهایی‌شده قابل ویرایش نیست",
        )
    settings = _settings(db)
    appointment_at = datetime.combine(
        item.appointment_date,
        item.start_time,
        tzinfo=ZoneInfo(settings.timezone_name),
    )
    if appointment_at <= datetime.now(ZoneInfo(settings.timezone_name)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="مهلت تکمیل فرم این نوبت گذشته است",
        )
    form = appointment_intake_form(item)
    if not form["questions"] and not form["consents"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="برای این نوبت فرم قبل از مراجعه تعریف نشده است",
        )
    normalized = validate_intake_submission(form, payload)
    if not item.intake_form_snapshot_json:
        item.intake_form_snapshot_json = json.dumps(form, ensure_ascii=False)
    item.intake_submission_json = json.dumps(normalized, ensure_ascii=False)
    item.intake_submitted_at = utcnow()
    record_audit(
        db,
        action="appointment.intake_submitted",
        entity_type="appointment",
        entity_id=item.id,
        summary=f"ثبت فرم قبل از مراجعه نوبت {item.tracking_code}",
        actor_patient_id=patient.id,
        details={
            "answered_questions": len(normalized["answers"]),
            "accepted_consents": len(normalized["accepted_consents"]),
        },
    )
    db.commit()
    db.refresh(item)
    return _appointment_read(item, settings=settings)


def _patient_reschedule_context(
    db: Session,
    appointment_id: int,
    patient: Patient,
) -> tuple[Appointment, ClinicSetting]:
    item = db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.patient_id == patient.id,
        )
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد")
    settings = _settings(db)
    unavailable_reason = _patient_reschedule_reason(item, settings)
    if unavailable_reason:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=unavailable_reason,
        )
    return item, settings


@router.get(
    "/appointments/{appointment_id}/reschedule/dates",
    response_model=list[AvailableDate],
)
def patient_reschedule_dates(
    appointment_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> list[AvailableDate]:
    item, settings = _patient_reschedule_context(db, appointment_id, patient)
    today = datetime.now(ZoneInfo(settings.timezone_name)).date()
    result: list[AvailableDate] = []
    for offset in range(settings.booking_horizon_days + 1):
        day = today + timedelta(days=offset)
        slots = list_available_slots(
            db,
            day,
            settings,
            item.service.duration_minutes,
            service=item.service,
            is_urgent=item.is_urgent,
            exclude_appointment_id=item.id,
        )
        if slots:
            result.append(AvailableDate(date=day, available_slots=len(slots)))
    return result


@router.get(
    "/appointments/{appointment_id}/reschedule/slots",
    response_model=list[AvailableSlot],
)
def patient_reschedule_slots(
    appointment_id: int,
    day: date,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> list[AvailableSlot]:
    item, settings = _patient_reschedule_context(db, appointment_id, patient)
    if not ensure_bookable_date(day, settings):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="تاریخ خارج از بازه رزرو است",
        )
    return [
        AvailableSlot(start_time=start, end_time=end, is_urgent=item.is_urgent)
        for start, end in list_available_slots(
            db,
            day,
            settings,
            item.service.duration_minutes,
            service=item.service,
            is_urgent=item.is_urgent,
            exclude_appointment_id=item.id,
        )
    ]


@router.patch(
    "/appointments/{appointment_id}/reschedule",
    response_model=AppointmentRead,
)
def patient_reschedule_appointment(
    appointment_id: int,
    payload: AppointmentReschedule,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> AppointmentRead:
    admission_lock(db)
    item, settings = _patient_reschedule_context(db, appointment_id, patient)
    if (
        item.appointment_date == payload.appointment_date
        and item.start_time == payload.start_time
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="زمان جدید با زمان فعلی یکسان است",
        )
    if not ensure_bookable_date(payload.appointment_date, settings):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="تاریخ خارج از بازه رزرو است",
        )
    matching_slot = next(
        (
            (start, end)
            for start, end in list_available_slots(
                db,
                payload.appointment_date,
                settings,
                item.service.duration_minutes,
                service=item.service,
                is_urgent=item.is_urgent,
                exclude_appointment_id=item.id,
            )
            if start == payload.start_time
        ),
        None,
    )
    if not matching_slot:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="زمان جدید دیگر ظرفیت آزاد ندارد",
        )
    previous_date = item.appointment_date
    previous_start = item.start_time
    offered = offer_cancelled_slot(db, item)
    item.slot_key = slot_key_for_appointment(
        db,
        item,
        payload.appointment_date,
        payload.start_time,
    )
    item.appointment_date = payload.appointment_date
    item.start_time, item.end_time = matching_slot
    item.rescheduled_at = utcnow()
    item.rescheduled_by_staff_id = None
    item.patient_reschedule_count += 1
    item.status = "pending"
    queue_sms_event(db, "appointment_rescheduled", patient=patient, appointment=item)
    record_audit(
        db,
        action="appointment.patient_rescheduled",
        entity_type="appointment",
        entity_id=item.id,
        summary=f"جابه‌جایی نوبت {item.tracking_code} توسط بیمار",
        actor_patient_id=patient.id,
        details={
            "from_date": previous_date.isoformat(),
            "from_time": previous_start.strftime("%H:%M"),
            "to_date": item.appointment_date.isoformat(),
            "to_time": item.start_time.strftime("%H:%M"),
            "patient_reschedule_count": item.patient_reschedule_count,
            "waitlist_offer_id": offered.id if offered else None,
        },
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="این زمان هم‌اکنون رزرو شد؛ زمان دیگری انتخاب کنید",
        ) from exc
    db.refresh(item)
    return _appointment_read(item, settings=settings)


@router.get("/appointments/{appointment_id}/calendar")
def patient_appointment_calendar(
    appointment_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> Response:
    item = db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.patient_id == patient.id,
        )
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد")
    if item.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="نوبت لغوشده قابل افزودن به تقویم نیست",
        )
    content = appointment_ics(item, _settings(db))
    return Response(
        content=content,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="appointment-{item.tracking_code}.ics"'
            )
        },
    )


def _waitlist_read(item: WaitlistEntry) -> WaitlistEntryRead:
    return WaitlistEntryRead(
        id=item.id,
        patient_id=item.patient_id,
        patient_name=" ".join(filter(None, [item.patient.first_name, item.patient.last_name])) or "بیمار",
        patient_phone=item.patient.phone,
        service_id=item.service_id,
        service_title=item.service.title,
        desired_date=item.desired_date,
        is_urgent=item.is_urgent,
        status=item.status,
        offered_date=item.offered_date,
        offered_start_time=item.offered_start_time,
        offered_end_time=item.offered_end_time,
        expires_at=item.expires_at,
        created_at=item.created_at,
    )


@router.get("/waitlist", response_model=list[WaitlistEntryRead])
def my_waitlist(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> list[WaitlistEntryRead]:
    if expire_waitlist_offers(db):
        db.commit()
    items = db.scalars(
        select(WaitlistEntry)
        .where(WaitlistEntry.patient_id == patient.id)
        .order_by(WaitlistEntry.created_at.desc())
    ).unique().all()
    return [_waitlist_read(item) for item in items]


@router.post("/waitlist", response_model=WaitlistEntryRead, status_code=status.HTTP_201_CREATED)
def join_waitlist(
    payload: WaitlistCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> WaitlistEntryRead:
    admission_lock(db)
    if not patient.profile_completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ابتدا اطلاعات پروفایل را تکمیل کنید")
    service = db.get(Service, payload.service_id)
    if not service or not service.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="خدمت انتخاب‌شده فعال نیست")
    if payload.is_urgent and not service.urgent_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="نوبت فوری برای این خدمت فعال نیست")
    if payload.desired_date and not ensure_bookable_date(payload.desired_date, _settings(db)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="تاریخ خارج از بازه رزرو است")
    existing = db.scalar(
        select(WaitlistEntry).where(
            WaitlistEntry.patient_id == patient.id,
            WaitlistEntry.service_id == service.id,
            WaitlistEntry.desired_date == payload.desired_date,
            WaitlistEntry.is_urgent == payload.is_urgent,
            WaitlistEntry.status.in_(["waiting", "notified"]),
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="قبلاً در لیست انتظار این خدمت هستید")
    item = WaitlistEntry(
        patient_id=patient.id,
        service_id=service.id,
        desired_date=payload.desired_date,
        is_urgent=payload.is_urgent,
    )
    db.add(item)
    db.flush()
    record_audit(
        db,
        action="waitlist.joined",
        entity_type="waitlist",
        entity_id=item.id,
        summary=f"ثبت در لیست انتظار {service.title}",
        actor_patient_id=patient.id,
    )
    db.commit()
    db.refresh(item)
    return _waitlist_read(item)


@router.delete("/waitlist/{entry_id}", response_model=ApiMessage)
def leave_waitlist(
    entry_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> ApiMessage:
    item = db.scalar(
        select(WaitlistEntry).where(
            WaitlistEntry.id == entry_id,
            WaitlistEntry.patient_id == patient.id,
        )
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="درخواست انتظار پیدا نشد")
    item.status = "cancelled"
    record_audit(
        db,
        action="waitlist.cancelled",
        entity_type="waitlist",
        entity_id=item.id,
        summary="خروج بیمار از لیست انتظار",
        actor_patient_id=patient.id,
    )
    db.commit()
    return ApiMessage(message="درخواست لیست انتظار لغو شد")


def _price_and_payable(service: Service, is_urgent: bool) -> tuple[int, int, str]:
    urgent_extra = service.urgent_extra_toman if is_urgent else 0
    total = service.price_toman + urgent_extra
    if service.payment_mode == "full":
        return total, total, "full"
    if service.payment_mode == "deposit":
        return total, min(total, service.deposit_toman + urgent_extra), "deposit"
    if urgent_extra:
        return total, urgent_extra, "urgent"
    return total, 0, "none"


def _new_appointment(
    *,
    db: Session,
    hold: BookingHold,
    payment: Payment | None = None,
) -> Appointment:
    service = hold.service or db.get(Service, hold.service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="خدمت نوبت دیگر در دسترس نیست",
        )
    prefix = (
        f"{hold.appointment_date.strftime('%Y%m%d')}-"
        f"{hold.start_time.strftime('%H%M')}-{hold.service_id}-"
    )
    used = set(
        db.scalars(
            select(Appointment.slot_key).where(Appointment.slot_key.like(f"{prefix}%"))
        ).all()
    )
    lane = next((number for number in range(1, 100) if f"{prefix}{number}" not in used), 99)
    return Appointment(
        tracking_code=f"DZ{secrets.randbelow(90_000_000) + 10_000_000}",
        patient_id=hold.patient_id,
        service_id=hold.service_id,
        appointment_date=hold.appointment_date,
        start_time=hold.start_time,
        end_time=hold.end_time,
        slot_key=f"{prefix}{lane}",
        has_previous_visit=hold.has_previous_visit,
        is_urgent=hold.is_urgent,
        price_toman=hold.price_toman,
        amount_paid_toman=payment.amount_toman if payment else 0,
        payment_status="paid" if payment else "not_required",
        payment_id=payment.id if payment else None,
        patient_note=hold.patient_note,
        status="pending",
        intake_form_snapshot_json=json.dumps(
            service_intake_snapshot(service),
            ensure_ascii=False,
        ),
    )


@router.post("/appointments", response_model=BookingStartResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    request: Request,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> BookingStartResponse:
    require_booking(db)
    if not patient.profile_completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ابتدا اطلاعات پروفایل را تکمیل کنید")
    settings = _settings(db)
    if not ensure_bookable_date(payload.appointment_date, settings):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="تاریخ خارج از بازه رزرو است")
    service = db.get(Service, payload.service_id)
    if not service or not service.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="خدمت انتخاب‌شده فعال نیست")
    if payload.is_urgent and not service.urgent_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="نوبت فوری برای این خدمت فعال نیست")
    admission_lock(db)
    settings = _settings(db)
    service = db.get(Service, payload.service_id)
    if not ensure_bookable_date(payload.appointment_date, settings) or not service or not service.is_active:
        raise HTTPException(409, "زمان یا خدمت انتخاب‌شده دیگر در دسترس نیست")
    if payload.is_urgent and not service.urgent_enabled:
        raise HTTPException(409, "نوبت فوری برای این خدمت فعال نیست")
    matching_slot = next(
        (
            (start, end)
            for start, end in list_available_slots(
                db,
                payload.appointment_date,
                settings,
                service.duration_minutes,
                service=service,
                is_urgent=payload.is_urgent,
            )
            if start == payload.start_time
        ),
        None,
    )
    if not matching_slot:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="این ساعت دیگر در دسترس نیست")
    start_time, end_time = matching_slot
    price_toman, amount_toman, payment_mode = _price_and_payable(service, payload.is_urgent)
    hold = BookingHold(
        id=secrets.token_urlsafe(32),
        patient_id=patient.id,
        service_id=service.id,
        appointment_date=payload.appointment_date,
        start_time=start_time,
        end_time=end_time,
        is_urgent=payload.is_urgent,
        has_previous_visit=payload.has_previous_visit,
        patient_note=payload.patient_note,
        price_toman=price_toman,
        amount_toman=amount_toman,
        payment_mode=payment_mode,
        status="pending_payment" if amount_toman else "completed",
        expires_at=utcnow() + timedelta(minutes=get_settings().booking_hold_minutes),
    )
    db.add(hold)
    if amount_toman == 0:
        item = _new_appointment(db=db, hold=hold)
        db.add(item)
        db.flush()
        queue_sms_event(db, "appointment_created", patient=patient, appointment=item)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="این ساعت هم‌اکنون رزرو شد؛ ساعت دیگری انتخاب کنید") from exc
        db.refresh(item)
        return BookingStartResponse(
            requires_payment=False,
            appointment=_appointment_read(item, settings=settings),
        )

    payment = Payment(hold=hold, amount_toman=amount_toman, status="created")
    db.add(payment)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="این ساعت هم‌اکنون رزرو شد؛ ساعت دیگری انتخاب کنید") from exc
    # The callback is built from configured values, never from the client-supplied Host header.
    runtime = get_settings(db)
    try:
        gateway_result = request_payment(
            amount_toman=amount_toman,
            description=f"رزرو {service.title}",
            callback_url=f"{runtime.frontend_url}{runtime.api_prefix}/payments/zarinpal/callback",
            mobile=patient.phone,
            email=patient.email,
            order_id=hold.id,
        )
    except PaymentGatewayError as exc:
        hold.status = "payment_failed"
        payment.status = "failed"
        payment.raw_response = str(exc)
        queue_sms_event(
            db,
            "payment_abandoned",
            patient=patient,
            extra={"service_title": service.title, "amount_toman": amount_toman},
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    payment.authority = gateway_result.authority
    payment.raw_response = gateway_result.raw_response
    payment.status = "redirected"
    db.commit()
    return BookingStartResponse(
        requires_payment=True,
        payment_url=gateway_result.payment_url,
        hold_id=hold.id,
        amount_toman=amount_toman,
        expires_at=hold.expires_at,
    )


def _payment_redirect(payment, frontend):
    if payment.status == "verified" and payment.appointment:
        return RedirectResponse(f"{frontend}?payment=success&tracking_code={payment.appointment.tracking_code}", status_code=303)
    if payment.status in {"verified", "verified_conflict"}:
        return RedirectResponse(f"{frontend}?payment=manual-review", status_code=303)
    return None


@router.get("/payments/zarinpal/callback", name="zarinpal_callback", include_in_schema=False)
def zarinpal_callback(
    Authority: str = Query(min_length=10, max_length=80),
    Status: str = Query(default="NOK", pattern=r"^(OK|NOK)$"),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    frontend = f"{get_settings().frontend_url}/appointment/"
    payment = db.scalar(select(Payment).where(Payment.authority == Authority))
    if not payment:
        return RedirectResponse(f"{frontend}?payment=unknown", status_code=303)
    terminal = _payment_redirect(payment, frontend)
    if terminal:
        return terminal
    payment_id, amount = payment.id, payment.amount_toman
    # No write transaction is held while the provider is contacted.
    db.rollback()
    verified = None
    error = False
    if Status == "OK":
        try:
            verified = verify_payment(authority=Authority, amount_toman=amount)
        except PaymentGatewayError:
            error = True
    db.execute(text("BEGIN IMMEDIATE"))
    db.expire_all()
    payment = db.get(Payment, payment_id)
    if not payment:
        db.rollback()
        return RedirectResponse(f"{frontend}?payment=unknown", status_code=303)
    terminal = _payment_redirect(payment, frontend)
    if terminal:
        db.rollback()
        return terminal
    hold = payment.hold
    if error or (verified and verified.code in {100, 101} and not verified.ref_id):
        # Leave the hold/payment eligible for a later safe verification retry.
        payment.status = "verification_error"
        db.commit()
        return RedirectResponse(f"{frontend}?payment=verification-error", status_code=303)
    if Status != "OK" or verified.code not in {100, 101}:
        payment.status = "cancelled" if Status != "OK" else "failed"
        hold.status = "payment_failed"
        if verified:
            payment.raw_response = verified.raw_response
        queue_sms_event(db, "payment_abandoned", patient=hold.patient,
                        dedupe_key=f"hold:{hold.id}:abandoned",
                        extra={"service_title": hold.service.title, "amount_toman": amount})
        db.commit()
        return RedirectResponse(f"{frontend}?payment={'cancelled' if Status != 'OK' else 'failed'}", status_code=303)

    payment.raw_response = verified.raw_response
    cancel_abandoned_notice(db, hold.id)
    # A duplicate reference cannot allocate another appointment. Preserve evidence
    # without violating the UNIQUE ref_id; raw_response is a minimal provider receipt.
    collision = db.scalar(select(Payment.id).where(Payment.ref_id == verified.ref_id, Payment.id != payment.id))
    payment.ref_id = None if collision else verified.ref_id
    payment.verified_at = utcnow()
    settings = _settings(db)
    matching_slot = next(((start, end) for start, end in list_available_slots(
        db, hold.appointment_date, settings, hold.service.duration_minutes,
        service=hold.service, is_urgent=hold.is_urgent, exclude_hold_id=hold.id,
    ) if start == hold.start_time), None)
    # Expired holds may safely complete only while the original slot is still free.
    if collision or not matching_slot or payment.refund_status != "none":
        payment.status = "verified_conflict"
        hold.status = "conflict_requires_refund"
        db.commit()
        return RedirectResponse(f"{frontend}?payment=manual-review", status_code=303)
    item = _new_appointment(db=db, hold=hold, payment=payment)
    db.add(item)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        db.execute(text("BEGIN IMMEDIATE"))
        db.expire_all()
        payment = db.get(Payment, payment_id)
        terminal = _payment_redirect(payment, frontend)
        if terminal:
            db.rollback()
            return terminal
        payment.status = "verified_conflict"
        payment.raw_response = verified.raw_response
        payment.verified_at = utcnow()
        payment.hold.status = "conflict_requires_refund"
        db.commit()
        return RedirectResponse(f"{frontend}?payment=manual-review", status_code=303)
    payment.status = "verified"
    hold.status = "completed"
    queue_sms_event(db, "payment_succeeded", patient=hold.patient, appointment=item,
                    dedupe_key=f"hold:{hold.id}:paid", extra={"amount_toman": amount})
    queue_sms_event(db, "appointment_created", patient=hold.patient, appointment=item,
                    dedupe_key=f"hold:{hold.id}:created")
    db.commit()
    return RedirectResponse(f"{frontend}?payment=success&tracking_code={item.tracking_code}", status_code=303)


@router.get(
    "/appointments/{appointment_id}/consultation",
    response_model=list[ConsultationMessageRead],
)
def consultation_messages(
    appointment_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> list[ConsultationMessageRead]:
    _patient_consultation_appointment(db, appointment_id, patient)
    messages = db.scalars(
        select(ConsultationMessage)
        .where(ConsultationMessage.appointment_id == appointment_id)
        .order_by(ConsultationMessage.created_at, ConsultationMessage.id)
    ).all()
    changed = False
    for message in messages:
        if message.sender_type == "staff" and message.read_at is None:
            message.read_at = utcnow()
            changed = True
    if changed:
        db.commit()
    return [consultation_message_read(message) for message in messages]


@router.post(
    "/appointments/{appointment_id}/consultation/messages",
    response_model=ConsultationMessageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_consultation_message(
    appointment_id: int,
    payload: ConsultationMessageCreate,
    background_tasks: BackgroundTasks,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> ConsultationMessageRead:
    _patient_consultation_appointment(db, appointment_id, patient)
    message = ConsultationMessage(
        appointment_id=appointment_id,
        sender_type="patient",
        body=payload.body,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    background_tasks.add_task(
        publish_consultation_event,
        appointment_id=appointment_id,
        patient_id=patient.id,
        sender_type="patient",
        message_id=message.id,
    )
    return consultation_message_read(message)


@router.post(
    "/appointments/{appointment_id}/consultation/images",
    response_model=ConsultationMessageRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_consultation_image(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    image_requirement_id: int = Form(...),
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> ConsultationMessageRead:
    appointment = _patient_consultation_appointment(db, appointment_id, patient)
    requirement = db.scalar(
        select(ServiceImageRequirement).where(
            ServiceImageRequirement.id == image_requirement_id,
            ServiceImageRequirement.service_id == appointment.service_id,
        )
    )
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="عنوان تصویر برای این خدمت معتبر نیست",
        )
    duplicate = db.scalar(
        select(ConsultationMessage.id).where(
            ConsultationMessage.appointment_id == appointment_id,
            ConsultationMessage.image_requirement_id == requirement.id,
        )
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"تصویر «{requirement.title}» قبلاً ارسال شده است",
        )
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="فقط فایل تصویری قابل ارسال است",
        )
    max_bytes = get_settings().max_upload_bytes
    contents = bytearray()
    while chunk := await file.read(1024 * 1024):
        contents.extend(chunk)
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="حجم هر تصویر باید حداکثر ۱۰ مگابایت باشد",
            )
    stored_name, size_bytes = optimize_consultation_image(contents)
    message = ConsultationMessage(
        appointment_id=appointment_id,
        sender_type="patient",
        body=None,
        image_requirement_id=requirement.id,
        original_file_name=(file.filename or "image")[:255],
        stored_file_name=stored_name,
        content_type="image/webp",
        size_bytes=size_bytes,
    )
    db.add(message)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        (get_settings().upload_dir / stored_name).unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"تصویر «{requirement.title}» قبلاً ارسال شده است",
        ) from exc
    db.refresh(message)
    background_tasks.add_task(
        publish_consultation_event,
        appointment_id=appointment_id,
        patient_id=patient.id,
        sender_type="patient",
        message_id=message.id,
    )
    return consultation_message_read(message)


@router.get("/appointments/{appointment_id}/consultation/images/{message_id}")
def consultation_image(
    appointment_id: int,
    message_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> FileResponse:
    _patient_consultation_appointment(db, appointment_id, patient)
    message = db.scalar(
        select(ConsultationMessage).where(
            ConsultationMessage.id == message_id,
            ConsultationMessage.appointment_id == appointment_id,
        )
    )
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="تصویر پیدا نشد")
    return FileResponse(attachment_path(message), media_type="image/webp")


@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentRead)
def cancel_appointment(
    appointment_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> AppointmentRead:
    item = db.scalar(
        select(Appointment).where(Appointment.id == appointment_id, Appointment.patient_id == patient.id)
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد")
    if item.status in {"cancelled", "completed"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="این نوبت قابل لغو نیست")
    settings = _settings(db)
    appointment_at = datetime.combine(
        item.appointment_date,
        item.start_time,
        tzinfo=ZoneInfo(settings.timezone_name),
    )
    if appointment_at - datetime.now(ZoneInfo(settings.timezone_name)) < timedelta(hours=settings.cancellation_cutoff_hours):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="مهلت لغو آنلاین این نوبت گذشته است")
    item.status = "cancelled"
    item.slot_key = None
    item.cancelled_at = utcnow()
    if item.payment and item.amount_paid_toman > 0:
        item.payment.refund_status = "requested"
        item.payment.refund_amount_toman = item.amount_paid_toman
    queue_sms_event(db, "appointment_cancelled", patient=patient, appointment=item)
    offered = offer_cancelled_slot(db, item)
    record_audit(
        db,
        action="appointment.cancelled",
        entity_type="appointment",
        entity_id=item.id,
        summary=f"لغو نوبت {item.tracking_code} توسط بیمار",
        actor_patient_id=patient.id,
        details={"waitlist_offer_id": offered.id if offered else None},
    )
    db.commit()
    db.refresh(item)
    return _appointment_read(item, settings=settings)


__all__ = ["router", "_appointment_read"]
