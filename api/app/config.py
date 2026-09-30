from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_list(value: str | None) -> tuple[str, ...]:
    if not value:
        return ()
    return tuple(item.strip() for item in value.split(",") if item.strip())


def _database_url(value: str) -> str:
    """Anchor relative SQLite URLs to the API directory.

    Uvicorn, Alembic and service managers may start with different working
    directories. Without this normalization, ``sqlite:///./data/...`` can
    silently point at a different database for each command.
    """
    prefix = "sqlite:///./"
    if value.startswith(prefix):
        relative_path = value.removeprefix(prefix)
        return f"sqlite:///{(BACKEND_DIR / relative_path).resolve().as_posix()}"
    return value


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_env: str
    debug: bool
    api_prefix: str
    secret_key: str
    database_url: str
    allowed_origins: tuple[str, ...]
    patient_session_days: int
    staff_session_hours: int
    otp_length: int
    otp_ttl_seconds: int
    otp_resend_seconds: int
    otp_max_attempts: int
    otp_max_per_phone_hour: int
    otp_max_per_ip_hour: int
    sms_provider: str
    sms_webhook_url: str
    sms_webhook_token: str
    sms_sender: str
    faraz_api_key: str
    faraz_pattern_code: str
    faraz_line_number: str
    faraz_otp_variable: str
    upload_dir: Path
    max_upload_bytes: int
    frontend_url: str
    booking_hold_minutes: int
    zarinpal_merchant_id: str
    zarinpal_sandbox: bool
    bootstrap_admin_username: str
    bootstrap_admin_password: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    default_db = f"sqlite:///{(BACKEND_DIR / 'data' / 'appointments_v2.db').as_posix()}"
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    debug = _as_bool(os.getenv("APP_DEBUG"), app_env != "production")
    secret_key = os.getenv("SECRET_KEY", "").strip()

    if app_env == "production" and len(secret_key) < 32:
        raise RuntimeError("در محیط اصلی، SECRET_KEY باید دست‌کم ۳۲ نویسه داشته باشد")

    if not secret_key:
        secret_key = "development-only-change-this-secret-key"

    return Settings(
        app_name=os.getenv("APP_NAME", "Dr Zamani Appointment API"),
        app_env=app_env,
        debug=debug,
        api_prefix=os.getenv("API_PREFIX", "/api/v1").rstrip("/"),
        secret_key=secret_key,
        database_url=_database_url(os.getenv("DATABASE_URL", default_db)),
        allowed_origins=_as_list(os.getenv("ALLOWED_ORIGINS")),
        patient_session_days=int(os.getenv("PATIENT_SESSION_DAYS", "30")),
        staff_session_hours=int(os.getenv("STAFF_SESSION_HOURS", "12")),
        otp_length=int(os.getenv("OTP_LENGTH", "6")),
        otp_ttl_seconds=int(os.getenv("OTP_TTL_SECONDS", "120")),
        otp_resend_seconds=int(os.getenv("OTP_RESEND_SECONDS", "60")),
        otp_max_attempts=int(os.getenv("OTP_MAX_ATTEMPTS", "5")),
        otp_max_per_phone_hour=int(os.getenv("OTP_MAX_PER_PHONE_HOUR", "5")),
        otp_max_per_ip_hour=int(os.getenv("OTP_MAX_PER_IP_HOUR", "20")),
        sms_provider=os.getenv("SMS_PROVIDER", "console").strip().lower(),
        sms_webhook_url=os.getenv("SMS_WEBHOOK_URL", "").strip(),
        sms_webhook_token=os.getenv("SMS_WEBHOOK_TOKEN", "").strip(),
        sms_sender=os.getenv("SMS_SENDER", "").strip(),
        faraz_api_key=os.getenv("FARAZ_API_KEY", "").strip(),
        faraz_pattern_code=os.getenv("FARAZ_PATTERN_CODE", "").strip(),
        faraz_line_number=os.getenv("FARAZ_LINE_NUMBER", "").strip(),
        faraz_otp_variable=os.getenv("FARAZ_OTP_VARIABLE", "code").strip() or "code",
        upload_dir=Path(os.getenv("UPLOAD_DIR", str(BACKEND_DIR / "data" / "uploads"))).resolve(),
        max_upload_bytes=int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/"),
        booking_hold_minutes=max(5, int(os.getenv("BOOKING_HOLD_MINUTES", "12"))),
        zarinpal_merchant_id=os.getenv("ZARINPAL_MERCHANT_ID", "").strip(),
        zarinpal_sandbox=_as_bool(os.getenv("ZARINPAL_SANDBOX"), app_env != "production"),
        bootstrap_admin_username=os.getenv("BOOTSTRAP_ADMIN_USERNAME", "").strip(),
        bootstrap_admin_password=os.getenv("BOOTSTRAP_ADMIN_PASSWORD", ""),
    )
