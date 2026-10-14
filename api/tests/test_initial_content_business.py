"""Fresh defaults, persistence after withdrawal, and public business metadata contracts."""
import json
import re
from dataclasses import replace

import pytest
from sqlalchemy import delete, select

from app import config
from app.comment_models import Comment
from app.content_models import Article, ContentSeedState, PublicMedia, SiteBlock
from app.database import Base, SessionLocal, get_engine
from app.initial_content import seed, KEY, PACK
from app.models import StaffUser
from test_roles import client, account, owner, headers


@pytest.fixture(autouse=True)
def isolated(monkeypatch, tmp_path):
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    original = config.get_settings()
    html = tmp_path / "html"
    html.mkdir()
    (html / "index.html").write_text('<html><head><script type="module" src="/assets/test.js"></script></head><body><div id="root"></div></body></html>', encoding="utf-8")
    settings = replace(original, public_html_dir=html, public_media_dir=tmp_path / "media")
    monkeypatch.setattr(config, "get_settings", lambda: settings)
    yield settings


def public_schema(response):
    payloads = re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', response.text, re.S)
    return next(json.loads(value) for value in payloads if 'MedicalClinic' in value)


def test_fresh_install_is_public_but_creates_no_login(client, isolated):
    with SessionLocal.begin() as db:
        seed(db, isolated)
    comments = client.get("/api/v1/comments").json()
    assert comments["total"] == 3
    assert {row["display_name"] for row in comments["items"]} == {row["display_name"] for row in PACK["comments"]}
    assert client.get("/api/v1/articles").json()["total"] == 12
    with SessionLocal() as db:
        actor = db.scalar(select(StaffUser).where(StaffUser.username == "__default_public_content__"))
        assert actor.is_active is False and actor.password_hash == "!"
        assert db.get(ContentSeedState, KEY)
        faq = json.loads(db.get(SiteBlock, "faq").published_json)
        assert len(next(value for value in faq.values() if isinstance(value, list))) == 4
        assert len(db.scalars(select(PublicMedia)).all()) == 15


def test_seed_never_recreates_deleted_content_or_revives_media(client, isolated):
    with SessionLocal.begin() as db:
        seed(db, isolated)
    with SessionLocal.begin() as db:
        key = db.scalar(select(PublicMedia.key))
        db.execute(delete(Comment))
        db.execute(delete(Article))
        seed(db, isolated)
    assert client.get("/api/v1/comments").json()["total"] == 0
    assert client.get("/api/v1/articles").json()["total"] == 0
    assert client.get(f"/media/{key}.webp").status_code == 404


def test_existing_unpublished_editorial_decisions_are_kept(client, isolated):
    actor = owner()[0]
    original = json.dumps({"display_name":"Existing", "body":"Original editorial draft", "age":None, "consent_received":False, "privacy_reviewed":False, "consent_reference":"", "photo_key":None, "photo_alt":"", "service_id":None, "sort_order":0})
    with SessionLocal.begin() as db:
        db.add(Comment(actor_id=actor, content_json=original, published_json=None))
        db.add(Article(slug="existing-draft", author_id=actor, content_json=json.dumps(PACK["articles"][0]), status="draft", published_json=None))
    with SessionLocal.begin() as db:
        seed(db, isolated)
        assert json.loads(db.get(ContentSeedState, KEY).details_json) == {"comments":0,"articles":0}
    with SessionLocal() as db:
        assert len(db.scalars(select(Comment)).all()) == 1
        assert len(db.scalars(select(Article)).all()) == 1
        assert db.scalar(select(Comment)).content_json == original


def test_business_hours_postal_code_and_title_follow_saved_profile(client):
    auth = headers(owner()[2])
    payload = client.get("/api/v1/staff/settings", headers=auth).json()
    assert payload["business_hours"] == [] and payload["postal_code"] == ""
    before = public_schema(client.get("/"))
    assert "openingHoursSpecification" not in before
    assert "postalCode" not in before["address"]
    payload.update(postal_code="۳۸۱۱۲۳۴۵۶۷", business_hours=[{"day_of_week":"Saturday", "opens":"۱۶:۰۰", "closes":"۲۰:۰۰"}])
    response = client.put("/api/v1/staff/settings", headers=auth, json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["postal_code"] == "3811234567"
    assert response.json()["business_hours"][0]["opens"] == "16:00"
    public = client.get("/api/v1/clinic").json()
    assert public["business_hours"] == response.json()["business_hours"]
    assert public["booking_enabled"] is False
    home = client.get("/")
    assert '<title data-rh="true">وبسایت رسمی دکتر فرزاد زمانی</title>' in home.text
    metadata = public_schema(home)
    assert metadata["address"]["postalCode"] == "3811234567"
    assert metadata["openingHoursSpecification"][0] == {"@type":"OpeningHoursSpecification", "dayOfWeek":"Saturday", "opens":"16:00", "closes":"20:00"}
    assert client.put("/api/v1/staff/settings", headers=auth, json=payload).status_code == 409
    limited = headers(account(["settings.view"])[2])
    assert client.put("/api/v1/staff/settings", headers=limited, json=response.json()).status_code == 403


@pytest.mark.parametrize("change", [
    {"postal_code":"123"},
    {"business_hours":[{"day_of_week":"Unknown", "opens":"16:00", "closes":"20:00"}]},
    {"business_hours":[{"day_of_week":"Friday", "opens":"25:00", "closes":"20:00"}]},
    {"business_hours":[{"day_of_week":"Friday", "opens":"16:00", "closes":"20:00"}]*2},
])
def test_invalid_profile_metadata_cannot_be_published(client, change):
    auth = headers(owner()[2])
    original = client.get("/api/v1/staff/settings", headers=auth).json()
    assert client.put("/api/v1/staff/settings", headers=auth, json={**original, **change}).status_code == 422
    assert client.get("/api/v1/staff/settings", headers=auth).json() == original
