from __future__ import annotations

import secrets
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, status
from PIL import Image, ImageOps, UnidentifiedImageError

from .config import get_settings
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
