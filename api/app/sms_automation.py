from __future__ import annotations

import json
from collections import defaultdict
from datetime import timedelta
import secrets
from sqlalchemy import select, text, or_
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
    dedupe_key: str | None = None,
) -> SmsOutbox | None:
    if dedupe_key:
        existing = db.scalar(select(SmsOutbox).where(SmsOutbox.dedupe_key == dedupe_key))
        if existing:
            return existing
    rule = db.scalar(
        select(SmsAutomationRule).where(SmsAutomationRule.event_key == event_key)
    )
    if not rule or not rule.enabled or not rule.template_text.strip():
        return None
    variables = _variables(patient, appointment, extra)
    rendered = rule.template_text.format_map(defaultdict(str, variables)).strip()
    item = SmsOutbox(
        dedupe_key=dedupe_key,
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
    db.commit()
    # Cheap read first: anonymous availability requests call this on every hit, and the write
    # lock below would otherwise serialize every request behind SQLite's single writer.
    if not db.scalar(
        select(BookingHold.id)
        .where(BookingHold.status == "pending_payment", BookingHold.expires_at <= utcnow())
        .limit(1)
    ):
        return 0
    db.execute(text("BEGIN IMMEDIATE"))
    db.expire_all()
    holds = db.scalars(
        select(BookingHold).where(
            BookingHold.status == "pending_payment",
            BookingHold.expires_at <= utcnow(),
        )
    ).all()
    for hold in holds:
        if hold.payment and hold.payment.status in {"verified", "verified_conflict"}:
            continue
        hold.status = "expired"
        if hold.payment:
            hold.payment.status = "expired"
        queue_sms_event(
            db,
            "payment_abandoned",
            dedupe_key=f"hold:{hold.id}:abandoned",
            patient=hold.patient,
            extra={
                "service_title": hold.service.title,
                "amount_toman": hold.amount_toman,
            },
        )
    db.commit()
    return len(holds)


def queue_appointment_reminders(db: Session, hours_ahead: int | None = None) -> int:
    del hours_ahead
    from .appointment_operations import queue_scheduled_reminders

    return queue_scheduled_reminders(db)


def cancel_abandoned_notice(db: Session, hold_id: str) -> None:
    item = db.scalar(select(SmsOutbox).where(SmsOutbox.dedupe_key == f"hold:{hold_id}:abandoned"))
    if item and item.status in {"pending", "failed"}:
        item.status = "cancelled"
        item.next_attempt_at = None
        item.last_error = "پرداخت تأیید شد؛ اعلان پرداخت ناموفق لغو شد"


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
    """Claim one durable job before network I/O; bounded retries across restarts.

    Delivery is at-least-once: a provider accepting a message followed by process
    death before the receipt commit can result in a retry after the lease expires.
    No unsupported exactly-once delivery promise is made.
    """
    from .runtime_settings import get_settings
    if get_settings().sms_provider == "disabled":
        return 0  # Deliberate suspension must not consume the retry budget.
    sent = 0
    for _ in range(max(0, min(limit, 200))):
        db.commit()
        db.execute(text("BEGIN IMMEDIATE"))
        db.expire_all()
        now = utcnow()
        stale = db.scalars(select(SmsOutbox).where(
            SmsOutbox.status == "sending", SmsOutbox.claim_until <= now)).all()
        for row in stale:
            row.status = "failed"
            row.claim_token = row.claim_until = None
            row.last_error = "پاسخ ارسال قبلی ثبت نشد؛ احتمال دریافت پیام وجود دارد"
            row.next_attempt_at = now + timedelta(minutes=5)
        db.flush()
        _refresh_campaign_progress(db, {r.campaign_id for r in stale if r.campaign_id})
        item = db.scalar(select(SmsOutbox).where(
            SmsOutbox.status.in_(["pending", "failed"]), SmsOutbox.attempts < 3,
            or_(SmsOutbox.next_attempt_at.is_(None), SmsOutbox.next_attempt_at <= now),
        ).order_by(SmsOutbox.created_at, SmsOutbox.id).limit(1))
        if not item:
            db.commit()
            break
        token = secrets.token_hex(24)
        item.status, item.claim_token = "sending", token
        item.claim_until = now + timedelta(minutes=2)
        item.attempts += 1
        item_id = item.id
        # Snapshot only the data required for this claimed message.
        phone, body, pattern, variables = item.phone, item.rendered_body, item.provider_pattern_code, item.variables_json
        db.commit()
        error = False
        try:
            get_sms_provider().send_event(phone, body, pattern, json.loads(variables))
        except (SmsDeliveryError, ValueError, TypeError):
            error = True
        db.execute(text("BEGIN IMMEDIATE"))
        db.expire_all()
        item = db.get(SmsOutbox, item_id)
        if item and item.status == "sending" and item.claim_token == token:
            item.claim_token = item.claim_until = None
            item.status = "failed" if error else "sent"
            item.last_error = "ارسال ناموفق بود؛ تنظیمات سرویس و گزارش ارائه‌دهنده را بررسی کنید" if error else None
            item.next_attempt_at = utcnow() + timedelta(minutes=5 * item.attempts) if error else None
            if not error:
                item.sent_at = utcnow()
                sent += 1
            db.flush()
            _refresh_campaign_progress(db, {item.campaign_id} if item.campaign_id else set())
        db.commit()
    return sent
