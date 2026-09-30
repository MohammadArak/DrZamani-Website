from __future__ import annotations

import os
from urllib.parse import urlsplit
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized not in {"1", "true", "yes", "on", "0", "false", "no", "off"}:
        raise RuntimeError("مقدار تنظیم boolean معتبر نیست")
    return normalized in {"1", "true", "yes", "on"}


def _bounded_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError as exc:
        raise RuntimeError(f"{name} باید عدد صحیح باشد") from exc
    if not minimum <= value <= maximum:
        raise RuntimeError(f"{name} باید بین {minimum} و {maximum} باشد")
    return value


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
    staff_login_max_attempts: int
    staff_login_lock_seconds: int
    staff_login_max_per_ip_window: int
    captcha_max_per_ip_hour: int
    otp_verify_max_per_ip_minute: int
    otp_verify_max_per_phone_hour: int
    settings_encryption_keys: tuple[str, ...] = ()
    sms_webhook_allowed_hosts: tuple[str, ...] = ()
    public_html_dir: Path = BACKEND_DIR.parent / "public_html"

    @property
    def development_debug(self) -> bool:
        return self.app_env in {"development", "test"} and self.debug


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    default_db = f"sqlite:///{(BACKEND_DIR / 'data' / 'appointments_v2.db').as_posix()}"
    app_env = os.getenv("APP_ENV", "production").strip().lower()
    if app_env not in {"production", "development", "test"}:
        raise RuntimeError("APP_ENV باید production، development یا test باشد")
    debug = _as_bool(os.getenv("APP_DEBUG"), False)
    secret_key = os.getenv("SECRET_KEY", "").strip()

    sandbox = _as_bool(os.getenv("ZARINPAL_SANDBOX"), app_env != "production")
    sms_provider = os.getenv("SMS_PROVIDER", "disabled").strip().lower()
    frontend_url = os.getenv(
        "FRONTEND_URL",
        "https://drfarzadzamani.ir" if app_env == "production" else "http://localhost:5173",
    ).rstrip("/")
    allowed_origins = _as_list(os.getenv("ALLOWED_ORIGINS"))
    if "*" in allowed_origins:
        raise RuntimeError("ALLOWED_ORIGINS باید شامل دامنه‌های مشخص باشد")
    if sms_provider not in {"disabled", "console", "faraz", "webhook"}:
        raise RuntimeError("SMS_PROVIDER معتبر نیست")
    if app_env == "production":
        if debug:
            raise RuntimeError("APP_DEBUG در محیط اصلی باید false باشد")
        if (
            len(secret_key) < 32 or len(set(secret_key)) < 8
            or any(marker in secret_key.lower() for marker in (
                "change_me", "change-this", "development-only", "paste_the", "your-secret",
            ))
        ):
            raise RuntimeError("SECRET_KEY محیط اصلی باید تصادفی، محرمانه و غیرنمونه باشد")
        if sandbox:
            raise RuntimeError("پرداخت آزمایشی در محیط اصلی مجاز نیست")
        if sms_provider == "console":
            raise RuntimeError("SMS_PROVIDER=console در محیط اصلی مجاز نیست")
        origins = (frontend_url, *allowed_origins)
        if sms_provider == "webhook":
            origins += (os.getenv("SMS_WEBHOOK_URL", ""),)
        for origin in origins:
            url = urlsplit(origin)
            if url.scheme != "https" or not url.hostname or url.username or url.password:
                raise RuntimeError("نشانی‌های محیط اصلی باید HTTPS و بدون اطلاعات ورود باشند")

    if not secret_key:
        secret_key = "development-only-change-this-secret-key"

    return Settings(
        app_name=os.getenv("APP_NAME", "Dr Zamani Appointment API"),
        app_env=app_env,
        debug=debug,
        api_prefix=os.getenv("API_PREFIX", "/api/v1").rstrip("/"),
        secret_key=secret_key,
        database_url=_database_url(os.getenv("DATABASE_URL", default_db)),
        allowed_origins=allowed_origins,
        patient_session_days=_bounded_int("PATIENT_SESSION_DAYS", 7, 1, 30),
        staff_session_hours=_bounded_int("STAFF_SESSION_HOURS", 12, 1, 24),
        otp_length=_bounded_int("OTP_LENGTH", 6, 6, 8),
        otp_ttl_seconds=_bounded_int("OTP_TTL_SECONDS", 120, 30, 600),
        otp_resend_seconds=_bounded_int("OTP_RESEND_SECONDS", 60, 30, 600),
        otp_max_attempts=_bounded_int("OTP_MAX_ATTEMPTS", 5, 1, 10),
        otp_max_per_phone_hour=_bounded_int("OTP_MAX_PER_PHONE_HOUR", 5, 1, 20),
        otp_max_per_ip_hour=_bounded_int("OTP_MAX_PER_IP_HOUR", 20, 1, 200),
        sms_provider=sms_provider,
        sms_webhook_url=os.getenv("SMS_WEBHOOK_URL", "").strip(),
        sms_webhook_token=os.getenv("SMS_WEBHOOK_TOKEN", "").strip(),
        sms_sender=os.getenv("SMS_SENDER", "").strip(),
        faraz_api_key=os.getenv("FARAZ_API_KEY", "").strip(),
        faraz_pattern_code=os.getenv("FARAZ_PATTERN_CODE", "").strip(),
        faraz_line_number=os.getenv("FARAZ_LINE_NUMBER", "").strip(),
        faraz_otp_variable=os.getenv("FARAZ_OTP_VARIABLE", "code").strip() or "code",
        upload_dir=Path(os.getenv("UPLOAD_DIR", str(BACKEND_DIR / "data" / "uploads"))).resolve(),
        max_upload_bytes=_bounded_int("MAX_UPLOAD_BYTES", 10 * 1024 * 1024, 1024, 10 * 1024 * 1024),
        frontend_url=frontend_url,
        booking_hold_minutes=_bounded_int("BOOKING_HOLD_MINUTES", 12, 5, 60),
        zarinpal_merchant_id=os.getenv("ZARINPAL_MERCHANT_ID", "").strip(),
        zarinpal_sandbox=sandbox,
        bootstrap_admin_username=os.getenv("BOOTSTRAP_ADMIN_USERNAME", "").strip(),
        bootstrap_admin_password=os.getenv("BOOTSTRAP_ADMIN_PASSWORD", ""),
        staff_login_max_attempts=_bounded_int("STAFF_LOGIN_MAX_ATTEMPTS", 5, 1, 20),
        staff_login_lock_seconds=_bounded_int("STAFF_LOGIN_LOCK_SECONDS", 900, 60, 3600),
        staff_login_max_per_ip_window=_bounded_int("STAFF_LOGIN_MAX_PER_IP_WINDOW", 30, 1, 300),
        captcha_max_per_ip_hour=_bounded_int("CAPTCHA_MAX_PER_IP_HOUR", 60, 1, 300),
        otp_verify_max_per_ip_minute=_bounded_int("OTP_VERIFY_MAX_PER_IP_MINUTE", 30, 1, 120),
        otp_verify_max_per_phone_hour=_bounded_int("OTP_VERIFY_MAX_PER_PHONE_HOUR", 30, 1, 120),
        settings_encryption_keys=_as_list(os.getenv("SETTINGS_ENCRYPTION_KEYS")),
        sms_webhook_allowed_hosts=_as_list(os.getenv("SMS_WEBHOOK_ALLOWED_HOSTS")),
        public_html_dir=Path(os.getenv("PUBLIC_HTML_DIR") or str(BACKEND_DIR.parent / "public_html")).resolve(),
    )
