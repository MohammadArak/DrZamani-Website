"""Mutable SEO identity must agree across initial HTML and public settings."""
from dataclasses import replace
from app import config, editorial_ai
from app.database import SessionLocal
from test_settings import client, schema, isolated_settings, access, save  # noqa: F401

def test_titles_and_website_identity_refresh_without_rebuild(client):
    auth=access()
    draft=client.get("/api/v1/staff/settings",headers=auth).json()
    draft.update(seo_title="وبسایت رسمی دکتر فرزاد زمانی",seo_site_name="وبسایت پزشک آزمایشی",seo_articles_title="دانستنی‌های سلامت",seo_articles_description="آموزش قابل فهم برای بیمار")
    response=client.put("/api/v1/staff/settings",headers=auth,json=draft)
    assert response.status_code==200,response.text
    assert "<title data-rh=\"true\">وبسایت رسمی دکتر فرزاد زمانی</title>" in client.get("/").text
    listing=client.get("/articles/").text
    assert "دانستنی‌های سلامت | وبسایت پزشک آزمایشی" in listing
    assert "آموزش قابل فهم برای بیمار" in listing
    service=client.get("/services/rhinoplasty/").text
    assert "رینوپلاستی | وبسایت پزشک آزمایشی" in service
    assert '"@type": "WebSite", "name": "وبسایت پزشک آزمایشی"' in service
    assert '"name": "دکتر فرزاد زمانی"' in service

def test_ai_key_is_encrypted_masked_and_disabled_by_default(client):
    auth=access(); state=client.get("/api/v1/staff/system-settings",headers=auth).json()
    fields={x['key']:x for x in state['fields']}
    assert fields['ai_provider']['value']=="disabled"
    secret="fixture-editorial-ai-secret"
    response=save(client,auth,{"ai_api_key":secret})
    assert response.status_code==200 and secret not in response.text
    assert secret not in client.get("/api/v1/clinic").text
    assert secret not in client.get("/").text
    with SessionLocal() as db:
        from app.models import SystemSetting
        assert secret not in db.get(SystemSetting,1).overrides_json

def test_ai_unsafe_endpoint_never_becomes_an_override(client):
    auth=access()
    response=save(client,auth,{"ai_provider":"custom","ai_model":"fixture","ai_api_key":"fixture-key","ai_base_url":"http://127.0.0.1/v1"})
    assert response.status_code==422
    assert client.get("/api/v1/staff/system-settings",headers=auth).json()['fields'][0]['value']=='disabled'

def test_only_current_official_cloudflare_account_route_is_constructed():
    base=replace(config.get_settings(),ai_provider="cloudflare",ai_account_id="a"*32,ai_model="@cf/fixture",ai_api_key="fixture")
    parsed,_=editorial_ai.endpoint(base)
    assert parsed.geturl()=="https://api.cloudflare.com/client/v4/accounts/"+"a"*32+"/ai/v1"

def test_service_references_and_booking_actions_are_accessible(client):
    from app.site_services import PATIENT_CONTENT
    page=client.get("/services/rhinoplasty/").text
    assert '<a data-reservation href="/appointment/">رزرو نوبت</a>' in page
    assert 'href="tel:' in page
    body=PATIENT_CONTENT['rhinoplasty']['description_html']
    assert body.count('<sup>[')==4 and 'منبع ۱' not in body
    assert body.count('https://www.plasticsurgery.org')==4
