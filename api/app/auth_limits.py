"""SQLite-backed fixed-window limits shared across requests and processes."""

from datetime import timedelta
import hashlib
import hmac

from fastapi import HTTPException, Request
from sqlalchemy import case, delete
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session

from .runtime_settings import get_settings
from .models import AuthRateLimit
from .security import utcnow


def client_ip(request: Request) -> str:
    # Uvicorn resolves headers only from trusted proxies; never trust raw XFF here.
    return request.client.host if request.client else "unknown"


def limit_key(scope: str, identity: str) -> str:
    return hmac.new(
        get_settings().secret_key.encode(),
        f"limit:{scope}:{identity}".encode(), hashlib.sha256,
    ).hexdigest()


def consume_limits(db: Session, limits: list[tuple[str, str, int, int]]) -> None:
    """Reserve related budgets atomically; a denied resend spends none of them.

    The separate IP attempt budget is committed before human verification and
    this phone-specific reservation, so rejected requests remain abuse limited.
    SQLite serializes the write transaction across processes.
    """
    now = utcnow()
    try:
        db.execute(delete(AuthRateLimit).where(AuthRateLimit.resets_at < now - timedelta(days=1)))
        for scope, identity, maximum, seconds in limits:
            expiry = now + timedelta(seconds=seconds)
            statement = insert(AuthRateLimit).values(key=limit_key(scope, identity), attempts=1, resets_at=expiry)
            statement = statement.on_conflict_do_update(
                index_elements=[AuthRateLimit.key],
                set_={
                    "attempts": case((AuthRateLimit.resets_at <= now, 1), else_=AuthRateLimit.attempts + 1),
                    "resets_at": case((AuthRateLimit.resets_at <= now, expiry), else_=AuthRateLimit.resets_at),
                },
            ).returning(AuthRateLimit.attempts, AuthRateLimit.resets_at)
            attempts, resets_at = db.execute(statement).one()
            if attempts > maximum:
                retry = max(1, int((resets_at - now).total_seconds()) + 1)
                message = "برای ارسال دوبارهٔ کد، تا پایان زمان انتظار صبر کنید." if scope == "otp-resend" else "تعداد تلاش‌ها بیش از حد مجاز است؛ تا پایان زمان انتظار دوباره تلاش نکنید."
                raise HTTPException(status_code=429, detail={"message": message, "retry_after_seconds": retry}, headers={"Retry-After": str(retry)})
        db.commit()
    except Exception:
        db.rollback()
        raise


def consume_limit(db: Session, scope: str, identity: str, maximum: int, seconds: int) -> None:
    consume_limits(db, [(scope, identity, maximum, seconds)])


def reset_limit(db: Session, scope: str, identity: str) -> None:
    db.execute(delete(AuthRateLimit).where(AuthRateLimit.key == limit_key(scope, identity)))
