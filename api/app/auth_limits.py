"""SQLite-backed fixed-window limits, shared across requests and processes."""

from datetime import timedelta
import hashlib
import hmac

from fastapi import HTTPException, Request
from sqlalchemy import case, delete
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session

from .config import get_settings
from .models import AuthRateLimit
from .security import utcnow


def client_ip(request: Request) -> str:
    # Uvicorn resolves forwarded headers only from its configured trusted proxies.
    # Never re-read attacker-controlled X-Forwarded-For inside the application.
    return request.client.host if request.client else "unknown"


def limit_key(scope: str, identity: str) -> str:
    return hmac.new(
        get_settings().secret_key.encode(),
        f"limit:{scope}:{identity}".encode(),
        hashlib.sha256,
    ).hexdigest()


def consume_limit(
    db: Session, scope: str, identity: str, maximum: int, seconds: int
) -> None:
    now = utcnow()
    # No raw IP, phone or username is stored; expired rows are bounded by retention.
    db.execute(
        delete(AuthRateLimit).where(AuthRateLimit.resets_at < now - timedelta(days=1))
    )
    key = limit_key(scope, identity)
    expiry = now + timedelta(seconds=seconds)
    statement = insert(AuthRateLimit).values(key=key, attempts=1, resets_at=expiry)
    statement = statement.on_conflict_do_update(
        index_elements=[AuthRateLimit.key],
        set_={
            "attempts": case(
                (AuthRateLimit.resets_at <= now, 1), else_=AuthRateLimit.attempts + 1
            ),
            "resets_at": case(
                (AuthRateLimit.resets_at <= now, expiry), else_=AuthRateLimit.resets_at
            ),
        },
    ).returning(AuthRateLimit.attempts, AuthRateLimit.resets_at)
    attempts, resets_at = db.execute(statement).one()
    db.commit()
    if attempts > maximum:
        retry = max(1, int((resets_at - now).total_seconds()) + 1)
        raise HTTPException(
            status_code=429,
            detail={
                "message": "تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید",
                "retry_after_seconds": retry,
            },
            headers={"Retry-After": str(retry)},
        )


def reset_limit(db: Session, scope: str, identity: str) -> None:
    db.execute(
        delete(AuthRateLimit).where(AuthRateLimit.key == limit_key(scope, identity))
    )
