"""Owner-authorized local review exception remains fail-closed elsewhere."""
from dataclasses import replace
from starlette.requests import Request
import pytest
from app.config import get_settings
from app import bot_protection as bot
from app.routers import auth
from fastapi.testclient import TestClient
from app.main import app
from test_auth_hardening import security_schema, staff, reset_auth_limits

def review_settings(tmp_path):
    return replace(get_settings(), local_review_disable_staff_captcha=True,
        app_env="development", debug=True,
        database_url="sqlite:///"+str(tmp_path/".local"/"runtime"/"review.db"))

def request(host="127.0.0.1"):
    return Request({"type":"http", "client":(host,1234), "headers":[]})

@pytest.mark.parametrize("overrides", [
    {"local_review_disable_staff_captcha":False}, {"app_env":"production"},
    {"app_env":"staging"}, {"debug":False},
    {"database_url":"sqlite:///production.db"},
    {"database_url":"postgresql://localhost/review"},
    {"database_url":"sqlite:///:memory:"},
])
def test_fail_closed_settings(tmp_path,overrides):
    settings=replace(review_settings(tmp_path),**overrides)
    assert not bot.local_review_bypass(settings,request())
    assert bot.provider_for(settings,"staff_login",request())=="local"

@pytest.mark.parametrize("host", ["testclient","192.168.1.2","127.0.0.2","localhost","::ffff:127.0.0.1"])
def test_remote_and_unrecognized_clients_cannot_bypass(tmp_path,host):
    assert not bot.local_review_bypass(review_settings(tmp_path),request(host))

def test_bypass_only_for_named_review_and_staff_login(tmp_path):
    settings=review_settings(tmp_path)
    for host in ["127.0.0.1","::1"]:
        assert bot.provider_for(settings,"staff_login",request(host))=="none"
        assert bot.issue(None,request(host),settings,"staff_login")["provider"]=="none"
    assert bot.provider_for(settings,"staff_login")=="local"
    assert not bot.local_review_bypass(settings,None)
    enabled=replace(settings,turnstile_enabled=True)
    assert bot.provider_for(enabled,"otp_request",request())=="turnstile"

def test_password_still_required_without_captcha(tmp_path,staff,monkeypatch,security_schema):
    settings=review_settings(tmp_path)
    monkeypatch.setattr(auth,"get_settings",lambda:settings)
    with TestClient(app,client=("127.0.0.1",1234)) as client:
        result=client.post("/api/v1/staff/auth/login",json={"username":staff[1],"password":"WrongPassword123!"})
        assert result.status_code==401
        result=client.post("/api/v1/staff/auth/login",json={"username":staff[1],"password":"SecurityTestPassword123!"})
        assert result.status_code==200
        assert result.json()["access_token"]
