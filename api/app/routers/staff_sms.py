from __future__ import annotations

import json
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_permission
from ..models import (
    Service,
    SmsAutomationRule,
    SmsCampaign,
    SmsOutbox,
    StaffUser,
)
from ..schemas import (
    ApiMessage,
    SmsAutomationRuleRead,
    SmsAutomationRuleWrite,
    SmsCampaignCreate,
    SmsCampaignPreviewRequest,
    SmsCampaignPreviewResponse,
    SmsCampaignRead,
    SmsOutboxRead,
)
from ..sms_automation import (
    ALLOWED_TEMPLATE_VARIABLES,
    dispatch_pending_sms,
    expire_unpaid_holds,
)


from .staff_common import _template_variables, _campaign_patients, _campaign_read

router = APIRouter()

CAMPAIGN_TEMPLATE_VARIABLES = {"patient_name", "first_name", "service_title"}


@router.get("/sms/rules", response_model=list[SmsAutomationRuleRead])
def sms_rules(
    _staff: StaffUser = Depends(require_permission("sms.view")),
    db: Session = Depends(get_db),
) -> list[SmsAutomationRule]:
    return list(db.scalars(select(SmsAutomationRule).order_by(SmsAutomationRule.id)))


@router.put("/sms/rules/{event_key}", response_model=SmsAutomationRuleRead)
def update_sms_rule(
    event_key: str,
    payload: SmsAutomationRuleWrite,
    _staff: StaffUser = Depends(require_permission("sms.rules.edit")),
    db: Session = Depends(get_db),
) -> SmsAutomationRule:
    item = db.scalar(
        select(SmsAutomationRule).where(SmsAutomationRule.event_key == event_key)
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="رویداد پیامکی پیدا نشد"
        )
    variables = _template_variables(payload.template_text)
    unknown = variables - ALLOWED_TEMPLATE_VARIABLES
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"متغیرهای ناشناخته در متن پیامک: {', '.join(sorted(unknown))}",
        )
    item.enabled = payload.enabled
    item.template_text = payload.template_text.strip()
    item.provider_pattern_code = payload.provider_pattern_code.strip()
    db.commit()
    db.refresh(item)
    return item


@router.get("/sms/outbox", response_model=list[SmsOutboxRead])
def sms_outbox(
    limit: int = Query(default=100, ge=1, le=500),
    _staff: StaffUser = Depends(require_permission("sms.view")),
    db: Session = Depends(get_db),
) -> list[SmsOutbox]:
    return list(
        db.scalars(select(SmsOutbox).order_by(SmsOutbox.id.desc()).limit(limit))
    )


@router.post("/sms/campaigns/preview", response_model=SmsCampaignPreviewResponse)
def preview_sms_campaign(
    payload: SmsCampaignPreviewRequest,
    _staff: StaffUser = Depends(require_permission("sms.campaigns.create")),
    db: Session = Depends(get_db),
) -> SmsCampaignPreviewResponse:
    return SmsCampaignPreviewResponse(
        recipient_count=len(_campaign_patients(db, payload.filters))
    )


@router.get("/sms/campaigns", response_model=list[SmsCampaignRead])
def sms_campaigns(
    limit: int = Query(default=50, ge=1, le=200),
    _staff: StaffUser = Depends(require_permission("sms.view")),
    db: Session = Depends(get_db),
) -> list[SmsCampaignRead]:
    items = db.scalars(
        select(SmsCampaign).order_by(SmsCampaign.id.desc()).limit(limit)
    ).all()
    return [_campaign_read(item) for item in items]


@router.post(
    "/sms/campaigns",
    response_model=SmsCampaignRead,
    status_code=status.HTTP_201_CREATED,
)
def create_sms_campaign(
    payload: SmsCampaignCreate,
    staff: StaffUser = Depends(require_permission("sms.campaigns.create")),
    db: Session = Depends(get_db),
) -> SmsCampaignRead:
    variables = _template_variables(payload.message_text)
    unknown = variables - CAMPAIGN_TEMPLATE_VARIABLES
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"متغیرهای ناشناخته در متن کمپین: {', '.join(sorted(unknown))}",
        )
    patients = _campaign_patients(db, payload.filters)
    if len(patients) != payload.expected_recipient_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "تعداد مخاطبان از زمان پیش‌نمایش تغییر کرده است؛ "
                f"تعداد فعلی {len(patients)} نفر است"
            ),
        )
    service_titles = (
        list(
            db.scalars(
                select(Service.title).where(Service.id.in_(payload.filters.service_ids))
            ).all()
        )
        if payload.filters.service_ids
        else []
    )
    service_title = "، ".join(service_titles) if service_titles else "خدمات مطب"
    campaign = SmsCampaign(
        title=payload.title,
        message_text=payload.message_text,
        provider_pattern_code=payload.provider_pattern_code,
        filters_json=payload.filters.model_dump_json(),
        status="queued",
        recipient_count=len(patients),
        created_by_staff_id=staff.id,
    )
    db.add(campaign)
    db.flush()
    for patient in patients:
        values = {
            "patient_name": " ".join(
                filter(None, [patient.first_name, patient.last_name])
            )
            or "بیمار",
            "first_name": patient.first_name or "بیمار",
            "service_title": service_title,
        }
        db.add(
            SmsOutbox(
                event_key="campaign",
                campaign_id=campaign.id,
                patient_id=patient.id,
                phone=patient.phone,
                rendered_body=payload.message_text.format_map(defaultdict(str, values)),
                provider_pattern_code=payload.provider_pattern_code,
                variables_json=json.dumps(values, ensure_ascii=False),
                status="pending",
            )
        )
    db.commit()
    db.refresh(campaign)
    return _campaign_read(campaign)


@router.post("/sms/dispatch", response_model=ApiMessage)
def dispatch_sms(
    _staff: StaffUser = Depends(require_permission("sms.dispatch")),
    db: Session = Depends(get_db),
) -> ApiMessage:
    expire_unpaid_holds(db)
    sent = dispatch_pending_sms(db, limit=100)
    return ApiMessage(message=f"{sent} پیامک با موفقیت ارسال شد")
