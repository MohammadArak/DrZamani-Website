"""Editable public service pages: text, rich description and SEO live in the database.

A draft (content_json) is separate from the approved public snapshot (published_json), the same
model used for articles, so a writer can prepare text and a publisher approves it.
"""
import json
import re
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import content as c
from .content_models import PublicMedia, SiteService
from .models import utcnow

IMAGES = ("rhinoplasty.png", "belpharoplasty.png", "face-lift.png", "mentoplasty.png")
SEED_CATALOG = json.loads(Path(__file__).with_name("clinic_services.json").read_text(encoding="utf-8"))
# Card and tile wording of the original homepage, so the first deployment looks unchanged.
SEED_TEXT = {
    "rhinoplasty": ("افزایش زیبایی چهره با طراحی متناسب بینی", "(جراحی زیبایی بینی)"),
    "blepharoplasty": ("جوانسازی پلک‌ها و ایجاد ظاهری شاداب‌تر", "(جراحی پلک)"),
    "face-lift": ("ایجاد ظاهری جوان‌تر با حفظ حالت طبیعی چهره", "(جراحی جوانسازی)"),
    "mentoplasty": ("اصلاح فرم چانه و ایجاد تناسب بهتر در چهره", "(جراحی فک)"),
}
SEED_DATE = datetime(2026, 10, 2)
# The homepage grid is designed for four cards; the /services/ pages list every published service.
HOME_LIMIT = 4


class ServiceContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=2, max_length=120)
    summary: str = Field(default="", max_length=300)
    tile_label: str = Field(default="", max_length=60)
    description_html: str = Field(default="", max_length=100000)
    image: str = Field(default=IMAGES[0], max_length=40)
    seo_title: str = Field(default="", max_length=200)
    seo_description: str = Field(default="", max_length=400)
    sort_order: int = Field(default=0, ge=0, le=10000)

    @field_validator("title", "summary", "tile_label", "seo_title", "seo_description")
    @classmethod
    def plain_text(cls, value):
        value = value.strip()
        if any(ord(char) < 32 and char not in "\n\t" for char in value):
            raise ValueError("نویسه کنترلی مجاز نیست")
        return value

    @field_validator("title")
    @classmethod
    def title_needed(cls, value):
        if len(value) < 2:
            raise ValueError("عنوان خدمت را کامل کنید")
        return value

    @field_validator("image")
    @classmethod
    def known_image(cls, value):
        if value not in IMAGES:
            raise ValueError("تصویر نماد باید از فهرست مجاز باشد")
        return value


class ServiceWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=0)
    content: ServiceContent


def clean(db: Session, content: ServiceContent) -> dict:
    """Sanitize the rich description and require that every image comes from the media library."""
    data = content.model_dump()
    data["description_html"] = c.sanitize(data["description_html"])
    parser = c.Outline()
    parser.feed(data["description_html"])
    if len(parser.images) > 40:
        raise HTTPException(422, "هر صفحه خدمت حداکثر ۴۰ تصویر می‌پذیرد")
    keys = {m.group(1) for image in parser.images if (m := c.MEDIA_RE.fullmatch(image.get("src", "")))}
    if keys and set(db.scalars(select(PublicMedia.key).where(PublicMedia.key.in_(keys), PublicMedia.deleted.is_(False)))) != keys:
        raise HTTPException(422, "تصویر باید از کتابخانه رسانه عمومی فعال انتخاب شود")
    return data


def get_row(db: Session, service_id: int, revision: int | None = None) -> SiteService:
    row = db.get(SiteService, service_id)
    if not row or row.deleted:
        raise HTTPException(404, "صفحه خدمت پیدا نشد")
    if revision is not None and row.revision != revision:
        raise HTTPException(409, "نسخه صفحه تغییر کرده؛ نسخه تازه را بخوانید")
    return row


def slug_taken(db: Session, slug: str, service_id: int | None = None) -> bool:
    other = db.scalar(select(SiteService.id).where(SiteService.slug == slug))
    return other is not None and other != service_id


def read(row: SiteService) -> dict:
    content = json.loads(row.content_json)
    published = json.loads(row.published_json) if row.published_json else None
    return dict(
        id=row.id, revision=row.revision, content=content, published=published is not None,
        unpublished_changes=bool(published is not None and published != content),
        published_at=row.published_at, updated_at=row.updated_at,
    )


def public_items(db: Session) -> list[dict]:
    """Published services as dicts (content + id + updated_at), ordered for display."""
    rows = db.scalars(select(SiteService).where(SiteService.deleted.is_(False), SiteService.published_json.is_not(None))).all()
    items = []
    for row in rows:
        data = json.loads(row.published_json)
        data["id"] = row.id
        data["updated_at"] = row.public_updated_at or row.updated_at
        items.append(data)
    return sorted(items, key=lambda item: (item["sort_order"], item["id"]))


def public_media_keys(db: Session) -> set[str]:
    keys: set[str] = set()
    for row in db.scalars(select(SiteService).where(SiteService.deleted.is_(False), SiteService.published_json.is_not(None))):
        keys |= c.media_keys(json.dumps({"body_html": json.loads(row.published_json)["description_html"], "cover_key": None}))
    return keys


def media_keys_in_use(db: Session) -> set[str]:
    keys: set[str] = set()
    for row in db.scalars(select(SiteService).where(SiteService.deleted.is_(False))):
        for snapshot in (row.content_json, row.published_json):
            if snapshot:
                keys |= c.media_keys(json.dumps({"body_html": json.loads(snapshot)["description_html"], "cover_key": None}))
    return keys


def has_text(html_value: str) -> bool:
    return bool(re.sub(r"<[^>]*>", "", html_value or "").strip())


def seed(db: Session) -> None:
    """Create the four built-in service pages once; archived rows keep the table non-empty."""
    if db.scalar(select(SiteService.id).limit(1)):
        return
    for order, item in enumerate(SEED_CATALOG, start=1):
        summary, tile = SEED_TEXT.get(item["slug"], (item["summary"], ""))
        data = ServiceContent(
            slug=item["slug"], title=item["title"], summary=summary, tile_label=tile, image=item["image"],
            description_html=f"<p>{item['description']}</p>", seo_description=item["description"], sort_order=order,
        ).model_dump()
        snapshot = json.dumps(data, ensure_ascii=False)
        db.add(SiteService(
            slug=data["slug"], revision=1, content_json=snapshot, published_json=snapshot,
            published_at=SEED_DATE, public_updated_at=SEED_DATE, created_at=utcnow(), updated_at=SEED_DATE,
        ))
    db.flush()
