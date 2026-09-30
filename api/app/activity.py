from __future__ import annotations

import json

from sqlalchemy.orm import Session

from .models import AuditLog


def record_audit(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str | int | None,
    summary: str,
    actor_staff_id: int | None = None,
    actor_patient_id: int | None = None,
    details: dict[str, object] | None = None,
) -> AuditLog:
    item = AuditLog(
        actor_staff_id=actor_staff_id,
        actor_patient_id=actor_patient_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        summary=summary,
        details_json=json.dumps(details or {}, ensure_ascii=False, default=str),
    )
    db.add(item)
    return item
