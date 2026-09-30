from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import AuthSession, Patient, StaffUser
from .security import hash_session_token, utcnow
from .browser_sessions import request_token, staff_state_hash, session_is_active
from .access import can


bearer_scheme = HTTPBearer(auto_error=False)


def _get_session(
    token: str,
    db: Session,
) -> AuthSession:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="نیاز به ورود دارید"
        )
    token_hash = hash_session_token(token)
    auth_session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == token_hash,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > utcnow(),
        )
    )
    if not auth_session or not session_is_active(auth_session):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="نشست نامعتبر یا منقضی است"
        )
    return auth_session


def get_current_patient(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Patient:
    auth_session = _get_session(request_token(request, "patient", credentials), db)
    if not auth_session.patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="دسترسی بیمار لازم است"
        )
    patient = db.get(Patient, auth_session.patient_id)
    if not patient or not patient.is_active:
        auth_session.revoked_at = utcnow()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب کاربری غیرفعال است"
        )
    return patient


def get_current_staff(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> StaffUser:
    auth_session = _get_session(request_token(request, "staff", credentials), db)
    if not auth_session.staff_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="دسترسی کارکنان لازم است"
        )
    staff = db.get(StaffUser, auth_session.staff_id)
    if (
        not staff
        or not staff.is_active
        or auth_session.staff_state_hash != staff_state_hash(staff)
    ):
        auth_session.revoked_at = utcnow()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب کاربری غیرفعال است"
        )
    return staff


def require_permission(code: str):
    def dependency(staff: StaffUser = Depends(get_current_staff)) -> StaffUser:
        if not can(staff, code):
            raise HTTPException(status_code=403, detail="دسترسی لازم برای این عملیات را ندارید")
        return staff
    return dependency
