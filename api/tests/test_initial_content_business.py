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
    assert client.get("/api/v1/articles").json()["total"] == 6
    with SessionLocal() as db:
        actor = db.scalar(select(StaffUser).where(StaffUser.username == "__default_public_content__"))
        assert actor.is_active is False and actor.password_hash == "!"
        assert db.get(ContentSeedState, KEY)
        faq = json.loads(db.get(SiteBlock, "faq").published_json)
        assert len(next(value for value in faq.values() if isinstance(value, list))) == 4
        assert len(db.scalars(select(PublicMedia)).all()) == 9


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


def test_selected_articles_are_readable_referenced_and_do_not_claim_clinician_review(client, isolated):
    with SessionLocal.begin() as db:
        seed(db, isolated)
    articles=client.get("/api/v1/articles").json()["items"]
    assert {item["content"]["slug"] for item in articles} == {
        "selfie-nose-distortion","thick-skin-rhinoplasty","nighttime-nasal-congestion",
        "snoring-or-sleep-apnea","vertigo-turning-in-bed","questions-before-rhinoplasty",
    }
    for article in articles:
        response=client.get(f"/articles/{article['content']['slug']}/")
        assert response.status_code==200
        assert "<sup>" in response.text
        assert "منابع" in response.text
        source=next(item for item in PACK["articles"] if item["slug"]==article["content"]["slug"])
        assert source["reviewer"]==""
        assert len(re.sub("<[^>]+>"," ",source["body_html"]).split())>=500
        assert len(source["sources"])>=4
        assert all(ref["url"].startswith("https://") for ref in source["sources"])
    ministry_topics={"snoring-or-sleep-apnea","vertigo-turning-in-bed"}
    for article in PACK["articles"]:
        if article["slug"] in ministry_topics:
            assert "وزارت بهداشت" in article["sources"][0]["title"]
            assert article["sources"][0]["url"].startswith("https://t.me/s/webda")

def test_selected_default_covers_are_distinct_and_selfie_is_dedicated():
    assets=PACK["articleAssets"]
    assert len({item["path"] for item in assets})==6
    assert len({item["sha256"] for item in assets})==6
    selfie=next(item for item in assets if item["slug"]=="selfie-nose-distortion")
    assert selfie["path"]=="/img/blog/articles/selfie-perspective-20261014.webp"
    assert "fictional" in selfie["origin"]

def test_reused_seed_media_in_one_transaction_does_not_duplicate(isolated):
    from app.initial_content import _media
    with SessionLocal.begin() as db:
        actor=StaffUser(username="fixture_media_seed",full_name="Source seed",password_hash="!",role="secretary",is_active=False)
        db.add(actor);db.flush()
        asset=PACK["articleAssets"][0]["path"]
        first=_media(db,isolated,actor,asset,"تصویر ساختگی منبع")
        second=_media(db,isolated,actor,asset,"کاربرد دوم همان تصویر")
        assert first==second
        assert len(db.scalars(select(PublicMedia)).all())==1
