from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    Appointment,
    BookingHold,
    ClinicSetting,
    ScheduleException,
    Service,
    ServiceScheduleException,
    ServiceWeeklySchedule,
    ServiceUrgentSchedule,
    WeeklySchedule,
)
from .security import utcnow


def combine_local(day: date, value: time, timezone_name: str) -> datetime:
    return datetime.combine(day, value, tzinfo=ZoneInfo(timezone_name))


def day_period(
    db: Session,
    day: date,
    service: Service | None = None,
) -> tuple[time, time] | None:
    exception = db.scalar(
        select(ScheduleException).where(ScheduleException.exception_date == day)
    )
    if exception and exception.is_closed:
        return None
    if service:
        service_exception = db.scalar(
            select(ServiceScheduleException).where(
                ServiceScheduleException.service_id == service.id,
                ServiceScheduleException.exception_date == day,
            )
        )
        if service_exception:
            if (
                service_exception.is_closed
                or not service_exception.start_time
                or not service_exception.end_time
            ):
                return None
            return service_exception.start_time, service_exception.end_time
    if exception:
        if not exception.start_time or not exception.end_time:
            return None
        return exception.start_time, exception.end_time
    weekly = None
    if service:
        weekly = db.scalar(
            select(ServiceWeeklySchedule).where(
                ServiceWeeklySchedule.service_id == service.id,
                ServiceWeeklySchedule.weekday == day.weekday(),
            )
        )
    if weekly is None:
        weekly = db.scalar(
            select(WeeklySchedule).where(WeeklySchedule.weekday == day.weekday())
        )
    if not weekly or not weekly.enabled:
        return None
    return weekly.start_time, weekly.end_time


def urgent_day_period(db: Session, day: date, service: Service) -> tuple[time, time] | None:
    exception = db.scalar(
        select(ScheduleException).where(ScheduleException.exception_date == day)
    )
    if exception and exception.is_closed:
        return None
    service_exception = db.scalar(
        select(ServiceScheduleException).where(
            ServiceScheduleException.service_id == service.id,
            ServiceScheduleException.exception_date == day,
        )
    )
    if service_exception:
        if (
            service_exception.is_closed
            or not service_exception.start_time
            or not service_exception.end_time
        ):
            return None
        return service_exception.start_time, service_exception.end_time
    schedule = db.scalar(
        select(ServiceUrgentSchedule).where(
            ServiceUrgentSchedule.service_id == service.id,
            ServiceUrgentSchedule.weekday == day.weekday(),
        )
    )
    if not service.urgent_enabled or not schedule or not schedule.enabled:
        return None
    return schedule.start_time, schedule.end_time


def list_available_slots(
    db: Session,
    day: date,
    settings: ClinicSetting,
    duration_minutes: int | None = None,
    service: Service | None = None,
    is_urgent: bool = False,
    exclude_appointment_id: int | None = None,
    exclude_hold_id: str | None = None,
) -> list[tuple[time, time]]:
    period = (
        urgent_day_period(db, day, service)
        if is_urgent and service
        else day_period(db, day, service)
    )
    if not period:
        return []
    start, end = period
    local_now = datetime.now(ZoneInfo(settings.timezone_name))
    earliest = local_now + timedelta(hours=settings.minimum_lead_hours)
    cursor = combine_local(day, start, settings.timezone_name)
    boundary = combine_local(day, end, settings.timezone_name)
    duration = timedelta(minutes=duration_minutes or settings.slot_duration_minutes)
    appointment_query = select(Appointment).where(
        Appointment.appointment_date == day,
        Appointment.slot_key.is_not(None),
    )
    hold_query = select(BookingHold).where(
        BookingHold.appointment_date == day,
        BookingHold.status == "pending_payment",
        BookingHold.expires_at > utcnow(),
    )
    if service:
        appointment_query = appointment_query.where(Appointment.service_id == service.id)
        hold_query = hold_query.where(BookingHold.service_id == service.id)
    if exclude_appointment_id is not None:
        appointment_query = appointment_query.where(Appointment.id != exclude_appointment_id)
    if exclude_hold_id is not None:
        hold_query = hold_query.where(BookingHold.id != exclude_hold_id)

    occupied: list[tuple[datetime, datetime]] = []
    for appointment in db.scalars(appointment_query).unique().all():
        before = timedelta(minutes=appointment.service.buffer_before_minutes)
        after = timedelta(minutes=appointment.service.buffer_after_minutes)
        occupied.append(
            (
                combine_local(day, appointment.start_time, settings.timezone_name) - before,
                combine_local(day, appointment.end_time, settings.timezone_name) + after,
            )
        )
    for hold in db.scalars(hold_query).unique().all():
        before = timedelta(minutes=hold.service.buffer_before_minutes)
        after = timedelta(minutes=hold.service.buffer_after_minutes)
        occupied.append(
            (
                combine_local(day, hold.start_time, settings.timezone_name) - before,
                combine_local(day, hold.end_time, settings.timezone_name) + after,
            )
        )

    candidate_before = timedelta(minutes=service.buffer_before_minutes if service else 0)
    candidate_after = timedelta(minutes=service.buffer_after_minutes if service else 0)
    capacity = service.concurrent_capacity if service else 1
    result: list[tuple[time, time]] = []
    while cursor + duration <= boundary:
        candidate_start = cursor - candidate_before
        candidate_end = cursor + duration + candidate_after
        overlap_count = sum(
            candidate_start < occupied_end and candidate_end > occupied_start
            for occupied_start, occupied_end in occupied
        )
        if cursor >= earliest and overlap_count < capacity:
            result.append((cursor.time().replace(tzinfo=None), (cursor + duration).time().replace(tzinfo=None)))
        cursor += duration
    return result


def ensure_bookable_date(day: date, settings: ClinicSetting) -> bool:
    local_today = datetime.now(ZoneInfo(settings.timezone_name)).date()
    return local_today <= day <= local_today + timedelta(days=settings.booking_horizon_days)


def slot_key_for_appointment(
    db: Session,
    item: Appointment,
    appointment_date: date,
    start_time: time,
) -> str:
    prefix = (
        f"{appointment_date.strftime('%Y%m%d')}-"
        f"{start_time.strftime('%H%M')}-{item.service_id}-"
    )
    used = set(
        db.scalars(
            select(Appointment.slot_key).where(
                Appointment.id != item.id,
                Appointment.slot_key.like(f"{prefix}%"),
            )
        ).all()
    )
    lane = next(
        (number for number in range(1, 100) if f"{prefix}{number}" not in used),
        99,
    )
    return f"{prefix}{lane}"
