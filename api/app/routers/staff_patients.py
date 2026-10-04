from __future__ import annotations

import json
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..activity import record_audit
from ..database import get_db
from ..dependencies import require_permission
from ..access import can
from ..models import (
    Patient,
    StaffUser,
)
from ..schemas import (
    PatientPage,
    PatientRecordRead,
    PatientRecordUpdate,
)
from ..security import normalize_digits, normalize_phone


from .staff_common import _patient_summaries, _staff_patient_item, _staff_record

router = APIRouter()


@router.get("/patients", response_model=PatientPage)
def patients(
    search: str | None = None,
    tag: str | None = None,
    needs_follow_up: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=5, le=100),
    _staff: StaffUser = Depends(require_permission("patients.view")),
    db: Session = Depends(get_db),
) -> PatientPage:
    if (tag or needs_follow_up) and not can(_staff, "patients.records.view"):
        raise HTTPException(403, "جست‌وجوی بالینی نیازمند مجوز پرونده است")
    query = select(Patient)
    if search:
        normalized = normalize_digits(search).strip()
        predicates = [
            Patient.first_name.contains(normalized),
            Patient.last_name.contains(normalized),
            Patient.phone.contains(normalized),
            Patient.national_id.contains(normalized),
            Patient.foreign_identifier.contains(normalized),
        ]
        try:
            predicates.append(Patient.phone == normalize_phone(normalized))
        except ValueError:
            pass
        if not can(_staff, "patients.records.view"):
            predicates = predicates[:3]
        query = query.where(or_(*predicates))
    if tag:
        query = query.where(
            Patient.tags_json.contains(json.dumps(tag, ensure_ascii=False))
        )
    if needs_follow_up:
        query = query.where(Patient.needs_follow_up.is_(True))
    total = (
        db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        or 0
    )
    total_pages = max(1, math.ceil(total / page_size))
    actual_page = min(page, total_pages)
    items = list(
        db.scalars(
            query.order_by(Patient.created_at.desc(), Patient.id.desc())
            .offset((actual_page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    all_tags = (
        sorted(
            {
                tag_value
                for raw_tags in db.scalars(select(Patient.tags_json).where(Patient.tags_json.is_not(None), Patient.tags_json.not_in(["", "[]"]))).all()
                for tag_value in (
                    json.loads(raw_tags or "[]") if isinstance(raw_tags, str) else []
                )
                if isinstance(tag_value, str) and tag_value.strip()
            }
        )
        if can(_staff, "patients.records.view")
        else []
    )
    summaries = (
        _patient_summaries(db, items) if can(_staff, "appointments.view") else {}
    )
    return PatientPage(
        items=[
            _staff_patient_item(
                db, item, _staff, summaries.get(item.id, (0, 0, None, None))
            )
            for item in items
        ],
        available_tags=all_tags if can(_staff, "patients.records.view") else [],
        total=total,
        page=actual_page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/patients/{patient_id}", response_model=PatientRecordRead)
def patient_record(
    patient_id: int,
    staff: StaffUser = Depends(require_permission("patients.records.view")),
    db: Session = Depends(get_db),
) -> PatientRecordRead:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="بیمار پیدا نشد"
        )
    record_audit(
        db,
        action="patient.record_viewed",
        entity_type="patient",
        entity_id=patient.id,
        summary="مشاهده پرونده بیمار",
        actor_staff_id=staff.id,
    )
    db.commit()
    return _staff_record(db, patient, staff)


@router.patch("/patients/{patient_id}", response_model=PatientRecordRead)
def update_patient_record(
    patient_id: int,
    payload: PatientRecordUpdate,
    staff: StaffUser = Depends(require_permission("patients.records.edit")),
    db: Session = Depends(get_db),
) -> PatientRecordRead:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="بیمار پیدا نشد"
        )
    previous_follow_up = patient.needs_follow_up
    patient.internal_note = payload.internal_note
    patient.tags_json = json.dumps(payload.tags, ensure_ascii=False)
    patient.needs_follow_up = payload.needs_follow_up
    record_audit(
        db,
        action="patient.record_updated",
        entity_type="patient",
        entity_id=patient.id,
        summary="به‌روزرسانی پرونده داخلی بیمار",
        actor_staff_id=staff.id,
        details={
            "tags": payload.tags,
            "follow_up_from": previous_follow_up,
            "follow_up_to": payload.needs_follow_up,
        },
    )
    db.commit()
    db.refresh(patient)
    return _staff_record(db, patient, staff)
