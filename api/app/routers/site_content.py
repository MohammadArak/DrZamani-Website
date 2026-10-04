"""Public homepage wording and its staff editor."""
import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from typing import Literal

from .. import content as c
from .. import site_content as s
from ..activity import record_audit
from ..database import get_db
from ..dependencies import require_permission
from ..models import utcnow

router = APIRouter(tags=["site content"])
staff_router = APIRouter(prefix="/staff/site-content", tags=["site content management"])


class Transition(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1)
    action: Literal["publish", "discard"]


def audit(db, row, staff, action, summary):
    record_audit(
        db, action="site_content." + action, entity_type="site_block", entity_id=row.key, summary=summary,
        actor_staff_id=staff.id, details={"revision": row.revision},
    )


@router.get("/site-content")
def public_content(db: Session = Depends(get_db)):
    return {"blocks": s.public_blocks(db)}


@staff_router.get("")
def staff_list(db: Session = Depends(get_db), staff=Depends(require_permission("site_content.view"))):
    return {"items": [s.read(s.get_row(db, key)) for key in s.KEYS]}


@staff_router.put("/{key}")
def update(key: s.BlockKey, payload: s.BlockWrite, db: Session = Depends(get_db), staff=Depends(require_permission("site_content.edit"))):
    c.lock(db, staff, "site_content.edit")
    row = s.get_row(db, key, payload.revision)
    data = s.validate(key, payload.content)
    row.content_json = json.dumps(data, ensure_ascii=False)
    row.revision += 1
    row.updated_at = utcnow()
    row.actor_id = staff.id
    audit(db, row, staff, "edit", "ویرایش پیش‌نویس متن صفحه اصلی")
    db.commit()
    return s.read(row)


@staff_router.post("/{key}/transition")
def transition(key: s.BlockKey, payload: Transition, db: Session = Depends(get_db), staff=Depends(require_permission("site_content.publish"))):
    c.lock(db, staff, "site_content.publish")
    row = s.get_row(db, key, payload.revision)
    if payload.action == "publish":
        row.published_json = json.dumps(s.validate(key, json.loads(row.content_json)), ensure_ascii=False)
        row.published_at = utcnow()
        row.public_updated_at = utcnow()
    else:
        # Throw the draft away and go back to the published wording.
        if not row.published_json:
            from fastapi import HTTPException
            raise HTTPException(409, "نسخه منتشرشده‌ای برای بازگشت وجود ندارد")
        row.content_json = row.published_json
    row.revision += 1
    row.updated_at = utcnow()
    audit(db, row, staff, payload.action, "انتشار متن صفحه اصلی" if payload.action == "publish" else "بازگشت پیش‌نویس به نسخه منتشرشده")
    db.commit()
    return s.read(row)
