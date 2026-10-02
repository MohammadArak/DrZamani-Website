from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_staff, require_permission
from ..access import can, identity
from ..models import (
    Appointment,
    ClinicSetting,
    ConsultationMessage,
    Patient,
    Payment,
    StaffUser,
    WaitlistEntry,
)
from ..schemas import (
    AppointmentChartPoint,
    DashboardStats,
    StaffProfile,
)


router = APIRouter()


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
    today_total = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.appointment_date == today)
        )
        or 0
    )
    pending_total = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.status == "pending")
        )
        or 0
    )
    confirmed_total = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.status == "confirmed")
        )
        or 0
    )
    patients_total = db.scalar(select(func.count()).select_from(Patient)) or 0
    unread_conversations = (
        db.scalar(
            select(func.count())
            .select_from(ConsultationMessage)
            .where(
                ConsultationMessage.sender_type == "patient",
                ConsultationMessage.read_at.is_(None),
            )
        )
        or 0
    )
    waitlist_total = (
        db.scalar(
            select(func.count())
            .select_from(WaitlistEntry)
            .where(WaitlistEntry.status.in_(["waiting", "notified"]))
        )
        or 0
    )
    refund_attention_total = (
        db.scalar(
            select(func.count())
            .select_from(Payment)
            .where(Payment.refund_status.in_(["requested", "processing"]))
        )
        or 0
    )
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
        unread_conversations=unread_conversations
        if can(_staff, "consultations.view")
        else 0,
        waitlist_total=waitlist_total if can(_staff, "waitlist.view") else 0,
        refund_attention_total=refund_attention_total
        if can(_staff, "finance.view")
        else 0,
        daily_appointments=[
            AppointmentChartPoint(date=appointment_date, total=total)
            for appointment_date, total in daily_rows
            if can(_staff, "appointments.view")
        ],
    )
