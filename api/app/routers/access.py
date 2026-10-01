"""Owner-controlled roles and staff accounts. No secrets in responses or audit details."""

import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from ..access import (
    CATALOG,
    ROOT_ONLY,
    identity,
    is_owner,
    revoke_staff,
    validate_permissions,
)
from ..activity import record_audit
from ..database import get_db
from ..dependencies import require_permission
from ..models import Permission, Role, StaffRole, StaffUser
from ..security import hash_password

router = APIRouter(prefix="/staff/access", tags=["staff access"])


class RoleWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    is_active: bool = True
    permissions: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        if len(value.strip()) < 2:
            raise ValueError("نام نقش کوتاه است")
        return value.strip()


class StaffWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str = Field(min_length=2, max_length=120)
    role_ids: list[int] = Field(min_length=1, max_length=20)
    is_active: bool = True
    password: str | None = Field(default=None, min_length=12, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value):
        if len(value.strip()) < 2:
            raise ValueError("نام کوتاه است")
        return value.strip()


class StaffCreate(StaffWrite):
    username: str = Field(min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=12, max_length=128)


def role_read(role: Role, db: Session) -> dict:
    return dict(
        id=role.id,
        slug=role.slug,
        name=role.name,
        description=role.description,
        is_active=role.is_active,
        is_system=role.is_system,
        is_superadmin=role.slug == "superadmin",
        permissions=sorted(p.code for p in role.permissions),
        member_count=len(
            list(
                db.scalars(
                    select(StaffRole.staff_id).where(StaffRole.role_id == role.id)
                )
            )
        ),
    )


def lock_owner(db: Session, actor: StaffUser) -> StaffUser:
    actor_id = actor.id
    db.rollback()
    # SQLite is the supported storage backend; serialize last-owner checks with mutations.
    db.execute(text("BEGIN IMMEDIATE"))
    db.expire_all()
    actor = db.get(StaffUser, actor_id)
    if not actor or not is_owner(actor):
        raise HTTPException(403, "فقط مدیرکل می‌تواند دسترسی‌ها را تغییر دهد")
    return actor


def ensure_owner_remains(db: Session) -> None:
    db.flush()
    if not any(is_owner(s) for s in db.scalars(select(StaffUser)).unique()):
        raise HTTPException(
            409, "آخرین مدیرکل فعال باید حفظ شود؛ ابتدا مدیرکل دیگری تعیین کنید"
        )
    from ..runtime_settings import get_settings
    if get_settings().mfa_required_owners and any(is_owner(s) and (not s.mfa or not s.mfa.enabled) for s in db.scalars(select(StaffUser)).unique()):
        raise HTTPException(409, "حساب جدید باید پیش از گرفتن نقش مدیرکل، رمزساز خود را تأیید کند")


@router.get("/permissions")
def catalog(_actor: StaffUser = Depends(require_permission("roles.manage"))):
    return [
        dict(code=c, title=t, group=g, requires=r, future=f, owner_only=c in ROOT_ONLY)
        for c, t, g, r, f in CATALOG
    ]


@router.get("/roles")
def roles(
    _actor: StaffUser = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db),
):
    return [
        role_read(r, db) for r in db.scalars(select(Role).order_by(Role.id)).unique()
    ]


@router.post("/roles", status_code=201)
def create_role(
    payload: RoleWrite,
    actor: StaffUser = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db),
):
    actor = lock_owner(db, actor)
    codes = validate_permissions(payload.permissions)
    role = Role(
        slug=f"custom-{secrets.token_hex(12)}",
        name=payload.name,
        description=payload.description,
        is_active=payload.is_active,
        permissions=list(
            db.scalars(select(Permission).where(Permission.code.in_(codes)))
        ),
    )
    db.add(role)
    db.flush()
    record_audit(
        db,
        action="access.role_created",
        entity_type="role",
        entity_id=role.id,
        actor_staff_id=actor.id,
        summary="افزودن نقش",
        details={"name": role.name, "permissions": sorted(codes)},
    )
    db.commit()
    return role_read(role, db)


@router.put("/roles/{role_id}")
def update_role(
    role_id: int,
    payload: RoleWrite,
    actor: StaffUser = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db),
):
    actor = lock_owner(db, actor)
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "نقش پیدا نشد")
    if role.slug == "superadmin":
        raise HTTPException(409, "نقش مدیرکل محافظت‌شده است")
    codes = validate_permissions(payload.permissions)
    role.name, role.description, role.is_active = (
        payload.name,
        payload.description,
        payload.is_active,
    )
    role.permissions = list(
        db.scalars(select(Permission).where(Permission.code.in_(codes)))
    )
    role.revision += 1
    revoke_staff(
        db,
        list(
            db.scalars(select(StaffRole.staff_id).where(StaffRole.role_id == role_id))
        ),
    )
    record_audit(
        db,
        action="access.role_updated",
        entity_type="role",
        entity_id=role.id,
        actor_staff_id=actor.id,
        summary="ویرایش دسترسی نقش",
        details={
            "name": role.name,
            "permissions": sorted(codes),
            "is_active": role.is_active,
        },
    )
    db.commit()
    return role_read(role, db)


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    actor: StaffUser = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db),
):
    actor = lock_owner(db, actor)
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "نقش پیدا نشد")
    if role.is_system or db.scalar(
        select(StaffRole.staff_id).where(StaffRole.role_id == role_id).limit(1)
    ):
        raise HTTPException(
            409, "نقش پیش‌فرض یا دارای عضو حذف نمی‌شود؛ نقش را غیرفعال کنید"
        )
    record_audit(
        db,
        action="access.role_deleted",
        entity_type="role",
        entity_id=role.id,
        actor_staff_id=actor.id,
        summary="حذف نقش",
        details={"name": role.name},
    )
    db.delete(role)
    db.commit()
    return {"message": "نقش حذف شد"}


@router.get("/staff")
def staff_list(
    _actor: StaffUser = Depends(require_permission("staff.manage")),
    db: Session = Depends(get_db),
):
    return [
        identity(s)
        for s in db.scalars(select(StaffUser).order_by(StaffUser.id)).unique()
    ]


def staff_roles(db: Session, ids: list[int]) -> list[Role]:
    roles = list(db.scalars(select(Role).where(Role.id.in_(set(ids)))).unique())
    if len(roles) != len(set(ids)) or any(not r.is_active for r in roles):
        raise HTTPException(422, "نقش نامعتبر یا غیرفعال است")
    return roles


@router.post("/staff", status_code=201)
def create_staff(
    payload: StaffCreate,
    actor: StaffUser = Depends(require_permission("staff.manage")),
    db: Session = Depends(get_db),
):
    actor = lock_owner(db, actor)
    username = payload.username.lower()
    if db.scalar(select(StaffUser.id).where(StaffUser.username == username)):
        raise HTTPException(409, "نام کاربری تکراری است")
    staff = StaffUser(
        username=username,
        full_name=payload.full_name,
        role="custom",
        is_active=payload.is_active,
        password_hash=hash_password(payload.password),
        roles=staff_roles(db, payload.role_ids),
    )
    db.add(staff)
    ensure_owner_remains(db)
    record_audit(
        db,
        action="access.staff_created",
        entity_type="staff",
        entity_id=staff.id,
        actor_staff_id=actor.id,
        summary="افزودن کارمند",
        details={"role_ids": payload.role_ids},
    )
    db.commit()
    return identity(staff)


@router.put("/staff/{staff_id}")
def update_staff(
    staff_id: int,
    payload: StaffWrite,
    actor: StaffUser = Depends(require_permission("staff.manage")),
    db: Session = Depends(get_db),
):
    actor = lock_owner(db, actor)
    staff = db.get(StaffUser, staff_id)
    if not staff:
        raise HTTPException(404, "کارمند پیدا نشد")
    staff.full_name, staff.is_active, staff.role = (
        payload.full_name,
        payload.is_active,
        "custom",
    )
    staff.roles = staff_roles(db, payload.role_ids)
    if payload.password:
        staff.password_hash = hash_password(payload.password)
    ensure_owner_remains(db)
    revoke_staff(db, [staff.id])
    record_audit(
        db,
        action="access.staff_updated",
        entity_type="staff",
        entity_id=staff.id,
        actor_staff_id=actor.id,
        summary="ویرایش کارمند",
        details={
            "role_ids": payload.role_ids,
            "is_active": staff.is_active,
            "password_changed": bool(payload.password),
        },
    )
    db.commit()
    return identity(staff)
