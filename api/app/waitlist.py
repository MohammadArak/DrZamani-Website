from __future__ import annotations

from datetime import timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .models import Appointment, WaitlistEntry
from .security import utcnow
from .sms_automation import queue_sms_event


def expire_waitlist_offers(db: Session) -> int:
    items = db.scalars(
        select(WaitlistEntry).where(
            WaitlistEntry.status == "notified",
            WaitlistEntry.expires_at.is_not(None),
            WaitlistEntry.expires_at <= utcnow(),
        )
    ).all()
    for item in items:
        item.status = "expired"
    return len(items)


def offer_cancelled_slot(db: Session, appointment: Appointment) -> WaitlistEntry | None:
    expire_waitlist_offers(db)
    entry = db.scalar(
        select(WaitlistEntry)
        .where(
            WaitlistEntry.service_id == appointment.service_id,
            WaitlistEntry.is_urgent == appointment.is_urgent,
            WaitlistEntry.status == "waiting",
            or_(
                WaitlistEntry.desired_date.is_(None),
                WaitlistEntry.desired_date == appointment.appointment_date,
            ),
        )
        .order_by(WaitlistEntry.created_at, WaitlistEntry.id)
        .limit(1)
    )
    if not entry:
        return None
    entry.status = "notified"
    entry.offered_date = appointment.appointment_date
    entry.offered_start_time = appointment.start_time
    entry.offered_end_time = appointment.end_time
    entry.notified_at = utcnow()
    entry.expires_at = utcnow() + timedelta(minutes=30)
    queue_sms_event(
        db,
        "waitlist_slot_available",
        patient=entry.patient,
        appointment=appointment,
    )
    return entry
