"""Host-only browser cookies and session-bound CSRF; bearer clients remain supported."""

import hashlib
import hmac
from datetime import timedelta

from fastapi import HTTPException, Request, Response

from .runtime_settings import get_settings
from .models import AuthSession, StaffUser
from .security import utcnow


def cookie_name(audience: str, kind: str = "session") -> str:
    prefix = "__Host-" if get_settings().app_env == "production" else ""
    return f"{prefix}drz_{audience}_{kind}"


def csrf_token(token: str) -> str:
    return hmac.new(
        get_settings().secret_key.encode(), f"csrf:{token}".encode(), hashlib.sha256
    ).hexdigest()


def allowed_origin(origin: str) -> bool:
    settings = get_settings()
    return origin in {settings.frontend_url, *settings.allowed_origins}


def check_origin(request: Request, *, required: bool = False) -> None:
    origin = request.headers.get("origin")
    if (required and not origin) or (origin and not allowed_origin(origin)):
        raise HTTPException(status_code=403, detail="مبدأ درخواست معتبر نیست")


def wants_cookie_session(request: Request) -> bool:
    if request.headers.get("x-session-transport") != "cookie":
        return False
    check_origin(request, required=True)
    return True


def set_session_cookies(
    response: Response, audience: str, token: str, seconds: int
) -> None:
    options = dict(
        max_age=seconds,
        secure=get_settings().app_env == "production",
        samesite="strict",
        path="/",
    )
    response.set_cookie(cookie_name(audience), token, httponly=True, **options)
    response.set_cookie(
        cookie_name(audience, "csrf"), csrf_token(token), httponly=False, **options
    )
    response.headers["Cache-Control"] = "no-store"


def clear_session_cookies(response: Response, audience: str) -> None:
    for kind in ("session", "csrf"):
        response.delete_cookie(
            cookie_name(audience, kind),
            path="/",
            secure=get_settings().app_env == "production",
            httponly=kind == "session",
            samesite="strict",
        )


def request_token(request: Request, audience: str, credentials) -> str:
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    token = request.cookies.get(cookie_name(audience), "")
    if token and request.method not in {"GET", "HEAD", "OPTIONS"}:
        check_origin(request)
        provided = request.headers.get("x-csrf-token", "")
        if not hmac.compare_digest(provided.encode(), csrf_token(token).encode()):
            raise HTTPException(
                status_code=403, detail="درخواست معتبر نیست؛ صفحه را تازه کنید"
            )
    return token


def staff_state_hash(staff: StaffUser) -> str:
    roles = sorted((role.id, role.slug, role.is_system, role.is_active, role.revision,
                    sorted(p.code for p in role.permissions)) for role in staff.roles)
    return hashlib.sha256(
        f"{staff.password_hash}:{staff.role}:{staff.is_active}:{roles}".encode()
    ).hexdigest()


def session_is_active(session: AuthSession) -> bool:
    settings = get_settings()
    lifetime = (
        timedelta(hours=settings.staff_session_hours)
        if session.staff_id
        else timedelta(days=settings.patient_session_days)
    )
    return (
        session.revoked_at is None
        and min(session.expires_at, session.created_at + lifetime) > utcnow()
    )
