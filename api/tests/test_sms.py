from __future__ import annotations

from app.sms import FarazSmsProvider


def test_faraz_pattern_payload(monkeypatch) -> None:
    captured: dict = {}

    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, str]:
            return {"status": "success"}

    def fake_post(url, *, json, headers, timeout):
        captured.update(
            {"url": url, "json": json, "headers": headers, "timeout": timeout}
        )
        return Response()

    monkeypatch.setattr("app.sms.httpx.post", fake_post)
    provider = FarazSmsProvider(
        api_key="test-key",
        pattern_code="test-pattern",
        line_number="500000000",
        otp_variable="code",
    )
    provider.send_otp("+989121212222", "123456")

    assert captured["url"] == "https://api.iranpayamak.com/ws/v1/sms/pattern"
    assert captured["headers"]["Api-Key"] == "test-key"
    assert captured["json"] == {
        "code": "test-pattern",
        "attributes": {"code": "123456"},
        "recipient": "09121212222",
        "line_number": "500000000",
        "number_format": "english",
    }
