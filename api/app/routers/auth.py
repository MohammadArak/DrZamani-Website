from __future__ import annotations

import base64
import secrets
from datetime import timedelta
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import delete, select, text, update
from sqlalchemy.orm import Session

from ..auth_limits import client_ip, consume_limit, reset_limit
from ..browser_sessions import (
    clear_session_cookies,
    request_token,
    set_session_cookies,
    staff_state_hash,
    wants_cookie_session,
)
from ..config import get_settings
from ..database import get_db
from ..dependencies import bearer_scheme
from ..models import AuthSession, CaptchaChallenge, OtpChallenge, Patient, StaffUser
from ..schemas import (
    ApiMessage,
    CaptchaResponse,
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    SessionResponse,
    StaffLoginRequest,
    StaffSessionResponse,
)
from ..security import (
    generate_nonce,
    generate_otp,
    hash_otp,
    hash_captcha,
    hash_password,
    hash_session_token,
    issue_session_token,
    patient_session_expiry,
    staff_session_expiry,
    utcnow,
    verify_otp_hash,
    verify_captcha_hash,
    verify_password,
)
from ..sms import SmsDeliveryError, get_sms_provider

router = APIRouter(prefix="/auth", tags=["authentication"])
staff_router = APIRouter(prefix="/staff/auth", tags=["staff authentication"])
CAPTCHA_TTL_SECONDS = 180
CAPTCHA_MAX_ATTEMPTS = 5
# Equal password work for unknown usernames; this is not an account credential.
_DUMMY_PASSWORD_HASH = hash_password("timing-only-value-not-an-account")


def _captcha_png(code: str) -> bytes:
    image = Image.new("RGB", (180, 64), "#f8fafc")
    font = ImageFont.load_default(size=32)
    for index, digit in enumerate(code):
        glyph = Image.new("RGBA", (40, 52))
        ImageDraw.Draw(glyph).text((8, 5), digit, font=font, fill="#293241")
        glyph = glyph.rotate(
            secrets.randbelow(25) - 12, resample=Image.Resampling.BICUBIC
        )
        image.paste(glyph, (8 + index * 32, 3 + secrets.randbelow(7)), glyph)
    draw = ImageDraw.Draw(image)
    for _ in range(5):
        draw.line(
            [
                (secrets.randbelow(180), secrets.randbelow(64)),
                (secrets.randbelow(180), secrets.randbelow(64)),
            ],
            fill=secrets.choice(["#d5ab64", "#7990a8", "#b8c2cc"]),
            width=1,
        )
    output = BytesIO()
    image.save(output, format="PNG")  # No answer text or metadata is embedded.
    return output.getvalue()


@staff_router.get(
    "/captcha", response_model=CaptchaResponse, response_model_exclude_none=True
)
def create_staff_captcha(
    request: Request, db: Session = Depends(get_db)
) -> CaptchaResponse:
    settings = get_settings()
    ip = client_ip(request)
    consume_limit(db, "captcha-ip", ip, settings.captcha_max_per_ip_hour, 3600)
    now = utcnow()
    db.execute(
        delete(CaptchaChallenge).where(
            CaptchaChallenge.expires_at < now - timedelta(days=1)
        )
    )
    challenge_id = secrets.token_urlsafe(24)
    answer = "".join(secrets.choice("23456789") for _ in range(5))
    nonce = generate_nonce()
    db.add(
        CaptchaChallenge(
            id=challenge_id,
            code_hash=hash_captcha(challenge_id, answer, nonce),
            nonce=nonce,
            request_ip=ip,
            expires_at=now + timedelta(seconds=CAPTCHA_TTL_SECONDS),
        )
    )
    db.commit()
    return CaptchaResponse(
        captcha_id=challenge_id,
        image_data=f"data:image/png;base64,{base64.b64encode(_captcha_png(answer)).decode()}",
        expires_in_seconds=CAPTCHA_TTL_SECONDS,
        debug_answer=answer if settings.development_debug else None,
    )


@router.post(
    "/otp/request", response_model=OtpRequestResponse, response_model_exclude_none=True
)
def request_otp(
    payload: OtpRequest, request: Request, db: Session = Depends(get_db)
) -> OtpRequestResponse:
    settings = get_settings()
    consume_limit(
        db, "otp-request-ip", client_ip(request), settings.otp_max_per_ip_hour, 3600
    )
    consume_limit(
        db, "otp-request-phone", payload.phone, settings.otp_max_per_phone_hour, 3600
    )
    consume_limit(db, "otp-resend", payload.phone, 1, settings.otp_resend_seconds)
    now = utcnow()
    db.execute(text("BEGIN IMMEDIATE"))
    db.execute(
        update(OtpChallenge)
        .where(OtpChallenge.phone == payload.phone, OtpChallenge.consumed_at.is_(None))
        .values(consumed_at=now)
    )
    code, nonce = generate_otp(), generate_nonce()
    challenge = OtpChallenge(
        phone=payload.phone,
        purpose="login",
        code_hash=hash_otp(payload.phone, code, nonce),
        nonce=nonce,
        request_ip=client_ip(request),
        expires_at=now + timedelta(seconds=settings.otp_ttl_seconds),
    )
    db.add(challenge)
    db.commit()
    try:
        get_sms_provider().send_otp(payload.phone, code)
    except SmsDeliveryError as exc:
        challenge.consumed_at = utcnow()
        db.commit()
        raise HTTPException(
            status_code=503, detail="ارسال پیامک موقتاً ممکن نیست"
        ) from exc
    return OtpRequestResponse(
        message="کد تأیید ارسال شد",
        retry_after_seconds=settings.otp_resend_seconds,
        debug_otp=code if settings.development_debug else None,
    )


@router.post("/otp/verify", response_model=SessionResponse)
def verify_otp(
    payload: OtpVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> SessionResponse:
    settings = get_settings()
    browser = wants_cookie_session(request)
    consume_limit(
        db,
        "otp-verify-ip",
        client_ip(request),
        settings.otp_verify_max_per_ip_minute,
        60,
    )
    consume_limit(
        db,
        "otp-verify-phone",
        payload.phone,
        settings.otp_verify_max_per_phone_hour,
        3600,
    )
    # Serialize consumption and failed-attempt increments, including concurrent valid submissions.
    db.execute(text("BEGIN IMMEDIATE"))
    now = utcnow()
    challenge = db.scalar(
        select(OtpChallenge)
        .where(OtpChallenge.phone == payload.phone, OtpChallenge.consumed_at.is_(None))
        .order_by(OtpChallenge.created_at.desc(), OtpChallenge.id.desc())
        .limit(1)
    )
    if not challenge or challenge.expires_at <= now:
        raise HTTPException(status_code=400, detail="کد تأیید منقضی یا نامعتبر است")
    if challenge.attempts >= settings.otp_max_attempts:
        challenge.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=429, detail="تعداد تلاش‌های ناموفق بیش از حد مجاز است"
        )
    if not verify_otp_hash(
        payload.phone, payload.code, challenge.nonce, challenge.code_hash
    ):
        challenge.attempts += 1
        if challenge.attempts >= settings.otp_max_attempts:
            challenge.consumed_at = now
        db.commit()
        raise HTTPException(status_code=400, detail="کد تأیید صحیح نیست")
    challenge.consumed_at = now
    patient = db.scalar(select(Patient).where(Patient.phone == payload.phone))
    if not patient:
        patient = Patient(phone=payload.phone)
        db.add(patient)
        db.flush()
    if not patient.is_active:
        db.commit()
        raise HTTPException(status_code=403, detail="حساب کاربری غیرفعال است")
    token, token_hash = issue_session_token()
    expires_at = patient_session_expiry()
    db.add(
        AuthSession(token_hash=token_hash, patient_id=patient.id, expires_at=expires_at)
    )
    db.commit()
    if browser:
        set_session_cookies(
            response, "patient", token, settings.patient_session_days * 86400
        )
    return SessionResponse(
        access_token="" if browser else token,
        token_type="cookie" if browser else "bearer",
        expires_at=expires_at.isoformat(),
        profile_completed=patient.profile_completed,
    )


def _logout(
    audience: str, request: Request, response: Response, credentials, db: Session
) -> ApiMessage:
    token = request_token(request, audience, credentials)
    if token:
        db.execute(
            update(AuthSession)
            .where(
                AuthSession.token_hash == hash_session_token(token),
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=utcnow())
        )
        db.commit()
    clear_session_cookies(response, audience)
    return ApiMessage(message="با موفقیت خارج شدید")


@router.post("/logout", response_model=ApiMessage)
def logout(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> ApiMessage:
    return _logout("patient", request, response, credentials, db)


@staff_router.post("/logout", response_model=ApiMessage)
def staff_logout(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> ApiMessage:
    return _logout("staff", request, response, credentials, db)


@staff_router.post("/login", response_model=StaffSessionResponse)
def staff_login(
    payload: StaffLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> StaffSessionResponse:
    settings = get_settings()
    browser = wants_cookie_session(request)
    ip = client_ip(request)
    consume_limit(
        db,
        "staff-login-ip",
        ip,
        settings.staff_login_max_per_ip_window,
        settings.staff_login_lock_seconds,
    )
    db.execute(text("BEGIN IMMEDIATE"))
    now = utcnow()
    captcha = db.get(CaptchaChallenge, payload.captcha_id)
    valid = bool(
        captcha
        and captcha.request_ip == ip
        and captcha.consumed_at is None
        and captcha.expires_at > now
        and captcha.attempts < CAPTCHA_MAX_ATTEMPTS
        and verify_captcha_hash(
            payload.captcha_id, payload.captcha_answer, captcha.nonce, captcha.code_hash
        )
    )
    if not valid:
        if captcha and captcha.consumed_at is None:
            captcha.attempts += 1
            if captcha.attempts >= CAPTCHA_MAX_ATTEMPTS:
                captcha.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=400, detail="کد امنیتی صحیح نیست یا منقضی شده است"
        )
    captcha.consumed_at = now
    db.commit()
    username = payload.username.strip().lower()
    consume_limit(
        db,
        "staff-login-account",
        username,
        settings.staff_login_max_attempts,
        settings.staff_login_lock_seconds,
    )
    staff = db.scalar(select(StaffUser).where(StaffUser.username == username))
    valid_password = verify_password(
        payload.password, staff.password_hash if staff else _DUMMY_PASSWORD_HASH
    )
    if not staff or not staff.is_active or not valid_password:
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور صحیح نیست")
    reset_limit(db, "staff-login-account", username)
    token, token_hash = issue_session_token()
    expires_at = staff_session_expiry()
    db.add(
        AuthSession(
            token_hash=token_hash,
            staff_id=staff.id,
            expires_at=expires_at,
            staff_state_hash=staff_state_hash(staff),
        )
    )
    db.commit()
    if browser:
        set_session_cookies(
            response, "staff", token, settings.staff_session_hours * 3600
        )
    return StaffSessionResponse(
        access_token="" if browser else token,
        token_type="cookie" if browser else "bearer",
        expires_at=expires_at.isoformat(),
        full_name=staff.full_name,
        role=staff.role,
    )
