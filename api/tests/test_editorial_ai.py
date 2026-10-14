"""Explicit editorial content only, bounded provider transport, permission and quota checks."""
import json
from dataclasses import replace
from urllib.parse import urlsplit
from types import SimpleNamespace
import pytest
from pydantic import ValidationError
from sqlalchemy import select
from app import editorial_ai as ai, config
from app.routers import editorial_assistance as router
from app.database import SessionLocal
from app.models import AuditLog
from test_roles import schema, client, account, headers

DATA={"kind":"article","title":"عنوان آزمایشی", "description":"توضیح عمومی", "keyword":"نمونه", "text":"متن عمومی برای آزمایش. "*20,"consent_to_send":True}
RESULT={"seo_title":"عنوان پیشنهادی", "seo_description":"توضیح پیشنهادی برای خواننده", "target_keyword":"نمونه", "suggestions":["عنوان را روشن‌تر کنید."]}
URL="/api/v1/staff/editorial-assistance"

def configured():
    return replace(config.get_settings(),ai_provider="avalai",ai_model="synthetic-model",ai_api_key="synthetic-provider-secret",ai_requests_per_hour=2)

@pytest.mark.parametrize("changes",[{"consent_to_send":False},{"consent_to_send":1},{"text":" "*100},{"title":"  "},{"text":"x"*12001},{"patient_id":123}])
def test_input_validation(changes):
    with pytest.raises(ValidationError):ai.EditorialInput.model_validate({**DATA,**changes})

@pytest.mark.parametrize("changes",[{"seo_title":"  "},{"seo_title":"<script>"},{"suggestions":[" "]},{"suggestions":["x"*501]},{"publish":True}])
def test_suggestion_validation(changes):
    with pytest.raises(ValidationError):ai.SeoSuggestion.model_validate({**RESULT,**changes})

@pytest.mark.parametrize("address",["127.0.0.1","10.0.0.1","::1","169.254.169.254","::ffff:127.0.0.1"])
def test_private_dns_blocked(monkeypatch,address):
    monkeypatch.setattr(ai.socket,"getaddrinfo",lambda *a,**k:[(2,1,6,"",(address,443))])
    with pytest.raises(ValueError):ai.endpoint(configured(),resolve=True)

def fake_transport(monkeypatch, *, content=None,status=200,raw=None):
    observed={}
    monkeypatch.setattr(ai,"endpoint",lambda settings,resolve=False:(urlsplit("https://api.avalai.ir/v1"),["8.8.8.8"]))
    encoded=raw if raw is not None else json.dumps({"choices":[{"message":{"content":json.dumps(content if content is not None else RESULT)}}]}).encode()
    class Response:
        def __init__(self):self.status=status;self.offset=0
        def read1(self,size):
            chunk=encoded[self.offset:self.offset+size];self.offset+=len(chunk);return chunk
    class Connection:
        def __init__(self,hostname,address):observed.update(host=hostname,address=address);self.sock=None
        def request(self,method,path,body,headers):observed.update(method=method,path=path,body=json.loads(body),headers=headers)
        def getresponse(self):return Response()
        def close(self):observed["closed"]=True
    monkeypatch.setattr(ai,"PinnedHTTPSConnection",Connection)
    return observed

def test_provider_receives_only_explicit_content(monkeypatch):
    observed=fake_transport(monkeypatch)
    result=ai.suggest(configured(),ai.EditorialInput.model_validate(DATA))
    assert result.model_dump()==RESULT
    assert observed["closed"] and observed["path"]=="/v1/chat/completions"
    body=observed["body"]
    assert body["stream"] is False and body["max_tokens"]<=2000
    sent=json.loads(body["messages"][1]["content"])
    assert sent==ai.EditorialInput.model_validate(DATA).model_dump(exclude={"consent_to_send"})
    assert "synthetic-provider-secret" not in json.dumps(body)

@pytest.mark.parametrize("kwargs",[{"status":302},{"status":429},{"raw":b"x"*131073},{"raw":b"bad-json"},{"content":{"publish":True}},{"content":{**RESULT,"seo_title":"<b>x</b>"}}])
def test_provider_failure_is_sanitized(monkeypatch,kwargs):
    observed=fake_transport(monkeypatch,**kwargs)
    with pytest.raises(ai.ProviderFailure):ai.suggest(configured(),ai.EditorialInput.model_validate(DATA))
    assert observed["closed"]

def test_disabled_default_and_readonly_denied(client,monkeypatch):
    _,_,token=account(["articles.view"])
    monkeypatch.setattr(router,"get_settings",lambda db:replace(configured(),ai_provider="disabled"))
    assert client.get(URL+"/status",headers=headers(token)).json()["enabled"] is False
    assert client.post(URL,headers=headers(token),json=DATA).status_code==403
    _,_,editor=account(["articles.view","articles.edit"])
    assert client.post(URL,headers=headers(editor),json=DATA).status_code==409

def test_permission_by_kind_and_no_consent(client,monkeypatch):
    _,_,token=account(["articles.view","articles.edit"])
    monkeypatch.setattr(router,"get_settings",lambda db:configured())
    assert client.post(URL,headers=headers(token),json={**DATA,"kind":"service"}).status_code==403
    assert client.post(URL,headers=headers(token),json={**DATA,"consent_to_send":False}).status_code==422

def test_suggestion_audit_and_persistent_quota(client,monkeypatch):
    staff_id,_,token=account(["articles.view","articles.edit"])
    monkeypatch.setattr(router,"get_settings",lambda db:configured())
    calls=[]
    def suggest(settings,payload):calls.append(payload);return ai.SeoSuggestion.model_validate(RESULT)
    monkeypatch.setattr(ai,"suggest",suggest)
    for _ in range(2):
        result=client.post(URL,headers=headers(token),json=DATA)
        assert result.status_code==200 and result.json()["suggestion"]==RESULT
    assert client.post(URL,headers=headers(token),json=DATA).status_code==429
    assert len(calls)==2
    with SessionLocal() as db:
        logs=db.scalars(select(AuditLog).where(AuditLog.actor_staff_id==staff_id,AuditLog.action=="editorial_ai.suggested")).all()
        assert len(logs)==2
        assert DATA["text"] not in str([row.details_json for row in logs])
        assert "synthetic-provider-secret" not in str([row.details_json for row in logs])

def test_provider_failure_stays_in_feature(client,monkeypatch):
    _,_,token=account(["site_services.view","site_services.edit"])
    monkeypatch.setattr(router,"get_settings",lambda db:configured())
    def failure(*args):raise ai.ProviderFailure
    monkeypatch.setattr(ai,"suggest",failure)
    assert client.post(URL,headers=headers(token),json={**DATA,"kind":"service"}).status_code==424

def test_shared_site_quota_across_different_staff(client,monkeypatch):
    monkeypatch.setattr(router,"get_settings",lambda db:configured())
    calls=[]
    def suggest(settings,payload):calls.append(payload);return ai.SeoSuggestion.model_validate(RESULT)
    monkeypatch.setattr(ai,"suggest",suggest)
    for _ in range(10):
        _,_,token=account(["articles.view","articles.edit"])
        for _ in range(2):assert client.post(URL,headers=headers(token),json=DATA).status_code==200
    _,_,last=account(["articles.view","articles.edit"])
    assert client.post(URL,headers=headers(last),json=DATA).status_code==429
    assert len(calls)==20

def test_status_names_destination_and_suggestions_do_not_publish(client,monkeypatch):
    from app.content_models import Article,SiteService
    _,_,token=account(["articles.view","articles.edit"])
    monkeypatch.setattr(router,"get_settings",lambda db:configured())
    monkeypatch.setattr(ai,"suggest",lambda settings,payload:ai.SeoSuggestion.model_validate(RESULT))
    status=client.get(URL+"/status",headers=headers(token))
    assert status.json()["destination"]=="api.avalai.ir"
    assert "synthetic-provider-secret" not in status.text
    def snapshot():
        with SessionLocal() as db:
            return [(type(row).__name__,row.id,row.revision,row.content_json,row.published_json) for model in [Article,SiteService] for row in db.scalars(select(model))]
    before=snapshot()
    assert client.post(URL,headers=headers(token),json=DATA).status_code==200
    assert snapshot()==before
