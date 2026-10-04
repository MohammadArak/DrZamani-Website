"""Editorial drafts are isolated from immutable approved publication snapshots."""
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import utcnow


class Article(Base):
    __tablename__ = "articles"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("staff_users.id"))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    content_json: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    published_slug: Mapped[str | None] = mapped_column(String(180), unique=True)
    published_json: Mapped[str | None] = mapped_column(Text)
    scheduled_json: Mapped[str | None] = mapped_column(Text)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime)
    public_updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ArticleRevision(Base):
    __tablename__ = "article_revisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id"), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    content_json: Mapped[str] = mapped_column(Text)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"))
    action: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ArticleAlias(Base):
    __tablename__ = "article_aliases"
    slug: Mapped[str] = mapped_column(String(180), primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id"), index=True)


class PublicMedia(Base):
    __tablename__ = "public_media"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("staff_users.id"))
    alt: Mapped[str] = mapped_column(String(300))
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    size: Mapped[int] = mapped_column(Integer)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class SiteService(Base):
    """Public service page text; a draft is separate from the approved public snapshot."""
    __tablename__ = "site_services"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    content_json: Mapped[str] = mapped_column(Text)
    published_json: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime)
    public_updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class SiteBlock(Base):
    """One editable homepage text block (hero, about, faq, footer); draft and public snapshot."""
    __tablename__ = "site_blocks"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    content_json: Mapped[str] = mapped_column(Text)
    published_json: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime)
    public_updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class SiteGalleryItem(Base):
    """One photo of the public gallery; draft and approved snapshot are kept apart."""
    __tablename__ = "site_gallery"
    id: Mapped[int] = mapped_column(primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    content_json: Mapped[str] = mapped_column(Text)
    published_json: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime)
    public_updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
