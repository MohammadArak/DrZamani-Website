from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from .models import Appointment, ClinicSetting


def _escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("\r", "")
        .replace("\n", "\\n")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def _fold(line: str) -> list[str]:
    if len(line.encode("utf-8")) <= 75:
        return [line]
    result: list[str] = []
    current = ""
    prefix = ""
    for character in line:
        candidate = f"{prefix}{current}{character}"
        if len(candidate.encode("utf-8")) > 75 and current:
            result.append(f"{prefix}{current}")
            prefix = " "
            current = character
        else:
            current += character
    if current:
        result.append(f"{prefix}{current}")
    return result


def appointment_ics(item: Appointment, settings: ClinicSetting) -> bytes:
    calendar_host = urlparse(settings.site_url).hostname or "clinic.local"
    local_zone = ZoneInfo(settings.timezone_name)
    starts_at = datetime.combine(
        item.appointment_date,
        item.start_time,
        tzinfo=local_zone,
    ).astimezone(timezone.utc)
    ends_at = datetime.combine(
        item.appointment_date,
        item.end_time,
        tzinfo=local_zone,
    ).astimezone(timezone.utc)
    updated_at = (
        (item.updated_at or item.created_at)
        .replace(
            tzinfo=timezone.utc
            if (item.updated_at or item.created_at).tzinfo is None
            else (item.updated_at or item.created_at).tzinfo
        )
        .astimezone(timezone.utc)
    )
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:-//{_escape(settings.doctor_name)}//Appointment Portal//FA",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:appointment-{item.id}-{item.tracking_code}@{calendar_host}",
        f"DTSTAMP:{updated_at.strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART:{starts_at.strftime('%Y%m%dT%H%M%SZ')}",
        f"DTEND:{ends_at.strftime('%Y%m%dT%H%M%SZ')}",
        f"SEQUENCE:{item.patient_reschedule_count}",
        f"SUMMARY:{_escape(f'{item.service.title} - {settings.doctor_name}')}",
        f"LOCATION:{_escape(settings.address)}",
        f"DESCRIPTION:{_escape(f'کد پیگیری: {item.tracking_code}')}",
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "TRIGGER:-PT2H",
        "ACTION:DISPLAY",
        "DESCRIPTION:نوبت ثبت‌شده در مطب",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    folded = [part for line in lines for part in _fold(line)]
    return ("\r\n".join(folded) + "\r\n").encode("utf-8")
