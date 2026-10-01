"""Self-service MFA with fresh password, limited challenges and atomic consumption."""
import base64
import json
import secrets
from datetime import timedelta
from typing import Literal
from urllib.parse import quote, urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.security.utils import get_authorization_scheme_param
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text, select
from sqlalchemy.orm import Session

from ..access import identity, is_owner, revoke_staff
from ..activity import record_audit
from ..auth_limits import client_ip, consume_limit, reset_limit
from ..bot_protection import digest
from ..browser_sessions import staff_state_hash, wants_cookie_session, set_session_cookies
from ..database import get_db
from ..dependencies import get_current_staff
from ..models import StaffUser, StaffMfa, MfaChallenge, AuthSession
from ..runtime_settings import get_settings
from ..schemas import StaffSessionResponse
from ..security import verify_password, staff_session_expiry, issue_session_token, utcnow
from .. import mfa

router = APIRouter(prefix="/staff/auth/mfa", tags=["staff MFA"])


class Factor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=6, max_length=80)
    method: Literal["totp", "recovery"] = "totp"


class LoginFactor(Factor):
    challenge_id: str = Field(min_length=16, max_length=64)


class ConfirmEnrollment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enrollment_id: str = Field(min_length=16, max_length=64)
    code: str = Field(min_length=6, max_length=6)


class FreshPassword(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: str = Field(min_length=8, max_length=200)
    code: str = Field(default="", max_length=80)
    method: Literal["totp", "recovery"] = "totp"


def locked_self(db, request, staff):
    actor_id = staff.id
    consume_limit(db, "mfa-management", str(actor_id), 10, 900)
    consume_limit(db, "mfa-management-ip", client_ip(request), 30, 900)
    db.execute(text("BEGIN IMMEDIATE")); db.expire_all()
    scheme, token = get_authorization_scheme_param(request.headers.get("Authorization"))
    credentials = HTTPAuthorizationCredentials(scheme=scheme, credentials=token) if scheme.lower() == "bearer" and token else None
    # Recheck revocation, fingerprint and cookie CSRF after taking the write lock.
    staff = get_current_staff(request, credentials, db)
    if staff.id != actor_id:
        raise HTTPException(401, "نشست تغییر کرده است")
    return staff


def fresh_password(db, staff, payload):
    if not verify_password(payload.password, staff.password_hash):
        raise HTTPException(400, "رمز فعلی صحیح نیست")
    if staff.mfa and staff.mfa.enabled:
        mfa.reject_factor(db, staff.mfa, payload.code, payload.method)


@router.get("/status")
def status(staff: StaffUser = Depends(get_current_staff)):
    record = staff.mfa
    return {"enabled": bool(record and record.enabled), "required": is_owner(staff) and get_settings().mfa_required_owners,
        "recovery_remaining": len(json.loads(record.recovery_hashes_json)) if record and record.enabled else 0,
        "encryption_ready": bool(get_settings().settings_encryption_keys)}


@router.post("/enroll")
def enroll(payload: FreshPassword, request: Request, staff: StaffUser = Depends(get_current_staff), db: Session = Depends(get_db)):
    staff = locked_self(db, request, staff)
    fresh_password(db, staff, payload)
    record = staff.mfa
    if not record:
        record = StaffMfa(staff_id=staff.id)
        staff.mfa = record
    secret = base64.b32encode(secrets.token_bytes(20)).decode()
    record.pending_json = mfa.encrypted_secret(staff.id, secret)
    record.pending_id = secrets.token_urlsafe(32)
    record.pending_expires_at = utcnow() + timedelta(minutes=10)
    db.add(record)
    record_audit(db, action="mfa.enrollment_started", entity_type="staff_user", entity_id=staff.id,
        actor_staff_id=staff.id, summary="شروع راه‌اندازی رمزساز", details={})
    db.commit()
    issuer = get_settings().app_name
    uri = "otpauth://totp/" + quote(issuer + ":" + staff.username, safe="") + "?" + urlencode(
        {"secret": secret, "issuer": issuer, "algorithm": "SHA1", "digits": 6, "period": 30})
    # Intentional one-time self response for device enrollment; never a public/settings response.
    return {"enrollment_id": record.pending_id, "secret": secret, "otpauth_uri": uri, "expires_in_seconds": 600}


@router.post("/confirm")
def confirm(payload: ConfirmEnrollment, request: Request, staff: StaffUser = Depends(get_current_staff), db: Session = Depends(get_db)):
    staff = locked_self(db, request, staff)
    record = staff.mfa
    if not record or record.pending_id != payload.enrollment_id or not record.pending_expires_at or record.pending_expires_at <= utcnow():
        raise HTTPException(400, "راه‌اندازی منقضی یا نامعتبر است")
    counter = mfa.verify_counter(mfa.mfa_secret(record, pending=True), payload.code)
    if counter is None:
        raise HTTPException(400, "کد برنامه رمزساز صحیح نیست")
    record.enabled = True
    record.secret_json = record.pending_json
    record.pending_json = record.pending_id = record.pending_expires_at = None
    record.revision += 1; record.last_counter = counter
    codes = mfa.new_recovery(record)
    revoke_staff(db, [staff.id])
    record_audit(db, action="mfa.enabled", entity_type="staff_user", entity_id=staff.id,
        actor_staff_id=staff.id, summary="تأیید رمزساز و ابطال نشست‌های قبلی", details={})
    db.commit()
    return {"enabled": True, "recovery_codes": codes, "reauthenticate": True}


@router.post("/recovery-codes")
def regenerate(payload: FreshPassword, request: Request, staff: StaffUser = Depends(get_current_staff), db: Session = Depends(get_db)):
    staff = locked_self(db, request, staff)
    if not staff.mfa or not staff.mfa.enabled:
        raise HTTPException(409, "رمزساز فعال نیست")
    fresh_password(db, staff, payload)
    codes = mfa.new_recovery(staff.mfa)
    staff.mfa.revision += 1
    revoke_staff(db, [staff.id])
    record_audit(db, action="mfa.recovery_rotated", entity_type="staff_user", entity_id=staff.id,
        actor_staff_id=staff.id, summary="تعویض کدهای بازیابی و ابطال نشست‌ها", details={})
    db.commit()
    return {"recovery_codes": codes, "reauthenticate": True}


@router.post("/disable")
def disable(payload: FreshPassword, request: Request, staff: StaffUser = Depends(get_current_staff), db: Session = Depends(get_db)):
    staff = locked_self(db, request, staff)
    if is_owner(staff) and get_settings().mfa_required_owners:
        raise HTTPException(409, "سیاست اجباری مدیرکل فعال است؛ ابتدا سیاست را بررسی کنید")
    fresh_password(db, staff, payload)
    if staff.mfa:
        staff.mfa.enabled = False
        staff.mfa.secret_json = "{}"; staff.mfa.recovery_hashes_json = "[]"
        staff.mfa.pending_json = staff.mfa.pending_id = staff.mfa.pending_expires_at = None
        staff.mfa.revision += 1
    revoke_staff(db, [staff.id])
    record_audit(db, action="mfa.disabled", entity_type="staff_user", entity_id=staff.id,
        actor_staff_id=staff.id, summary="غیرفعال‌کردن رمزساز و ابطال نشست‌ها", details={})
    db.commit()
    return {"enabled": False, "reauthenticate": True}


@router.post("/verify", response_model=StaffSessionResponse)
def login(payload: LoginFactor, request: Request, response: Response, db: Session = Depends(get_db)):
    browser = wants_cookie_session(request)
    consume_limit(db, "mfa-login-ip", client_ip(request), 30, 900)
    # Find the staff ID before the independent account limiter, then reload under lock.
    preliminary = db.get(MfaChallenge, payload.challenge_id)
    if not preliminary:
        raise HTTPException(400, "مرحله ورود منقضی یا نامعتبر است")
    consume_limit(db, "mfa-login-account", str(preliminary.staff_id), 5, 900)
    db.execute(text("BEGIN IMMEDIATE")); db.expire_all()
    challenge = db.get(MfaChallenge, payload.challenge_id)
    staff = db.get(StaffUser, challenge.staff_id)
    if challenge.consumed_at or challenge.expires_at <= utcnow() or challenge.attempts >= 5 or challenge.browser != browser or challenge.ip_hash != digest("ip:" + client_ip(request)) or not staff or not staff.is_active or challenge.state_hash != staff_state_hash(staff) or not staff.mfa or not staff.mfa.enabled:
        raise HTTPException(400, "مرحله ورود منقضی یا نامعتبر است")
    challenge.attempts += 1
    mfa.reject_factor(db, staff.mfa, payload.code, payload.method)
    challenge.consumed_at = utcnow()
    reset_limit(db, "mfa-login-account", str(staff.id))
    reset_limit(db, "staff-login-account", staff.username)
    token, token_hash = issue_session_token()
    expiry = staff_session_expiry()
    db.add(AuthSession(token_hash=token_hash, staff_id=staff.id, expires_at=expiry, staff_state_hash=staff_state_hash(staff)))
    record_audit(db, action="mfa.login_verified", entity_type="staff_user", entity_id=staff.id,
        actor_staff_id=staff.id, summary="ورود با عامل دوم", details={"method": payload.method})
    db.commit()
    if browser:
        set_session_cookies(response, "staff", token, get_settings().staff_session_hours * 3600)
    return StaffSessionResponse(access_token="" if browser else token, token_type="cookie" if browser else "bearer", expires_at=expiry.isoformat(), **identity(staff))
