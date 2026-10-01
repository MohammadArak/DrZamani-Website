"""Only public site keys go to clients; credential proof requires an owner session."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..activity import record_audit
from ..auth_limits import client_ip, consume_limit
from ..database import get_db
from ..dependencies import require_permission
from ..models import CaptchaAttestation, StaffUser
from ..schemas import BotProof
from ..runtime_settings import get_settings
from .. import bot_protection as bot

router = APIRouter(tags=["bot protection"])


@router.get("/auth/bot/challenge")
def challenge(request: Request, operation: Literal["staff_login", "otp_request", "otp_verify"], db: Session = Depends(get_db)):
    consume_limit(db, "bot-challenge-ip", client_ip(request), 180, 3600)
    return bot.issue(db, request, get_settings(), operation)


@router.get("/staff/system-settings/captcha/setup")
def setup(request: Request, provider: Literal["google", "turnstile"], staff: StaffUser = Depends(require_permission("secrets.manage")), db: Session = Depends(get_db)):
    settings = get_settings()
    if not getattr(settings, provider + "_site_key") or not (settings.turnstile_secret if provider == "turnstile" else settings.google_project_id and settings.google_api_key):
        raise HTTPException(422, "کلیدهای ارائه‌دهنده را ابتدا با حالت خاموش ذخیره کنید")
    consume_limit(db, "bot-setup-owner", str(staff.id), 20, 3600)
    return bot.issue(db, request, settings, "captcha_setup", provider=provider)


@router.post("/staff/system-settings/captcha/confirm")
def confirm(proof: BotProof, request: Request, staff: StaffUser = Depends(require_permission("secrets.manage")), db: Session = Depends(get_db)):
    settings = get_settings()
    consume_limit(db, "bot-setup-confirm", str(staff.id), 20, 3600)
    provider = bot.verify(db, request, settings, "captcha_setup", proof, setup=True)
    from ..access import can
    db.expire_all()
    staff = db.get(StaffUser, staff.id)
    if not staff or not can(staff, "secrets.manage"):
        raise HTTPException(403, "مجوز مدیرکل تغییر کرده است")
    marker = bot.fingerprint(settings, provider)
    if not db.get(CaptchaAttestation, marker):
        db.add(CaptchaAttestation(fingerprint=marker, provider=provider, actor_staff_id=staff.id))
    record_audit(db, action="captcha.credentials_verified", entity_type="system_setting", entity_id=1,
        actor_staff_id=staff.id, summary="تأیید کلید سرویس امنیتی", details={"provider": provider})
    db.commit()
    return {"verified": True, "provider": provider}
