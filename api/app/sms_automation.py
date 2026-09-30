from __future__ import annotations

import json
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    Appointment,
    BookingHold,
    Patient,
    SmsAutomationRule,
    SmsCampaign,
    SmsOutbox,
)
from .security import utcnow
from .sms import SmsDeliveryError, get_sms_provider


SMS_EVENT_CATALOG: dict[str, tuple[str, str]] = {
    "appointment_created": (
        "ثبت نوبت",
        "{patient_name} عزیز، نوبت {service_title} در تاریخ {appointment_date} ساعت {appointment_time} ثبت شد. کد پیگیری: {tracking_code}",
    ),
    "payment_succeeded": (
        "پرداخت موفق",
        "{patient_name} عزیز، پرداخت {amount_toman} تومان با موفقیت انجام و نوبت شما ثبت شد. کد پیگیری: {tracking_code}",
    ),
    "payment_abandoned": (
        "عدم پرداخت یا انصراف",
        "{patient_name} عزیز، پرداخت نوبت {service_title} کامل نشد و زمان موقت آزاد شد.",
    ),
    "appointment_cancelled": (
        "لغو نوبت",
        "{patient_name} عزیز، نوبت {service_title} با کد {tracking_code} لغو شد.",
    ),
    "appointment_rescheduled": (
        "تغییر زمان نوبت",
        "{patient_name} عزیز، زمان نوبت {service_title} به تاریخ {appointment_date} ساعت {appointment_time} تغییر کرد. کد پیگیری: {tracking_code}",
    ),
    "waitlist_slot_available": (
        "آزاد شدن ظرفیت لیست انتظار",
        "{patient_name} عزیز، برای {service_title} در تاریخ {appointment_date} ساعت {appointment_time} ظرفیت آزاد شده است. این پیشنهاد ۳۰ دقیقه اعتبار دارد.",
    ),
    "refund_recorded": (
        "ثبت بازپرداخت",
        "{patient_name} عزیز، بازپرداخت مبلغ {amount_toman} تومان برای نوبت {service_title} ثبت شد.",
    ),
    "staff_message_received": (
        "پیام جدید برای بیمار",
        "{patient_name} عزیز، پیام جدیدی از مطب درباره {service_title} دریافت کرده‌اید. لطفاً وارد پنل شوید.",
    ),
    "patient_message_received": (
        "پیام جدید بیمار",
        "پیام جدیدی از {patient_name} برای خدمت {service_title} ثبت شد.",
    ),
    "appointment_reminder": (
        "یادآوری نوبت",
        "{patient_name} عزیز، یادآوری نوبت {service_title}: {appointment_date} ساعت {appointment_time}.",
    ),
}


ALLOWED_TEMPLATE_VARIABLES = {
    "patient_name",
    "service_title",
    "appointment_date",
    "appointment_time",
    "tracking_code",
    "amount_toman",
}


def seed_sms_rules(db: Session) -> None:
    existing = set(db.scalars(select(SmsAutomationRule.event_key)).all())
    for event_key, (title, default_template) in SMS_EVENT_CATALOG.items():
        if event_key not in existing:
            db.add(
                SmsAutomationRule(
                    event_key=event_key,
                    title=title,
                    enabled=False,
                    template_text=default_template,
                )
            )


def _variables(
    patient: Patient,
    appointment: Appointment | None,
    extra: dict[str, str | int] | None,
) -> dict[str, str]:
    values = {
        "patient_name": " ".join(filter(None, [patient.first_name, patient.last_name])) or "بیمار",
        "service_title": appointment.service.title if appointment else "خدمت انتخابی",
        "appointment_date": appointment.appointment_date.isoformat() if appointment else "",
        "appointment_time": appointment.start_time.strftime("%H:%M") if appointment else "",
        "tracking_code": appointment.tracking_code if appointment else "",
        "amount_toman": str(appointment.amount_paid_toman if appointment else 0),
    }
    for key, value in (extra or {}).items():
        if key in ALLOWED_TEMPLATE_VARIABLES:
            values[key] = str(value)
    return values


def queue_sms_event(
    db: Session,
    event_key: str,
    *,
    patient: Patient,
    appointment: Appointment | None = None,
    extra: dict[str, str | int] | None = None,
) -> SmsOutbox | None:
    rule = db.scalar(
        select(SmsAutomationRule).where(SmsAutomationRule.event_key == event_key)
    )
    if not rule or not rule.enabled or not rule.template_text.strip():
        return None
    variables = _variables(patient, appointment, extra)
    rendered = rule.template_text.format_map(defaultdict(str, variables)).strip()
    item = SmsOutbox(
        event_key=event_key,
        patient_id=patient.id,
        appointment_id=appointment.id if appointment else None,
        phone=patient.phone,
        rendered_body=rendered,
        provider_pattern_code=rule.provider_pattern_code,
        variables_json=json.dumps(variables, ensure_ascii=False),
        status="pending",
    )
    db.add(item)
    return item


def expire_unpaid_holds(db: Session) -> int:
    holds = db.scalars(
        select(BookingHold).where(
            BookingHold.status == "pending_payment",
            BookingHold.expires_at <= utcnow(),
        )
    ).all()
    for hold in holds:
        hold.status = "expired"
        if hold.payment:
            hold.payment.status = "expired"
        queue_sms_event(
            db,
            "payment_abandoned",
            patient=hold.patient,
            extra={
                "service_title": hold.service.title,
                "amount_toman": hold.amount_toman,
            },
        )
    if holds:
        db.commit()
    return len(holds)


def queue_appointment_reminders(db: Session, hours_ahead: int | None = None) -> int:
    del hours_ahead
    from .appointment_operations import queue_scheduled_reminders

    return queue_scheduled_reminders(db)


def _refresh_campaign_progress(db: Session, campaign_ids: set[int]) -> None:
    for campaign_id in campaign_ids:
        campaign = db.get(SmsCampaign, campaign_id)
        if not campaign:
            continue
        campaign.sent_count = len(
            db.scalars(
                select(SmsOutbox.id).where(
                    SmsOutbox.campaign_id == campaign_id,
                    SmsOutbox.status == "sent",
                )
            ).all()
        )
        campaign.failed_count = len(
            db.scalars(
                select(SmsOutbox.id).where(
                    SmsOutbox.campaign_id == campaign_id,
                    SmsOutbox.status == "failed",
                    SmsOutbox.attempts >= 3,
                )
            ).all()
        )
        campaign.status = (
            "completed"
            if campaign.sent_count + campaign.failed_count >= campaign.recipient_count
            else "sending"
        )


def dispatch_pending_sms(db: Session, limit: int = 20) -> int:
    items = db.scalars(
        select(SmsOutbox)
        .where(SmsOutbox.status.in_(["pending", "failed"]), SmsOutbox.attempts < 3)
        .order_by(SmsOutbox.created_at, SmsOutbox.id)
        .limit(limit)
    ).all()
    if not items:
        return 0
    campaign_ids = {item.campaign_id for item in items if item.campaign_id is not None}
    try:
        provider = get_sms_provider()
    except SmsDeliveryError as exc:
        for item in items:
            item.attempts += 1
            item.status = "failed"
            item.last_error = str(exc)[:500]
        _refresh_campaign_progress(db, campaign_ids)
        db.commit()
        return 0
    sent = 0
    for item in items:
        item.attempts += 1
        try:
            provider.send_event(
                item.phone,
                item.rendered_body,
                item.provider_pattern_code,
                json.loads(item.variables_json),
            )
            item.status = "sent"
            item.sent_at = utcnow()
            item.last_error = None
            sent += 1
        except (SmsDeliveryError, ValueError, TypeError) as exc:
            item.status = "failed"
            item.last_error = str(exc)[:500]
    _refresh_campaign_progress(db, campaign_ids)
    db.commit()
    return sent
