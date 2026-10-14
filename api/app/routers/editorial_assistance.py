"""Explicit editorial-only suggestions; no automatic publishing or private data retrieval."""
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from .. import editorial_ai as ai
from ..access import can
from ..activity import record_audit
from ..auth_limits import consume_limit
from ..database import get_db
from ..dependencies import get_current_staff
from ..runtime_settings import get_settings

router=APIRouter(prefix="/staff/editorial-assistance",tags=["editorial assistance"])


@router.get("/status")
def status(db:Session=Depends(get_db),staff=Depends(get_current_staff)):
    if not (can(staff,"articles.view") or can(staff,"site_services.view")):
        raise HTTPException(403,"دسترسی به محتوا لازم است")
    settings=get_settings(db)
    enabled=settings.ai_provider!="disabled"
    try:ai.validate_configuration(settings)
    except ValueError:enabled=False
    return {"enabled":enabled,"provider":settings.ai_provider,
            "requests_per_hour":settings.ai_requests_per_hour,
            "destination":ai.endpoint(settings)[0].hostname if enabled else None}


@router.post("")
def assist(payload:ai.EditorialInput,db:Session=Depends(get_db),staff=Depends(get_current_staff)):
    prefix="articles" if payload.kind=="article" else "site_services"
    if not (can(staff,prefix+".edit") or can(staff,prefix+".create")):
        raise HTTPException(403,"مجوز نوشتن همین نوع محتوا لازم است")
    settings=get_settings(db)
    if settings.ai_provider=="disabled":raise HTTPException(409,"سرویس هوش مصنوعی هنوز فعال نشده است")
    try:ai.validate_configuration(settings)
    except ValueError:raise HTTPException(422,"تنظیمات سرویس هوش مصنوعی باید توسط مدیر بررسی شود") from None
    consume_limit(db,"editorial-ai-staff",str(staff.id),settings.ai_requests_per_hour,3600)
    consume_limit(db,"editorial-ai-site","shared",20,3600)
    try:
        result=ai.suggest(settings,payload)
    except (ai.ProviderFailure,ValueError):
        record_audit(db,action="editorial_ai.failed",entity_type="editorial",entity_id=None,
            summary="سرویس پیشنهاد سردبیری پاسخ معتبر نداد",actor_staff_id=staff.id,
            details={"provider":settings.ai_provider,"kind":payload.kind})
        db.commit()
        # Dependency failure belongs to this feature, not the site's connection overlay.
        raise HTTPException(424,"سرویس هوش مصنوعی پاسخ معتبر نداد؛ تنظیمات یا سهمیه ارائه‌دهنده را بررسی کنید") from None
    record_audit(db,action="editorial_ai.suggested",entity_type="editorial",entity_id=None,
        summary="پیشنهاد سئو دریافت شد؛ هیچ مطلبی ذخیره یا منتشر نشد",actor_staff_id=staff.id,
        details={"provider":settings.ai_provider,"kind":payload.kind,"characters":len(payload.text)})
    db.commit()
    return {"suggestion":result.model_dump(),"notice":"پیشنهاد نیازمند بررسی شماست؛ ذخیره یا انتشار انجام نشده است."}
