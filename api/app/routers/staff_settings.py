from __future__ import annotations

import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..activity import record_audit
from ..appointment_operations import queue_scheduled_reminders
from ..database import get_db
from ..dependencies import require_permission
from ..models import (
    ClinicSetting,
    ScheduleException,
    Service,
    ServiceImageRequirement,
    ServiceIntakeQuestion,
    ServiceConsent,
    ServiceScheduleException,
    ServiceWeeklySchedule,
    ServiceUrgentSchedule,
    StaffUser,
    WeeklySchedule,
)
from ..schemas import (
    ApiMessage,
    ClinicSettingRead,
    ClinicSettingUpdate,
    OperationsRunResult,
    ScheduleExceptionRead,
    ScheduleExceptionWrite,
    ServiceScheduleExceptionRead,
    ServiceScheduleExceptionWrite,
    ServiceRead,
    ServiceWrite,
    WeeklyScheduleRead,
    WeeklyScheduleWrite,
)
from ..sms_automation import (
    dispatch_pending_sms,
)


from .staff_common import _default_service_schedule

router = APIRouter()


@router.get("/settings", response_model=ClinicSettingRead)
def settings(
    _staff: StaffUser = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
) -> ClinicSetting:
    item = db.get(ClinicSetting, 1)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="تنظیمات پیدا نشد"
        )
    from ..booking_policy import public_clinic

    return public_clinic(item, db)


@router.put("/settings", response_model=ClinicSettingRead)
def update_settings(
    payload: ClinicSettingUpdate,
    staff: StaffUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
) -> ClinicSetting:
    from ..runtime_settings import update_clinic
    from ..booking_policy import public_clinic

    return public_clinic(update_clinic(db, staff, payload), db)


@router.post("/operations/run", response_model=OperationsRunResult)
def run_scheduled_operations(
    _staff: StaffUser = Depends(require_permission("operations.run")),
    db: Session = Depends(get_db),
) -> OperationsRunResult:
    queued_reminders = queue_scheduled_reminders(db)
    sms_sent = dispatch_pending_sms(db, limit=200)
    return OperationsRunResult(
        queued_reminders=queued_reminders,
        sms_sent=sms_sent,
    )


@router.get("/schedule", response_model=list[WeeklyScheduleRead])
def weekly_schedule(
    _staff: StaffUser = Depends(require_permission("schedule.view")),
    db: Session = Depends(get_db),
) -> list[WeeklySchedule]:
    return list(db.scalars(select(WeeklySchedule).order_by(WeeklySchedule.weekday)))


@router.put("/schedule", response_model=list[WeeklyScheduleRead])
def update_weekly_schedule(
    payload: list[WeeklyScheduleWrite],
    _staff: StaffUser = Depends(require_permission("schedule.edit")),
    db: Session = Depends(get_db),
) -> list[WeeklySchedule]:
    if {item.weekday for item in payload} != set(range(7)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="برنامه هر هفت روز هفته باید ارسال شود",
        )
    existing = {item.weekday: item for item in db.scalars(select(WeeklySchedule)).all()}
    for schedule in payload:
        item = existing.get(schedule.weekday)
        if not item:
            item = WeeklySchedule(weekday=schedule.weekday)
            db.add(item)
        item.enabled = schedule.enabled
        item.start_time = schedule.start_time
        item.end_time = schedule.end_time
    db.commit()
    return list(db.scalars(select(WeeklySchedule).order_by(WeeklySchedule.weekday)))


@router.get("/exceptions", response_model=list[ScheduleExceptionRead])
def exceptions(
    start: date | None = None,
    end: date | None = None,
    _staff: StaffUser = Depends(require_permission("schedule.view")),
    db: Session = Depends(get_db),
) -> list[ScheduleException]:
    query = select(ScheduleException)
    if start:
        query = query.where(ScheduleException.exception_date >= start)
    if end:
        query = query.where(ScheduleException.exception_date <= end)
    return list(db.scalars(query.order_by(ScheduleException.exception_date)))


@router.post(
    "/exceptions",
    response_model=ScheduleExceptionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_exception(
    payload: ScheduleExceptionWrite,
    _staff: StaffUser = Depends(require_permission("schedule.create")),
    db: Session = Depends(get_db),
) -> ScheduleException:
    item = ScheduleException(**payload.model_dump())
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="برای این تاریخ قبلاً استثنا ثبت شده است",
        ) from exc
    db.refresh(item)
    return item


@router.delete("/exceptions/{exception_id}", response_model=ApiMessage)
def delete_exception(
    exception_id: int,
    _staff: StaffUser = Depends(require_permission("schedule.delete")),
    db: Session = Depends(get_db),
) -> ApiMessage:
    item = db.get(ScheduleException, exception_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="استثنا پیدا نشد"
        )
    db.delete(item)
    db.commit()
    return ApiMessage(message="استثنا حذف شد")


@router.get(
    "/services/{service_id}/exceptions",
    response_model=list[ServiceScheduleExceptionRead],
)
def service_exceptions(
    service_id: int,
    _staff: StaffUser = Depends(require_permission("schedule.view")),
    db: Session = Depends(get_db),
) -> list[ServiceScheduleException]:
    if not db.get(Service, service_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="خدمت پیدا نشد"
        )
    return list(
        db.scalars(
            select(ServiceScheduleException)
            .where(ServiceScheduleException.service_id == service_id)
            .order_by(ServiceScheduleException.exception_date)
        )
    )


@router.post(
    "/services/{service_id}/exceptions",
    response_model=ServiceScheduleExceptionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_service_exception(
    service_id: int,
    payload: ServiceScheduleExceptionWrite,
    staff: StaffUser = Depends(require_permission("schedule.create")),
    db: Session = Depends(get_db),
) -> ServiceScheduleException:
    service = db.get(Service, service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="خدمت پیدا نشد"
        )
    item = ServiceScheduleException(service_id=service_id, **payload.model_dump())
    db.add(item)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="برای این خدمت در تاریخ انتخاب‌شده قبلاً استثنا ثبت شده است",
        ) from exc
    record_audit(
        db,
        action="service.exception.created",
        entity_type="service",
        entity_id=service_id,
        summary=f"ثبت استثنای زمانی برای {service.title}",
        actor_staff_id=staff.id,
        details=payload.model_dump(mode="json"),
    )
    db.commit()
    db.refresh(item)
    return item


@router.delete(
    "/services/{service_id}/exceptions/{exception_id}", response_model=ApiMessage
)
def delete_service_exception(
    service_id: int,
    exception_id: int,
    staff: StaffUser = Depends(require_permission("schedule.delete")),
    db: Session = Depends(get_db),
) -> ApiMessage:
    item = db.scalar(
        select(ServiceScheduleException).where(
            ServiceScheduleException.id == exception_id,
            ServiceScheduleException.service_id == service_id,
        )
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="استثنا پیدا نشد"
        )
    db.delete(item)
    record_audit(
        db,
        action="service.exception.deleted",
        entity_type="service",
        entity_id=service_id,
        summary="حذف استثنای زمانی خدمت",
        actor_staff_id=staff.id,
        details={"exception_date": item.exception_date.isoformat()},
    )
    db.commit()
    return ApiMessage(message="استثنای خدمت حذف شد")


@router.get("/services", response_model=list[ServiceRead])
def all_services(
    _staff: StaffUser = Depends(require_permission("services.view")),
    db: Session = Depends(get_db),
) -> list[Service]:
    return list(db.scalars(select(Service).order_by(Service.sort_order, Service.id)))


@router.post(
    "/services", response_model=ServiceRead, status_code=status.HTTP_201_CREATED
)
def create_service(
    payload: ServiceWrite,
    staff: StaffUser = Depends(require_permission("services.create")),
    db: Session = Depends(get_db),
) -> Service:
    values = payload.model_dump(
        exclude={
            "image_requirements",
            "weekly_schedules",
            "urgent_schedules",
            "intake_questions",
            "consents",
        }
    )
    item = Service(**values)
    item.image_requirements = [
        ServiceImageRequirement(**entry.model_dump())
        for entry in payload.image_requirements
    ]
    item.weekly_schedules = (
        [
            ServiceWeeklySchedule(**entry.model_dump())
            for entry in payload.weekly_schedules
        ]
        if payload.weekly_schedules
        else _default_service_schedule(db)
    )
    item.urgent_schedules = [
        ServiceUrgentSchedule(**entry.model_dump())
        for entry in payload.urgent_schedules
    ]
    item.intake_questions = [
        ServiceIntakeQuestion(
            **entry.model_dump(exclude={"options"}),
            options_json=json.dumps(entry.options, ensure_ascii=False),
        )
        for entry in payload.intake_questions
    ]
    item.consents = [ServiceConsent(**entry.model_dump()) for entry in payload.consents]
    db.add(item)
    db.flush()
    record_audit(
        db,
        action="service.created",
        entity_type="service",
        entity_id=item.id,
        summary=f"ایجاد خدمت {item.title}",
        actor_staff_id=staff.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/services/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: int,
    payload: ServiceWrite,
    staff: StaffUser = Depends(require_permission("services.edit")),
    db: Session = Depends(get_db),
) -> Service:
    item = db.get(Service, service_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="خدمت پیدا نشد"
        )
    for field, value in payload.model_dump(
        exclude={
            "image_requirements",
            "weekly_schedules",
            "urgent_schedules",
            "intake_questions",
            "consents",
        }
    ).items():
        setattr(item, field, value)

    existing_requirements = {
        requirement.title.strip(): requirement
        for requirement in item.image_requirements
    }
    requested_titles: set[str] = set()
    for entry in payload.image_requirements:
        values = entry.model_dump()
        title = values.pop("title").strip()
        requested_titles.add(title)
        requirement = existing_requirements.get(title)
        if requirement is None:
            item.image_requirements.append(
                ServiceImageRequirement(title=title, **values)
            )
            continue
        for field, value in values.items():
            setattr(requirement, field, value)
    for title, requirement in existing_requirements.items():
        if title not in requested_titles:
            item.image_requirements.remove(requirement)

    if payload.weekly_schedules:
        existing_weekly_days = {
            schedule.weekday: schedule for schedule in item.weekly_schedules
        }
        requested_weekly_days: set[int] = set()
        for entry in payload.weekly_schedules:
            values = entry.model_dump()
            weekday = values.pop("weekday")
            requested_weekly_days.add(weekday)
            schedule = existing_weekly_days.get(weekday)
            if schedule is None:
                item.weekly_schedules.append(
                    ServiceWeeklySchedule(weekday=weekday, **values)
                )
                continue
            for field, value in values.items():
                setattr(schedule, field, value)
        for weekday, schedule in existing_weekly_days.items():
            if weekday not in requested_weekly_days:
                item.weekly_schedules.remove(schedule)

    existing_urgent_days = {
        schedule.weekday: schedule for schedule in item.urgent_schedules
    }
    requested_days: set[int] = set()
    for entry in payload.urgent_schedules:
        values = entry.model_dump()
        weekday = values.pop("weekday")
        requested_days.add(weekday)
        schedule = existing_urgent_days.get(weekday)
        if schedule is None:
            item.urgent_schedules.append(
                ServiceUrgentSchedule(weekday=weekday, **values)
            )
            continue
        for field, value in values.items():
            setattr(schedule, field, value)
    for weekday, schedule in existing_urgent_days.items():
        if weekday not in requested_days:
            item.urgent_schedules.remove(schedule)

    item.intake_questions.clear()
    item.intake_questions.extend(
        ServiceIntakeQuestion(
            **entry.model_dump(exclude={"options"}),
            options_json=json.dumps(entry.options, ensure_ascii=False),
        )
        for entry in payload.intake_questions
    )
    item.consents.clear()
    item.consents.extend(
        ServiceConsent(**entry.model_dump()) for entry in payload.consents
    )

    record_audit(
        db,
        action="service.updated",
        entity_type="service",
        entity_id=item.id,
        summary=f"ویرایش تنظیمات {item.title}",
        actor_staff_id=staff.id,
        details={
            "capacity": item.concurrent_capacity,
            "buffer_before": item.buffer_before_minutes,
            "buffer_after": item.buffer_after_minutes,
        },
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="اطلاعات تکراری یا نامعتبر در تنظیمات خدمت وجود دارد",
        ) from exc
    db.refresh(item)
    db.expire(
        item,
        [
            "image_requirements",
            "weekly_schedules",
            "urgent_schedules",
            "intake_questions",
            "consents",
        ],
    )
    return item
