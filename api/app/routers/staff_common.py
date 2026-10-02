from __future__ import annotations

from string import Formatter
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import jdatetime
from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from ..consultations import consultation_message_read
from ..access import can
from ..models import (
    Appointment,
    BookingHold,
    ConsultationMessage,
    Patient,
    Payment,
    Service,
    ServiceWeeklySchedule,
    SmsCampaign,
    StaffUser,
    WeeklySchedule,
)
from ..schemas import (
    AppointmentRead,
    ConsultationMessageRead,
    PaymentRead,
    PatientListItem,
    PatientRecordConversation,
    PatientRecordPayment,
    PatientRecordRead,
    PatientTimelineItem,
    SmsCampaignFilters,
    SmsCampaignRead,
)
from ..security import normalize_digits, normalize_phone
from .patient import _appointment_read


def _staff_appointment(item: Appointment, staff: StaffUser) -> AppointmentRead:
    result = _appointment_read(item, include_patient=True)
    if not can(staff, "patients.records.view"):
        result.patient_note = result.staff_note = None
        result.has_previous_visit = False
    if not can(staff, "intake.view"):
        result.intake_form = result.intake_form.model_copy(
            update={"questions": [], "consents": []}
        )
        result.intake_submission = result.intake_submitted_at = None
        result.intake_required = result.intake_completed = False
    if not can(staff, "images.view"):
        result.image_requirements = []
    result.consultation_enabled = result.consultation_enabled and can(
        staff, "consultations.view"
    )
    return result


def _staff_patient_item(
    db: Session, patient: Patient, staff: StaffUser, summary=None
) -> PatientListItem:
    result = _patient_list_item(db, patient, summary)
    if not can(staff, "patients.records.view"):
        result.tags, result.needs_follow_up = [], False
        result.gender = result.birth_date_jalali = None
    if not can(staff, "appointments.view"):
        result.appointment_count = result.completed_count = 0
        result.last_appointment_date = result.next_appointment_date = None
    return result


def _staff_record(db: Session, patient: Patient, staff: StaffUser) -> PatientRecordRead:
    result = _patient_record(db, patient, include_payments=can(staff, "finance.view"))
    result.appointments = (
        [
            _staff_appointment(a, staff)
            for a in sorted(
                patient.appointments,
                key=lambda a: (a.appointment_date, a.start_time),
                reverse=True,
            )
        ]
        if can(staff, "appointments.view")
        else []
    )
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
    result.timeline = [
        t
        for t in result.timeline
        if t.kind in allowed_kinds
        and (t.kind != "conversation" or can(staff, "images.view"))
    ]
    result.duplicate_candidates = [
        _staff_patient_item(db, p, staff)
        for p in db.scalars(
            select(Patient).where(
                Patient.id.in_([x.id for x in result.duplicate_candidates])
            )
        )
    ]
    return result


def _staff_message(
    message: ConsultationMessage, staff: StaffUser
) -> ConsultationMessageRead:
    result = consultation_message_read(message)
    if not can(staff, "images.view"):
        result.has_image = False
        result.original_file_name = result.view_label = (
            result.image_requirement_title
        ) = None
        result.image_requirement_id = None
    return result


def _patient_summaries(db: Session, patients: list[Patient]) -> dict:
    """Fetch page summaries together without loading appointment notes or patient records."""
    if not patients:
        return {}
    today = datetime.now(ZoneInfo("Asia/Tehran")).date()
    rows = db.execute(
        select(
            Appointment.patient_id,
            func.count(Appointment.id),
            func.sum(case((Appointment.status == "completed", 1), else_=0)),
            func.max(
                case(
                    (
                        Appointment.appointment_date <= today,
                        Appointment.appointment_date,
                    )
                )
            ),
            func.min(
                case(
                    (
                        and_(
                            Appointment.appointment_date >= today,
                            Appointment.status.in_(["pending", "confirmed"]),
                        ),
                        Appointment.appointment_date,
                    )
                )
            ),
        )
        .where(Appointment.patient_id.in_([patient.id for patient in patients]))
        .group_by(Appointment.patient_id)
    )
    return {row[0]: tuple(row[1:]) for row in rows}


def _patient_list_item(db: Session, patient: Patient, summary=None) -> PatientListItem:
    if summary is None:
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
            if item.appointment_date >= today
            and item.status in {"pending", "confirmed"}
        ]
        summary = (
            len(appointments),
            sum(item.status == "completed" for item in appointments),
            past[-1].appointment_date if past else None,
            future[0].appointment_date if future else None,
        )
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
        appointment_count=summary[0],
        completed_count=summary[1],
        last_appointment_date=summary[2],
        next_appointment_date=summary[3],
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


def _patient_record(
    db: Session, patient: Patient, include_payments: bool
) -> PatientRecordRead:
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
            .order_by(
                Appointment.appointment_date.desc(), Appointment.start_time.desc()
            )
        )
        .unique()
        .all()
    )
    payments = (
        list(
            db.scalars(
                select(Payment)
                .join(BookingHold, Payment.hold_id == BookingHold.id)
                .where(BookingHold.patient_id == patient.id)
                .order_by(Payment.created_at.desc())
            )
            .unique()
            .all()
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
                    image_count=sum(
                        bool(message.stored_file_name) for message in messages
                    ),
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
        service = (
            payment.appointment.service if payment.appointment else payment.hold.service
        )
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
        duplicate_predicates.append(
            Patient.foreign_identifier == patient.foreign_identifier
        )
    if patient.first_name and patient.last_name and patient.birth_date_jalali:
        duplicate_predicates.append(
            (Patient.first_name == patient.first_name)
            & (Patient.last_name == patient.last_name)
            & (Patient.birth_date_jalali == patient.birth_date_jalali)
        )
    duplicates = (
        list(
            db.scalars(duplicate_query.where(or_(*duplicate_predicates)).limit(5)).all()
        )
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
        total_paid_toman=sum(
            item.amount_toman for item in payments if item.status == "verified"
        ),
        appointments=[
            _appointment_read(item, include_patient=True) for item in appointments
        ],
        payments=payment_reads,
        conversations=sorted(
            conversations,
            key=lambda item: item.last_message_at or datetime.min,
            reverse=True,
        ),
        timeline=sorted(timeline, key=lambda item: item.occurred_at, reverse=True),
        duplicate_candidates=[_patient_list_item(db, item) for item in duplicates],
    )


def _default_service_schedule(db: Session) -> list[ServiceWeeklySchedule]:
    clinic_days = {
        item.weekday: item for item in db.scalars(select(WeeklySchedule)).all()
    }
    return [
        ServiceWeeklySchedule(
            weekday=weekday,
            enabled=clinic_days.get(weekday).enabled
            if weekday in clinic_days
            else False,
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
        query = query.where(
            Appointment.appointment_date.between(month_start, month_end)
        )
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


def _staff_consultation_appointment(db: Session, appointment_id: int) -> Appointment:
    item = db.get(Appointment, appointment_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد"
        )
    if not item.service.allows_media_chat:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="گفت‌وگوی تصویری برای این خدمت فعال نیست",
        )
    return item


def _payment_read(item: Payment) -> PaymentRead:
    appointment = item.appointment
    patient = appointment.patient if appointment else item.hold.patient
    service = appointment.service if appointment else item.hold.service
    return PaymentRead(
        id=item.id,
        appointment_id=appointment.id if appointment else None,
        tracking_code=appointment.tracking_code if appointment else None,
        patient_name=" ".join(filter(None, [patient.first_name, patient.last_name]))
        or "بیمار",
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


def _patient_age(patient: Patient) -> int | None:
    if not patient.birth_date_jalali:
        return None
    try:
        year, month, day = (int(part) for part in patient.birth_date_jalali.split("/"))
        birth = jdatetime.date(year, month, day)
    except (TypeError, ValueError):
        return None
    today = jdatetime.date.today()
    return (
        today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    )


def _campaign_patients(db: Session, filters: SmsCampaignFilters) -> list[Patient]:
    query = select(Patient).where(Patient.is_active.is_(True))
    if filters.gender:
        query = query.where(Patient.gender == filters.gender)
    if filters.service_ids:
        existing_ids = set(
            db.scalars(
                select(Service.id).where(Service.id.in_(filters.service_ids))
            ).all()
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
