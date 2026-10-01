"""Provider contracts, action/hostname/replay safety, real enrollment and MFA login."""
import json
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from io import StringIO

import httpx
import pytest
from sqlalchemy import delete, select

from app import config, bot_protection as bot, mfa, recover_access
from app.access import is_owner, revoke_staff
from app.database import SessionLocal
from app.models import AuthSession, AuditLog, BotChallenge, CaptchaAttestation, MfaChallenge, StaffMfa, StaffUser
from app.runtime_settings import get_settings
from test_roles import PASSWORD, account, owner, headers, schema, client
from test_settings import isolated_settings, save, PREFIX

MFA = "/api/v1/staff/auth/mfa"
BOT = "/api/v1/auth/bot/challenge"
SETUP = PREFIX + "/captcha"


@pytest.fixture(autouse=True)
def isolated_factors(isolated_settings, monkeypatch):
    monkeypatch.setattr(mfa, "current_counter", lambda: 600000)
    with SessionLocal.begin() as db:
        for model in [MfaChallenge, StaffMfa, BotChallenge, CaptchaAttestation]: db.execute(delete(model))
    yield
    with SessionLocal.begin() as db:
        for model in [MfaChallenge, StaffMfa, BotChallenge, CaptchaAttestation]: db.execute(delete(model))


def result(settings, provider, token, operation, ip):
    timestamp = datetime.now(timezone.utc).isoformat()
    host = sorted(bot.hosts(settings))[0]
    return {"success": True, "hostname": host, "action": operation, "challenge_ts": timestamp} if provider == "turnstile" else {
        "tokenProperties": {"valid": True, "hostname": host, "action": operation, "createTime": timestamp}, "riskAnalysis": {"score": 0.9}}


def prepare(client, auth, monkeypatch, *, enabled=True, both=False):
    values = {"turnstile_site_key": "synthetic-turnstile-site-key", "turnstile_secret": "synthetic-turnstile-secret"}
    if both: values.update(google_site_key="synthetic-google-site-key", google_api_key="synthetic-google-api-key", google_project_id="synthetic-project")
    assert save(client, auth, values).status_code == 200
    monkeypatch.setattr(bot, "provider_result", result)
    for provider in (["turnstile", "google"] if both else ["turnstile"]):
        challenge = client.get(SETUP + "/setup", headers=auth, params={"provider": provider}).json()
        assert client.post(SETUP + "/confirm", headers=auth, json={"challenge_id":challenge["challenge_id"],"token":"setup-"+provider}).status_code == 200
    if enabled:
        flags = {"turnstile_enabled": True}
        if both: flags.update(google_enabled=True, captcha_fallback=True)
        assert save(client, auth, flags).status_code == 200


def proof(client, operation="otp_request", token="synthetic-token"):
    challenge = client.get(BOT, params={"operation":operation}).json()
    return {"challenge_id": challenge["challenge_id"], "token": token}


def staff_login(client, staff_id, *, browser=False, bot_proof=None):
    with SessionLocal() as db: username = db.get(StaffUser, staff_id).username
    captcha = client.get("/api/v1/staff/auth/captcha").json()
    return client.post("/api/v1/staff/auth/login", headers={"Origin": config.get_settings().frontend_url,"X-Session-Transport":"cookie"} if browser else {},
        json={"username":username,"password":PASSWORD,"captcha_id":captcha["captcha_id"],"captcha_answer":captcha["debug_answer"],"bot":bot_proof})


def enroll(client, auth):
    start = client.post(MFA + "/enroll", headers=auth, json={"password":PASSWORD})
    assert start.status_code == 200, start.text
    data = start.json()
    confirm = client.post(MFA + "/confirm", headers=auth, json={"enrollment_id":data["enrollment_id"], "code":mfa.totp(data["secret"],600000)})
    assert confirm.status_code == 200, confirm.text
    return data, confirm.json()["recovery_codes"]


def test_disabled_compatibility_and_public_secrecy(client):
    for op, expected in [("staff_login","local"),("otp_request","none"),("otp_verify","none")]:
        data = client.get(BOT, params={"operation":op}).json()
        assert data["provider"] == expected
        assert not data["site_key"]
    assert client.get(BOT, params={"operation":"captcha_setup"}).status_code == 422
    assert staff_login(client, account()[0]).status_code == 200


def test_activation_requires_matching_owner_verified_keys(client, monkeypatch):
    auth = headers(owner()[2])
    assert save(client, auth, {"turnstile_enabled":True}).status_code == 422
    prepare(client, auth, monkeypatch, enabled=False)
    assert client.get(PREFIX,headers=auth).json()["status"]["captcha_verified"]=={"turnstile":True,"google":False}
    assert save(client, auth, {"turnstile_enabled":True}).status_code == 200
    assert save(client, auth, {"turnstile_secret":"new-unverified-secret"}).status_code == 422
    assert save(client, auth, {"turnstile_enabled":False,"turnstile_secret":"new-secret"}).status_code == 200
    assert not client.get(PREFIX,headers=auth).json()["status"]["captcha_verified"]["turnstile"]
    assert save(client, auth, {"turnstile_enabled":True}).status_code == 422
    denied = headers(account(builtin="admin")[2])
    assert client.get(SETUP+"/setup", headers=denied, params={"provider":"turnstile"}).status_code == 403
    assert client.post(SETUP+"/confirm", headers=denied, json={"challenge_id":"not-real-challenge","token":"x"}).status_code == 403


def test_unverified_environment_provider_cannot_bypass_missing_settings_row(client,monkeypatch):
    bootstrap=config.get_settings()
    monkeypatch.setattr(config,"get_settings",lambda:replace(bootstrap,turnstile_enabled=True,
        turnstile_site_key="synthetic-turnstile-key",turnstile_secret="unverified-server-secret"))
    response=client.get(BOT,params={"operation":"otp_request"})
    assert response.status_code==503 and "unverified-server-secret" not in response.text


@pytest.mark.parametrize("provider,defect", [(p,d) for p in ("turnstile","google")
    for d in ("invalid","hostname","action","expired","future","missing-time","score","nan")
    if p == "google" or d not in {"score","nan"}])
def test_provider_negative_contract(provider, defect):
    settings = config.get_settings()
    value = result(settings,provider,"","otp_request","")
    props = value if provider == "turnstile" else value["tokenProperties"]
    time_field = "challenge_ts" if provider == "turnstile" else "createTime"
    if defect == "invalid": props["success" if provider == "turnstile" else "valid"] = False
    elif defect in {"hostname", "action"}: props[defect] = "wrong"
    elif defect == "expired": props[time_field] = (datetime.now(timezone.utc)-timedelta(seconds=301)).isoformat()
    elif defect == "future": props[time_field] = (datetime.now(timezone.utc)+timedelta(minutes=2)).isoformat()
    elif defect == "missing-time": props.pop(time_field)
    elif provider == "google": value["riskAnalysis"]["score"] = 0.1 if defect == "score" else float("nan")
    else: pytest.skip("Turnstile has no score")
    assert not bot.valid_result(settings, provider, value, "otp_request")


def test_enabled_enforced_otp_and_staff_despite_local_png(client, monkeypatch):
    auth = headers(owner()[2]); prepare(client, auth, monkeypatch)
    assert client.post("/api/v1/auth/otp/request", json={"phone":"09127770000"}).status_code == 400
    assert client.post("/api/v1/auth/otp/verify", json={"phone":"09127770000","code":"123456"}).status_code == 400
    staff = account()[0]
    assert staff_login(client, staff).status_code == 400
    assert staff_login(client, staff, bot_proof=proof(client,"staff_login")).status_code == 200
    requested = client.post("/api/v1/auth/otp/request", json={"phone":"09127770001","bot":proof(client, token="request")})
    assert requested.status_code == 200
    assert client.post("/api/v1/auth/otp/verify", json={"phone":"09127770001","code":requested.json()["debug_otp"],"bot":proof(client,"otp_verify","verify")}).status_code == 200


def test_replay_cross_action_ip_expiry_and_policy_change(client, monkeypatch):
    auth = headers(owner()[2]); prepare(client, auth, monkeypatch)
    wrong = proof(client,"otp_verify","wrong-action")
    assert client.post("/api/v1/auth/otp/request", json={"phone":"09127771111","bot":wrong}).status_code == 400
    expired = proof(client, token="expired")
    with SessionLocal.begin() as db: db.get(BotChallenge, expired["challenge_id"]).expires_at = bot.now()-timedelta(seconds=1)
    assert client.post("/api/v1/auth/otp/request", json={"phone":"09127771112","bot":expired}).status_code == 400
    ip = proof(client, token="wrong-ip")
    with SessionLocal.begin() as db: db.get(BotChallenge, ip["challenge_id"]).ip_hash = "wrong"
    assert client.post("/api/v1/auth/otp/request", json={"phone":"09127771113","bot":ip}).status_code == 400
    stale = proof(client, token="stale")
    assert save(client, auth, {"captcha_fallback":True}).status_code == 200
    assert client.post("/api/v1/auth/otp/request", json={"phone":"09127771114","bot":stale}).status_code == 400
    first = proof(client,token="replay")
    assert client.post("/api/v1/auth/otp/request", json={"phone":"09127771115","bot":first}).status_code == 200
    assert client.post("/api/v1/auth/otp/request", json={"phone":"09127771116","bot":first}).status_code == 400
    assert client.post("/api/v1/auth/otp/request", json={"phone":"09127771117","bot":proof(client,token="replay")}).status_code == 400


def test_only_server_outage_can_select_one_fallback(client, monkeypatch):
    auth = headers(owner()[2]); prepare(client, auth, monkeypatch, both=True)
    def outage(*args): raise bot.ProviderUnavailable
    monkeypatch.setattr(bot,"provider_result",outage)
    failed = client.post("/api/v1/auth/otp/request", json={"phone":"09127772222","bot":proof(client,token="first-outage")})
    assert failed.status_code == 503
    alternative = failed.json()["detail"]["bot_challenge"]
    assert alternative["provider"] == "google" and alternative["fallback_used"]
    second = client.post("/api/v1/auth/otp/request", json={"phone":"09127772222","bot":{"challenge_id":alternative["challenge_id"],"token":"second-outage"}})
    assert second.status_code == 503 and "bot_challenge" not in str(second.json())
    monkeypatch.setattr(bot,"provider_result",lambda *args: {"success":False})
    denied = client.post("/api/v1/auth/otp/request", json={"phone":"09127772223","bot":proof(client,token="invalid")})
    assert denied.status_code == 400 and "bot_challenge" not in str(denied.json())


def test_fallback_can_complete_with_second_provider(client, monkeypatch):
    auth = headers(owner()[2]); prepare(client,auth,monkeypatch,both=True)
    def selected(settings,provider,*args):
        if provider == "turnstile": raise bot.ProviderUnavailable
        return result(settings,provider,*args)
    monkeypatch.setattr(bot,"provider_result",selected)
    denied=client.post("/api/v1/auth/otp/request",json={"phone":"09127773333","bot":proof(client,token="outage")})
    alternate=denied.json()["detail"]["bot_challenge"]
    assert client.post("/api/v1/auth/otp/request",json={"phone":"09127773333","bot":{"challenge_id":alternate["challenge_id"],"token":"alternate"}}).status_code == 200


def test_fixed_provider_urls_payload_and_no_secret_url(monkeypatch):
    captured=[]
    class Client:
        def __init__(self, **options): assert options == {"timeout":8,"follow_redirects":False,"trust_env":False}
        def __enter__(self): return self
        def __exit__(self,*args): pass
        def post(self,url,**options): captured.append((url,options)); return httpx.Response(200,json={"success":True})
    monkeypatch.setattr(bot.httpx,"Client",Client)
    settings=replace(config.get_settings(),google_project_id="synthetic-project",google_api_key="server-secret",turnstile_secret="cf-secret")
    for provider in ["google","turnstile"]: bot.provider_result(settings,provider,"testtoken","otp_request","203.0.113.10")
    assert "secret" not in captured[0][0] and "?" not in captured[0][0]
    assert captured[0][1]["headers"]["X-Goog-Api-Key"] == "server-secret"
    assert set(captured[0][1]["json"]["event"]) == {"token","siteKey","expectedAction","userIpAddress"}
    assert captured[1][1]["data"]["secret"] == "cf-secret"


@pytest.mark.parametrize("timestamp,expected", [(59,"94287082"),(1111111109,"07081804"),(1234567890,"89005924"),(2000000000,"69279037")])
def test_rfc6238_vectors(timestamp, expected):
    assert mfa.totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",timestamp//30,8) == expected


def test_real_enrollment_encryption_revocation_and_cookie_login(client):
    staff_id,_,token=owner();auth=headers(token)
    enrollment,codes=enroll(client,auth)
    assert len(codes)==10 and len(set(codes))==10
    assert client.get("/api/v1/staff/me",headers=auth).status_code == 401
    with SessionLocal() as db:
        record=db.get(StaffMfa,staff_id)
        assert enrollment["secret"] not in record.secret_json
        assert codes[0].replace("-","") not in record.recovery_hashes_json
        assert record.pending_json is None
        assert enrollment["secret"] not in str([row.details_json for row in db.scalars(select(AuditLog))])
        before=db.scalar(select(AuthSession.id).where(AuthSession.staff_id==staff_id).order_by(AuthSession.id.desc()))
    first=staff_login(client,staff_id,browser=True)
    assert first.status_code == 200 and first.json()["mfa_required"]
    assert "access_token" not in first.text and "permissions" not in first.text
    assert not first.headers.get("set-cookie")
    with SessionLocal() as db: assert before == db.scalar(select(AuthSession.id).where(AuthSession.staff_id==staff_id).order_by(AuthSession.id.desc()))
    second=client.post(MFA+"/verify",headers={"Origin":config.get_settings().frontend_url,"X-Session-Transport":"cookie"},json={"challenge_id":first.json()["challenge_id"],"code":mfa.totp(enrollment["secret"],600001)})
    assert second.status_code == 200 and second.json()["access_token"] == ""
    assert "HttpOnly" in second.headers["set-cookie"]
    assert client.get("/api/v1/staff/me").status_code == 200
    assert client.get(MFA+"/status").json()["recovery_remaining"] == 10


def test_wrong_factor_attempts_rate_limit_expired_transport_and_state(client):
    staff_id,_,token=owner(); enroll(client,headers(token))
    first=staff_login(client,staff_id).json()
    wrong=client.post(MFA+"/verify",headers={"Origin":config.get_settings().frontend_url,"X-Session-Transport":"cookie"},json={"challenge_id":first["challenge_id"],"code":"000000"})
    assert wrong.status_code == 400
    with SessionLocal.begin() as db: db.get(MfaChallenge,first["challenge_id"]).expires_at=bot.now()-timedelta(seconds=1)
    assert client.post(MFA+"/verify",json={"challenge_id":first["challenge_id"],"code":"000000"}).status_code == 400
    fresh=staff_login(client,staff_id).json()
    with SessionLocal.begin() as db: db.get(StaffUser,staff_id).is_active=False
    assert client.post(MFA+"/verify",json={"challenge_id":fresh["challenge_id"],"code":"000000"}).status_code == 400


def test_recovery_single_use_concurrent_and_totp_replay(client):
    staff_id,_,token=owner(); enrollment,codes=enroll(client,headers(token))
    one=staff_login(client,staff_id).json(); two=staff_login(client,staff_id).json()
    with ThreadPoolExecutor(2) as pool:
        responses=list(pool.map(lambda challenge: client.post(MFA+"/verify",json={"challenge_id":challenge["challenge_id"],"code":codes[0],"method":"recovery"}).status_code,[one,two]))
    assert sorted(responses)==[200,400]
    third=staff_login(client,staff_id).json()
    assert client.post(MFA+"/verify",json={"challenge_id":third["challenge_id"],"code":mfa.totp(enrollment["secret"],600001)}).status_code==200
    assert client.post(MFA+"/verify",json={"challenge_id":third["challenge_id"],"code":codes[1],"method":"recovery"}).status_code==400
    fourth=staff_login(client,staff_id).json()
    assert client.post(MFA+"/verify",json={"challenge_id":fourth["challenge_id"],"code":mfa.totp(enrollment["secret"],600001)}).status_code==400


def test_five_failures_persist_across_fresh_password_challenges(client):
    staff_id,_,token=owner(); enroll(client,headers(token))
    first=staff_login(client,staff_id).json()
    with SessionLocal() as db: secret=mfa.mfa_secret(db.get(StaffMfa,staff_id))
    wrong = "000000" if mfa.totp(secret,600001) != "000000" else "111111"
    for _ in range(5): assert client.post(MFA+"/verify",json={"challenge_id":first["challenge_id"],"code":wrong}).status_code==400
    # Independent account limiter is not cleared merely by completing password login again.
    another=staff_login(client,staff_id)
    if another.status_code==200:
        assert client.post(MFA+"/verify",json={"challenge_id":another.json()["challenge_id"],"code":mfa.totp(secret,600001)}).status_code==429
    else: assert another.status_code==429


def test_incomplete_wrong_expired_enrollment_preserves_previous_factor(client):
    auth=headers(owner()[2])
    assert client.post(MFA+"/enroll",headers=auth,json={"password":"WrongPassword123!"}).status_code==400
    start=client.post(MFA+"/enroll",headers=auth,json={"password":PASSWORD}).json()
    assert client.post(MFA+"/confirm",headers=auth,json={"enrollment_id":start["enrollment_id"],"code":"000000"}).status_code==400
    with SessionLocal.begin() as db:
        record=db.scalar(select(StaffMfa).where(StaffMfa.pending_id==start["enrollment_id"]));assert not record.enabled
        record.pending_expires_at=bot.now()-timedelta(seconds=1)
    assert client.post(MFA+"/confirm",headers=auth,json={"enrollment_id":start["enrollment_id"],"code":mfa.totp(start["secret"],600000)}).status_code==400


def test_missing_encryption_key_no_enrollment_or_plaintext(client, monkeypatch):
    auth=headers(owner()[2]); bootstrap=config.get_settings()
    monkeypatch.setattr(config,"get_settings",lambda:replace(bootstrap,settings_encryption_keys=()))
    response=client.post(MFA+"/enroll",headers=auth,json={"password":PASSWORD})
    assert response.status_code==503 and "secret" not in response.json()


def test_owner_mfa_mandatory_gate_and_role_promotion(client, monkeypatch):
    staff_id,_,token=owner(); auth=headers(token)
    assert save(client,auth,{"mfa_required_owners":True}).status_code==422
    enrollment,codes=enroll(client,auth)
    first=staff_login(client,staff_id).json()
    verified=client.post(MFA+"/verify",json={"challenge_id":first["challenge_id"],"code":codes[0],"method":"recovery"}).json()
    # Other owner fixtures are isolated historical accounts, not production owners.
    with SessionLocal.begin() as db:
        for staff in db.scalars(select(StaffUser)).unique():
            if staff.id!=staff_id and is_owner(staff): staff.is_active=False
    auth=headers(verified["access_token"])
    assert save(client,auth,{"mfa_required_owners":True}).status_code==200
    assert client.get("/api/v1/staff/me",headers=auth).status_code==401
    first=staff_login(client,staff_id).json()
    verified=client.post(MFA+"/verify",json={"challenge_id":first["challenge_id"],"code":codes[1],"method":"recovery"}).json()
    auth=headers(verified["access_token"])
    assert client.post(MFA+"/disable",headers=auth,json={"password":PASSWORD,"code":codes[2],"method":"recovery"}).status_code==409
    with SessionLocal() as db: role_id=next(r.id for r in db.get(StaffUser,staff_id).roles if r.slug=="superadmin")
    denied=client.post("/api/v1/staff/access/staff",headers=auth,json={"username":"new-unenrolled-owner","full_name":"New owner","password":PASSWORD,"role_ids":[role_id]})
    assert denied.status_code==409


def test_explicit_cli_recovery_requires_confirmation_and_owner(client, monkeypatch):
    staff_id,_,token=owner(); auth=headers(token); enroll(client,auth)
    with SessionLocal() as db: username=db.get(StaffUser,staff_id).username
    monkeypatch.setattr("sys.argv",["recover_access","--username",username,"--reset-mfa","--disable-captcha","--reason","synthetic recovery test"])
    monkeypatch.setattr("sys.stdin",StringIO("NO\n")); assert recover_access.main()==1
    with SessionLocal() as db: assert db.get(StaffMfa,staff_id).enabled
    monkeypatch.setattr("sys.stdin",StringIO("RECOVER "+username+"\n")); assert recover_access.main()==0
    with SessionLocal() as db: assert not db.get(StaffMfa,staff_id).enabled
    assert staff_login(client,staff_id).status_code==200


def test_provider_switch_action_off_and_concurrent_token(client, monkeypatch):
    auth=headers(owner()[2]); prepare(client,auth,monkeypatch,both=True)
    assert save(client,auth,{"captcha_primary":"google","captcha_staff_login":False,"captcha_otp_verify":False}).status_code==200
    assert client.get(BOT,params={"operation":"staff_login"}).json()["provider"]=="local"
    assert client.get(BOT,params={"operation":"otp_verify"}).json()["provider"]=="none"
    one=proof(client,token="simultaneous-token");two=proof(client,token="simultaneous-token")
    with ThreadPoolExecutor(2) as pool:
        responses=list(pool.map(lambda item:client.post("/api/v1/auth/otp/request",json={"phone":item[0],"bot":item[1]}).status_code,
            [("09127778881",one),("09127778882",two)]))
    assert sorted(responses)==[200,400]


@pytest.mark.parametrize("status,unavailable",[(429,True),(500,True),(403,False),(302,False)])
def test_provider_http_errors_never_reflect_body(monkeypatch,status,unavailable):
    class Client:
        def __init__(self,**options): pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,*args,**kwargs):return httpx.Response(status,text="upstream-private-value")
    monkeypatch.setattr(bot.httpx,"Client",Client)
    from fastapi import HTTPException
    with pytest.raises(bot.ProviderUnavailable if unavailable else HTTPException) as caught:
        bot.provider_result(config.get_settings(),"turnstile","token","otp_request","203.0.113.10")
    assert "upstream-private-value" not in str(caught.value)


def test_changed_policy_while_provider_verifies(client,monkeypatch):
    auth=headers(owner()[2]);prepare(client,auth,monkeypatch)
    def changed(settings,*args):
        assert save(client,auth,{"captcha_fallback":True}).status_code==200
        return result(settings,*args)
    monkeypatch.setattr(bot,"provider_result",changed)
    assert client.post("/api/v1/auth/otp/request",json={"phone":"09127778883","bot":proof(client)}).status_code==400


def test_provider_timeout_and_malformed_body(monkeypatch):
    class Client:
        def __init__(self,**options):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,*args,**kwargs):raise httpx.ReadTimeout("private-network-error")
    monkeypatch.setattr(bot.httpx,"Client",Client)
    with pytest.raises(bot.ProviderUnavailable):bot.provider_result(config.get_settings(),"turnstile","token","otp_request","ip")
    monkeypatch.setattr(Client,"post",lambda *args,**kwargs:httpx.Response(200,text="not-json-private-value"))
    with pytest.raises(bot.ProviderUnavailable):bot.provider_result(config.get_settings(),"google","token","otp_request","ip")


def authenticated_after_enrollment(client,staff_id,codes,index=0):
    challenge=staff_login(client,staff_id).json()
    response=client.post(MFA+"/verify",json={"challenge_id":challenge["challenge_id"],"method":"recovery","code":codes[index]})
    assert response.status_code==200,response.text
    return headers(response.json()["access_token"])


def test_rotated_codes_disable_and_incomplete_replacement(client):
    staff_id,_,token=owner();enrollment,codes=enroll(client,headers(token))
    auth=authenticated_after_enrollment(client,staff_id,codes)
    assert client.post(MFA+"/disable",headers=auth,json={"password":PASSWORD,"code":"wrong"}).status_code==400
    pending=client.post(MFA+"/enroll",headers=auth,json={"password":PASSWORD,"method":"recovery","code":codes[1]})
    assert pending.status_code==200
    with SessionLocal() as db:
        assert mfa.mfa_secret(db.get(StaffMfa,staff_id))==enrollment["secret"]
    rotated=client.post(MFA+"/recovery-codes",headers=auth,json={"password":PASSWORD,"method":"recovery","code":codes[2]})
    assert rotated.status_code==200
    assert client.get(MFA+"/status",headers=auth).status_code==401
    new_codes=rotated.json()["recovery_codes"]
    challenge=staff_login(client,staff_id).json()
    assert client.post(MFA+"/verify",json={"challenge_id":challenge["challenge_id"],"method":"recovery","code":codes[3]}).status_code==400
    auth=authenticated_after_enrollment(client,staff_id,new_codes)
    assert client.post(MFA+"/disable",headers=auth,json={"password":PASSWORD,"method":"recovery","code":new_codes[1]}).status_code==200
    assert client.get(MFA+"/status",headers=auth).status_code==401
    assert "mfa_required" not in staff_login(client,staff_id).json()


def test_management_rechecks_session_after_lock_and_mfa_challenge_ip(client,monkeypatch):
    from app.routers import mfa as routes
    staff_id,_,token=owner();auth=headers(token)
    original=routes.consume_limit
    def revoke_in_between(db,*args):
        original(db,*args)
        with SessionLocal.begin() as other:revoke_staff(other,[staff_id])
    monkeypatch.setattr(routes,"consume_limit",revoke_in_between)
    assert client.post(MFA+"/enroll",headers=auth,json={"password":PASSWORD}).status_code==401
    monkeypatch.setattr(routes,"consume_limit",original)
    auth=headers(staff_login(client,staff_id).json()["access_token"])
    _,codes=enroll(client,auth)
    challenge=staff_login(client,staff_id).json()
    with SessionLocal.begin() as db:db.get(MfaChallenge,challenge["challenge_id"]).ip_hash="different-ip"
    assert client.post(MFA+"/verify",json={"challenge_id":challenge["challenge_id"],"method":"recovery","code":codes[0]}).status_code==400
    with SessionLocal() as db:assert len(json.loads(db.get(StaffMfa,staff_id).recovery_hashes_json))==10
