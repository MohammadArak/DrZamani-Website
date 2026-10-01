from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from .models import Appointment, AppointmentReminder, ClinicSetting
from .sms_automation import queue_sms_event


def queue_scheduled_reminders(db: Session) -> int:
    db.commit()
    db.execute(text("BEGIN IMMEDIATE"))
    db.expire_all()
    settings = db.get(ClinicSetting, 1)
    if not settings or not settings.reminder_enabled:
        db.rollback()
        return 0

    timezone_info = ZoneInfo(settings.timezone_name)
    local_now = datetime.now(timezone_info)
    max_hours = max(settings.first_reminder_hours, settings.final_reminder_hours)
    boundary = local_now + timedelta(hours=max_hours)
    appointments = list(
        db.scalars(
            select(Appointment).where(
                Appointment.appointment_date.between(
                    local_now.date(),
                    boundary.date(),
                ),
                Appointment.status.in_(["pending", "confirmed"]),
            )
        ).all()
    )

    queued = 0
    reminder_windows = [
        ("first", settings.first_reminder_hours),
        ("final", settings.final_reminder_hours),
    ]
    for appointment in appointments:
        appointment_at = datetime.combine(
            appointment.appointment_date,
            appointment.start_time,
            tzinfo=timezone_info,
        )
        if appointment_at <= local_now:
            continue

        eligible = sorted(
            [
                (key, hours, appointment_at - timedelta(hours=hours))
                for key, hours in reminder_windows
                if appointment_at - timedelta(hours=hours) <= local_now
            ],
            key=lambda item: item[1],
        )
        if not eligible:
            continue

        reminder_key, hours_before, scheduled_for = eligible[0]
        already_queued = db.scalar(
            select(AppointmentReminder.id).where(
                AppointmentReminder.appointment_id == appointment.id,
                AppointmentReminder.reminder_key == reminder_key,
            )
        )
        if already_queued:
            continue

        outbox = queue_sms_event(
            db,
            "appointment_reminder",
            dedupe_key=f"reminder:{appointment.id}:{reminder_key}",
            patient=appointment.patient,
            appointment=appointment,
        )
        if not outbox:
            continue

        db.flush()
        db.add(
            AppointmentReminder(
                appointment_id=appointment.id,
                reminder_key=reminder_key,
                hours_before=hours_before,
                scheduled_for=scheduled_for.astimezone(timezone.utc).replace(tzinfo=None),
                outbox_id=outbox.id,
            )
        )
        queued += 1

    db.commit()
    return queued
