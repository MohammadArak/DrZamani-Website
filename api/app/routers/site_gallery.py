"""Public list and staff management of the editable gallery."""
import json
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import content as c
from .. import site_gallery as g
from ..activity import record_audit
from ..content_models import SiteGalleryItem
from ..database import get_db
from ..dependencies import require_permission
from ..models import utcnow

router = APIRouter(tags=["site gallery"])
staff_router = APIRouter(prefix="/staff/site-gallery", tags=["site gallery management"])


class RevisionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1)


class Transition(RevisionInput):
    action: Literal["publish", "unpublish"]


def audit(db, row, staff, action, summary):
    record_audit(
        db, action="site_gallery." + action, entity_type="site_gallery", entity_id=row.id, summary=summary,
        actor_staff_id=staff.id, details={"revision": row.revision},
    )


@router.get("/public-gallery")
def public_list(db: Session = Depends(get_db)):
    items = g.public_items(db)
    return {"items": items, "total": len(items)}


@staff_router.get("")
def staff_list(db: Session = Depends(get_db), staff=Depends(require_permission("site_gallery.view"))):
    rows = db.scalars(select(SiteGalleryItem).where(SiteGalleryItem.deleted.is_(False))).all()
    rows = sorted(rows, key=lambda row: (json.loads(row.content_json)["sort_order"], row.id))
    return {"items": [g.read(row) for row in rows], "total": len(rows)}


@staff_router.post("", status_code=201)
def create(payload: g.GalleryWrite, db: Session = Depends(get_db), staff=Depends(require_permission("site_gallery.create"))):
    c.lock(db, staff, "site_gallery.create")
    data = g.check(db, payload.content)
    row = SiteGalleryItem(revision=1, content_json=json.dumps(data, ensure_ascii=False), actor_id=staff.id)
    db.add(row)
    db.flush()
    audit(db, row, staff, "create", "افزودن تصویر نمونه‌کار")
    db.commit()
    return g.read(row)


@staff_router.put("/{item_id}")
def update(item_id: int, payload: g.GalleryWrite, db: Session = Depends(get_db), staff=Depends(require_permission("site_gallery.edit"))):
    c.lock(db, staff, "site_gallery.edit")
    row = g.get_row(db, item_id, payload.revision)
    data = g.check(db, payload.content)
    if json.loads(row.content_json)["ref"] != data["ref"] and row.published_json:
        raise HTTPException(409, "تصویر منتشرشده عوض نمی‌شود؛ ابتدا انتشار را متوقف کنید")
    row.content_json = json.dumps(data, ensure_ascii=False)
    row.revision += 1
    row.updated_at = utcnow()
    row.actor_id = staff.id
    audit(db, row, staff, "edit", "ویرایش پیش‌نویس تصویر نمونه‌کار")
    db.commit()
    return g.read(row)


@staff_router.post("/{item_id}/transition")
def transition(item_id: int, payload: Transition, db: Session = Depends(get_db), staff=Depends(require_permission("site_gallery.publish"))):
    c.lock(db, staff, "site_gallery.publish")
    row = g.get_row(db, item_id, payload.revision)
    if payload.action == "publish":
        data = g.check(db, g.GalleryContent.model_validate(json.loads(row.content_json)))
        g.require_consent(data)
        row.published_json = json.dumps(data, ensure_ascii=False)
        row.published_at = row.published_at or utcnow()
        row.public_updated_at = utcnow()
    else:
        row.published_json = None
    row.revision += 1
    row.updated_at = utcnow()
    audit(db, row, staff, payload.action, "انتشار تصویر نمونه‌کار" if payload.action == "publish" else "توقف انتشار تصویر نمونه‌کار")
    db.commit()
    return g.read(row)


@staff_router.delete("/{item_id}")
def archive(item_id: int, payload: RevisionInput, db: Session = Depends(get_db), staff=Depends(require_permission("site_gallery.delete"))):
    c.lock(db, staff, "site_gallery.delete")
    row = g.get_row(db, item_id, payload.revision)
    row.deleted = True
    row.published_json = None
    row.revision += 1
    row.updated_at = utcnow()
    audit(db, row, staff, "archive", "بایگانی تصویر نمونه‌کار")
    db.commit()
    return {"message": "تصویر بایگانی شد"}
