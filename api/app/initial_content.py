"""Install owner-approved source content once; respect existing editorial decisions."""
import hashlib
import json
from pathlib import Path

from PIL import Image
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .comment_models import Comment
from .comments import CommentContent
from .content import ArticleContent, sanitize
from .content_models import Article, ContentSeedState, PublicMedia
from .models import StaffUser, utcnow

PACK = json.loads(Path(__file__).with_name("initial_content_pack.json").read_text(encoding="utf-8"))
KEY = "approved-public-content-v1"
ARTICLE_ASSETS = {item["slug"]: item for item in PACK["articleAssets"]}
ASSETS = {"/img/comments/profile-1.jpg", "/img/comments/profile-2.jpg", "/img/comments/profile-3.jpg"} | {item["path"] for item in ARTICLE_ASSETS.values()}


def _media(db, settings, actor, asset, alt):
    if asset not in ASSETS:
        raise ValueError("Initial media is not in the verified asset list")
    candidates = [settings.public_html_dir / asset.lstrip("/"), Path(__file__).resolve().parents[2] / "public" / asset.lstrip("/")]
    source = next((path for path in candidates if path.is_file()), None)
    if source is None:
        raise RuntimeError("Build the site's public assets before installing initial content")
    key = hashlib.sha256(source.read_bytes() + KEY.encode()).hexdigest()[:32]
    existing = db.get(PublicMedia, key)
    if existing:
        return key
    settings.public_media_dir.mkdir(parents=True, exist_ok=True)
    target = settings.public_media_dir / f"{key}.webp"
    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((1600, 1600))
        image.save(target, "WEBP", quality=85)
        db.add(PublicMedia(key=key, owner_id=actor.id, alt=alt, width=image.width, height=image.height, size=target.stat().st_size))
    return key


def seed(db, settings):
    if db.get(ContentSeedState, KEY):
        return
    # A savepoint/unique key prevents replay; the caller commits content and ledger together.
    state = ContentSeedState(key=KEY, details_json="{}")
    try:
        with db.begin_nested():
            db.add(state)
            db.flush()
    except IntegrityError:
        return
    comments_empty = db.scalar(select(Comment.id).limit(1)) is None
    articles_empty = db.scalar(select(Article.id).limit(1)) is None
    counts = {"comments": 0, "articles": 0}
    if comments_empty or articles_empty:
        actor = db.scalar(select(StaffUser).where(StaffUser.username == "__default_public_content__"))
        if actor is None:
            actor = StaffUser(username="__default_public_content__", full_name="محتوای اولیه سایت", password_hash="!", role="secretary", is_active=False)
            db.add(actor)
            db.flush()
        now = utcnow()
        if comments_empty:
            for item in PACK["comments"]:
                data = {key:value for key,value in item.items() if key != "photo_path"}
                data.update(photo_key=_media(db, settings, actor, item["photo_path"], item["photo_alt"]), consent_received=True, privacy_reviewed=True, consent_reference="Owner-approved package defaults; original public drfarzadzamani.ir reviews; request 2026-10-12")
                data = CommentContent.model_validate(data).model_dump()
                data["service_title"] = ""
                snapshot = json.dumps(data, ensure_ascii=False)
                db.add(Comment(actor_id=actor.id, content_json=snapshot, published_json=snapshot, published_at=now, public_updated_at=now))
                counts["comments"] += 1
        if articles_empty:
            for item in PACK["articles"]:
                cover = _media(db, settings, actor, ARTICLE_ASSETS[item["slug"]]["path"], item["cover_alt"])
                data = ArticleContent.model_validate({**item, "cover_key": cover}).model_dump()
                data["body_html"] = sanitize(data["body_html"])
                snapshot = json.dumps(data, ensure_ascii=False)
                db.add(Article(slug=data["slug"], author_id=actor.id, content_json=snapshot, status="published", published_slug=data["slug"], published_json=snapshot, published_at=now, public_updated_at=now))
                counts["articles"] += 1
    state.details_json = json.dumps(counts)
    db.flush()
