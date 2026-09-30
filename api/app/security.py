from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from .runtime_settings import get_settings


PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
PHONE_PATTERN = re.compile(r"^\+989\d{9}$")


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_digits(value: str) -> str:
    return value.translate(PERSIAN_DIGITS)


def normalize_phone(value: str) -> str:
    phone = re.sub(r"[^0-9+]", "", normalize_digits(value).strip())
    if phone.startswith("0098"):
        phone = "+98" + phone[4:]
    elif phone.startswith("98"):
        phone = "+" + phone
    elif phone.startswith("09"):
        phone = "+98" + phone[1:]
    if not PHONE_PATTERN.fullmatch(phone):
        raise ValueError("شماره موبایل معتبر نیست")
    return phone


def validate_national_id(value: str) -> bool:
    national_id = normalize_digits(value).strip()
    if not re.fullmatch(r"\d{10}", national_id) or len(set(national_id)) == 1:
        return False
    check = int(national_id[-1])
    total = sum(int(national_id[index]) * (10 - index) for index in range(9)) % 11
    expected = total if total < 2 else 11 - total
    return check == expected


def generate_otp() -> str:
    length = get_settings().otp_length
    return "".join(secrets.choice("0123456789") for _ in range(length))


def generate_nonce() -> str:
    return secrets.token_hex(12)


def hash_otp(phone: str, code: str, nonce: str) -> str:
    payload = f"{phone}:{code}:{nonce}".encode()
    return hmac.new(get_settings().secret_key.encode(), payload, hashlib.sha256).hexdigest()


def verify_otp_hash(phone: str, code: str, nonce: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(phone, code, nonce), expected_hash)


def hash_captcha(challenge_id: str, code: str, nonce: str) -> str:
    payload = f"captcha:{challenge_id}:{code}:{nonce}".encode()
    return hmac.new(get_settings().secret_key.encode(), payload, hashlib.sha256).hexdigest()


def verify_captcha_hash(challenge_id: str, code: str, nonce: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_captcha(challenge_id, code, nonce), expected_hash)


def issue_session_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(40)
    return token, hash_session_token(token)


def hash_session_token(token: str) -> str:
    payload = f"session:{token}".encode()
    return hmac.new(get_settings().secret_key.encode(), payload, hashlib.sha256).hexdigest()


def hash_password(password: str, *, salt: str | None = None) -> str:
    actual_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        bytes.fromhex(actual_salt),
        600_000,
    ).hex()
    return f"pbkdf2_sha256$600000${actual_salt}${digest}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, rounds, salt, expected = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256" or int(rounds) != 600_000:
            return False
        actual = hash_password(password, salt=salt).rsplit("$", 1)[-1]
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def patient_session_expiry() -> datetime:
    return utcnow() + timedelta(days=get_settings().patient_session_days)


def staff_session_expiry() -> datetime:
    return utcnow() + timedelta(hours=get_settings().staff_session_hours)
