from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import AuthSession, Patient, StaffUser
from .security import hash_session_token, utcnow


bearer_scheme = HTTPBearer(auto_error=False)


def _get_session(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> AuthSession:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نیاز به ورود دارید")
    token_hash = hash_session_token(credentials.credentials)
    auth_session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == token_hash,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > utcnow(),
        )
    )
    if not auth_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نشست نامعتبر یا منقضی است")
    return auth_session


def get_current_patient(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Patient:
    auth_session = _get_session(credentials, db)
    if not auth_session.patient_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="دسترسی بیمار لازم است")
    patient = db.get(Patient, auth_session.patient_id)
    if not patient or not patient.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب کاربری غیرفعال است")
    return patient


def get_current_staff(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> StaffUser:
    auth_session = _get_session(credentials, db)
    if not auth_session.staff_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="دسترسی کارکنان لازم است")
    staff = db.get(StaffUser, auth_session.staff_id)
    if not staff or not staff.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب کاربری غیرفعال است")
    return staff


def require_admin(staff: StaffUser = Depends(get_current_staff)) -> StaffUser:
    if staff.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="دسترسی مدیر لازم است")
    return staff

