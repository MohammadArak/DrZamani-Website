"""Settings policy, secrecy, concurrency, cross-process refresh and initial HTML."""
import json
import os
import socket
import subprocess
import sys
from dataclasses import replace
from concurrent.futures import ThreadPoolExecutor

import pytest
from cryptography.fernet import Fernet
from sqlalchemy import delete, select

from app import config, outbound, runtime_settings as runtime
from app.database import SessionLocal
from app.models import SystemSetting, SettingRevision, ClinicSetting, AuditLog
from app.schemas import ClinicSettingRead
from test_roles import client, schema, account, owner, headers  # shared isolated authenticated fixtures

PREFIX = "/api/v1/staff/system-settings"


@pytest.fixture(autouse=True)
def isolated_settings(schema, monkeypatch, tmp_path):
    bootstrap = config.get_settings()
    key = Fernet.generate_key().decode()
    template = tmp_path / "html"
    template.mkdir()
    (template / "index.html").write_text('<html><head><title>OLD</title><meta name="description" content="OLD"><script type="module" src="/assets/bundle.js"></script><link rel="stylesheet" href="/assets/bundle.css"><script type="application/ld+json">{"name":"OLD"}</script></head><body><div id="root"></div></body></html>', encoding="utf-8")
    monkeypatch.setattr(config, "get_settings", lambda: replace(bootstrap, settings_encryption_keys=(key,), public_html_dir=template, sms_webhook_allowed_hosts=("sms.example.com",)))
    with SessionLocal.begin() as db:
        db.execute(delete(SettingRevision))
        db.execute(delete(SystemSetting))
        clinic = db.get(ClinicSetting, 1)
        if clinic:
            db.delete(clinic)
            db.flush()
        db.add(ClinicSetting(id=1))
    yield
    with SessionLocal.begin() as db:
        db.execute(delete(SettingRevision))
        db.execute(delete(SystemSetting))
        db.get(ClinicSetting, 1).revision = 1


def access():
    return headers(owner()[2])


def save(client, auth, values, *, revision=None, reset=None):
    revision = revision or client.get(PREFIX, headers=auth).json()["revision"]
    return client.put(PREFIX, headers=auth, json={"revision": revision, "values": values, "reset": reset or []})


def test_owner_only(client):
    auth = headers(account(builtin="admin")[2])
    for method, path, payload in [("get", "", None), ("get", "/history", None), ("put", "", {"revision":1}), ("post", "/restore", {"revision":1,"target_revision":1}), ("post", "/probe-webhook", None)]:
        response = client.request(method, PREFIX + path, headers=auth, **({"json":payload} if payload else {}))
        assert response.status_code == 403


def test_encrypted_masked_audit_and_restore(client):
    auth = access()
    secret = "synthetic-private-key-for-fixture"
    response = save(client, auth, {"faraz_api_key": secret, "patient_session_days": 3})
    assert response.status_code == 200
    assert secret not in response.text
    field = next(f for f in response.json()["fields"] if f["key"] == "faraz_api_key")
    assert field["configured"] and field["value"] is None and field["default"] is None
    with SessionLocal() as db:
        stored = db.get(SystemSetting, 1).overrides_json
        assert secret not in stored and "encrypted" in stored
        assert all(secret not in row.details_json for row in db.scalars(select(AuditLog)))
    assert runtime.get_settings().faraz_api_key == secret
    assert secret not in client.get(PREFIX + "/history", headers=auth).text
    for url in ["/", "/api/v1/clinic", "/robots.txt", "/sitemap.xml"]:
        assert secret not in client.get(url).text
    response = client.post(PREFIX + "/restore", headers=auth, json={"revision":2,"target_revision":1})
    assert response.status_code == 200 and response.json()["revision"] == 3
    assert runtime.get_settings().patient_session_days == config.get_settings().patient_session_days
    response = client.post(PREFIX + "/restore", headers=auth, json={"revision":3,"target_revision":2})
    assert response.status_code == 200
    assert runtime.get_settings().faraz_api_key == secret


@pytest.mark.parametrize("values", [
    {"patient_session_days":0}, {"patient_session_days":True}, {"otp_length":5}, {"otp_length":"6"},
    {"max_upload_bytes":10485761}, {"staff_session_hours":25}, {"otp_resend_seconds":600},
    {"frontend_url":"https://attacker.example"}, {"sms_provider":"bad"},
    {"sms_provider":"faraz"}, {"secret_key":"illegal"}, {"faraz_api_key":17},
    {"sms_webhook_url":"http://sms.example.com"}, {"sms_webhook_url":"https://sms.example.com:8443"},
])
def test_invalid_atomic(client, values):
    auth = access()
    response = save(client, auth, values)
    assert response.status_code == 422
    assert client.get(PREFIX, headers=auth).json()["revision"] == 1
    assert client.get(PREFIX + "/history", headers=auth).json() == []


def test_conflicting_reset_unknown_extra_fields(client):
    auth = access()
    assert save(client, auth, {"otp_length":6}, reset=["otp_length"]).status_code == 422
    assert save(client, auth, {}, reset=["unknown"]).status_code == 422
    assert client.put(PREFIX, headers=auth, json={"revision":1,"values":{},"unknown":1}).status_code == 422


def test_missing_wrong_key_and_ciphertext_swap(client, monkeypatch):
    auth = access()
    bootstrap = config.get_settings()
    monkeypatch.setattr(config, "get_settings", lambda: replace(bootstrap, settings_encryption_keys=()))
    assert save(client, auth, {"faraz_api_key":"secret-fixture"}).status_code == 503
    monkeypatch.setattr(config, "get_settings", lambda: bootstrap)
    assert save(client, auth, {"faraz_api_key":"secret-fixture"}).status_code == 200
    monkeypatch.setattr(config, "get_settings", lambda: replace(bootstrap, settings_encryption_keys=(Fernet.generate_key().decode(),)))
    assert client.get(PREFIX, headers=auth).status_code == 503
    monkeypatch.setattr(config, "get_settings", lambda: bootstrap)
    with SessionLocal.begin() as db:
        row = db.get(SystemSetting,1)
        stored = json.loads(row.overrides_json)
        stored["sms_webhook_token"] = stored.pop("faraz_api_key")
        row.overrides_json = json.dumps(stored)
    assert client.get(PREFIX, headers=auth).status_code == 503


def test_clear_blocks_env_and_reset_restores_env(client, monkeypatch):
    auth = access()
    bootstrap = config.get_settings()
    monkeypatch.setattr(config, "get_settings", lambda: replace(bootstrap, faraz_api_key="environment-fixture"))
    assert save(client, auth, {"faraz_api_key":""}).status_code == 200
    assert runtime.get_settings().faraz_api_key == ""
    assert save(client, auth, {}, reset=["faraz_api_key"]).status_code == 200
    assert runtime.get_settings().faraz_api_key == "environment-fixture"


def test_production_cannot_enable_test_services(client, monkeypatch):
    auth = access()
    bootstrap = config.get_settings()
    monkeypatch.setattr(config, "get_settings", lambda: replace(bootstrap, app_env="production", debug=False, zarinpal_sandbox=False, sms_provider="disabled"))
    assert save(client, auth, {"zarinpal_sandbox":True}).status_code == 422
    assert save(client, auth, {"sms_provider":"console"}).status_code == 422


def test_concurrent_version_cas(client):
    auth = access()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda value: save(client, auth, {"patient_session_days":value}, revision=1), [2,3]))
    assert sorted(response.status_code for response in results) == [200,409]
    assert runtime.get_settings().patient_session_days in {2,3}


def test_runtime_refresh_separate_worker(client):
    auth = access()
    assert save(client, auth, {"patient_session_days":2}).status_code == 200
    result = subprocess.run([sys.executable,"-c","from app.runtime_settings import get_settings; print(get_settings().patient_session_days)"], env=dict(os.environ), capture_output=True, text=True, check=True)
    assert result.stdout.strip() == "2"
    assert save(client, auth, {"patient_session_days":4}).status_code == 200
    assert runtime.get_settings().patient_session_days == 4


def test_clinic_html_seo_and_cas(client):
    auth = access()
    before = client.get("/api/v1/clinic").json()
    payload = {**before, "doctor_name":"دکتر آزمایش", "office_phone":"08633333333", "address":"نشانی تازه آزمایشی", "seo_title":"عنوان <آزمایشی>", "seo_description":"توضیح جدید </script><script>alert(1)</script>", "site_url":"https://clinic.example"}
    response = client.put("/api/v1/staff/settings", headers=auth, json=payload)
    assert response.status_code == 200
    home = client.get("/")
    assert home.status_code == 200 and home.headers["cache-control"] == "no-store"
    assert "OLD" not in home.text and '/assets/bundle.js' in home.text
    assert "عنوان &lt;آزمایشی&gt;" in home.text and "08633333333" in home.text
    assert "</script><script>alert(1)" not in home.text
    assert "https://clinic.example/" in home.text
    assert "clinic-bootstrap" in home.text
    assert "clinic.example/sitemap.xml" in client.get("/robots.txt").text
    assert "clinic.example/" in client.get("/sitemap.xml").text
    for path in ["/staff/", "/appointment/"]:
        rendered = client.get(path)
        assert "دکتر آزمایش" in rendered.text and "noindex" in rendered.headers["x-robots-tag"]
    assert client.get("/404.html").status_code == 404
    assert client.put("/api/v1/staff/settings", headers=auth, json=payload).status_code == 409
    assert save(client, auth, {"booking_hold_minutes":15}, revision=1).status_code == 409


@pytest.mark.parametrize("changes", [{"map_embed_url":"https://attacker.example/embed"}, {"site_url":"https://clinic.example/path"}, {"site_url":"https://user:pass@clinic.example"}, {"site_url":"javascript:alert(1)"}, {"timezone_name":"Bogus/Zone"}])
def test_public_invalid(client, changes):
    auth = access()
    payload = client.get("/api/v1/clinic").json() | changes
    assert client.put("/api/v1/staff/settings", headers=auth, json=payload).status_code == 422


@pytest.mark.parametrize("address", ["127.0.0.1","10.0.0.1","169.254.169.254","::1","fc00::1","::ffff:127.0.0.1"])
def test_ssrf_private_dns(monkeypatch, address):
    monkeypatch.setattr(socket,"getaddrinfo",lambda *args,**kwargs:[(socket.AF_INET,socket.SOCK_STREAM,0,"",(address,443))])
    with pytest.raises(ValueError): outbound.validate_webhook("https://sms.example.com/webhook")


def test_ssrf_allowlist_and_probe_no_credentials(client, monkeypatch):
    auth = access()
    monkeypatch.setattr(socket,"getaddrinfo",lambda *args,**kwargs:[(socket.AF_INET,socket.SOCK_STREAM,0,"",("8.8.8.8",443))])
    for url in ["https://sms.example.com.attacker.example", "https://127.0.0.1", "https://user@ sms.example.com", "https://sms.example.com/#fragment"]:
        with pytest.raises(ValueError): outbound.validate_webhook(url)
    assert save(client, auth, {"sms_webhook_url":"https://sms.example.com/hook", "sms_webhook_token":"probe-fixture"}).status_code == 200
    calls = []
    class Connection:
        def __init__(self,host,address): calls.append((host,address))
        def request(self,method,path,body,headers): calls.append((method,path,body,headers))
        def getresponse(self): return type("Reply",(),{"status":405})()
        def close(self): pass
    monkeypatch.setattr(outbound,"PinnedHTTPSConnection",Connection)
    response = client.post(PREFIX + "/probe-webhook", headers=auth)
    assert response.status_code == 200 and response.json()["http_status"] == 405
    assert calls[1][0] == "HEAD" and calls[1][2] is None
    assert "Authorization" not in calls[1][3]
    assert "probe-fixture" not in response.text


def test_eight_digit_otp_and_current_app_name(client):
    auth = access()
    assert save(client, auth, {"otp_length":8, "app_name":"Fixture service"}).status_code == 200
    assert client.get("/api/health").json()["service"] == "Fixture service"
    assert client.get("/api/openapi.json").json()["info"]["title"] == "Fixture service"
    response = client.post("/api/v1/auth/otp/request", json={"phone":"09120000999"})
    assert response.status_code == 200
    assert response.json()["code_length"] == 8 and len(response.json()["debug_otp"]) == 8
    verified = client.post("/api/v1/auth/otp/verify", json={"phone":"09120000999", "code":response.json()["debug_otp"]})
    assert verified.status_code == 200


def test_key_rotation_can_read_old_secret_and_history(client, monkeypatch):
    auth = access()
    bootstrap = config.get_settings()
    assert save(client, auth, {"faraz_api_key":"first-fixture"}).status_code == 200
    rotated_key = Fernet.generate_key().decode()
    monkeypatch.setattr(config,"get_settings",lambda: replace(bootstrap, settings_encryption_keys=(rotated_key,*bootstrap.settings_encryption_keys)))
    assert runtime.get_settings().faraz_api_key == "first-fixture"
    assert save(client, auth, {"faraz_api_key":"next-fixture"}).status_code == 200
    assert client.post(PREFIX + "/restore", headers=auth, json={"revision":3,"target_revision":2}).status_code == 200
    assert runtime.get_settings().faraz_api_key == "first-fixture"


def test_webhook_redirect_blocked_and_rebinding_checked(client, monkeypatch):
    auth = access()
    addresses = ["8.8.8.8"]
    monkeypatch.setattr(socket,"getaddrinfo",lambda *args,**kwargs:[(socket.AF_INET,socket.SOCK_STREAM,0,"",(address,443)) for address in addresses])
    assert save(client, auth, {"sms_webhook_url":"https://sms.example.com/hook"}).status_code == 200
    addresses[:] = ["127.0.0.1"]
    # The destination is resolved and validated again at send/probe time.
    assert client.post(PREFIX + "/probe-webhook", headers=auth).status_code == 502
    addresses[:] = ["8.8.8.8"]
    class Redirect:
        def __init__(self,*args): pass
        def request(self,*args,**kwargs): pass
        def getresponse(self): return type("Reply",(),{"status":302})()
        def close(self): pass
    monkeypatch.setattr(outbound,"PinnedHTTPSConnection",Redirect)
    assert client.post(PREFIX + "/probe-webhook",headers=auth).status_code == 502
    addresses[:] = ["8.8.8.8","192.168.1.1"]
    with pytest.raises(ValueError): outbound.validate_webhook("https://sms.example.com/hook")
