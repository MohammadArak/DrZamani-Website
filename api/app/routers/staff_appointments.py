from __future__ import annotations

import math
from datetime import date, datetime
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..appointment_export import build_appointments_workbook
from ..activity import record_audit
from ..database import get_db
from ..dependencies import require_permission
from ..access import can
from ..models import (
    Appointment,
    ClinicSetting,
    StaffUser,
)
from ..schemas import (
    AppointmentRead,
    AppointmentPage,
    AppointmentStatusUpdate,
    AppointmentReschedule,
)
from ..security import utcnow
from ..scheduling import (
    ensure_bookable_date,
    list_available_slots,
    slot_key_for_appointment,
)
from ..sms_automation import (
    queue_sms_event,
)
from ..waitlist import offer_cancelled_slot


from .staff_common import _staff_appointment, _appointments_query

router = APIRouter()


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
    total = (
        db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        or 0
    )
    total_pages = max(1, math.ceil(total / page_size))
    actual_page = min(page, total_pages)
    items = (
        db.scalars(
            query.order_by(Appointment.created_at.desc(), Appointment.id.desc())
            .offset((actual_page - 1) * page_size)
            .limit(page_size)
        )
        .unique()
        .all()
    )
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
    items = (
        db.scalars(query.order_by(Appointment.created_at.desc(), Appointment.id.desc()))
        .unique()
        .all()
    )
    record_audit(
        db,
        action="appointments.exported",
        entity_type="appointment",
        entity_id=None,
        summary="دریافت خروجی اکسل نوبت‌ها",
        actor_staff_id=_staff.id,
        details={"count": len(items), "includes_notes": can(_staff, "patients.records.view")},
    )
    db.commit()
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد"
        )
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
    if "staff_note" in payload.model_fields_set and not can(
        staff, "patients.records.edit"
    ):
        raise HTTPException(403, "مجوز ویرایش یادداشت پرونده ندارید")
    previous_status = item.status
    item.status = payload.status
    if "staff_note" in payload.model_fields_set:
        item.staff_note = payload.staff_note
    if payload.status == "cancelled":
        item.slot_key = None
        item.cancelled_at = utcnow()
        queue_sms_event(
            db, "appointment_cancelled", patient=item.patient, appointment=item
        )
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
    return _staff_appointment(item, staff)


@router.patch(
    "/appointments/{appointment_id}/reschedule", response_model=AppointmentRead
)
def reschedule_appointment(
    appointment_id: int,
    payload: AppointmentReschedule,
    staff: StaffUser = Depends(require_permission("appointments.reschedule")),
    db: Session = Depends(get_db),
) -> AppointmentRead:
    item = db.get(Appointment, appointment_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="نوبت پیدا نشد"
        )
    if item.status not in {"pending", "confirmed"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="نوبت نهایی‌شده قابل جابه‌جایی نیست",
        )
    clinic = db.get(ClinicSetting, 1)
    if not clinic or not ensure_bookable_date(payload.appointment_date, clinic):
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="زمان جدید ظرفیت آزاد ندارد"
        )
    previous_date = item.appointment_date
    previous_start = item.start_time
    if (
        previous_date != payload.appointment_date
        or previous_start != payload.start_time
    ):
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
    queue_sms_event(
        db, "appointment_rescheduled", patient=item.patient, appointment=item
    )
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="این زمان هم‌اکنون رزرو شد"
        ) from exc
    db.refresh(item)
    return _staff_appointment(item, staff)
