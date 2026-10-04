"""Editable gallery: seed, permissions, consent gating, draft isolation and media protection."""
import json

from sqlalchemy import select

from app.content_models import SiteGalleryItem
from app.database import SessionLocal
from test_content import client, isolated, upload  # noqa: F401
from test_roles import account, headers, owner

BASE = "/api/v1/staff/site-gallery"


def media_payload(key, **updates):
    content = dict(
        kind="media", ref=key, alt="نمونه آزمایشی", sort_order=500,
        consent_received=True, consent_reference="F-100", privacy_reviewed=True,
    )
    content.update(updates)
    return dict(revision=0, content=content)


def test_legacy_images_are_seeded_and_public(client):
    items = client.get("/api/v1/public-gallery").json()["items"]
    assert len(items) >= 16 and items[0]["src"] == "/img/samples/1.jpg"
    assert "gallery-bootstrap" in client.get("/").text


def test_permissions_and_consent_gating(client):
    boss = headers(owner()[2])
    key = upload(client, boss)[1]["key"]
    _, _, editor = account(builtin="content_editor")
    access = headers(editor)
    created = client.post(BASE, headers=access, json=media_payload(key, consent_received=False))
    assert created.status_code == 201
    row = created.json()
    publish = lambda who, item: client.post(f"{BASE}/{item['id']}/transition", headers=who, json=dict(revision=item["revision"], action="publish"))
    assert publish(access, row).status_code == 403  # editors cannot publish
    assert publish(boss, row).status_code == 422  # no consent recorded
    fixed = client.put(f"{BASE}/{row['id']}", headers=access, json=dict(media_payload(key), revision=row["revision"])).json()
    published = publish(boss, fixed)
    assert published.status_code == 200 and published.json()["published"] is True
    assert any(item["src"] == f"/media/{key}.webp" for item in client.get("/api/v1/public-gallery").json()["items"])
    assert client.get(f"/media/{key}.webp").status_code == 200  # a gallery photo is public media
    assert client.request("DELETE", f"{BASE}/{fixed['id']}", headers=access, json=dict(revision=1)).status_code == 403
    assert client.get(BASE).status_code == 401


def test_media_in_gallery_cannot_be_deleted_and_published_photo_cannot_be_swapped(client):
    boss = headers(owner()[2])
    first, second = upload(client, boss)[1]["key"], upload(client, boss)[1]["key"]
    row = client.post(BASE, headers=boss, json=media_payload(first)).json()
    row = client.post(f"{BASE}/{row['id']}/transition", headers=boss, json=dict(revision=row["revision"], action="publish")).json()
    assert client.delete(f"/api/v1/staff/media/{first}", headers=boss).status_code == 409
    swap = client.put(f"{BASE}/{row['id']}", headers=boss, json=dict(media_payload(second), revision=row["revision"]))
    assert swap.status_code == 409
    row = client.post(f"{BASE}/{row['id']}/transition", headers=boss, json=dict(revision=row["revision"], action="unpublish")).json()
    assert client.get(f"/media/{first}.webp").status_code == 404
    assert client.put(f"{BASE}/{row['id']}", headers=boss, json=dict(media_payload(second), revision=row["revision"])).status_code == 200


def test_invalid_references_and_archive(client):
    boss = headers(owner()[2])
    bad_static = dict(revision=0, content=dict(kind="static", ref="/img/samples/99.jpg", alt="x", sort_order=1))
    assert client.post(BASE, headers=boss, json=bad_static).status_code == 422
    assert client.post(BASE, headers=boss, json=media_payload("f" * 32)).status_code == 422  # not in the library
    with SessionLocal() as db:
        legacy = db.scalars(select(SiteGalleryItem).order_by(SiteGalleryItem.id).limit(1)).one()
        revision, item_id = legacy.revision, legacy.id
    archived = client.request("DELETE", f"{BASE}/{item_id}", headers=boss, json=dict(revision=revision))
    assert archived.status_code == 200
    assert all(item["id"] != item_id for item in client.get("/api/v1/public-gallery").json()["items"])
    assert json.loads(client.get(BASE, headers=boss).text)["total"] >= 15
