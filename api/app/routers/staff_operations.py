from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..activity import record_audit
from ..database import get_db
from ..dependencies import require_permission
from ..access import identity
from ..models import (
    AuditLog,
    Payment,
    StaffUser,
    WaitlistEntry,
)
from ..schemas import (
    AuditLogRead,
    FinanceSummary,
    PaymentRead,
    RefundUpdate,
    WaitlistEntryRead,
    WaitlistStatusUpdate,
)
from ..security import utcnow
from ..sms_automation import (
    queue_sms_event,
)
from ..waitlist import expire_waitlist_offers
from .patient import _waitlist_read


from .staff_common import _payment_read

router = APIRouter()


@router.get("/waitlist", response_model=list[WaitlistEntryRead])
def staff_waitlist(
    status_filter: str | None = Query(default=None, alias="status"),
    _staff: StaffUser = Depends(require_permission("waitlist.view")),
    db: Session = Depends(get_db),
) -> list[WaitlistEntryRead]:
    if expire_waitlist_offers(db):
        db.commit()
    query = select(WaitlistEntry)
    if status_filter:
        query = query.where(WaitlistEntry.status == status_filter)
    items = (
        db.scalars(query.order_by(WaitlistEntry.created_at, WaitlistEntry.id))
        .unique()
        .all()
    )
    return [_waitlist_read(item) for item in items]


@router.patch("/waitlist/{entry_id}", response_model=WaitlistEntryRead)
def update_waitlist_status(
    entry_id: int,
    payload: WaitlistStatusUpdate,
    staff: StaffUser = Depends(require_permission("waitlist.edit")),
    db: Session = Depends(get_db),
) -> WaitlistEntryRead:
    item = db.get(WaitlistEntry, entry_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="درخواست انتظار پیدا نشد"
        )
    previous = item.status
    item.status = payload.status
    record_audit(
        db,
        action="waitlist.status_changed",
        entity_type="waitlist",
        entity_id=item.id,
        summary=f"تغییر وضعیت لیست انتظار {item.service.title}",
        actor_staff_id=staff.id,
        details={"from": previous, "to": payload.status},
    )
    db.commit()
    db.refresh(item)
    return _waitlist_read(item)


@router.get("/finance/summary", response_model=FinanceSummary)
def finance_summary(
    _staff: StaffUser = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db),
) -> FinanceSummary:
    items = db.scalars(select(Payment)).unique().all()
    verified = [item for item in items if item.status == "verified"]
    pending_refunds = [
        item for item in items if item.refund_status in {"requested", "processing"}
    ]
    refunded = [item for item in items if item.refund_status == "refunded"]
    failed = [
        item
        for item in items
        if item.status in {"failed", "cancelled", "verification_error"}
    ]
    return FinanceSummary(
        verified_count=len(verified),
        collected_toman=sum(item.amount_toman for item in verified),
        refund_pending_count=len(pending_refunds),
        refund_pending_toman=sum(item.refund_amount_toman for item in pending_refunds),
        refunded_count=len(refunded),
        refunded_toman=sum(item.refund_amount_toman for item in refunded),
        failed_count=len(failed),
    )


@router.get("/finance/payments", response_model=list[PaymentRead])
def finance_payments(
    refund_status: str | None = None,
    _staff: StaffUser = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db),
) -> list[PaymentRead]:
    query = select(Payment)
    if refund_status:
        query = query.where(Payment.refund_status == refund_status)
    items = (
        db.scalars(query.order_by(Payment.created_at.desc(), Payment.id.desc()))
        .unique()
        .all()
    )
    return [_payment_read(item) for item in items]


@router.patch("/finance/payments/{payment_id}/refund", response_model=PaymentRead)
def update_refund(
    payment_id: int,
    payload: RefundUpdate,
    staff: StaffUser = Depends(require_permission("finance.refund")),
    db: Session = Depends(get_db),
) -> PaymentRead:
    item = db.get(Payment, payment_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="پرداخت پیدا نشد"
        )
    if payload.amount_toman > item.amount_toman:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="مبلغ بازپرداخت بیشتر از پرداخت است",
        )
    if payload.status == "refunded" and payload.amount_toman <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="مبلغ بازپرداخت الزامی است",
        )
    previous = item.refund_status
    if previous == "refunded":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="بازپرداخت ثبت‌شده نهایی است و تغییر نمی‌کند")
    if payload.status != "none" and item.status not in {"verified", "verified_conflict"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="فقط برای پرداخت تأییدشده می‌توان بازپرداخت ثبت کرد")
    item.refund_status = payload.status
    item.refund_amount_toman = payload.amount_toman
    item.refund_reference = payload.reference
    item.refund_note = payload.note
    item.refunded_at = utcnow() if payload.status == "refunded" else None
    if item.appointment and payload.status == "refunded":
        item.appointment.payment_status = "refunded"
        queue_sms_event(
            db,
            "refund_recorded",
            patient=item.appointment.patient,
            appointment=item.appointment,
            extra={"amount_toman": payload.amount_toman},
            dedupe_key=f"refund:{item.id}",
        )
    record_audit(
        db,
        action="payment.refund_updated",
        entity_type="payment",
        entity_id=item.id,
        summary="به‌روزرسانی وضعیت بازپرداخت",
        actor_staff_id=staff.id,
        details={
            "from": previous,
            "to": payload.status,
            "amount_toman": payload.amount_toman,
        },
    )
    db.commit()
    db.refresh(item)
    return _payment_read(item)


@router.get("/audit-logs", response_model=list[AuditLogRead])
def audit_logs(
    limit: int = Query(default=100, ge=1, le=300),
    _staff: StaffUser = Depends(require_permission("audit.view")),
    db: Session = Depends(get_db),
) -> list[AuditLogRead]:
    items = (
        db.scalars(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .limit(limit)
        )
        .unique()
        .all()
    )
    result: list[AuditLogRead] = []
    for item in items:
        actor_name = "سامانه"
        actor_role = "system"
        if item.actor_staff:
            actor_name = item.actor_staff.full_name
            actor_role = (
                "، ".join(identity(item.actor_staff)["role_titles"]) or "بدون نقش فعال"
            )
        elif item.actor_patient:
            actor_name = (
                " ".join(
                    filter(
                        None,
                        [item.actor_patient.first_name, item.actor_patient.last_name],
                    )
                )
                or "بیمار"
            )
            actor_role = "patient"
        result.append(
            AuditLogRead(
                id=item.id,
                actor_name=actor_name,
                actor_role=actor_role,
                action=item.action,
                entity_type=item.entity_type,
                entity_id=item.entity_id,
                summary=item.summary,
                details=json.loads(item.details_json or "{}"),
                created_at=item.created_at,
            )
        )
    return result
