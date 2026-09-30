from __future__ import annotations

from dataclasses import dataclass

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


def _base_urls() -> tuple[str, str]:
    settings = get_settings()
    if settings.zarinpal_sandbox:
        return (
            "https://sandbox.zarinpal.com/pg/v4/payment",
            "https://sandbox.zarinpal.com/pg/StartPay",
        )
    return (
        "https://payment.zarinpal.com/pg/v4/payment",
        "https://payment.zarinpal.com/pg/StartPay",
    )


def _merchant_id() -> str:
    merchant_id = get_settings().zarinpal_merchant_id
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
    api_base, start_pay_base = _base_urls()
    metadata = {
        "mobile": f"0{mobile[3:]}" if mobile.startswith("+98") else mobile,
        "order_id": order_id,
    }
    if email:
        metadata["email"] = email
    payload = {
        "merchant_id": _merchant_id(),
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
            timeout=15,
        )
        response.raise_for_status()
        result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise PaymentGatewayError("ارتباط با درگاه زرین‌پال برقرار نشد") from exc
    data = result.get("data") or {}
    if data.get("code") != 100 or not data.get("authority"):
        message = (result.get("errors") or {}).get("message") if isinstance(result.get("errors"), dict) else None
        raise PaymentGatewayError(message or "زرین‌پال درخواست پرداخت را نپذیرفت")
    authority = str(data["authority"])
    return PaymentRequestResult(
        authority=authority,
        payment_url=f"{start_pay_base}/{authority}",
        raw_response=response.text[:4000],
    )


def verify_payment(*, authority: str, amount_toman: int) -> PaymentVerifyResult:
    api_base, _ = _base_urls()
    payload = {
        "merchant_id": _merchant_id(),
        "amount": amount_toman,
        "authority": authority,
    }
    try:
        response = httpx.post(
            f"{api_base}/verify.json",
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=15,
        )
        response.raise_for_status()
        result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise PaymentGatewayError("اعتبارسنجی پرداخت از زرین‌پال ناموفق بود") from exc
    data = result.get("data") or {}
    code = int(data.get("code") or 0)
    return PaymentVerifyResult(
        code=code,
        ref_id=str(data["ref_id"]) if data.get("ref_id") is not None else None,
        raw_response=response.text[:4000],
    )
