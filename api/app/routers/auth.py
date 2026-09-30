from __future__ import annotations

import base64
import html
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

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


def _client_ip(request: Request) -> str:
    # Nginx appends the trusted remote address to X-Forwarded-For. Reading the
    # right-most value prevents a client-supplied first value bypassing limits.
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[-1].strip()
    return forwarded or (request.client.host if request.client else "unknown")


def _captcha_svg(code: str) -> str:
    glyphs = []
    for index, character in enumerate(code):
        x = 25 + index * 31
        y = 47 + secrets.randbelow(9) - 4
        rotation = secrets.randbelow(25) - 12
        glyphs.append(
            f'<text x="{x}" y="{y}" transform="rotate({rotation} {x} {y})" '
            f'font-family="Tahoma,Arial" font-size="30" font-weight="700" fill="#293241">'
            f'{html.escape(character)}</text>'
        )
    lines = []
    for _ in range(6):
        x1, x2 = secrets.randbelow(181), secrets.randbelow(181)
        y1, y2 = secrets.randbelow(61), secrets.randbelow(61)
        color = secrets.choice(["#d5ab64", "#7990a8", "#b8c2cc"])
        lines.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
            'stroke-width="1.4" opacity="0.75" />'
        )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="60" viewBox="0 0 180 60" '
        'role="img" aria-label="تصویر کپچا">'
        '<rect width="180" height="60" rx="12" fill="#f8fafc" />'
        + "".join(lines)
        + "".join(glyphs)
        + "</svg>"
    )


@staff_router.get("/captcha", response_model=CaptchaResponse)
def create_staff_captcha(request: Request, db: Session = Depends(get_db)) -> CaptchaResponse:
    settings = get_settings()
    now = utcnow()
    challenge_id = secrets.token_urlsafe(24)
    answer = "".join(secrets.choice("23456789") for _ in range(5))
    nonce = generate_nonce()
    db.add(
        CaptchaChallenge(
            id=challenge_id,
            code_hash=hash_captcha(challenge_id, answer, nonce),
            nonce=nonce,
            request_ip=_client_ip(request),
            expires_at=now + timedelta(seconds=CAPTCHA_TTL_SECONDS),
        )
    )
    db.commit()
    encoded = base64.b64encode(_captcha_svg(answer).encode()).decode()
    return CaptchaResponse(
        captcha_id=challenge_id,
        image_data=f"data:image/svg+xml;base64,{encoded}",
        expires_in_seconds=CAPTCHA_TTL_SECONDS,
        debug_answer=answer if settings.debug else None,
    )


@router.post("/otp/request", response_model=OtpRequestResponse)
def request_otp(payload: OtpRequest, request: Request, db: Session = Depends(get_db)) -> OtpRequestResponse:
    settings = get_settings()
    now = utcnow()
    one_hour_ago = now - timedelta(hours=1)
    ip = _client_ip(request)

    phone_count = db.scalar(
        select(func.count()).select_from(OtpChallenge).where(
            OtpChallenge.phone == payload.phone,
            OtpChallenge.created_at >= one_hour_ago,
        )
    ) or 0
    ip_count = db.scalar(
        select(func.count()).select_from(OtpChallenge).where(
            OtpChallenge.request_ip == ip,
            OtpChallenge.created_at >= one_hour_ago,
        )
    ) or 0
    if phone_count >= settings.otp_max_per_phone_hour or ip_count >= settings.otp_max_per_ip_hour:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="تعداد درخواست‌ها بیش از حد مجاز است")

    latest = db.scalar(
        select(OtpChallenge)
        .where(OtpChallenge.phone == payload.phone)
        .order_by(OtpChallenge.created_at.desc())
        .limit(1)
    )
    if latest and latest.created_at + timedelta(seconds=settings.otp_resend_seconds) > now:
        remaining = int((latest.created_at + timedelta(seconds=settings.otp_resend_seconds) - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"message": "برای ارسال مجدد کمی صبر کنید", "retry_after_seconds": max(1, remaining)},
        )

    db.execute(
        update(OtpChallenge)
        .where(OtpChallenge.phone == payload.phone, OtpChallenge.consumed_at.is_(None))
        .values(consumed_at=now)
    )
    code = generate_otp()
    nonce = generate_nonce()
    challenge = OtpChallenge(
        phone=payload.phone,
        purpose="login",
        code_hash=hash_otp(payload.phone, code, nonce),
        nonce=nonce,
        request_ip=ip,
        expires_at=now + timedelta(seconds=settings.otp_ttl_seconds),
    )
    db.add(challenge)
    db.commit()

    try:
        get_sms_provider().send_otp(payload.phone, code)
    except SmsDeliveryError as exc:
        challenge.consumed_at = utcnow()
        db.commit()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="ارسال پیامک موقتاً ممکن نیست") from exc

    return OtpRequestResponse(
        message="کد تأیید ارسال شد",
        retry_after_seconds=settings.otp_resend_seconds,
        debug_otp=code if settings.debug else None,
    )


@router.post("/otp/verify", response_model=SessionResponse)
def verify_otp(payload: OtpVerifyRequest, db: Session = Depends(get_db)) -> SessionResponse:
    settings = get_settings()
    now = utcnow()
    challenge = db.scalar(
        select(OtpChallenge)
        .where(
            OtpChallenge.phone == payload.phone,
            OtpChallenge.consumed_at.is_(None),
        )
        .order_by(OtpChallenge.created_at.desc())
        .limit(1)
    )
    if not challenge or challenge.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="کد تأیید منقضی یا نامعتبر است")
    if challenge.attempts >= settings.otp_max_attempts:
        challenge.consumed_at = now
        db.commit()
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="تعداد تلاش‌های ناموفق بیش از حد مجاز است")
    if not verify_otp_hash(payload.phone, payload.code, challenge.nonce, challenge.code_hash):
        challenge.attempts += 1
        if challenge.attempts >= settings.otp_max_attempts:
            challenge.consumed_at = now
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="کد تأیید صحیح نیست")

    challenge.consumed_at = now
    patient = db.scalar(select(Patient).where(Patient.phone == payload.phone))
    if not patient:
        patient = Patient(phone=payload.phone)
        db.add(patient)
        db.flush()
    token, token_hash = issue_session_token()
    expires_at = patient_session_expiry()
    db.add(AuthSession(token_hash=token_hash, patient_id=patient.id, expires_at=expires_at))
    db.commit()
    return SessionResponse(
        access_token=token,
        expires_at=expires_at.isoformat(),
        profile_completed=patient.profile_completed,
    )


@router.post("/logout", response_model=ApiMessage)
def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> ApiMessage:
    if credentials:
        auth_session = db.scalar(
            select(AuthSession).where(AuthSession.token_hash == hash_session_token(credentials.credentials))
        )
        if auth_session and not auth_session.revoked_at:
            auth_session.revoked_at = utcnow()
            db.commit()
    return ApiMessage(message="با موفقیت خارج شدید")


@staff_router.post("/login", response_model=StaffSessionResponse)
def staff_login(
    payload: StaffLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> StaffSessionResponse:
    now = utcnow()
    captcha = db.get(CaptchaChallenge, payload.captcha_id)
    captcha_valid = bool(
        captcha
        and captcha.request_ip == _client_ip(request)
        and captcha.consumed_at is None
        and captcha.expires_at > now
        and captcha.attempts < CAPTCHA_MAX_ATTEMPTS
        and verify_captcha_hash(
            payload.captcha_id,
            payload.captcha_answer,
            captcha.nonce,
            captcha.code_hash,
        )
    )
    if not captcha_valid:
        if captcha and captcha.consumed_at is None:
            captcha.attempts += 1
            if captcha.attempts >= CAPTCHA_MAX_ATTEMPTS:
                captcha.consumed_at = now
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="کد امنیتی صحیح نیست یا منقضی شده است",
        )
    captcha.consumed_at = now
    staff = db.scalar(select(StaffUser).where(StaffUser.username == payload.username.strip().lower()))
    if not staff or not staff.is_active or not verify_password(payload.password, staff.password_hash):
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نام کاربری یا رمز عبور صحیح نیست")
    token, token_hash = issue_session_token()
    expires_at = staff_session_expiry()
    db.add(AuthSession(token_hash=token_hash, staff_id=staff.id, expires_at=expires_at))
    db.commit()
    return StaffSessionResponse(
        access_token=token,
        expires_at=expires_at.isoformat(),
        full_name=staff.full_name,
        role=staff.role,
    )
