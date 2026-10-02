from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..consultations import attachment_path
from ..database import get_db
from ..dependencies import require_permission
from ..access import can
from ..models import (
    Appointment,
    ConsultationMessage,
    Service,
    StaffUser,
)
from ..schemas import (
    ConsultationMessageCreate,
    ConsultationMessageRead,
    ConsultationThreadRead,
)
from ..security import utcnow
from ..realtime import publish_consultation_event
from ..sms_automation import (
    queue_sms_event,
)


from .staff_common import _staff_message, _staff_consultation_appointment

router = APIRouter()


@router.get("/consultations", response_model=list[ConsultationThreadRead])
def consultation_threads(
    _staff: StaffUser = Depends(require_permission("consultations.view")),
    db: Session = Depends(get_db),
) -> list[ConsultationThreadRead]:
    appointments = (
        db.scalars(
            select(Appointment)
            .join(Appointment.service)
            .where(Service.allows_media_chat.is_(True))
            .order_by(Appointment.created_at.desc())
        )
        .unique()
        .all()
    )
    result: list[ConsultationThreadRead] = []
    for item in appointments:
        last_message = db.scalar(
            select(ConsultationMessage)
            .where(ConsultationMessage.appointment_id == item.id)
            .order_by(
                ConsultationMessage.created_at.desc(), ConsultationMessage.id.desc()
            )
            .limit(1)
        )
        unread_count = (
            db.scalar(
                select(func.count())
                .select_from(ConsultationMessage)
                .where(
                    ConsultationMessage.appointment_id == item.id,
                    ConsultationMessage.sender_type == "patient",
                    ConsultationMessage.read_at.is_(None),
                )
            )
            or 0
        )
        result.append(
            ConsultationThreadRead(
                appointment_id=item.id,
                patient_name=" ".join(
                    filter(None, [item.patient.first_name, item.patient.last_name])
                )
                or "تکمیل‌نشده",
                patient_phone=item.patient.phone,
                service_title=item.service.title,
                appointment_date=item.appointment_date,
                appointment_time=item.start_time,
                appointment_status=item.status,
                patient_note=item.patient_note
                if can(_staff, "patients.records.view")
                else None,
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
    background_tasks.add_task(
        publish_consultation_event,
        appointment_id=appointment_id,
        patient_id=appointment.patient_id,
        sender_type="staff",
        message_id=message.id,
    )
    return _staff_message(message, staff)


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="تصویر پیدا نشد"
        )
    return FileResponse(attachment_path(message), media_type="image/webp")
