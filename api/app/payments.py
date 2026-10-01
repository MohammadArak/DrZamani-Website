from __future__ import annotations

from dataclasses import dataclass
import json
import re

import httpx

from .runtime_settings import get_settings


class PaymentGatewayError(RuntimeError):
    pass


@dataclass(frozen=True)
class PaymentRequestResult:
    authority: str
    payment_url: str
    raw_response: str


@dataclass(frozen=True)
class PaymentVerifyResult:
    code: int
    ref_id: str | None
    raw_response: str


def _base_urls(settings=None) -> tuple[str, str]:
    settings = settings or get_settings()
    if settings.zarinpal_sandbox:
        return (
            "https://sandbox.zarinpal.com/pg/v4/payment",
            "https://sandbox.zarinpal.com/pg/StartPay",
        )
    return (
        "https://payment.zarinpal.com/pg/v4/payment",
        "https://payment.zarinpal.com/pg/StartPay",
    )


def _merchant_id(settings=None) -> str:
    merchant_id = (settings or get_settings()).zarinpal_merchant_id
    if len(merchant_id) != 36:
        raise PaymentGatewayError("شناسه پذیرنده زرین‌پال تنظیم نشده یا معتبر نیست")
    return merchant_id


def request_payment(
    *,
    amount_toman: int,
    description: str,
    callback_url: str,
    mobile: str,
    email: str | None,
    order_id: str,
) -> PaymentRequestResult:
    if amount_toman < 1_000:
        raise PaymentGatewayError("مبلغ پرداخت باید حداقل هزار تومان باشد")
    settings = get_settings()
    api_base, start_pay_base = _base_urls(settings)
    metadata = {
        "mobile": f"0{mobile[3:]}" if mobile.startswith("+98") else mobile,
        "order_id": order_id,
    }
    if email:
        metadata["email"] = email
    payload = {
        "merchant_id": _merchant_id(settings),
        "amount": amount_toman,
        "currency": "IRT",
        "description": description[:255],
        "callback_url": callback_url,
        "metadata": metadata,
    }
    try:
        response = httpx.post(
            f"{api_base}/request.json",
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=15, trust_env=False, follow_redirects=False,
        )
        response.raise_for_status()
        result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise PaymentGatewayError("ارتباط با درگاه زرین‌پال برقرار نشد") from exc
    data = result.get("data") if isinstance(result, dict) else None
    if not isinstance(data, dict) or type(data.get("code")) is not int or data["code"] != 100:
        raise PaymentGatewayError("زرین‌پال درخواست پرداخت را نپذیرفت")
    authority = data.get("authority")
    if not isinstance(authority, str) or not re.fullmatch(r"[A-Za-z0-9_-]{10,80}", authority):
        raise PaymentGatewayError("پاسخ درخواست پرداخت معتبر نیست")
    return PaymentRequestResult(
        authority=authority,
        payment_url=f"{start_pay_base}/{authority}",
        raw_response=json.dumps({"code":100, "authority":authority}),
    )


def verify_payment(*, authority: str, amount_toman: int) -> PaymentVerifyResult:
    settings = get_settings()
    api_base, _ = _base_urls(settings)
    payload = {
        "merchant_id": _merchant_id(settings),
        "amount": amount_toman,
        "authority": authority,
    }
    try:
        response = httpx.post(
            f"{api_base}/verify.json",
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=15, trust_env=False, follow_redirects=False,
        )
        response.raise_for_status()
        result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise PaymentGatewayError("اعتبارسنجی پرداخت از زرین‌پال ناموفق بود") from exc
    data = result.get("data") if isinstance(result, dict) else None
    if not isinstance(data, dict) or type(data.get("code")) is not int:
        errors = result.get("errors") if isinstance(result, dict) else None
        if isinstance(errors, dict) and type(errors.get("code")) is int:
            data = {"code":errors["code"]}
        else:
            raise PaymentGatewayError("پاسخ تأیید پرداخت معتبر نیست")
    code = data["code"]
    reference = data.get("ref_id")
    if code in {100,101} and (type(reference) not in {str,int} or not re.fullmatch(r"[0-9]{1,80}", str(reference)) or int(reference) <= 0):
        raise PaymentGatewayError("شناسه رسید پرداخت معتبر نیست")
    ref_id = str(reference) if code in {100,101} else None
    return PaymentVerifyResult(
        code=code,
        ref_id=ref_id,
        raw_response=json.dumps({"code":code, "ref_id":ref_id}),
    )
