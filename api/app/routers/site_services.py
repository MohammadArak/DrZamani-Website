"""Public list and staff management of the editable service pages."""
import json
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import content as c
from .. import site_services as s
from ..activity import record_audit
from ..content_models import SiteService
from ..database import get_db
from ..dependencies import require_permission
from fastapi import HTTPException
from ..models import utcnow

router = APIRouter(tags=["site services"])
staff_router = APIRouter(prefix="/staff/site-services", tags=["site services management"])
PUBLIC_FIELDS = ("slug", "title", "summary", "tile_label", "image", "sort_order")


class RevisionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1)


class Transition(RevisionInput):
    action: Literal["publish", "unpublish"]


def audit(db, row, staff, action, summary):
    record_audit(
        db, action="site_service." + action, entity_type="site_service", entity_id=row.id, summary=summary,
        actor_staff_id=staff.id, details={"slug": row.slug, "revision": row.revision},
    )


@router.get("/public-services")
def public_list(db: Session = Depends(get_db)):
    items = [{key: item[key] for key in PUBLIC_FIELDS} for item in s.public_items(db)]
    return {"items": items, "total": len(items)}


@staff_router.get("")
def staff_list(db: Session = Depends(get_db), staff=Depends(require_permission("site_services.view"))):
    rows = db.scalars(select(SiteService).where(SiteService.deleted.is_(False))).all()
    rows = sorted(rows, key=lambda row: (json.loads(row.content_json)["sort_order"], row.id))
    return {"items": [s.read(row) for row in rows], "total": len(rows)}


@staff_router.get("/{service_id}")
def staff_get(service_id: int, db: Session = Depends(get_db), staff=Depends(require_permission("site_services.view"))):
    return s.read(s.get_row(db, service_id))


@staff_router.post("", status_code=201)
def create(payload: s.ServiceWrite, db: Session = Depends(get_db), staff=Depends(require_permission("site_services.create"))):
    c.lock(db, staff, "site_services.create")
    if s.slug_taken(db, payload.content.slug):
        raise HTTPException(409, "این نشانی قبلاً استفاده شده است")
    data = s.clean(db, payload.content)
    row = SiteService(slug=data["slug"], revision=1, content_json=json.dumps(data, ensure_ascii=False), actor_id=staff.id)
    db.add(row)
    db.flush()
    audit(db, row, staff, "create", "افزودن صفحه خدمت")
    db.commit()
    return s.read(row)


@staff_router.put("/{service_id}")
def update(service_id: int, payload: s.ServiceWrite, db: Session = Depends(get_db), staff=Depends(require_permission("site_services.edit"))):
    c.lock(db, staff, "site_services.edit")
    row = s.get_row(db, service_id, payload.revision)
    data = s.clean(db, payload.content)
    if data["slug"] != row.slug:
        if row.published_json:
            raise HTTPException(409, "نشانی صفحه منتشرشده تغییر نمی‌کند؛ ابتدا انتشار را متوقف کنید")
        if s.slug_taken(db, data["slug"], row.id):
            raise HTTPException(409, "این نشانی قبلاً استفاده شده است")
        row.slug = data["slug"]
    row.content_json = json.dumps(data, ensure_ascii=False)
    row.revision += 1
    row.updated_at = utcnow()
    row.actor_id = staff.id
    audit(db, row, staff, "edit", "ویرایش پیش‌نویس صفحه خدمت")
    db.commit()
    return s.read(row)


@staff_router.post("/{service_id}/transition")
def transition(service_id: int, payload: Transition, db: Session = Depends(get_db), staff=Depends(require_permission("site_services.publish"))):
    c.lock(db, staff, "site_services.publish")
    row = s.get_row(db, service_id, payload.revision)
    if payload.action == "publish":
        data = json.loads(row.content_json)
        if not data["summary"].strip() or not s.has_text(data["description_html"]):
            raise HTTPException(422, "خلاصه و متن توضیح برای انتشار لازم‌اند")
        row.published_json = json.dumps(s.clean(db, s.ServiceContent.model_validate(data)), ensure_ascii=False)
        row.published_at = row.published_at or utcnow()
        row.public_updated_at = utcnow()
    else:
        row.published_json = None
    row.revision += 1
    row.updated_at = utcnow()
    audit(db, row, staff, payload.action, "انتشار صفحه خدمت" if payload.action == "publish" else "توقف انتشار صفحه خدمت")
    db.commit()
    return s.read(row)


@staff_router.delete("/{service_id}")
def archive(service_id: int, payload: RevisionInput, db: Session = Depends(get_db), staff=Depends(require_permission("site_services.delete"))):
    c.lock(db, staff, "site_services.delete")
    row = s.get_row(db, service_id, payload.revision)
    row.deleted = True
    row.published_json = None
    row.revision += 1
    row.updated_at = utcnow()
    audit(db, row, staff, "archive", "بایگانی صفحه خدمت")
    db.commit()
    return {"message": "صفحه خدمت بایگانی شد؛ نشانی آن برای استفاده‌ی دوباره رزرو می‌ماند"}
