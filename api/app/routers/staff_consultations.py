from __future__ import annotations

from fastapi import Query, Response
from sqlalchemy.exc import IntegrityError
from ..consultations import message_page, retry_message
from ..schemas import ConsultationMessagePage
from ..realtime import publish_consultation_read_event

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select, or_
from sqlalchemy.orm import Session, joinedload

from ..consultations import attachment_path
from ..database import get_db
from ..dependencies import require_permission
from ..access import can
from ..models import (
    Appointment,
    ConsultationMessage,
    Patient,
    Service,
    StaffUser,
)
from ..schemas import (
    ConsultationMessageCreate,
    ConsultationMessageRead,
    ConsultationThreadRead,
)
from ..security import utcnow, normalize_digits, normalize_phone
from ..realtime import publish_consultation_event
from ..sms_automation import (
    queue_sms_event,
)


from .staff_common import _staff_message, _staff_consultation_appointment

router = APIRouter()


@router.get("/consultations", response_model=list[ConsultationThreadRead])
def consultation_threads(
    response: Response,
    search: str | None = Query(default=None, max_length=120),
    _staff: StaffUser = Depends(require_permission("consultations.view")),
    db: Session = Depends(get_db),
) -> list[ConsultationThreadRead]:
    response.headers["Cache-Control"] = "no-store"
    query = select(Appointment).join(Appointment.service).join(Appointment.patient).where(Service.allows_media_chat.is_(True))
    if search and search.strip():
        needle = normalize_digits(search).strip()
        full_name = func.coalesce(Patient.first_name, "") + " " + func.coalesce(Patient.last_name, "")
        predicates = [full_name.icontains(needle, autoescape=True), Patient.phone.contains(needle, autoescape=True), Service.title.icontains(needle, autoescape=True),
                      select(ConsultationMessage.id).where(ConsultationMessage.appointment_id == Appointment.id, or_(ConsultationMessage.body.icontains(needle, autoescape=True), ConsultationMessage.body.icontains(search.strip(), autoescape=True))).exists()]
        try:
            predicates.append(Patient.phone == normalize_phone(needle))
        except ValueError:
            pass
        # Match the existing patient-record search permission; never return the identifier.
        if can(_staff, "patients.records.view"):
            predicates.append(Patient.national_id.contains(needle, autoescape=True))
        query = query.where(or_(*predicates))
    chat_ids = query.with_only_columns(Appointment.id)
    appointments = db.scalars(query.options(joinedload(Appointment.patient), joinedload(Appointment.service)).order_by(Appointment.created_at.desc(), Appointment.id.desc())).unique().all()
    unread_by_appointment = dict(
        db.execute(
            select(ConsultationMessage.appointment_id, func.count())
            .where(
                ConsultationMessage.appointment_id.in_(chat_ids),
                ConsultationMessage.sender_type == "patient",
                ConsultationMessage.read_at.is_(None),
            )
            .group_by(ConsultationMessage.appointment_id)
        ).all()
    )
    newest = (
        select(
            ConsultationMessage.id.label("id"),
            func.row_number()
            .over(
                partition_by=ConsultationMessage.appointment_id,
                order_by=(ConsultationMessage.created_at.desc(), ConsultationMessage.id.desc()),
            )
            .label("position"),
        )
        .where(ConsultationMessage.appointment_id.in_(chat_ids))
        .subquery()
    )
    last_by_appointment = {
        message.appointment_id: message
        for message in db.scalars(
            select(ConsultationMessage).join(newest, newest.c.id == ConsultationMessage.id).where(newest.c.position == 1)
        )
    }
    result: list[ConsultationThreadRead] = []
    for item in appointments:
        last_message = last_by_appointment.get(item.id)
        unread_count = unread_by_appointment.get(item.id, 0)
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
                last_message_at=(last_message.created_at.replace(tzinfo=timezone.utc) if last_message.created_at.tzinfo is None else last_message.created_at) if last_message else None,
                last_sender_type=last_message.sender_type if last_message else None,
                unread_count=unread_count,
            )
        )
    result.sort(key=lambda item: item.last_message_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
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



@router.get("/appointments/{appointment_id}/consultation/sync", response_model=ConsultationMessagePage)
def staff_consultation_sync(appointment_id:int, background_tasks:BackgroundTasks, response:Response, after_id:int|None=Query(None,gt=0), before_id:int|None=Query(None,gt=0), limit:int=Query(50,ge=1,le=100), staff:StaffUser=Depends(require_permission("consultations.view")), db:Session=Depends(get_db)):
    appointment=_staff_consultation_appointment(db,appointment_id)
    page,ack=message_page(db,appointment_id,"staff",lambda item:_staff_message(item,staff),after_id=after_id,before_id=before_id,limit=limit)
    if not can(staff,"images.view"): page.uploaded_requirement_ids=[]
    response.headers["Cache-Control"]="no-store"
    if ack: background_tasks.add_task(publish_consultation_read_event,appointment_id=appointment_id,patient_id=appointment.patient_id,sender_type="staff",message_id=ack)
    return page

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
    previous=retry_message(db,appointment_id,"staff",payload.client_nonce,payload.body)
    if previous: return _staff_message(previous,staff)
    message = ConsultationMessage(
        appointment_id=appointment_id,
        sender_type="staff",
        sender_staff_id=staff.id,
        body=payload.body,
        client_nonce=payload.client_nonce,
    )
    db.add(message)
    try: db.flush()
    except IntegrityError:
        db.rollback()
        previous=retry_message(db,appointment_id,"staff",payload.client_nonce,payload.body)
        if previous: return _staff_message(previous,staff)
        raise
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
