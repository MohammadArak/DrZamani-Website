"""Typed DB overrides, refreshed for every API/job read; infrastructure stays in ENV.

No process cache means a worker cannot keep an old credential or security policy.
Bootstrap config/database construction deliberately does not import this module.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, replace
from urllib.parse import urlsplit
from typing import TYPE_CHECKING

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from sqlalchemy import select, text
from fastapi import HTTPException

from . import config
from .activity import record_audit
from .models import ClinicSetting, SystemSetting, SettingRevision, StaffUser, CaptchaAttestation, Payment

if TYPE_CHECKING:
    from .schemas import ClinicSettingUpdate


class SettingsUnavailable(RuntimeError):
    """Safe error: never attach ciphertext, key material, or a provider URL."""


@dataclass(frozen=True)
class Field:
    key: str
    label: str
    group: str
    kind: str = "string"
    minimum: int | None = None
    maximum: int | None = None
    choices: tuple[str, ...] = ()
    help: str = "از درخواست یا اجرای بعدی اعمال می‌شود."
    secret: bool = False
    owner_only: bool = True


FIELDS = [
    Field("app_name", "نام سرویس", "system", maximum=120, help="نام نمایشی سرویس سلامت و اسناد API؛ از درخواست بعدی."),
    Field("patient_session_days", "اعتبار نشست بیمار (روز)", "security", "integer", 1, 30, help="حداکثر عمر نشست‌های جدید و موجود؛ کاهش زمان ممکن است کاربران را خارج کند."),
    Field("staff_session_hours", "اعتبار نشست کارکنان (ساعت)", "security", "integer", 1, 24, help="حداکثر عمر نشست‌های جدید و موجود."),
    Field("otp_length", "طول کد ورود", "security", "integer", 6, 8),
    Field("otp_ttl_seconds", "اعتبار کد (ثانیه)", "security", "integer", 30, 600),
    Field("otp_resend_seconds", "فاصله ارسال مجدد (ثانیه)", "security", "integer", 30, 600),
    Field("otp_max_attempts", "تعداد تلاش هر کد", "security", "integer", 1, 10),
    Field("otp_max_per_phone_hour", "ارسال برای هر شماره در ساعت", "security", "integer", 1, 20),
    Field("otp_max_per_ip_hour", "ارسال برای هر IP در ساعت", "security", "integer", 1, 200),
    Field("otp_verify_max_per_ip_minute", "تأیید کد برای هر IP در دقیقه", "security", "integer", 1, 120),
    Field("otp_verify_max_per_phone_hour", "تأیید کد برای هر شماره در ساعت", "security", "integer", 1, 120),
    Field("staff_login_max_attempts", "تلاش ورود کارکنان", "security", "integer", 1, 20),
    Field("staff_login_lock_seconds", "قفل حساب کارکنان (ثانیه)", "security", "integer", 60, 3600),
    Field("staff_login_max_per_ip_window", "ورود کارکنان برای هر IP در بازه", "security", "integer", 1, 300),
    Field("captcha_max_per_ip_hour", "تصویر کپچا برای هر IP در ساعت", "security", "integer", 1, 300),
    Field("sms_provider", "سرویس پیامک", "sms", "select", choices=("disabled", "console", "faraz", "webhook"), help="خاموش، آزمایشی (فقط توسعه)، فراز یا وب‌هوک؛ تغییر ممکن است ورود بیمار و پیامک‌های صف را متوقف کند."),
    Field("sms_webhook_url", "نشانی وب‌هوک", "sms", maximum=1000, help="HTTPS و پورت ۴۴۳؛ دامنه دقیق باید در SMS_WEBHOOK_ALLOWED_HOSTS سرور مجاز باشد."),
    Field("sms_webhook_token", "توکن وب‌هوک", "sms", maximum=2048, secret=True),
    Field("sms_sender", "فرستنده پیامک", "sms", maximum=120),
    Field("faraz_api_key", "کلید API فراز", "sms", maximum=2048, secret=True),
    Field("faraz_pattern_code", "پترن کد ورود فراز", "sms", maximum=120),
    Field("faraz_line_number", "خط ارسال فراز", "sms", maximum=120),
    Field("faraz_otp_variable", "نام متغیر کد ورود", "sms", maximum=80),
    Field("max_upload_bytes", "حداکثر حجم تصویر (بایت)", "system", "integer", 1024, 10485760, help="از آپلود بعدی؛ حداکثر ۱۰ مگابایت مطابق سقف Nginx، محدودیت پیکسل مستقل است."),
    Field("frontend_url", "مبدأ پنل بیمار و بازگشت پرداخت", "payment", maximum=500, help="باید یکی از مبدأهای مجاز ENV باشد؛ تغییر DNS/CORS و دامنه عمومی سایت جداگانه هماهنگ شود."),
    Field("booking_enabled", "فعال بودن رزرو آنلاین", "booking", "boolean", help="رزرو جدید، جابه‌جایی بیمار و عضویت جدید در انتظار را کنترل می‌کند؛ پرونده و بازگشت پرداخت‌های قبلی باز می‌مانند."),
    Field("booking_disabled_message", "پیام غیرفعال بودن رزرو", "booking", maximum=1000),
    Field("booking_hold_minutes", "اعتبار نگهداری نوبت (دقیقه)", "booking", "integer", 5, 60, help="فقط نگهداری‌های جدید؛ پرداخت قبلی پس از خاموش‌شدن همچنان بررسی می‌شود."),
    Field("zarinpal_merchant_id", "شناسه پذیرنده زرین‌پال", "payment", maximum=120, secret=True),
    Field("zarinpal_sandbox", "درگاه آزمایشی", "payment", "boolean", help="در محیط اصلی همیشه ممنوع؛ تنظیم درگاه به معنی روشن‌شدن نوبت‌دهی نیست."),
    Field("turnstile_enabled", "فعال بودن Cloudflare Turnstile", "captcha", "boolean", help="پیش از فعال‌سازی، کلید ذخیره‌شده را روی همین دامنه تأیید کنید."),
    Field("turnstile_site_key", "Site key کلادفلر", "captcha", maximum=200),
    Field("turnstile_secret", "Secret کلادفلر", "captcha", maximum=2048, secret=True),
    Field("google_enabled", "فعال بودن Google Fraud Defense", "captcha", "boolean", help="کلید score-based Enterprise و تأیید مرورگر/سرور لازم است؛ از API assessments v1 استفاده می‌شود."),
    Field("google_site_key", "Site key گوگل", "captcha", maximum=200),
    Field("google_project_id", "شناسه پروژه Google Cloud", "captcha", maximum=100),
    Field("google_api_key", "API key سروری گوگل", "captcha", maximum=2048, secret=True),
    Field("google_min_score", "حداقل امتیاز گوگل (از ۱۰۰)", "captcha", "integer", 0, 100, help="۵۰ یعنی 0.5؛ با امتیازهای واقعی و نرخ خطا تنظیم شود."),
    Field("captcha_primary", "ارائه‌دهنده اصلی", "captcha", "select", choices=("turnstile", "google")),
    Field("captcha_fallback", "جایگزین فقط هنگام قطع سرویس سروری", "captcha", "boolean", help="هر دو باید فعال باشند. امتیاز پایین یا توکن نامعتبر به جایگزین منتقل نمی‌شود؛ خطای مرورگر نیز به‌تنهایی مجوز جایگزین نیست."),
    Field("captcha_staff_login", "محافظت از ورود کارکنان", "captcha", "boolean"),
    Field("captcha_otp_request", "محافظت از ارسال کد بیمار", "captcha", "boolean"),
    Field("captcha_otp_verify", "محافظت از تأیید کد بیمار", "captcha", "boolean"),
    Field("captcha_hostnames", "دامنه‌های دقیق مجاز کپچا", "captcha", maximum=500, help="CSV بدون wildcard و scheme؛ خالی یعنی hostname مبدأهای مجاز سرور. برای چند دامنه، کلید ارائه‌دهنده هم باید آن‌ها را بپذیرد."),
    Field("mfa_required_owners", "اجباری بودن عامل دوم مدیرکل", "security", "boolean", help="تنها وقتی همه مدیرکل‌های فعال رمزساز تأییدشده دارند قابل روشن‌کردن است. تغییر، نشست مدیرکل را باطل می‌کند."),
]
CATALOG = {field.key: field for field in FIELDS}
SECRET_KEYS = {field.key for field in FIELDS if field.secret}


def cipher() -> MultiFernet:
    keys = config.get_settings().settings_encryption_keys
    if not keys:
        raise SettingsUnavailable("کلید رمزگذاری مستقل تنظیمات در سرور تنظیم نشده است")
    try:
        if any(key == config.get_settings().secret_key for key in keys):
            raise ValueError
        return MultiFernet([Fernet(key) for key in keys])
    except (ValueError, TypeError):
        raise SettingsUnavailable("کلید رمزگذاری تنظیمات معتبر نیست") from None


def seal(key: str, value: str) -> dict:
    return {"encrypted": cipher().encrypt(json.dumps([key, value]).encode()).decode()}


def unseal(key: str, value: dict) -> str:
    try:
        name, secret = json.loads(cipher().decrypt(value["encrypted"].encode()))
        if name != key or not isinstance(secret, str):
            raise ValueError
        return secret
    except SettingsUnavailable:
        raise
    except (InvalidToken, KeyError, ValueError, TypeError):
        raise SettingsUnavailable("خواندن رمز تنظیمات ممکن نیست؛ کلید یا نسخه ذخیره‌شده را بررسی کنید") from None


def decode(overrides: dict) -> dict:
    if not isinstance(overrides, dict) or set(overrides) - CATALOG.keys():
        raise SettingsUnavailable("ساختار تنظیمات ذخیره‌شده معتبر نیست")
    return {key: unseal(key, value) if key in SECRET_KEYS else value for key, value in overrides.items()}


_EFFECTIVE: dict[str, tuple[config.Settings, config.Settings]] = {}


def get_settings(db=None) -> config.Settings:
    from .database import SessionLocal
    bootstrap = config.get_settings()
    if db is None:
        with SessionLocal() as session:
            return get_settings(session)
    row = db.get(SystemSetting, 1)
    raw = row.overrides_json if row else ""
    cached = _EFFECTIVE.get(raw)
    if cached and cached[0] is bootstrap:
        return cached[1]
    try:
        values = decode(json.loads(raw)) if row else {}
        effective = replace(bootstrap, **values)
        validate_effective(effective, check_dns=False)
        # Pure function of (ENV bootstrap, stored JSON): the row is still read on every call, so a changed
        # value or credential is never served stale; only the decrypt/validate work is skipped.
        if len(_EFFECTIVE) >= 8:
            _EFFECTIVE.clear()
        _EFFECTIVE[raw] = (bootstrap, effective)
        return effective
    except SettingsUnavailable:
        raise
    except (ValueError, TypeError):
        raise SettingsUnavailable("ساختار تنظیمات ذخیره‌شده معتبر نیست") from None


def validate_value(field: Field, value):
    if field.kind == "integer":
        if type(value) is not int or not field.minimum <= value <= field.maximum:
            raise ValueError(f"{field.label}: عدد صحیح بین {field.minimum} و {field.maximum}")
    elif field.kind == "boolean":
        if type(value) is not bool:
            raise ValueError(f"{field.label}: مقدار روشن/خاموش معتبر لازم است")
    else:
        if not isinstance(value, str) or len(value) > (field.maximum or 2048) or any(ord(char) < 32 for char in value):
            raise ValueError(f"{field.label}: متن معتبر و محدود لازم است")
        value = value.strip()
        if field.choices and value not in field.choices:
            raise ValueError(f"{field.label}: گزینه معتبر انتخاب کنید")
    return value


def validate_effective(settings: config.Settings, *, check_dns: bool):
    for field in FIELDS:
        validate_value(field, getattr(settings, field.key))
    if not settings.booking_disabled_message.strip():
        raise ValueError("پیام غیرفعال بودن رزرو نمی‌تواند خالی باشد")
    if not settings.app_name or not settings.faraz_otp_variable:
        raise ValueError("نام سرویس و متغیر کد ورود نمی‌تواند خالی باشد")
    if settings.otp_resend_seconds > settings.otp_ttl_seconds:
        raise ValueError("فاصله ارسال مجدد باید کمتر یا مساوی اعتبار کد باشد")
    if settings.app_env == "production" and (settings.zarinpal_sandbox or settings.sms_provider == "console"):
        raise ValueError("پیامک یا پرداخت آزمایشی در محیط اصلی مجاز نیست")
    bootstrap = config.get_settings()
    allowed = {bootstrap.frontend_url, *bootstrap.allowed_origins}
    parsed = urlsplit(settings.frontend_url)
    if settings.frontend_url not in allowed or parsed.username or parsed.password or parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
        raise ValueError("مبدأ بازگشت باید از مبدأهای مجاز سرور انتخاب شود")
    from .bot_protection import validate_configuration
    validate_configuration(settings)
    if settings.mfa_required_owners:
        from .database import SessionLocal
        from .access import is_owner
        with SessionLocal() as check_db:
            if any(is_owner(staff) and (not staff.mfa or not staff.mfa.enabled) for staff in check_db.scalars(select(StaffUser)).unique()):
                raise ValueError("همه مدیرکل‌های فعال باید ابتدا رمزساز خود را تأیید کنند")
    if settings.sms_webhook_url:
        from .outbound import validate_webhook
        validate_webhook(settings.sms_webhook_url, resolve=check_dns)
    if settings.sms_provider == "webhook" and not settings.sms_webhook_url:
        raise ValueError("نشانی وب‌هوک برای این سرویس لازم است")
    if settings.sms_provider == "faraz" and not all([settings.faraz_api_key, settings.faraz_pattern_code, settings.faraz_line_number]):
        raise ValueError("کلید، پترن و خط فراز را پیش از انتخاب این سرویس تکمیل کنید")


def state(db):
    row = db.get(SystemSetting, 1)
    if not row:
        row = SystemSetting(id=1, revision=1, overrides_json="{}")
        db.add(row)
        db.flush()
    return row


def lock(db, staff: StaffUser, expected: int):
    staff_id = staff.id
    db.rollback()
    db.execute(text("BEGIN IMMEDIATE"))
    db.expire_all()
    fresh_staff = db.get(StaffUser, staff_id)
    row = state(db)
    if row.revision != expected:
        raise HTTPException(409, "تنظیمات توسط حساب دیگری تغییر کرده؛ ابتدا آخرین نسخه را بارگیری کنید")
    return row, fresh_staff


def checkpoint(db, row, staff, changed_keys):
    from .schemas import ClinicSettingRead
    clinic = db.get(ClinicSetting, 1)
    if not clinic:
        raise HTTPException(503, "تنظیمات مطب آماده نیست")
    snapshot = {"overrides": json.loads(row.overrides_json), "clinic": ClinicSettingRead.model_validate(clinic).model_dump()}
    db.add(SettingRevision(revision=row.revision, snapshot_json=json.dumps(snapshot, ensure_ascii=False), changed_keys_json=json.dumps(changed_keys), actor_staff_id=staff.id))
    row.revision += 1
    clinic.revision = row.revision
    record_audit(db, action="settings.updated", entity_type="system_setting", entity_id=1,
                 actor_staff_id=staff.id, summary="تغییر نسخه تنظیمات",
                 details={"revision": row.revision, "changed_keys": changed_keys})


def update_clinic(db, staff, payload: ClinicSettingUpdate):
    from .access import can
    row, staff = lock(db, staff, payload.revision)
    if not staff or not can(staff, "settings.edit"):
        raise HTTPException(403, "اجازه ویرایش تنظیمات ندارید")
    clinic = db.get(ClinicSetting, 1)
    if not clinic:
        raise HTTPException(503, "تنظیمات مطب آماده نیست")
    values = payload.model_dump(exclude={"revision", "booking_enabled", "booking_disabled_message"})
    changed = [key for key, value in values.items() if getattr(clinic, key) != value]
    if changed:
        checkpoint(db, row, staff, changed)
        for key, value in values.items():
            setattr(clinic, key, value)
        record_audit(db, action="clinic.settings_updated", entity_type="clinic_setting", entity_id=1,
                     summary="به‌روزرسانی اطلاعات مطب", actor_staff_id=staff.id,
                     details={"changed_fields": changed, "revision": row.revision})
    db.commit()
    db.refresh(clinic)
    return clinic


def describe(db):
    from .bot_protection import fingerprint
    row = db.get(SystemSetting, 1)
    stored = json.loads(row.overrides_json) if row else {}
    effective = get_settings()
    fields = []
    bootstrap = config.get_settings()
    for field in FIELDS:
        data = asdict(field)
        value = getattr(effective, field.key)
        data.update(value=None if field.secret else value,
                    default=None if field.secret else getattr(bootstrap, field.key),
                    configured=bool(value), source="database" if field.key in stored else "environment/default")
        fields.append(data)
    return {"revision": row.revision if row else 1, "fields": fields,
            "status": {"environment": bootstrap.app_env, "encryption_ready": bool(bootstrap.settings_encryption_keys),
                       "captcha_verified": {p: bool(db.get(CaptchaAttestation, fingerprint(effective, p))) for p in ("google", "turnstile")},
                       "webhook_allowed_hosts": list(bootstrap.sms_webhook_allowed_hosts),
                       "frontend_origins": [bootstrap.frontend_url, *bootstrap.allowed_origins],
                       "public_html_ready": (bootstrap.public_html_dir / "index.html").is_file()},
            "infrastructure": [
                {"key": key, "help": help_text} for key, help_text in [
                    ("APP_ENV / APP_DEBUG", "محیط و حالت اشکال‌زدایی؛ فقط تنظیم سرور و راه‌اندازی مجدد."),
                    ("SECRET_KEY", "کلید امضای نشست؛ تغییر آن همه نشست‌ها را باطل می‌کند."),
                    ("DATABASE_URL / UPLOAD_DIR / PUBLIC_HTML_DIR", "مسیر دیتابیس، رسانه خصوصی و خروجی ساخت؛ فقط تنظیم سرور."),
                    ("API_PREFIX / ALLOWED_ORIGINS", "مسیر API و سیاست CORS؛ نیازمند هماهنگی frontend و Nginx."),
                    ("SETTINGS_ENCRYPTION_KEYS", "کلیدهای مستقل رمزگذاری؛ جدید در ابتدای فهرست، قدیمی برای خواندن تاریخچه."),
                    ("SMS_WEBHOOK_ALLOWED_HOSTS", "فهرست دقیق دامنه‌های وب‌هوک مجاز؛ کنترل خروجی شبکه."),
                    ("BOOTSTRAP_ADMIN_*", "فقط نصب اولیه؛ پس از استفاده از محیط حذف شوند."),
                    ("VITE_* / PRERENDER_* / PYTHONDONTWRITEBYTECODE", "تنظیمات ساخت و اجرای سرویس؛ مدیریت از محیط استقرار."),
                ]],
            "future": {"content": "مقالات و نظرات در مراحل ۶ و ۷"}}


def guard_payment_config(db, current, target):
    if (current.zarinpal_merchant_id, current.zarinpal_sandbox) != (target.zarinpal_merchant_id, target.zarinpal_sandbox):
        if db.scalar(select(Payment.id).where(Payment.status.in_(["created", "redirected", "verification_error"])).limit(1)):
            raise HTTPException(409, "پیش از تغییر حساب یا محیط درگاه، پرداخت‌های در انتظار تأیید را تعیین تکلیف کنید")


def change(db, staff, revision: int, values: dict, reset: list[str]):
    from .access import can
    row, staff = lock(db, staff, revision)
    if not staff or not can(staff, "secrets.manage"):
        raise HTTPException(403, "تنظیمات سرویس و امنیت فقط برای مدیرکل است")
    if set(values) & set(reset) or (set(values) | set(reset)) - CATALOG.keys():
        raise HTTPException(422, "نام تنظیم یا دستور بازنشانی معتبر نیست")
    overrides = json.loads(row.overrides_json)
    current = replace(config.get_settings(), **decode(overrides))
    try:
        for key in reset:
            overrides.pop(key, None)
        for key, value in values.items():
            value = validate_value(CATALOG[key], value)
            overrides[key] = seal(key, value) if key in SECRET_KEYS else value
        effective = replace(config.get_settings(), **decode(overrides))
        validate_effective(effective, check_dns=True)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    guard_payment_config(db, current, effective)
    checkpoint(db, row, staff, sorted(set(values) | set(reset)))
    row.overrides_json = json.dumps(overrides, ensure_ascii=False)
    db.commit()
    return describe(db)


def restore(db, staff, revision: int, target: int):
    from .access import can
    from .schemas import ClinicSettingUpdate
    row, staff = lock(db, staff, revision)
    if not staff or not can(staff, "secrets.manage"):
        raise HTTPException(403, "بازیابی فقط برای مدیرکل است")
    previous = db.scalar(select(SettingRevision).where(SettingRevision.revision == target))
    if not previous:
        raise HTTPException(404, "نسخه مورد نظر پیدا نشد")
    saved = json.loads(previous.snapshot_json)
    try:
        clinic_values = ClinicSettingUpdate.model_validate(saved["clinic"]).model_dump(exclude={"revision", "booking_enabled", "booking_disabled_message"})
        validate_effective(replace(config.get_settings(), **decode(saved["overrides"])), check_dns=True)
    except ValueError:
        raise HTTPException(422, "نسخه قدیمی با سیاست فعلی سرور سازگار نیست") from None
    guard_payment_config(db, replace(config.get_settings(), **decode(json.loads(row.overrides_json))), replace(config.get_settings(), **decode(saved["overrides"])))
    checkpoint(db, row, staff, [f"restore:{target}"])
    row.overrides_json = json.dumps(saved["overrides"], ensure_ascii=False)
    clinic = db.get(ClinicSetting, 1)
    for key, value in clinic_values.items():
        setattr(clinic, key, value)
    db.commit()
    return describe(db)
