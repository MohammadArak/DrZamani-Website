from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from .config import get_settings


logger = logging.getLogger(__name__)


class SmsDeliveryError(RuntimeError):
    pass


class SmsProvider:
    def send_otp(self, phone: str, code: str) -> None:
        raise NotImplementedError

    def send_event(
        self,
        phone: str,
        message: str,
        pattern_code: str,
        variables: dict[str, str],
    ) -> None:
        raise NotImplementedError


@dataclass
class ConsoleSmsProvider(SmsProvider):
    def send_otp(self, phone: str, code: str) -> None:
        settings = get_settings()
        if not settings.development_debug:
            raise SmsDeliveryError("ارسال آزمایشی پیامک در محیط اصلی غیرفعال است")
        logger.info("Development OTP delivery simulated (recipient and code omitted)")

    def send_event(
        self,
        phone: str,
        message: str,
        pattern_code: str,
        variables: dict[str, str],
    ) -> None:
        settings = get_settings()
        if not settings.development_debug:
            raise SmsDeliveryError("ارسال آزمایشی پیامک در محیط اصلی غیرفعال است")
        logger.info("Development SMS delivery simulated (recipient and message omitted)")


@dataclass
class WebhookSmsProvider(SmsProvider):
    url: str
    token: str
    sender: str

    def send_otp(self, phone: str, code: str) -> None:
        headers = {"Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        payload = {
            "recipient": phone,
            "code": code,
            "sender": self.sender,
            "template": "appointment_otp",
        }
        try:
            response = httpx.post(self.url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise SmsDeliveryError("ارسال پیامک از سرویس واسط ناموفق بود") from exc

    def send_event(
        self,
        phone: str,
        message: str,
        pattern_code: str,
        variables: dict[str, str],
    ) -> None:
        headers = {"Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        payload = {
            "recipient": phone,
            "message": message,
            "template": pattern_code,
            "variables": variables,
            "sender": self.sender,
        }
        try:
            response = httpx.post(self.url, json=payload, headers=headers, timeout=12)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise SmsDeliveryError("ارسال پیامک رویداد از سرویس واسط ناموفق بود") from exc


@dataclass
class FarazSmsProvider(SmsProvider):
    api_key: str
    pattern_code: str
    line_number: str
    otp_variable: str

    endpoint = "https://api.iranpayamak.com/ws/v1/sms/pattern"

    def send_otp(self, phone: str, code: str) -> None:
        recipient = f"0{phone[3:]}" if phone.startswith("+98") else phone
        payload = {
            "code": self.pattern_code,
            "attributes": {self.otp_variable: code},
            "recipient": recipient,
            "line_number": self.line_number,
            "number_format": "english",
        }
        try:
            response = httpx.post(
                self.endpoint,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Api-Key": self.api_key,
                },
                timeout=12,
            )
            response.raise_for_status()
            result = response.json()
            if result.get("status") != "success":
                raise SmsDeliveryError("پنل فراز ارسال پیامک را تأیید نکرد")
        except (httpx.HTTPError, ValueError) as exc:
            raise SmsDeliveryError("ارتباط با پنل فراز پیامک ناموفق بود") from exc

    def send_event(
        self,
        phone: str,
        message: str,
        pattern_code: str,
        variables: dict[str, str],
    ) -> None:
        if not pattern_code:
            raise SmsDeliveryError("کد پترن پیامک این رویداد تنظیم نشده است")
        recipient = f"0{phone[3:]}" if phone.startswith("+98") else phone
        payload = {
            "code": pattern_code,
            "attributes": variables,
            "recipient": recipient,
            "line_number": self.line_number,
            "number_format": "english",
        }
        try:
            response = httpx.post(
                self.endpoint,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Api-Key": self.api_key,
                },
                timeout=12,
            )
            response.raise_for_status()
            result = response.json()
            if result.get("status") != "success":
                raise SmsDeliveryError("پنل فراز ارسال پیامک رویداد را تأیید نکرد")
        except (httpx.HTTPError, ValueError) as exc:
            raise SmsDeliveryError("ارتباط با پنل فراز پیامک ناموفق بود") from exc


def get_sms_provider() -> SmsProvider:
    settings = get_settings()
    if settings.sms_provider == "console":
        return ConsoleSmsProvider()
    if settings.sms_provider == "webhook" and settings.sms_webhook_url:
        return WebhookSmsProvider(
            url=settings.sms_webhook_url,
            token=settings.sms_webhook_token,
            sender=settings.sms_sender,
        )
    if settings.sms_provider == "faraz":
        if not all(
            [settings.faraz_api_key, settings.faraz_pattern_code, settings.faraz_line_number]
        ):
            raise SmsDeliveryError("تنظیمات پنل فراز پیامک کامل نیست")
        return FarazSmsProvider(
            api_key=settings.faraz_api_key,
            pattern_code=settings.faraz_pattern_code,
            line_number=settings.faraz_line_number,
            otp_variable=settings.faraz_otp_variable,
        )
    raise SmsDeliveryError("سرویس ارسال پیامک تنظیم نشده است")
