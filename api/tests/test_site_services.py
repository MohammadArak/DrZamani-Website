"""Editable service pages: permissions, draft/publish isolation, sanitizing and public output."""
import json

from sqlalchemy import select

from app.content_models import SiteService
from app.database import SessionLocal
from test_content import client, isolated, upload  # noqa: F401
from test_roles import account, headers, owner

BASE = "/api/v1/staff/site-services"


def payload(slug="new-service", **updates):
    content = dict(
        slug=slug, title="خدمت آزمایشی", summary="خلاصه‌ی خدمت آزمایشی", tile_label="(آزمون)",
        description_html="<h2>تیتر</h2><p>متن آزمایشی خدمت</p>", image="rhinoplasty.png",
        seo_title="", seo_description="", sort_order=50,
    )
    content.update(updates)
    return dict(revision=0, content=content)


def create(client, access, **updates):
    response = client.post(BASE, headers=access, json=payload(**updates))
    assert response.status_code == 201, response.text
    return response.json()


def publish(client, access, row, action="publish"):
    return client.post(f"{BASE}/{row['id']}/transition", headers=access, json=dict(revision=row["revision"], action=action))


def test_builtin_pages_are_seeded_and_public(client):
    items = client.get("/api/v1/public-services").json()
    assert [item["slug"] for item in items["items"]] == ["rhinoplasty", "blepharoplasty", "face-lift", "mentoplasty"]
    assert "description_html" not in items["items"][0] and items["items"][0]["tile_label"]
    page = client.get("/services/rhinoplasty/").text
    assert "رینوپلاستی" in page and "legacy-service-body" in page
    sitemap = client.get("/sitemap.xml").text
    assert "/services/face-lift/" in sitemap


def test_permissions_split_writing_from_publishing(client):
    _, _, viewer = account({"site_services.view"})
    assert client.get(BASE, headers=headers(viewer)).status_code == 200
    assert client.post(BASE, headers=headers(viewer), json=payload()).status_code == 403
    _, _, editor = account(builtin="content_editor")
    access = headers(editor)
    row = create(client, access)
    assert publish(client, access, row).status_code == 403  # editors cannot publish
    assert client.request("DELETE", f"{BASE}/{row['id']}", headers=access, json=dict(revision=row["revision"])).status_code == 403
    assert client.get("/services/new-service/").status_code == 404  # drafts are never public
    assert client.get(BASE).status_code == 401


def test_publish_unpublish_and_draft_isolation(client):
    access = headers(owner()[2])
    row = create(client, access)
    published = publish(client, access, row).json()
    assert published["published"] and not published["unpublished_changes"]
    page = client.get("/services/new-service/").text
    assert "متن آزمایشی خدمت" in page and "خدمت آزمایشی" in page
    edited = payload(title="عنوان ویرایش‌شده", description_html="<p>متن پیش‌نویس تازه</p>")
    edited["revision"] = published["revision"]
    after = client.put(f"{BASE}/{row['id']}", headers=access, json=edited).json()
    assert after["unpublished_changes"] is True
    public = client.get("/services/new-service/").text
    assert "متن آزمایشی خدمت" in public and "متن پیش‌نویس تازه" not in public  # approved snapshot stays
    gone = publish(client, access, after, "unpublish")
    assert gone.status_code == 200
    assert client.get("/services/new-service/").status_code == 404
    assert "/services/new-service/" not in client.get("/sitemap.xml").text
    assert "new-service" not in [item["slug"] for item in client.get("/api/v1/public-services").json()["items"]]


def test_publish_requires_text_and_slug_rules(client):
    access = headers(owner()[2])
    empty = create(client, access, slug="empty-one", summary="", description_html="<p></p>")
    assert publish(client, access, empty).status_code == 422
    assert client.post(BASE, headers=access, json=payload("rhinoplasty")).status_code == 409  # slug already used
    assert client.post(BASE, headers=access, json=payload("Bad Slug")).status_code == 422
    live = create(client, access, slug="live-one")
    live = publish(client, access, live).json()
    rename = payload("other-slug")
    rename["revision"] = live["revision"]
    assert client.put(f"{BASE}/{live['id']}", headers=access, json=rename).status_code == 409  # published URL is stable
    stale = payload("live-one")
    stale["revision"] = live["revision"] - 1
    assert client.put(f"{BASE}/{live['id']}", headers=access, json=stale).status_code == 409


def test_description_is_sanitized_and_images_must_come_from_the_library(client):
    access = headers(owner()[2])
    row = create(client, access, slug="clean-one", description_html='<p onclick="bad()">متن</p><script>bad()</script><a href="javascript:bad()">پیوند</a>')
    stored = row["content"]["description_html"]
    assert "<script" not in stored and "onclick" not in stored and "javascript:" not in stored
    foreign = client.post(BASE, headers=access, json=payload("foreign-image", description_html=f'<p>x</p><img src="/media/{"a" * 32}.webp" alt="x">'))
    assert foreign.status_code == 422
    _, media = upload(client, access)
    with_image = create(client, access, slug="with-image", description_html=f'<p>x</p><img src="{media["url"]}" alt="تصویر">')
    assert client.get(media["url"]).status_code == 404  # not public until a page using it is published
    publish(client, access, with_image)
    assert client.get(media["url"]).status_code == 200
    assert client.delete("/api/v1/staff/media/" + media["key"], headers=access).status_code == 409


def test_hostile_text_is_escaped_on_the_public_page(client):
    access = headers(owner()[2])
    row = create(client, access, slug="hostile-one", title="<script>fixture()</script>", summary='"><img src=x onerror=fixture()>')
    publish(client, access, row)
    page = client.get("/services/hostile-one/").text
    assert "<script>fixture()" not in page and "<img src=x onerror" not in page
    assert "&lt;script&gt;fixture()&lt;/script&gt;" in page


def test_archive_removes_page_but_reserves_the_slug(client):
    access = headers(owner()[2])
    row = publish(client, access, create(client, access, slug="old-one")).json()
    assert client.request("DELETE", f"{BASE}/{row['id']}", headers=access, json=dict(revision=row["revision"])).status_code == 200
    assert client.get("/services/old-one/").status_code == 404
    assert client.post(BASE, headers=access, json=payload("old-one")).status_code == 409
    with SessionLocal() as db:
        assert db.scalar(select(SiteService.deleted).where(SiteService.slug == "old-one")) is True


def test_seed_runs_once_even_if_every_page_is_archived(client):
    access = headers(owner()[2])
    rows = client.get(BASE, headers=access).json()["items"]
    for row in rows:
        assert client.request("DELETE", f"{BASE}/{row['id']}", headers=access, json=dict(revision=row["revision"])).status_code == 200
    from app.main import seed_defaults
    seed_defaults()
    assert client.get(BASE, headers=access).json()["total"] == 0
    assert json.loads(client.get("/api/v1/public-services").text)["total"] == 0


def test_homepage_shows_four_services_but_service_pages_list_all(client):
    access = headers(owner()[2])
    publish(client, access, create(client, access, slug="fifth-one", title="خدمت پنجم", sort_order=99))
    home = client.get("/").text
    assert home.count('class="landing-service-card"') == 4 and "خدمت پنجم" not in home.split('id="services-bootstrap"', 1)[1].split("</script>", 1)[0]
    detail = client.get("/services/rhinoplasty/").text  # the "other services" block lists every published service
    assert detail.count('class="landing-service-card"') == 5 and "خدمت پنجم" in detail
    assert client.get("/api/v1/public-services").json()["total"] == 5  # the SPA slices to four itself
