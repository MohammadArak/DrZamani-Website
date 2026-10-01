"""One booking policy for HTML, public API and transactional admission checks."""
from fastapi import HTTPException
from sqlalchemy import text

from .runtime_settings import get_settings
from .schemas import ClinicSettingRead


def policy(db=None):
    settings = get_settings(db)
    return {"booking_enabled": settings.booking_enabled,
            "booking_disabled_message": settings.booking_disabled_message}


def require_booking(db):
    current = policy(db)
    if not current["booking_enabled"]:
        raise HTTPException(409, current["booking_disabled_message"])


def admission_lock(db):
    # Dependencies may have populated the identity map before waiting for the lock.
    db.commit()
    db.execute(text("BEGIN IMMEDIATE"))
    db.expire_all()
    require_booking(db)


def public_clinic(clinic, db=None):
    return ClinicSettingRead.model_validate(clinic).model_copy(update=policy(db))
