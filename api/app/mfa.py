"""RFC 6238 TOTP, encrypted enrollment and single-use hashed recovery codes."""
import base64
import hashlib
import hmac
import json
import secrets
import struct
from datetime import timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import delete

from .auth_limits import client_ip
from .bot_protection import digest
from .browser_sessions import staff_state_hash
from .models import MfaChallenge
from .runtime_settings import seal, unseal
from .security import normalize_digits, utcnow


def totp(secret, counter, digits=6):
    key = base64.b32decode(secret, casefold=True)
    mac = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = mac[-1] & 15
    number = (struct.unpack(">I", mac[offset:offset+4])[0] & 0x7fffffff) % (10 ** digits)
    return str(number).zfill(digits)


def current_counter():
    return int(utcnow().replace(tzinfo=timezone.utc).timestamp()) // 30


def verify_counter(secret, code, last=-1):
    code = normalize_digits(code).strip()
    counter = current_counter()
    if len(code) == 6 and code.isascii() and code.isdigit():
        for candidate in (counter, counter - 1, counter + 1):
            if candidate > last and hmac.compare_digest(totp(secret, candidate), code):
                return candidate
    return None


def mfa_secret(record, pending=False):
    return unseal("mfa:" + str(record.staff_id), json.loads(record.pending_json if pending else record.secret_json))


def encrypted_secret(staff_id, secret):
    return json.dumps(seal("mfa:" + str(staff_id), secret))


def recovery_hash(staff_id, code):
    normalized = normalize_digits(code).replace("-", "").replace(" ", "").strip().upper()
    return digest("recovery:" + str(staff_id) + ":" + normalized)


def consume_factor(record, code, method):
    if method == "totp":
        counter = verify_counter(mfa_secret(record), code, record.last_counter)
        if counter is None:
            return False
        record.last_counter = counter
        return True
    hashes = json.loads(record.recovery_hashes_json)
    candidate = recovery_hash(record.staff_id, code)
    matching = next((value for value in hashes if hmac.compare_digest(value, candidate)), None)
    if not matching:
        return False
    hashes.remove(matching)
    record.recovery_hashes_json = json.dumps(hashes)
    return True


def new_recovery(record):
    codes = [secrets.token_hex(16).upper() for _ in range(10)]
    record.recovery_hashes_json = json.dumps([recovery_hash(record.staff_id, code) for code in codes])
    return ["-".join(code[i:i+8] for i in range(0, 32, 8)) for code in codes]


def create_login_challenge(db, request, staff, browser):
    from .schemas import MfaLoginRequired
    now = utcnow()
    db.execute(delete(MfaChallenge).where(MfaChallenge.expires_at < now - timedelta(days=1)))
    item = MfaChallenge(id=secrets.token_urlsafe(32), staff_id=staff.id,
        state_hash=staff_state_hash(staff), ip_hash=digest("ip:" + client_ip(request)),
        browser=browser, expires_at=now + timedelta(seconds=180))
    db.add(item); db.commit()
    return MfaLoginRequired(challenge_id=item.id)


def reject_factor(db, record, code, method):
    if not consume_factor(record, code, method):
        db.commit()
        raise HTTPException(400, "کد رمزساز یا بازیابی صحیح نیست یا قبلاً استفاده شده است")
