from __future__ import annotations

import json
import math
from collections import defaultdict
from string import Formatter
from datetime import date, datetime, time, timedelta
from io import BytesIO
from zoneinfo import ZoneInfo

import jdatetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..appointment_export import build_appointments_workbook
from ..activity import record_audit
from ..appointment_operations import queue_scheduled_reminders
from ..consultations import attachment_path, consultation_message_read
from ..database import get_db
from ..dependencies import get_current_staff, require_permission
from ..access import can, identity
from ..models import (
    Appointment,
    AuditLog,
    BookingHold,
    ClinicSetting,
    ConsultationMessage,
    Patient,
    Payment,
    ScheduleException,
    Service,
    ServiceImageRequirement,
    ServiceIntakeQuestion,
    ServiceConsent,
    ServiceScheduleException,
    ServiceWeeklySchedule,
    ServiceUrgentSchedule,
    SmsAutomationRule,
    SmsCampaign,
    SmsOutbox,
    StaffUser,
    WaitlistEntry,
    WeeklySchedule,
)
from ..schemas import (
    ApiMessage,
    AppointmentRead,
    AppointmentChartPoint,
    AppointmentPage,
    AppointmentStatusUpdate,
    AppointmentReschedule,
    ClinicSettingRead,
    ClinicSettingUpdate,
    ConsultationMessageCreate,
    ConsultationMessageRead,
    ConsultationThreadRead,
    AuditLogRead,
    DashboardStats,
    FinanceSummary,
    PaymentRead,
    PatientListItem,
    PatientPage,
    PatientRecordConversation,
    PatientRecordPayment,
    PatientRecordRead,
    PatientRecordUpdate,
    PatientTimelineItem,
    RefundUpdate,
    OperationsRunResult,
    ScheduleExceptionRead,
    ScheduleExceptionWrite,
    ServiceScheduleExceptionRead,
    ServiceScheduleExceptionWrite,
    ServiceRead,
    ServiceWrite,
    SmsAutomationRuleRead,
    SmsAutomationRuleWrite,
    SmsCampaignCreate,
    SmsCampaignFilters,
    SmsCampaignPreviewRequest,
    SmsCampaignPreviewResponse,
    SmsCampaignRead,
    SmsOutboxRead,
    StaffProfile,
    WaitlistEntryRead,
    WaitlistStatusUpdate,
    WeeklyScheduleRead,
    WeeklyScheduleWrite,
)
from ..security import normalize_digits, normalize_phone, utcnow
from ..realtime import publish_consultation_event
from ..scheduling import ensure_bookable_date, list_available_slots, slot_key_for_appointment
from ..sms_automation import (
    ALLOWED_TEMPLATE_VARIABLES,
    dispatch_pending_sms,
    expire_unpaid_holds,
    queue_sms_event,
)
from ..waitlist import expire_waitlist_offers, offer_cancelled_slot
from .patient import _appointment_read, _waitlist_read


router = APIRouter(prefix="/staff", tags=["staff portal"])


def _staff_appointment(item: Appointment, staff: StaffUser) -> AppointmentRead:
    result = _appointment_read(item, include_patient=True)
    if not can(staff, "patients.records.view"):
        result.patient_note = result.staff_note = None
        result.has_previous_visit = False
    if not can(staff, "intake.view"):
        result.intake_form = result.intake_form.model_copy(update={"questions": [], "consents": []})
        result.intake_submission = result.intake_submitted_at = None
        result.intake_required = result.intake_completed = False
    if not can(staff, "images.view"):
        result.image_requirements = []
    result.consultation_enabled = result.consultation_enabled and can(staff, "consultations.view")
    return result


def _staff_patient_item(db: Session, patient: Patient, staff: StaffUser) -> PatientListItem:
    result = _patient_list_item(db, patient)
    if not can(staff, "patients.records.view"):
        result.tags, result.needs_follow_up = [], False
        result.gender = result.birth_date_jalali = None
    if not can(staff, "appointments.view"):
        result.appointment_count = result.completed_count = 0
        result.last_appointment_date = result.next_appointment_date = None
    return result


def _staff_record(db: Session, patient: Patient, staff: StaffUser) -> PatientRecordRead:
    result = _patient_record(db, patient, include_payments=can(staff, "finance.view"))
    result.appointments = [_staff_appointment(a, staff) for a in sorted(patient.appointments, key=lambda a: (a.appointment_date, a.start_time), reverse=True)] if can(staff, "appointments.view") else []
    if not can(staff, "appointments.view"):
        result.appointment_count = result.completed_count = 0
    if not can(staff, "consultations.view"):
        result.conversations = []
    elif not can(staff, "images.view"):
        for conversation in result.conversations:
            conversation.image_count = 0
    allowed_kinds = {"payment"} if can(staff, "finance.view") else set()
    if can(staff, "appointments.view"):
        allowed_kinds.add("appointment")
    if can(staff, "consultations.view"):
        allowed_kinds.add("conversation")
    result.timeline = [t for t in result.timeline if t.kind in allowed_kinds and (t.kind != "conversation" or can(staff, "images.view"))]
    result.duplicate_candidates = [_staff_patient_item(db, p, staff) for p in db.scalars(select(Patient).where(Patient.id.in_([x.id for x in result.duplicate_candidates])))]
    return result


def _staff_message(message: ConsultationMessage, staff: StaffUser) -> ConsultationMessageRead:
    result = consultation_message_read(message)
    if not can(staff, "images.view"):
        result.has_image = False
        result.original_file_name = result.view_label = result.image_requirement_title = None
        result.image_requirement_id = None
    return result


def _patient_list_item(db: Session, patient: Patient) -> PatientListItem:
    appointments = list(
        db.scalars(
            select(Appointment)
            .where(Appointment.patient_id == patient.id)
            .order_by(Appointment.appointment_date, Appointment.start_time)
        ).all()
    )
    today = datetime.now(ZoneInfo("Asia/Tehran")).date()
    past = [item for item in appointments if item.appointment_date <= today]
    future = [
        item
        for item in appointments
        if item.appointment_date >= today and item.status in {"pending", "confirmed"}
    ]
    return PatientListItem(
        id=patient.id,
        full_name=" ".join(filter(None, [patient.first_name, patient.last_name]))
        or "پروفایل تکمیل‌نشده",
        phone=patient.phone,
        gender=patient.gender,
        birth_date_jalali=patient.birth_date_jalali,
        tags=patient.tags,
        needs_follow_up=patient.needs_follow_up,
        profile_completed=patient.profile_completed,
        appointment_count=len(appointments),
        completed_count=sum(item.status == "completed" for item in appointments),
        last_appointment_date=past[-1].appointment_date if past else None,
        next_appointment_date=future[0].appointment_date if future else None,
        created_at=patient.created_at,
    )


def _template_variables(template_text: str) -> set[str]:
    try:
        return {
            field_name
            for _, field_name, _, _ in Formatter().parse(template_text)
            if field_name
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ساختار متغیرهای متن پیامک معتبر نیست",
        ) from exc


@router.get("/me", response_model=StaffProfile)
def me(staff: StaffUser = Depends(get_current_staff)) -> StaffUser:
    return identity(staff)


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(
    _staff: StaffUser = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
) -> DashboardStats:
    clinic = db.get(ClinicSetting, 1)
    timezone_name = clinic.timezone_name if clinic else "Asia/Tehran"
    today = datetime.now(ZoneInfo(timezone_name)).date()
    today_total = db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.appointment_date == today)
    ) or 0
    pending_total = db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.status == "pending")
    ) or 0
    confirmed_total = db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.status == "confirmed")
    ) or 0
    patients_total = db.scalar(select(func.count()).select_from(Patient)) or 0
    unread_conversations = db.scalar(
        select(func.count()).select_from(ConsultationMessage).where(
            ConsultationMessage.sender_type == "patient",
            ConsultationMessage.read_at.is_(None),
        )
    ) or 0
    waitlist_total = db.scalar(
        select(func.count()).select_from(WaitlistEntry).where(
            WaitlistEntry.status.in_(["waiting", "notified"])
        )
    ) or 0
    refund_attention_total = db.scalar(
        select(func.count()).select_from(Payment).where(
            Payment.refund_status.in_(["requested", "processing"])
        )
    ) or 0
    chart_start = today - timedelta(days=370)
    daily_rows = db.execute(
        select(Appointment.appointment_date, func.count(Appointment.id))
        .where(Appointment.appointment_date >= chart_start)
        .group_by(Appointment.appointment_date)
        .order_by(Appointment.appointment_date)
    ).all()
    return DashboardStats(
        today_total=today_total if can(_staff, "appointments.view") else 0,
        pending_total=pending_total if can(_staff, "appointments.view") else 0,
        confirmed_total=confirmed_total if can(_staff, "appointments.view") else 0,
        patients_total=patients_total if can(_staff, "patients.view") else 0,
        unread_conversations=unread_conversations if can(_staff, "consultations.view") else 0,
        waitlist_total=waitlist_total if can(_staff, "waitlist.view") else 0,
        refund_attention_total=refund_attention_total if can(_staff, "finance.view") else 0,
        daily_appointments=[
            AppointmentChartPoint(date=appointment_date, total=total)
            for appointment_date, total in daily_rows if can(_staff, "appointments.view")
        ],
    )


@router.get("/patients", response_model=PatientPage)
def patients(
    search: str | None = None,
    tag: str | None = None,
    needs_follow_up: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=5, le=100),
    _staff: StaffUser = Depends(require_permission("patients.view")),
    db: Session = Depends(get_db),
) -> PatientPage:
    if (tag or needs_follow_up) and not can(_staff, "patients.records.view"):
        raise HTTPException(403, "جست‌وجوی بالینی نیازمند مجوز پرونده است")
    query = select(Patient)
    if search:
        normalized = normalize_digits(search).strip()
        predicates = [
            Patient.first_name.contains(normalized),
            Patient.last_name.contains(normalized),
            Patient.phone.contains(normalized),
            Patient.national_id.contains(normalized),
            Patient.foreign_identifier.contains(normalized),
        ]
        try:
            predicates.append(Patient.phone == normalize_phone(normalized))
        except ValueError:
            pass
        if not can(_staff, "patients.records.view"):
            predicates = predicates[:3]
        query = query.where(or_(*predicates))
    if tag:
        query = query.where(Patient.tags_json.contains(json.dumps(tag, ensure_ascii=False)))
    if needs_follow_up:
        query = query.where(Patient.needs_follow_up.is_(True))
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery())) or 0
    total_pages = max(1, math.ceil(total / page_size))
    actual_page = min(page, total_pages)
    items = list(
        db.scalars(
            query.order_by(Patient.created_at.desc())
            .offset((actual_page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    all_tags = sorted(
        {
            tag_value
            for raw_tags in db.scalars(select(Patient.tags_json)).all()
            for tag_value in (
                json.loads(raw_tags or "[]")
                if isinstance(raw_tags, str)
                else []
            )
            if isinstance(tag_value, str) and tag_value.strip()
        }
    )
    return PatientPage(
        items=[_staff_patient_item(db, item, _staff) for item in items],
        available_tags=all_tags if can(_staff, "patients.records.view") else [],
        total=total,
        page=actual_page,
        page_size=page_size,
        total_pages=total_pages,
    )


def _patient_record(db: Session, patient: Patient, include_payments: bool) -> PatientRecordRead:
    appointment_status_labels = {
        "pending": "در انتظار",
        "confirmed": "تأیید شده",
        "completed": "انجام شده",
        "cancelled": "لغو شده",
    }
    payment_status_labels = {
        "created": "ایجاد شده",
        "pending": "در انتظار",
        "verified": "تأیید شده",
        "failed": "ناموفق",
        "cancelled": "لغو شده",
        "verification_error": "خطای تأیید",
    }
    appointments = list(
        db.scalars(
            select(Appointment)
            .where(Appointment.patient_id == patient.id)
            .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
        ).unique().all()
    )
    payments = (
        list(
            db.scalars(
                select(Payment)
                .join(BookingHold, Payment.hold_id == BookingHold.id)
                .where(BookingHold.patient_id == patient.id)
                .order_by(Payment.created_at.desc())
            ).unique().all()
        )
        if include_payments
        else []
    )
    conversations: list[PatientRecordConversation] = []
    timeline: list[PatientTimelineItem] = []
    for appointment in appointments:
        messages = list(appointment.consultation_messages)
        if messages:
            last_message = messages[-1]
            conversations.append(
                PatientRecordConversation(
                    appointment_id=appointment.id,
                    service_title=appointment.service.title,
                    message_count=len(messages),
                    image_count=sum(bool(message.stored_file_name) for message in messages),
                    unread_count=sum(
                        message.sender_type == "patient" and message.read_at is None
                        for message in messages
                    ),
                    last_message=(
                        last_message.body
                        or ("تصویر پزشکی" if last_message.stored_file_name else None)
                    ),
                    last_message_at=last_message.created_at,
                )
            )
            timeline.append(
                PatientTimelineItem(
                    kind="conversation",
                    title=f"گفت‌وگوی {appointment.service.title}",
                    description=f"{len(messages)} پیام و {sum(bool(message.stored_file_name) for message in messages)} تصویر",
                    occurred_at=last_message.created_at,
                    appointment_id=appointment.id,
                )
            )
        timeline.append(
            PatientTimelineItem(
                kind="appointment",
                title=f"نوبت {appointment.service.title}",
                description=f"وضعیت: {appointment_status_labels.get(appointment.status, appointment.status)}",
                occurred_at=appointment.created_at,
                appointment_id=appointment.id,
            )
        )
    payment_reads: list[PatientRecordPayment] = []
    for payment in payments:
        service = payment.appointment.service if payment.appointment else payment.hold.service
        payment_reads.append(
            PatientRecordPayment(
                id=payment.id,
                appointment_id=payment.appointment.id if payment.appointment else None,
                service_title=service.title,
                amount_toman=payment.amount_toman,
                status=payment.status,
                refund_status=payment.refund_status,
                created_at=payment.created_at,
            )
        )
        timeline.append(
            PatientTimelineItem(
                kind="payment",
                title=f"پرداخت {service.title}",
                description=(
                    f"{payment.amount_toman} تومان · "
                    f"{payment_status_labels.get(payment.status, payment.status)}"
                ),
                occurred_at=payment.created_at,
                appointment_id=payment.appointment.id if payment.appointment else None,
            )
        )
    duplicate_query = select(Patient).where(Patient.id != patient.id)
    duplicate_predicates = []
    if patient.national_id:
        duplicate_predicates.append(Patient.national_id == patient.national_id)
    if patient.foreign_identifier:
        duplicate_predicates.append(Patient.foreign_identifier == patient.foreign_identifier)
    if patient.first_name and patient.last_name and patient.birth_date_jalali:
        duplicate_predicates.append(
            (Patient.first_name == patient.first_name)
            & (Patient.last_name == patient.last_name)
            & (Patient.birth_date_jalali == patient.birth_date_jalali)
        )
    duplicates = (
        list(db.scalars(duplicate_query.where(or_(*duplicate_predicates)).limit(5)).all())
        if duplicate_predicates
        else []
    )
    return PatientRecordRead(
        id=patient.id,
        phone=patient.phone,
        first_name=patient.first_name,
        last_name=patient.last_name,
        birth_date_jalali=patient.birth_date_jalali,
        email=patient.email,
        gender=patient.gender,
        national_id=patient.national_id,
        is_foreign_national=patient.is_foreign_national,
        foreign_identifier=patient.foreign_identifier,
        profile_completed=patient.profile_completed,
        is_active=patient.is_active,
        internal_note=patient.internal_note,
        tags=patient.tags,
        needs_follow_up=patient.needs_follow_up,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        appointment_count=len(appointments),
        completed_count=sum(item.status == "completed" for item in appointments),
        total_paid_toman=sum(item.amount_toman for item in payments if item.status == "verified"),
        appointments=[_appointment_read(item, include_patient=True) for item in appointments],
        payments=payment_reads,
        conversations=sorted(
            conversations,
            key=lambda item: item.last_message_at or datetime.min,
            reverse=True,
        ),
        timeline=sorted(timeline, key=lambda item: item.occurred_at, reverse=True),
        duplicate_candidates=[_patient_list_item(db, item) for item in duplicates],
    )


@router.get("/patients/{patient_id}", response_model=PatientRecordRead)
def patient_record(
    patient_id: int,
    staff: StaffUser = Depends(require_permission("patients.records.view")),
    db: Session = Depends(get_db),
) -> PatientRecordRead:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="بیمار پیدا نشد")
    return _staff_record(db, patient, staff)


@router.patch("/patients/{patient_id}", response_model=PatientRecordRead)
def update_patient_record(
    patient_id: int,
    payload: PatientRecordUpdate,
    staff: StaffUser = Depends(require_permission("patients.records.edit")),
    db: Session = Depends(get_db),
) -> PatientRecordRead:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="بیمار پیدا نشد")
    previous_follow_up = patient.needs_follow_up
    patient.internal_note = payload.internal_note
    patient.tags_json = json.dumps(payload.tags, ensure_ascii=False)
    patient.needs_follow_up = payload.needs_follow_up
    record_audit(
        db,
        action="patient.record_updated",
        entity_type="patient",
        entity_id=patient.id,
        summary="به‌روزرسانی پرونده داخلی بیمار",
        actor_staff_id=staff.id,
        details={
            "tags": payload.tags,
            "follow_up_from": previous_follow_up,
            "follow_up_to": payload.needs_follow_up,
        },
    )
    db.commit()
    db.refresh(patient)
    return _staff_record(db, patient, staff)


@router.get("/settings", response_model=ClinicSettingRead)
def settings(
    _staff: StaffUser = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
) -> ClinicSetting:
    item = db.get(ClinicSetting, 1)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="تنظیمات پیدا نشد")
    return item


@router.put("/settings", response_model=ClinicSettingRead)
def update_settings(
    payload: ClinicSettingUpdate,
    staff: StaffUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
) -> ClinicSetting:
    from ..runtime_settings import update_clinic
    return update_clinic(db, staff, payload)


@router.post("/operations/run", response_model=OperationsRunResult)
def run_scheduled_operations(
    _staff: StaffUser = Depends(require_permission("operations.run")),
    db: Session = Depends(get_db),
) -> OperationsRunResult:
    queued_reminders = queue_scheduled_reminders(db)
    sms_sent = dispatch_pending_sms(db, limit=200)
    return OperationsRunResult(
        queued_reminders=queued_reminders,
        sms_sent=sms_sent,
    )


@router.get("/schedule", response_model=list[WeeklyScheduleRead])
def weekly_schedule(
    _staff: StaffUser = Depends(require_permission("schedule.view")),
    db: Session = Depends(get_db),
) -> list[WeeklySchedule]:
    return list(db.scalars(select(WeeklySchedule).order_by(WeeklySchedule.weekday)))


@router.put("/schedule", response_model=list[WeeklyScheduleRead])
def update_weekly_schedule(
    payload: list[WeeklyScheduleWrite],
    _staff: StaffUser = Depends(require_permission("schedule.edit")),
    db: Session = Depends(get_db),
) -> list[WeeklySchedule]:
    if {item.weekday for item in payload} != set(range(7)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="برنامه هر هفت روز هفته باید ارسال شود")
    existing = {item.weekday: item for item in db.scalars(select(WeeklySchedule)).all()}
    for schedule in payload:
        item = existing.get(schedule.weekday)
        if not item:
            item = WeeklySchedule(weekday=schedule.weekday)
            db.add(item)
        item.enabled = schedule.enabled
        item.start_time = schedule.start_time
        item.end_time = schedule.end_time
    db.commit()
    return list(db.scalars(select(WeeklySchedule).order_by(WeeklySchedule.weekday)))


@router.get("/exceptions", response_model=list[ScheduleExceptionRead])
def exceptions(
    start: date | None = None,
    end: date | None = None,
    _staff: StaffUser = Depends(require_permission("schedule.view")),
    db: Session = Depends(get_db),
) -> list[ScheduleException]:
    query = select(ScheduleException)
    if start:
        query = query.where(ScheduleException.exception_date >= start)
    if end:
        query = query.where(ScheduleException.exception_date <= end)
    return list(db.scalars(query.order_by(ScheduleException.exception_date)))


@router.post("/exceptions", response_model=ScheduleExceptionRead, status_code=status.HTTP_201_CREATED)
def create_exception(
    payload: ScheduleExceptionWrite,
    _staff: StaffUser = Depends(require_permission("schedule.create")),
    db: Session = Depends(get_db),
) -> ScheduleException:
    item = ScheduleException(**payload.model_dump())
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="برای این تاریخ قبلاً استثنا ثبت شده است") from exc
    db.refresh(item)
    return item


@router.delete("/exceptions/{exception_id}", response_model=ApiMessage)
def delete_exception(
    exception_id: int,
    _staff: StaffUser = Depends(require_permission("schedule.delete")),
    db: Session = Depends(get_db),
) -> ApiMessage:
    item = db.get(ScheduleException, exception_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="استثنا پیدا نشد")
    db.delete(item)
    db.commit()
    return ApiMessage(message="استثنا حذف شد")


@router.get(
    "/services/{service_id}/exceptions",
    response_model=list[ServiceScheduleExceptionRead],
)
def service_exceptions(
    service_id: int,
    _staff: StaffUser = Depends(require_permission("schedule.view")),
    db: Session = Depends(get_db),
) -> list[ServiceScheduleException]:
    if not db.get(Service, service_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="خدمت پیدا نشد")
    return list(
        db.scalars(
            select(ServiceScheduleException)
            .where(ServiceScheduleException.service_id == service_id)
            .order_by(ServiceScheduleException.exception_date)
        )
    )


@router.post(
    "/services/{service_id}/exceptions",
    response_model=ServiceScheduleExceptionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_service_exception(
    service_id: int,
    payload: ServiceScheduleExceptionWrite,
    staff: StaffUser = Depends(require_permission("schedule.create")),
    db: Session = Depends(get_db),
) -> ServiceScheduleException:
    service = db.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="خدمت پیدا نشد")
    item = ServiceScheduleException(service_id=service_id, **payload.model_dump())
    db.add(item)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="برای این خدمت در تاریخ انتخاب‌شده قبلاً استثنا ثبت شده است",
        ) from exc
    record_audit(
        db,
        action="service.exception.created",
        entity_type="service",
        entity_id=service_id,
        summary=f"ثبت استثنای زمانی برای {service.title}",
        actor_staff_id=staff.id,
        details=payload.model_dump(mode="json"),
    )
    db.commit()
    db.refresh(item)
    return item


@router.delete("/services/{service_id}/exceptions/{exception_id}", response_model=ApiMessage)
def delete_service_exception(
    service_id: int,
    exception_id: int,
    staff: StaffUser = Depends(require_permission("schedule.delete")),
    db: Session = Depends(get_db),
) -> ApiMessage:
    item = db.scalar(
        select(ServiceScheduleException).where(
            ServiceScheduleException.id == exception_id,
            ServiceScheduleException.service_id == service_id,
        )
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="استثنا پیدا نشد")
    db.delete(item)
    record_audit(
        db,
        action="service.exception.deleted",
        entity_type="service",
        entity_id=service_id,
        summary="حذف استثنای زمانی خدمت",
        actor_staff_id=staff.id,
        details={"exception_date": item.exception_date.isoformat()},
    )
    db.commit()
    return ApiMessage(message="استثنای خدمت حذف شد")


@router.get("/services", response_model=list[ServiceRead])
def all_services(
    _staff: StaffUser = Depends(require_permission("services.view")),
    db: Session = Depends(get_db),
) -> list[Service]:
    return list(db.scalars(select(Service).order_by(Service.sort_order, Service.id)))


def _default_service_schedule(db: Session) -> list[ServiceWeeklySchedule]:
    clinic_days = {
        item.weekday: item
        for item in db.scalars(select(WeeklySchedule)).all()
    }
    return [
        ServiceWeeklySchedule(
            weekday=weekday,
            enabled=clinic_days.get(weekday).enabled if weekday in clinic_days else False,
            start_time=(
                clinic_days.get(weekday).start_time
                if weekday in clinic_days
                else time(16, 0)
            ),
            end_time=(
                clinic_days.get(weekday).end_time
                if weekday in clinic_days
                else time(20, 0)
            ),
        )
        for weekday in range(7)
    ]


@router.post("/services", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceWrite,
    staff: StaffUser = Depends(require_permission("services.create")),
    db: Session = Depends(get_db),
) -> Service:
    values = payload.model_dump(
        exclude={
            "image_requirements",
            "weekly_schedules",
            "urgent_schedules",
            "intake_questions",
            "consents",
        }
    )
    item = Service(**values)
    item.image_requirements = [
        ServiceImageRequirement(**entry.model_dump()) for entry in payload.image_requirements
    ]
    item.weekly_schedules = (
        [ServiceWeeklySchedule(**entry.model_dump()) for entry in payload.weekly_schedules]
        if payload.weekly_schedules
        else _default_service_schedule(db)
    )
    item.urgent_schedules = [
        ServiceUrgentSchedule(**entry.model_dump()) for entry in payload.urgent_schedules
    ]
    item.intake_questions = [
        ServiceIntakeQuestion(
            **entry.model_dump(exclude={"options"}),
            options_json=json.dumps(entry.options, ensure_ascii=False),
        )
        for entry in payload.intake_questions
    ]
    item.consents = [ServiceConsent(**entry.model_dump()) for entry in payload.consents]
    db.add(item)
    db.flush()
    record_audit(
        db,
        action="service.created",
        entity_type="service",
        entity_id=item.id,
        summary=f"ایجاد خدمت {item.title}",
        actor_staff_id=staff.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/services/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: int,
    payload: ServiceWrite,
    staff: StaffUser = Depends(require_permission("services.edit")),
    db: Session = Depends(get_db),
) -> Service:
    item = db.get(Service, service_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="خدمت پیدا نشد")
    for field, value in payload.model_dump(
        exclude={
            "image_requirements",
            "weekly_schedules",
            "urgent_schedules",
            "intake_questions",
            "consents",
        }
    ).items():
        setattr(item, field, value)

    existing_requirements = {
        requirement.title.strip(): requirement for requirement in item.image_requirements
    }
    requested_titles: set[str] = set()
    for entry in payload.image_requirements:
        values = entry.model_dump()
        title = values.pop("title").strip()
        requested_titles.add(title)
        requirement = existing_requirements.get(title)
        if requirement is None:
            item.image_requirements.append(
                ServiceImageRequirement(title=title, **values)
            )
            continue
        for field, value in values.items():
            setattr(requirement, field, value)
    for title, requirement in existing_requirements.items():
        if title not in requested_titles:
            item.image_requirements.remove(requirement)

    if payload.weekly_schedules:
        existing_weekly_days = {
            schedule.weekday: schedule for schedule in item.weekly_schedules
        }
        requested_weekly_days: set[int] = set()
        for entry in payload.weekly_schedules:
            values = entry.model_dump()
            weekday = values.pop("weekday")
            requested_weekly_days.add(weekday)
            schedule = existing_weekly_days.get(weekday)
            if schedule is None:
                item.weekly_schedules.append(
                    ServiceWeeklySchedule(weekday=weekday, **values)
                )
                continue
            for field, value in values.items():
                setattr(schedule, field, value)
        for weekday, schedule in existing_weekly_days.items():
            if weekday not in requested_weekly_days:
                item.weekly_schedules.remove(schedule)

    existing_urgent_days = {
        schedule.weekday: schedule for schedule in item.urgent_schedules
    }
    requested_days: set[int] = set()
    for entry in payload.urgent_schedules:
        values = entry.model_dump()
        weekday = values.pop("weekday")
        requested_days.add(weekday)
        schedule = existing_urgent_days.get(weekday)
        if schedule is None:
            item.urgent_schedules.append(
                ServiceUrgentSchedule(weekday=weekday, **values)
            )
            continue
        for field, value in values.items():
            setattr(schedule, field, value)
    for weekday, schedule in existing_urgent_days.items():
        if weekday not in requested_days:
            item.urgent_schedules.remove(schedule)

    item.intake_questions.clear()
    item.intake_questions.extend(
        ServiceIntakeQuestion(
            **entry.model_dump(exclude={"options"}),
            options_json=json.dumps(entry.options, ensure_ascii=False),
        )
        for entry in payload.intake_questions
    )
    item.consents.clear()
    item.consents.extend(
        ServiceConsent(**entry.model_dump()) for entry in payload.consents
    )

    record_audit(
        db,
        action="service.updated",
        entity_type="service",
        entity_id=item.id,
        summary=f"ویرایش تنظیمات {item.title}",
        actor_staff_id=staff.id,
        details={
            "capacity": item.concurrent_capacity,
            "buffer_before": item.buffer_before_minutes,
            "buffer_after": item.buffer_after_minutes,
        },
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="اطلاعات تکراری یا نامعتبر در تنظیمات خدمت وجود دارد",
        ) from exc
    db.refresh(item)
    db.expire(
        item,
        [
            "image_requirements",
            "weekly_schedules",
            "urgent_schedules",
            "intake_questions",
            "consents",
        ],
    )
    return item


def _jalali_month_bounds() -> tuple[date, date]:
    today = jdatetime.date.today()
    first = jdatetime.date(today.year, today.month, 1).togregorian()
    if today.month == 12:
        next_month = jdatetime.date(today.year + 1, 1, 1).togregorian()
    else:
        next_month = jdatetime.date(today.year, today.month + 1, 1).togregorian()
    return first, next_month - timedelta(days=1)


def _appointments_query(
    *,
    appointment_date: date | None,
    status_filter: str | None,
    search: str | None,
    this_month: bool,
) -> object:
    query = select(Appointment).join(Appointment.patient).join(Appointment.service)
    if appointment_date:
        query = query.where(Appointment.appointment_date == appointment_date)
    if this_month:
        month_start, month_end = _jalali_month_bounds()
        query = query.where(Appointment.appointment_date.between(month_start, month_end))
    if status_filter:
        query = query.where(Appointment.status == status_filter)
    if search:
        normalized = normalize_digits(search).strip()
        phone = None
        try:
            phone = normalize_phone(normalized)
        except ValueError:
            pass
        predicates = [
            Patient.first_name.contains(normalized),
            Patient.last_name.contains(normalized),
            Appointment.tracking_code.contains(normalized),
        ]
        if phone:
            predicates.append(Patient.phone == phone)
        else:
            predicates.append(Patient.phone.contains(normalized))
        query = query.where(or_(*predicates))
    return query


@router.get("/appointments", response_model=AppointmentPage)
def appointments(
    appointment_date: date | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = None,
    this_month: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=5, le=100),
    _staff: StaffUser = Depends(require_permission("appointments.view")),
    db: Session = Depends(get_db),
) -> AppointmentPage:
    query = _appointments_query(
        appointment_date=appointment_date,
        status_filter=status_filter,
        search=search,
        this_month=this_month,
    )
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery())) or 0
    total_pages = max(1, math.ceil(total / page_size))
    actual_page = min(page, total_pages)
    items = db.scalars(
        query.order_by(Appointment.created_at.desc(), Appointment.id.desc())
        .offset((actual_page - 1) * page_size)
        .limit(page_size)
    ).unique().all()
    return AppointmentPage(
        items=[_staff_appointment(item, _staff) for item in items],
        total=total,
        page=actual_page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/appointments/export")
def export_appointments(
    appointment_date: date | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = None,
    this_month: bool = False,
    _staff: StaffUser = Depends(require_permission("appointments.export")),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    query = _appointments_query(
        appointment_date=appointment_date,
        status_filter=status_filter,
        search=search,
        this_month=this_month,
    )
    items = db.scalars(
        query.order_by(Appointment.created_at.desc(), Appointment.id.desc())
    ).unique().all()
    clinic = db.get(ClinicSetting, 1)
    content = build_appointments_workbook(
        list(items),
        doctor_name=clinic.doctor_name if clinic else "پزشک مطب",
        include_sensitive_notes=can(_staff, "patients.records.view"),
    )
    filename = f"appointments-{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/appointments/{appointment_id}", response_model=AppointmentRead)
def update_appointment(
    appointment_id: int,
    payload: AppointmentStatusUpdate,
    staff: StaffUser = Depends(require_permission("appointments.edit")),
    db: Session = Depends(get_db),
) -> AppointmentRead:
    item = db.get(Appointment, appointment_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد")
    allowed_transitions = {
        "pending": {"pending", "confirmed", "cancelled"},
        "confirmed": {"confirmed", "completed", "cancelled"},
        "completed": {"completed"},
        "cancelled": {"cancelled"},
    }
    if payload.status not in allowed_transitions.get(item.status, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="این تغییر وضعیت مجاز نیست؛ نوبت نهایی‌شده قابل بازگردانی نیست",
        )
    if payload.status == "cancelled" and not can(staff, "appointments.cancel"):
        raise HTTPException(403, "مجوز لغو نوبت ندارید")
    if "staff_note" in payload.model_fields_set and not can(staff, "patients.records.edit"):
        raise HTTPException(403, "مجوز ویرایش یادداشت پرونده ندارید")
    previous_status = item.status
    item.status = payload.status
    if "staff_note" in payload.model_fields_set:
        item.staff_note = payload.staff_note
    if payload.status == "cancelled":
        item.slot_key = None
        item.cancelled_at = utcnow()
        queue_sms_event(db, "appointment_cancelled", patient=item.patient, appointment=item)
        offered = offer_cancelled_slot(db, item)
        if item.payment and item.amount_paid_toman > 0:
            item.payment.refund_status = "requested"
            item.payment.refund_amount_toman = item.amount_paid_toman
    else:
        offered = None
    record_audit(
        db,
        action="appointment.status_changed",
        entity_type="appointment",
        entity_id=item.id,
        summary=f"تغییر وضعیت نوبت {item.tracking_code}",
        actor_staff_id=staff.id,
        details={
            "from": previous_status,
            "to": payload.status,
            "waitlist_offer_id": offered.id if offered else None,
        },
    )
    db.commit()
    db.refresh(item)
    dispatch_pending_sms(db)
    return _staff_appointment(item, staff)


@router.patch("/appointments/{appointment_id}/reschedule", response_model=AppointmentRead)
def reschedule_appointment(
    appointment_id: int,
    payload: AppointmentReschedule,
    staff: StaffUser = Depends(require_permission("appointments.reschedule")),
    db: Session = Depends(get_db),
) -> AppointmentRead:
    item = db.get(Appointment, appointment_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد")
    if item.status not in {"pending", "confirmed"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="نوبت نهایی‌شده قابل جابه‌جایی نیست")
    clinic = db.get(ClinicSetting, 1)
    if not clinic or not ensure_bookable_date(payload.appointment_date, clinic):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="تاریخ خارج از بازه رزرو است")
    matching_slot = next(
        (
            (start, end)
            for start, end in list_available_slots(
                db,
                payload.appointment_date,
                clinic,
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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="زمان جدید ظرفیت آزاد ندارد")
    previous_date = item.appointment_date
    previous_start = item.start_time
    if previous_date != payload.appointment_date or previous_start != payload.start_time:
        offered = offer_cancelled_slot(db, item)
    else:
        offered = None
    item.appointment_date = payload.appointment_date
    item.start_time, item.end_time = matching_slot
    item.slot_key = slot_key_for_appointment(
        db,
        item,
        item.appointment_date,
        item.start_time,
    )
    item.rescheduled_at = utcnow()
    item.rescheduled_by_staff_id = staff.id
    queue_sms_event(db, "appointment_rescheduled", patient=item.patient, appointment=item)
    record_audit(
        db,
        action="appointment.rescheduled",
        entity_type="appointment",
        entity_id=item.id,
        summary=f"جابه‌جایی نوبت {item.tracking_code}",
        actor_staff_id=staff.id,
        details={
            "from_date": previous_date.isoformat(),
            "from_time": previous_start.strftime("%H:%M"),
            "to_date": item.appointment_date.isoformat(),
            "to_time": item.start_time.strftime("%H:%M"),
            "waitlist_offer_id": offered.id if offered else None,
        },
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="این زمان هم‌اکنون رزرو شد") from exc
    db.refresh(item)
    dispatch_pending_sms(db)
    return _staff_appointment(item, staff)


def _staff_consultation_appointment(db: Session, appointment_id: int) -> Appointment:
    item = db.get(Appointment, appointment_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد")
    if not item.service.allows_media_chat:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="گفت‌وگوی تصویری برای این خدمت فعال نیست",
        )
    return item


@router.get("/consultations", response_model=list[ConsultationThreadRead])
def consultation_threads(
    _staff: StaffUser = Depends(require_permission("consultations.view")),
    db: Session = Depends(get_db),
) -> list[ConsultationThreadRead]:
    appointments = db.scalars(
        select(Appointment)
        .join(Appointment.service)
        .where(Service.allows_media_chat.is_(True))
        .order_by(Appointment.created_at.desc())
    ).unique().all()
    result: list[ConsultationThreadRead] = []
    for item in appointments:
        last_message = db.scalar(
            select(ConsultationMessage)
            .where(ConsultationMessage.appointment_id == item.id)
            .order_by(ConsultationMessage.created_at.desc(), ConsultationMessage.id.desc())
            .limit(1)
        )
        unread_count = db.scalar(
            select(func.count()).select_from(ConsultationMessage).where(
                ConsultationMessage.appointment_id == item.id,
                ConsultationMessage.sender_type == "patient",
                ConsultationMessage.read_at.is_(None),
            )
        ) or 0
        result.append(
            ConsultationThreadRead(
                appointment_id=item.id,
                patient_name=" ".join(
                    filter(None, [item.patient.first_name, item.patient.last_name])
                ) or "تکمیل‌نشده",
                patient_phone=item.patient.phone,
                service_title=item.service.title,
                appointment_date=item.appointment_date,
                appointment_time=item.start_time,
                appointment_status=item.status,
                patient_note=item.patient_note if can(_staff, "patients.records.view") else None,
                last_message=(
                    last_message.body
                    if last_message and last_message.body
                    else "تصویر جدید"
                    if last_message
                    else None
                ),
                last_message_at=last_message.created_at if last_message else None,
                last_sender_type=last_message.sender_type if last_message else None,
                unread_count=unread_count,
            )
        )
    result.sort(key=lambda item: item.last_message_at or datetime.min, reverse=True)
    return result


@router.get(
    "/appointments/{appointment_id}/consultation",
    response_model=list[ConsultationMessageRead],
)
def staff_consultation_messages(
    appointment_id: int,
    _staff: StaffUser = Depends(require_permission("consultations.view")),
    db: Session = Depends(get_db),
) -> list[ConsultationMessageRead]:
    _staff_consultation_appointment(db, appointment_id)
    messages = db.scalars(
        select(ConsultationMessage)
        .where(ConsultationMessage.appointment_id == appointment_id)
        .order_by(ConsultationMessage.created_at, ConsultationMessage.id)
    ).all()
    changed = False
    for message in messages:
        if message.sender_type == "patient" and message.read_at is None:
            message.read_at = utcnow()
            changed = True
    if changed:
        db.commit()
    return [_staff_message(message, _staff) for message in messages]


@router.post(
    "/appointments/{appointment_id}/consultation/messages",
    response_model=ConsultationMessageRead,
    status_code=status.HTTP_201_CREATED,
)
def staff_create_consultation_message(
    appointment_id: int,
    payload: ConsultationMessageCreate,
    background_tasks: BackgroundTasks,
    staff: StaffUser = Depends(require_permission("consultations.send")),
    db: Session = Depends(get_db),
) -> ConsultationMessageRead:
    appointment = _staff_consultation_appointment(db, appointment_id)
    message = ConsultationMessage(
        appointment_id=appointment_id,
        sender_type="staff",
        sender_staff_id=staff.id,
        body=payload.body,
    )
    db.add(message)
    queue_sms_event(
        db,
        "staff_message_received",
        patient=appointment.patient,
        appointment=appointment,
    )
    db.commit()
    db.refresh(message)
    dispatch_pending_sms(db)
    background_tasks.add_task(
        publish_consultation_event,
        appointment_id=appointment_id,
        patient_id=appointment.patient_id,
        sender_type="staff",
        message_id=message.id,
    )
    return _staff_message(message, staff)


@router.get("/waitlist", response_model=list[WaitlistEntryRead])
def staff_waitlist(
    status_filter: str | None = Query(default=None, alias="status"),
    _staff: StaffUser = Depends(require_permission("waitlist.view")),
    db: Session = Depends(get_db),
) -> list[WaitlistEntryRead]:
    if expire_waitlist_offers(db):
        db.commit()
    query = select(WaitlistEntry)
    if status_filter:
        query = query.where(WaitlistEntry.status == status_filter)
    items = db.scalars(query.order_by(WaitlistEntry.created_at, WaitlistEntry.id)).unique().all()
    return [_waitlist_read(item) for item in items]


@router.patch("/waitlist/{entry_id}", response_model=WaitlistEntryRead)
def update_waitlist_status(
    entry_id: int,
    payload: WaitlistStatusUpdate,
    staff: StaffUser = Depends(require_permission("waitlist.edit")),
    db: Session = Depends(get_db),
) -> WaitlistEntryRead:
    item = db.get(WaitlistEntry, entry_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="درخواست انتظار پیدا نشد")
    previous = item.status
    item.status = payload.status
    record_audit(
        db,
        action="waitlist.status_changed",
        entity_type="waitlist",
        entity_id=item.id,
        summary=f"تغییر وضعیت لیست انتظار {item.service.title}",
        actor_staff_id=staff.id,
        details={"from": previous, "to": payload.status},
    )
    db.commit()
    db.refresh(item)
    return _waitlist_read(item)


def _payment_read(item: Payment) -> PaymentRead:
    appointment = item.appointment
    patient = appointment.patient if appointment else item.hold.patient
    service = appointment.service if appointment else item.hold.service
    return PaymentRead(
        id=item.id,
        appointment_id=appointment.id if appointment else None,
        tracking_code=appointment.tracking_code if appointment else None,
        patient_name=" ".join(filter(None, [patient.first_name, patient.last_name])) or "بیمار",
        service_title=service.title,
        amount_toman=item.amount_toman,
        status=item.status,
        ref_id=item.ref_id,
        refund_status=item.refund_status,
        refund_amount_toman=item.refund_amount_toman,
        refund_reference=item.refund_reference,
        refund_note=item.refund_note,
        created_at=item.created_at,
        verified_at=item.verified_at,
        refunded_at=item.refunded_at,
    )


@router.get("/finance/summary", response_model=FinanceSummary)
def finance_summary(
    _staff: StaffUser = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db),
) -> FinanceSummary:
    items = db.scalars(select(Payment)).unique().all()
    verified = [item for item in items if item.status == "verified"]
    pending_refunds = [item for item in items if item.refund_status in {"requested", "processing"}]
    refunded = [item for item in items if item.refund_status == "refunded"]
    failed = [item for item in items if item.status in {"failed", "cancelled", "verification_error"}]
    return FinanceSummary(
        verified_count=len(verified),
        collected_toman=sum(item.amount_toman for item in verified),
        refund_pending_count=len(pending_refunds),
        refund_pending_toman=sum(item.refund_amount_toman for item in pending_refunds),
        refunded_count=len(refunded),
        refunded_toman=sum(item.refund_amount_toman for item in refunded),
        failed_count=len(failed),
    )


@router.get("/finance/payments", response_model=list[PaymentRead])
def finance_payments(
    refund_status: str | None = None,
    _staff: StaffUser = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db),
) -> list[PaymentRead]:
    query = select(Payment)
    if refund_status:
        query = query.where(Payment.refund_status == refund_status)
    items = db.scalars(query.order_by(Payment.created_at.desc(), Payment.id.desc())).unique().all()
    return [_payment_read(item) for item in items]


@router.patch("/finance/payments/{payment_id}/refund", response_model=PaymentRead)
def update_refund(
    payment_id: int,
    payload: RefundUpdate,
    staff: StaffUser = Depends(require_permission("finance.refund")),
    db: Session = Depends(get_db),
) -> PaymentRead:
    item = db.get(Payment, payment_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="پرداخت پیدا نشد")
    if payload.amount_toman > item.amount_toman:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="مبلغ بازپرداخت بیشتر از پرداخت است")
    if payload.status == "refunded" and payload.amount_toman <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="مبلغ بازپرداخت الزامی است")
    previous = item.refund_status
    item.refund_status = payload.status
    item.refund_amount_toman = payload.amount_toman
    item.refund_reference = payload.reference
    item.refund_note = payload.note
    item.refunded_at = utcnow() if payload.status == "refunded" else None
    if item.appointment and payload.status == "refunded":
        item.appointment.payment_status = "refunded"
        queue_sms_event(
            db,
            "refund_recorded",
            patient=item.appointment.patient,
            appointment=item.appointment,
            extra={"amount_toman": payload.amount_toman},
        )
    record_audit(
        db,
        action="payment.refund_updated",
        entity_type="payment",
        entity_id=item.id,
        summary="به‌روزرسانی وضعیت بازپرداخت",
        actor_staff_id=staff.id,
        details={"from": previous, "to": payload.status, "amount_toman": payload.amount_toman},
    )
    db.commit()
    db.refresh(item)
    dispatch_pending_sms(db)
    return _payment_read(item)


@router.get("/audit-logs", response_model=list[AuditLogRead])
def audit_logs(
    limit: int = Query(default=100, ge=1, le=300),
    _staff: StaffUser = Depends(require_permission("audit.view")),
    db: Session = Depends(get_db),
) -> list[AuditLogRead]:
    items = db.scalars(
        select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit)
    ).unique().all()
    result: list[AuditLogRead] = []
    for item in items:
        actor_name = "سامانه"
        actor_role = "system"
        if item.actor_staff:
            actor_name = item.actor_staff.full_name
            actor_role = "، ".join(identity(item.actor_staff)["role_titles"]) or "بدون نقش فعال"
        elif item.actor_patient:
            actor_name = " ".join(
                filter(None, [item.actor_patient.first_name, item.actor_patient.last_name])
            ) or "بیمار"
            actor_role = "patient"
        result.append(
            AuditLogRead(
                id=item.id,
                actor_name=actor_name,
                actor_role=actor_role,
                action=item.action,
                entity_type=item.entity_type,
                entity_id=item.entity_id,
                summary=item.summary,
                details=json.loads(item.details_json or "{}"),
                created_at=item.created_at,
            )
        )
    return result


@router.get("/sms/rules", response_model=list[SmsAutomationRuleRead])
def sms_rules(
    _staff: StaffUser = Depends(require_permission("sms.view")),
    db: Session = Depends(get_db),
) -> list[SmsAutomationRule]:
    return list(db.scalars(select(SmsAutomationRule).order_by(SmsAutomationRule.id)))


@router.put("/sms/rules/{event_key}", response_model=SmsAutomationRuleRead)
def update_sms_rule(
    event_key: str,
    payload: SmsAutomationRuleWrite,
    _staff: StaffUser = Depends(require_permission("sms.rules.edit")),
    db: Session = Depends(get_db),
) -> SmsAutomationRule:
    item = db.scalar(
        select(SmsAutomationRule).where(SmsAutomationRule.event_key == event_key)
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="رویداد پیامکی پیدا نشد")
    variables = _template_variables(payload.template_text)
    unknown = variables - ALLOWED_TEMPLATE_VARIABLES
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"متغیرهای ناشناخته در متن پیامک: {', '.join(sorted(unknown))}",
        )
    item.enabled = payload.enabled
    item.template_text = payload.template_text.strip()
    item.provider_pattern_code = payload.provider_pattern_code.strip()
    db.commit()
    db.refresh(item)
    return item


@router.get("/sms/outbox", response_model=list[SmsOutboxRead])
def sms_outbox(
    limit: int = Query(default=100, ge=1, le=500),
    _staff: StaffUser = Depends(require_permission("sms.view")),
    db: Session = Depends(get_db),
) -> list[SmsOutbox]:
    return list(
        db.scalars(select(SmsOutbox).order_by(SmsOutbox.id.desc()).limit(limit))
    )


CAMPAIGN_TEMPLATE_VARIABLES = {"patient_name", "first_name", "service_title"}


def _patient_age(patient: Patient) -> int | None:
    if not patient.birth_date_jalali:
        return None
    try:
        year, month, day = (int(part) for part in patient.birth_date_jalali.split("/"))
        birth = jdatetime.date(year, month, day)
    except (TypeError, ValueError):
        return None
    today = jdatetime.date.today()
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))


def _campaign_patients(db: Session, filters: SmsCampaignFilters) -> list[Patient]:
    query = select(Patient).where(Patient.is_active.is_(True))
    if filters.gender:
        query = query.where(Patient.gender == filters.gender)
    if filters.service_ids:
        existing_ids = set(
            db.scalars(select(Service.id).where(Service.id.in_(filters.service_ids))).all()
        )
        if existing_ids != set(filters.service_ids):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="یک یا چند خدمت انتخاب‌شده معتبر نیست",
            )
        query = query.where(
            Patient.appointments.any(
                Appointment.service_id.in_(filters.service_ids)
                & Appointment.status.in_(["pending", "confirmed", "completed"])
            )
        )
    patients = list(db.scalars(query.order_by(Patient.id)).all())
    if filters.min_age is None and filters.max_age is None:
        return patients
    result: list[Patient] = []
    for patient in patients:
        age = _patient_age(patient)
        if age is None:
            continue
        if filters.min_age is not None and age < filters.min_age:
            continue
        if filters.max_age is not None and age > filters.max_age:
            continue
        result.append(patient)
    return result


def _campaign_read(item: SmsCampaign) -> SmsCampaignRead:
    return SmsCampaignRead(
        id=item.id,
        title=item.title,
        message_text=item.message_text,
        provider_pattern_code=item.provider_pattern_code,
        filters=SmsCampaignFilters.model_validate_json(item.filters_json),
        status=item.status,
        recipient_count=item.recipient_count,
        sent_count=item.sent_count,
        failed_count=item.failed_count,
        created_at=item.created_at,
    )


@router.post("/sms/campaigns/preview", response_model=SmsCampaignPreviewResponse)
def preview_sms_campaign(
    payload: SmsCampaignPreviewRequest,
    _staff: StaffUser = Depends(require_permission("sms.campaigns.create")),
    db: Session = Depends(get_db),
) -> SmsCampaignPreviewResponse:
    return SmsCampaignPreviewResponse(
        recipient_count=len(_campaign_patients(db, payload.filters))
    )


@router.get("/sms/campaigns", response_model=list[SmsCampaignRead])
def sms_campaigns(
    limit: int = Query(default=50, ge=1, le=200),
    _staff: StaffUser = Depends(require_permission("sms.view")),
    db: Session = Depends(get_db),
) -> list[SmsCampaignRead]:
    items = db.scalars(
        select(SmsCampaign).order_by(SmsCampaign.id.desc()).limit(limit)
    ).all()
    return [_campaign_read(item) for item in items]


@router.post(
    "/sms/campaigns",
    response_model=SmsCampaignRead,
    status_code=status.HTTP_201_CREATED,
)
def create_sms_campaign(
    payload: SmsCampaignCreate,
    staff: StaffUser = Depends(require_permission("sms.campaigns.create")),
    db: Session = Depends(get_db),
) -> SmsCampaignRead:
    variables = _template_variables(payload.message_text)
    unknown = variables - CAMPAIGN_TEMPLATE_VARIABLES
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"متغیرهای ناشناخته در متن کمپین: {', '.join(sorted(unknown))}",
        )
    patients = _campaign_patients(db, payload.filters)
    if len(patients) != payload.expected_recipient_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "تعداد مخاطبان از زمان پیش‌نمایش تغییر کرده است؛ "
                f"تعداد فعلی {len(patients)} نفر است"
            ),
        )
    service_titles = list(
        db.scalars(
            select(Service.title).where(Service.id.in_(payload.filters.service_ids))
        ).all()
    ) if payload.filters.service_ids else []
    service_title = "، ".join(service_titles) if service_titles else "خدمات مطب"
    campaign = SmsCampaign(
        title=payload.title,
        message_text=payload.message_text,
        provider_pattern_code=payload.provider_pattern_code,
        filters_json=payload.filters.model_dump_json(),
        status="queued",
        recipient_count=len(patients),
        created_by_staff_id=staff.id,
    )
    db.add(campaign)
    db.flush()
    for patient in patients:
        values = {
            "patient_name": " ".join(
                filter(None, [patient.first_name, patient.last_name])
            ) or "بیمار",
            "first_name": patient.first_name or "بیمار",
            "service_title": service_title,
        }
        db.add(
            SmsOutbox(
                event_key="campaign",
                campaign_id=campaign.id,
                patient_id=patient.id,
                phone=patient.phone,
                rendered_body=payload.message_text.format_map(defaultdict(str, values)),
                provider_pattern_code=payload.provider_pattern_code,
                variables_json=json.dumps(values, ensure_ascii=False),
                status="pending",
            )
        )
    db.commit()
    db.refresh(campaign)
    return _campaign_read(campaign)


@router.post("/sms/dispatch", response_model=ApiMessage)
def dispatch_sms(
    _staff: StaffUser = Depends(require_permission("sms.dispatch")),
    db: Session = Depends(get_db),
) -> ApiMessage:
    expire_unpaid_holds(db)
    sent = dispatch_pending_sms(db, limit=100)
    return ApiMessage(message=f"{sent} پیامک با موفقیت ارسال شد")


@router.get("/appointments/{appointment_id}/consultation/images/{message_id}")
def staff_consultation_image(
    appointment_id: int,
    message_id: int,
    _staff: StaffUser = Depends(require_permission("images.view")),
    db: Session = Depends(get_db),
) -> FileResponse:
    _staff_consultation_appointment(db, appointment_id)
    message = db.scalar(
        select(ConsultationMessage).where(
            ConsultationMessage.id == message_id,
            ConsultationMessage.appointment_id == appointment_id,
        )
    )
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="تصویر پیدا نشد")
    return FileResponse(attachment_path(message), media_type="image/webp")
