"""Owner-only runtime/security/secret management; no plaintext secret responses."""
import json
import http.client
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dependencies import require_permission
from ..database import get_db
from ..models import StaffUser, SettingRevision
from .. import runtime_settings as runtime
from ..outbound import webhook_request

router = APIRouter(prefix="/staff/system-settings", tags=["system settings"])


class SettingsWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1)
    values: dict[str, object] = Field(default_factory=dict, max_length=40)
    reset: list[str] = Field(default_factory=list, max_length=40)


class RestoreWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1)
    target_revision: int = Field(ge=1)


@router.get("")
def read(_staff: StaffUser = Depends(require_permission("secrets.manage")), db: Session = Depends(get_db)):
    return runtime.describe(db)


@router.put("")
def write(payload: SettingsWrite, request: Request, staff: StaffUser = Depends(require_permission("secrets.manage")), db: Session = Depends(get_db)):
    result = runtime.change(db, staff, payload.revision, payload.values, payload.reset)
    request.app.title = runtime.get_settings().app_name
    request.app.openapi_schema = None
    return result


@router.get("/history")
def history(_staff: StaffUser = Depends(require_permission("secrets.manage")), db: Session = Depends(get_db)):
    # Only metadata, never the snapshots or provider secrets.
    return [{"revision": item.revision, "changed_keys": json.loads(item.changed_keys_json),
             "actor_staff_id": item.actor_staff_id, "created_at": item.created_at}
            for item in db.scalars(select(SettingRevision).order_by(SettingRevision.revision.desc()).limit(100))]


@router.post("/restore")
def restore(payload: RestoreWrite, request: Request, staff: StaffUser = Depends(require_permission("secrets.manage")), db: Session = Depends(get_db)):
    result = runtime.restore(db, staff, payload.revision, payload.target_revision)
    request.app.title = runtime.get_settings().app_name
    request.app.openapi_schema = None
    return result


@router.post("/probe-webhook")
def probe(_staff: StaffUser = Depends(require_permission("secrets.manage"))):
    settings = runtime.get_settings()
    if not settings.sms_webhook_url:
        raise HTTPException(422, "ابتدا نشانی وب‌هوک را ذخیره کنید")
    try:
        status = webhook_request(settings.sms_webhook_url, probe=True)
        return {"reachable": True, "http_status": status, "detail": "TLS و دسترسی شبکه برقرار است؛ پیامکی ارسال نشد. وضعیت HTTP صحت کلید یا ارسال را اثبات نمی‌کند."}
    except (ValueError, OSError, http.client.HTTPException):
        raise HTTPException(502, "اتصال امن به دامنه مجاز وب‌هوک برقرار نشد") from None
