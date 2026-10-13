from __future__ import annotations

import secrets
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, status
from PIL import Image, ImageOps, UnidentifiedImageError

from .runtime_settings import get_settings
from .models import ConsultationMessage
from .schemas import ConsultationMessageRead


ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_PIXELS = 20_000_000


def consultation_message_read(item: ConsultationMessage) -> ConsultationMessageRead:
    sender_name = "بیمار"
    if item.sender_type == "staff":
        sender_name = (
            item.sender_staff.full_name if item.sender_staff else "پشتیبانی مطب"
        )
    return ConsultationMessageRead(
        id=item.id,
        appointment_id=item.appointment_id,
        sender_type=item.sender_type,
        sender_name=sender_name,
        body=item.body,
        view_label=item.view_label,
        image_requirement_id=item.image_requirement_id,
        image_requirement_title=(
            item.image_requirement.title if item.image_requirement else item.view_label
        ),
        has_image=bool(item.stored_file_name),
        original_file_name=item.original_file_name,
        created_at=item.created_at,
        read_at=item.read_at,
    )


def optimize_consultation_image(contents: bytes) -> tuple[str, int]:
    settings = get_settings()
    if not contents or len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="حجم هر تصویر باید کمتر از ۱۰ مگابایت باشد",
        )
    try:
        with Image.open(
            BytesIO(contents), formats=sorted(ALLOWED_IMAGE_FORMATS)
        ) as source:
            if source.width * source.height > MAX_IMAGE_PIXELS:
                raise HTTPException(
                    status_code=413, detail="ابعاد تصویر بیش از حد مجاز است"
                )
            if source.format not in ALLOWED_IMAGE_FORMATS:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="فقط تصویر JPG، PNG یا WebP قابل بارگذاری است",
                )
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
            output = BytesIO()
            image.save(output, format="WEBP", quality=82, method=6)
    except HTTPException:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="فایل انتخاب‌شده یک تصویر معتبر نیست",
        ) from exc
    optimized = output.getvalue()
    stored_name = f"{secrets.token_urlsafe(24)}.webp"
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    (settings.upload_dir / stored_name).write_bytes(optimized)
    return stored_name, len(optimized)


def attachment_path(item: ConsultationMessage) -> Path:
    if not item.stored_file_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="تصویر پیدا نشد"
        )
    settings = get_settings()
    path = (settings.upload_dir / item.stored_file_name).resolve()
    if path.parent != settings.upload_dir.resolve() or not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="تصویر پیدا نشد"
        )
    return path


def retry_message(db, appointment_id, sender, nonce, body):
    from sqlalchemy import select
    if not nonce: return None
    item = db.scalar(select(ConsultationMessage).where(ConsultationMessage.appointment_id == appointment_id, ConsultationMessage.sender_type == sender, ConsultationMessage.client_nonce == nonce))
    if item and item.body != body:
        raise HTTPException(409, "شناسهٔ این پیام قبلاً برای متن دیگری استفاده شده است")
    return item


def message_page(db, appointment_id, viewer, serialize, *, after_id=None, before_id=None, limit=50):
    """A stable (created_at,id) window. Incoming messages are acknowledged through
    the returned high-water mark only, so a concurrent new message stays unread."""
    from sqlalchemy import select, tuple_, update
    from sqlalchemy.orm import joinedload
    from sqlalchemy.orm.attributes import set_committed_value
    from .models import utcnow, StaffUser, ServiceImageRequirement
    from .schemas import ConsultationMessagePage
    if after_id is not None and before_id is not None:
        raise HTTPException(422, "فقط یکی از مسیرهای پیام‌های قدیمی یا جدید مجاز است")
    base = ConsultationMessage.appointment_id == appointment_id
    order = tuple_(ConsultationMessage.created_at, ConsultationMessage.id)
    query = select(ConsultationMessage).where(base).options(
        joinedload(ConsultationMessage.sender_staff).load_only(StaffUser.id,StaffUser.full_name).raiseload("*"),
        joinedload(ConsultationMessage.image_requirement).load_only(ServiceImageRequirement.id,ServiceImageRequirement.title),
    )
    cursor_id = after_id if after_id is not None else before_id
    if cursor_id is not None:
        cursor = db.execute(select(ConsultationMessage.created_at,ConsultationMessage.id).where(base,ConsultationMessage.id == cursor_id)).first()
        if not cursor: raise HTTPException(422, "نشانی ادامهٔ گفتگو معتبر نیست")
        query = query.where(order > tuple(cursor) if after_id is not None else order < tuple(cursor))
    ascending = after_id is not None
    query = query.order_by(ConsultationMessage.created_at.asc() if ascending else ConsultationMessage.created_at.desc(),ConsultationMessage.id.asc() if ascending else ConsultationMessage.id.desc()).limit(limit+1)
    rows = list(db.scalars(query).unique())
    more = len(rows)>limit
    rows = rows[:limit]
    if not ascending: rows.reverse()
    acknowledged = None
    if rows and before_id is None:
        last = rows[-1]; now=utcnow()
        count = db.execute(update(ConsultationMessage).where(base,ConsultationMessage.sender_type != viewer,ConsultationMessage.read_at.is_(None),order <= (last.created_at,last.id)).values(read_at=now).execution_options(synchronize_session=False)).rowcount
        if count:
            for item in rows:
                if item.sender_type != viewer and item.read_at is None: set_committed_value(item,"read_at",now)
            db.commit()
            acknowledged=last.id
    peer = db.execute(select(ConsultationMessage.id,ConsultationMessage.created_at,ConsultationMessage.read_at).where(base,ConsultationMessage.sender_type == viewer,ConsultationMessage.read_at.is_not(None)).order_by(ConsultationMessage.created_at.desc(),ConsultationMessage.id.desc()).limit(1)).first()
    requirements=list(db.scalars(select(ConsultationMessage.image_requirement_id).where(base,ConsultationMessage.image_requirement_id.is_not(None)).distinct()))
    return ConsultationMessagePage(items=[serialize(item) for item in rows],has_more=more,before_id=rows[0].id if rows else before_id,after_id=rows[-1].id if rows else after_id,peer_read_through=dict(peer._mapping) if peer else None,uploaded_requirement_ids=requirements), acknowledged
