"""Editable "نمونه‌کارها" gallery. Images come from the public media library (or the 16 legacy files).

A media photo is only published with a recorded consent and a privacy review. The legacy images
(/img/samples/N.jpg) are seeded as already public so the site does not change on first deployment.
"""
import json
import re
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from .content_models import PublicMedia, SiteGalleryItem
from .models import utcnow

LEGACY_RE = re.compile(r"^/img/samples/(?:[1-9]|1[0-6])\.jpg$")
MEDIA_KEY_RE = re.compile(r"^[a-f0-9]{32}$")
LEGACY_COUNT = 16


class GalleryContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["static", "media"]
    ref: str = Field(min_length=1, max_length=64)
    alt: str = Field(default="", max_length=300)
    sort_order: int = Field(default=0, ge=0, le=10000)
    consent_received: bool = False
    consent_reference: str = Field(default="", max_length=200)
    privacy_reviewed: bool = False

    @field_validator("alt", "consent_reference")
    @classmethod
    def plain(cls, value):
        value = value.strip()
        if any(ord(char) < 32 and char not in "\n\t" for char in value):
            raise ValueError("نویسه کنترلی مجاز نیست")
        return value


class GalleryWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=0)
    content: GalleryContent


def check(db: Session, content: GalleryContent) -> dict:
    data = content.model_dump()
    if data["kind"] == "static":
        if not LEGACY_RE.fullmatch(data["ref"]):
            raise HTTPException(422, "تصویر قدیمی معتبر نیست")
    else:
        if not MEDIA_KEY_RE.fullmatch(data["ref"]):
            raise HTTPException(422, "تصویر باید از کتابخانه رسانه عمومی انتخاب شود")
        media = db.get(PublicMedia, data["ref"])
        if not media or media.deleted:
            raise HTTPException(422, "تصویر باید از کتابخانه رسانه عمومی فعال انتخاب شود")
    return data


def require_consent(data: dict) -> None:
    """Legacy images were approved before this workflow existed; every new photo needs a consent record."""
    if data["kind"] == "static":
        if not data["alt"].strip():
            raise HTTPException(422, "توضیح تصویر برای انتشار لازم است")
        return
    if not (data["consent_received"] and data["privacy_reviewed"] and data["consent_reference"].strip() and data["alt"].strip()):
        raise HTTPException(422, "برای انتشار، رضایت مراجع، بازبینی حریم خصوصی، مرجع رضایت و توضیح تصویر لازم است")


def get_row(db: Session, item_id: int, revision: int | None = None) -> SiteGalleryItem:
    row = db.get(SiteGalleryItem, item_id)
    if not row or row.deleted:
        raise HTTPException(404, "تصویر پیدا نشد")
    if revision is not None and row.revision != revision:
        raise HTTPException(409, "نسخه تصویر تغییر کرده؛ نسخه تازه را بخوانید")
    return row


def src_of(data: dict) -> str:
    return data["ref"] if data["kind"] == "static" else f"/media/{data['ref']}.webp"


def read(row: SiteGalleryItem) -> dict:
    content = json.loads(row.content_json)
    published = json.loads(row.published_json) if row.published_json else None
    return dict(
        id=row.id, revision=row.revision, content=content, src=src_of(content), published=published is not None,
        unpublished_changes=bool(published is not None and published != content), updated_at=row.updated_at,
    )


def _live(db: Session):
    return db.scalars(select(SiteGalleryItem).where(SiteGalleryItem.deleted.is_(False)))


def public_items(db: Session) -> list[dict]:
    items = []
    for row in _live(db):
        if row.published_json:
            data = json.loads(row.published_json)
            items.append({"id": row.id, "src": src_of(data), "alt": data["alt"], "sort_order": data["sort_order"]})
    return sorted(items, key=lambda item: (item["sort_order"], item["id"]))


def public_media_keys(db: Session) -> set[str]:
    keys = set()
    for row in _live(db):
        if row.published_json:
            data = json.loads(row.published_json)
            if data["kind"] == "media":
                keys.add(data["ref"])
    return keys


def media_keys_in_use(db: Session) -> set[str]:
    keys = set()
    for row in _live(db):
        for snapshot in (row.content_json, row.published_json):
            if snapshot:
                data = json.loads(snapshot)
                if data["kind"] == "media":
                    keys.add(data["ref"])
    return keys


def seed(db: Session) -> None:
    """Create the 16 legacy gallery images once; archived rows keep the table non-empty."""
    if db.scalar(select(SiteGalleryItem.id).limit(1)):
        return
    now = utcnow()
    for number in range(1, LEGACY_COUNT + 1):
        data = GalleryContent(kind="static", ref=f"/img/samples/{number}.jpg", alt=f"نمونه کار شماره {number}", sort_order=number).model_dump()
        snapshot = json.dumps(data, ensure_ascii=False)
        db.add(SiteGalleryItem(
            content_json=snapshot, published_json=snapshot, revision=1, published_at=now, public_updated_at=now,
            created_at=now, updated_at=now,
        ))
    db.flush()
