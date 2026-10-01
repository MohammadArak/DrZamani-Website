"""Server-selected, one-use, action-bound provider proofs; never fail open."""
import hashlib
import hmac
import json
import math
import re
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException
from sqlalchemy import delete, text
from sqlalchemy.exc import IntegrityError

from . import config
from .models import BotChallenge, CaptchaAttestation

OPERATIONS = {"staff_login", "otp_request", "otp_verify", "captcha_setup"}


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def digest(value):
    return hmac.new(config.get_settings().secret_key.encode(), value.encode(), hashlib.sha256).hexdigest()


def hosts(settings):
    if settings.captcha_hostnames:
        return {h.strip().lower() for h in settings.captcha_hostnames.split(",")}
    return {urlsplit(url).hostname for url in (settings.frontend_url, *settings.allowed_origins)} - {None}


def fingerprint(settings, provider):
    values = {key: getattr(settings, key) for key in (
        ("turnstile_site_key", "turnstile_secret") if provider == "turnstile" else
        ("google_site_key", "google_project_id", "google_api_key", "google_min_score"))}
    return digest(json.dumps([provider, values, sorted(hosts(settings))], sort_keys=True))


def policy_hash(settings):
    return digest(json.dumps([fingerprint(settings, p) for p in ("google", "turnstile")] +
        [getattr(settings, k) for k in ("google_enabled", "turnstile_enabled", "captcha_primary", "captcha_fallback", "captcha_staff_login", "captcha_otp_request", "captcha_otp_verify")]))


def validate_configuration(settings):
    from .database import SessionLocal
    valid_hosts = hosts(settings)
    if not valid_hosts or any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", h) or ".." in h
        or (settings.app_env == "production" and ("." not in h or re.fullmatch(r"[0-9.]+", h))) for h in valid_hosts):
        raise ValueError("دامنه‌های کپچا باید hostname دقیق و معتبر باشند")
    if settings.google_project_id and not re.fullmatch(r"[a-z][a-z0-9-]{4,98}[a-z0-9]", settings.google_project_id):
        raise ValueError("شناسه پروژه گوگل معتبر نیست")
    for provider in ("turnstile", "google"):
        key = getattr(settings, provider + "_site_key")
        if key and not re.fullmatch(r"[a-zA-Z0-9_-]{10,200}", key):
            raise ValueError("Site key کپچا معتبر نیست")
        if getattr(settings, provider + "_enabled"):
            complete = key and (settings.turnstile_secret if provider == "turnstile" else settings.google_project_id and settings.google_api_key)
            with SessionLocal() as db:
                proven = complete and db.get(CaptchaAttestation, fingerprint(settings, provider))
            if not proven:
                raise ValueError("پیش از فعال‌سازی، کلیدهای این ارائه‌دهنده را ذخیره و با آزمون مرورگر/سرور تأیید کنید")


def provider_for(settings, operation):
    if not getattr(settings, "captcha_" + operation):
        return "local" if operation == "staff_login" else "none"
    enabled = [p for p in (settings.captcha_primary, "google" if settings.captcha_primary == "turnstile" else "turnstile") if getattr(settings, p + "_enabled")]
    return enabled[0] if enabled else ("local" if operation == "staff_login" else "none")


def describe(challenge, settings):
    return {"challenge_id": challenge.id, "provider": challenge.provider, "operation": challenge.operation,
            "site_key": getattr(settings, challenge.provider + "_site_key"), "expires_in_seconds": 300,
            "fallback_used": challenge.fallback_used}


def issue(db, request, settings, operation, *, provider=None, fallback=False):
    from .auth_limits import client_ip
    provider = provider or provider_for(settings, operation)
    if provider in {"none", "local"}:
        return {"provider": provider, "operation": operation, "challenge_id": "", "site_key": "", "expires_in_seconds": 0, "fallback_used": False}
    db.execute(delete(BotChallenge).where(BotChallenge.expires_at < now() - timedelta(days=1)))
    challenge = BotChallenge(id=secrets.token_urlsafe(32), provider=provider, operation=operation,
        ip_hash=digest("ip:" + client_ip(request)), policy_hash=policy_hash(settings),
        fallback_used=fallback, expires_at=now() + timedelta(seconds=300))
    db.add(challenge); db.commit()
    return describe(challenge, settings)


class ProviderUnavailable(Exception):
    pass


def provider_result(settings, provider, token, operation, ip):
    try:
        with httpx.Client(timeout=8, follow_redirects=False, trust_env=False) as client:
            if provider == "turnstile":
                response = client.post("https://challenges.cloudflare.com/turnstile/v0/siteverify",
                    data={"secret": settings.turnstile_secret, "response": token, "remoteip": ip})
            else:
                response = client.post(f"https://recaptchaenterprise.googleapis.com/v1/projects/{settings.google_project_id}/assessments",
                    headers={"X-Goog-Api-Key": settings.google_api_key},
                    json={"event": {"token": token, "siteKey": settings.google_site_key,
                        "expectedAction": operation, "userIpAddress": ip}})
            if response.status_code == 429 or response.status_code >= 500:
                raise ProviderUnavailable
            if response.status_code != 200 or len(response.content) > 65536:
                raise HTTPException(503, "پیکربندی سرویس امنیتی معتبر نیست؛ با مطب تماس بگیرید")
            result = response.json()
            if not isinstance(result, dict):
                raise ValueError
            return result
    except (httpx.RequestError, ValueError, TypeError):
        raise ProviderUnavailable from None


def valid_result(settings, provider, result, operation):
    properties = result if provider == "turnstile" else result.get("tokenProperties", {})
    if not isinstance(properties, dict):
        return False
    valid = properties.get("success" if provider == "turnstile" else "valid") is True
    valid = valid and properties.get("hostname") in hosts(settings) and properties.get("action") == operation
    try:
        created = datetime.fromisoformat(properties.get("challenge_ts" if provider == "turnstile" else "createTime", "").replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - created).total_seconds()
        valid = valid and -30 <= age <= (300 if provider == "turnstile" else 120)
        if provider == "google":
            score = result.get("riskAnalysis", {}).get("score")
            valid = valid and type(score) in {int, float} and math.isfinite(score) and 0 <= score <= 1 and score >= settings.google_min_score / 100
    except (ValueError, TypeError, AttributeError):
        return False
    return bool(valid)


def verify(db, request, settings, operation, proof, *, setup=False):
    from .auth_limits import client_ip
    if not setup and provider_for(settings, operation) in {"none", "local"}:
        return
    if not proof:
        raise HTTPException(400, "تأیید امنیتی لازم است؛ صفحه را تازه کنید")
    db.rollback(); db.execute(text("BEGIN IMMEDIATE")); db.expire_all()
    challenge = db.get(BotChallenge, proof.challenge_id)
    if not challenge or challenge.consumed_at or challenge.expires_at <= now() or challenge.operation != operation or challenge.policy_hash != policy_hash(settings) or challenge.ip_hash != digest("ip:" + client_ip(request)):
        raise HTTPException(400, "تأیید امنیتی منقضی یا نامعتبر است")
    provider, fallback_used = challenge.provider, challenge.fallback_used
    challenge.consumed_at = now()
    challenge.token_hash = digest("bot-token:" + proof.token)
    try:
        db.commit()  # Reserve before network IO; same token cannot race across two challenges.
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "توکن امنیتی قبلاً استفاده شده است") from None
    try:
        result = provider_result(settings, provider, proof.token, operation, client_ip(request))
    except ProviderUnavailable:
        ensure_current_policy(settings)
        secondary = "google" if provider == "turnstile" else "turnstile"
        if not setup and not fallback_used and settings.captcha_fallback and getattr(settings, secondary + "_enabled"):
            next_challenge = issue(db, request, settings, operation, provider=secondary, fallback=True)
            raise HTTPException(503, {"message": "سرویس اصلی پاسخ نداد؛ تأیید امنیتی جایگزین را انجام دهید", "bot_challenge": next_challenge}) from None
        raise HTTPException(503, "سرویس تأیید امنیتی در دسترس نیست؛ کمی بعد تلاش کنید") from None
    if not valid_result(settings, provider, result, operation):
        raise HTTPException(400, "تأیید امنیتی پذیرفته نشد؛ دوباره تلاش کنید")
    ensure_current_policy(settings)
    return provider


def ensure_current_policy(settings):
    from .runtime_settings import get_settings
    if policy_hash(get_settings()) != policy_hash(settings):
        raise HTTPException(400, "تنظیمات امنیتی تغییر کرده است؛ تأیید را دوباره انجام دهید")
