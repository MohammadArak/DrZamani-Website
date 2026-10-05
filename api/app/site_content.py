"""Editable homepage wording (hero, about, FAQ, footer) kept in the database.

Each block has a draft (content_json) and an approved public snapshot (published_json). The set of
blocks is fixed; the first start seeds them with the wording that used to be hard-coded.
Text may use the placeholders {doctorName}, {specialty}, {officePhone} and {consultationPhone}.
"""
import json
from pathlib import Path
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from .content_models import SiteBlock
from .models import utcnow

DEFAULTS = json.loads(Path(__file__).with_name("site_content_defaults.json").read_text(encoding="utf-8"))
KEYS = ("hero", "trust", "about", "faq", "footer")
BlockKey = Literal["hero", "trust", "about", "faq", "footer"]
TITLES = {"hero": "متن بالای صفحه (هیرو)", "trust": "نوار اعتماد زیر هیرو", "about": "درباره پزشک", "faq": "سوالات متداول", "footer": "متن فوتر"}


def _plain(value: str) -> str:
    value = value.strip()
    if any(ord(char) < 32 and char not in "\n\t" for char in value):
        raise ValueError("نویسه کنترلی مجاز نیست")
    return value


class Hero(BaseModel):
    model_config = ConfigDict(extra="forbid")
    description: str = Field(min_length=10, max_length=700)

    @field_validator("description")
    @classmethod
    def description_ok(cls, value):
        return _plain(value)


class Fact(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: str = Field(min_length=1, max_length=30)
    label: str = Field(min_length=1, max_length=60)

    @field_validator("value", "label")
    @classmethod
    def text_ok(cls, value):
        return _plain(value)


class About(BaseModel):
    model_config = ConfigDict(extra="forbid")
    paragraphs: list[str] = Field(min_length=1, max_length=6)
    facts: list[Fact] = Field(default_factory=list, max_length=4)

    @field_validator("paragraphs")
    @classmethod
    def paragraphs_ok(cls, values):
        cleaned = [_plain(value) for value in values]
        if any(not (10 <= len(value) <= 1500) for value in cleaned):
            raise ValueError("هر بند باید بین ۱۰ تا ۱۵۰۰ نویسه باشد")
        return cleaned


class TrustItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=2, max_length=80)
    text: str = Field(default="", max_length=160)

    @field_validator("title", "text")
    @classmethod
    def text_ok(cls, value):
        return _plain(value)


class Trust(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[TrustItem] = Field(default_factory=list, max_length=4)  # none hides the strip


class FaqItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=3, max_length=200)
    content: str = Field(min_length=3, max_length=2000)

    @field_validator("title", "content")
    @classmethod
    def text_ok(cls, value):
        return _plain(value)


class Faq(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[FaqItem] = Field(min_length=1, max_length=20)


class Footer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    description: str = Field(min_length=10, max_length=900)

    @field_validator("description")
    @classmethod
    def description_ok(cls, value):
        return _plain(value)


MODELS = {"hero": Hero, "trust": Trust, "about": About, "faq": Faq, "footer": Footer}


class BlockWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1)
    content: dict


def validate(key: str, content: dict) -> dict:
    try:
        return MODELS[key].model_validate(content).model_dump()
    except ValidationError as error:
        raise HTTPException(422, "محتوای این بخش معتبر نیست؛ طول و تعداد فیلدها را بررسی کنید") from error


def get_row(db: Session, key: str, revision: int | None = None) -> SiteBlock:
    row = db.get(SiteBlock, key) if key in KEYS else None
    if not row:
        raise HTTPException(404, "بخش پیدا نشد")
    if revision is not None and row.revision != revision:
        raise HTTPException(409, "نسخه این بخش تغییر کرده؛ نسخه تازه را بخوانید")
    return row


def read(row: SiteBlock) -> dict:
    content = json.loads(row.content_json)
    published = json.loads(row.published_json) if row.published_json else None
    return dict(
        key=row.key, title=TITLES[row.key], revision=row.revision, content=content, published=published,
        unpublished_changes=published != content, published_at=row.published_at, updated_at=row.updated_at,
    )


def public_blocks(db: Session) -> dict:
    """Published content per key; a block that was never published is simply absent."""
    blocks = {}
    for row in db.scalars(select(SiteBlock)):
        if row.published_json:
            blocks[row.key] = json.loads(row.published_json)
    return blocks


def seed(db: Session) -> None:
    """Create any missing block from the built-in wording (existing edits are never overwritten)."""
    existing = set(db.scalars(select(SiteBlock.key)))
    now = utcnow()
    for key in KEYS:
        if key in existing:
            continue
        snapshot = json.dumps(validate(key, DEFAULTS[key]), ensure_ascii=False)
        db.add(SiteBlock(key=key, revision=1, content_json=snapshot, published_json=snapshot, published_at=now, public_updated_at=now, updated_at=now))
    db.flush()
