"""Stable permission catalog. Legacy role strings are never an authorization source."""

from sqlalchemy import select, update
from sqlalchemy.orm import Session
from fastapi import HTTPException

from .models import AuthSession, Permission, Role, StaffUser
from .security import utcnow

# code, Persian title, group, prerequisite permissions, reserved for a later phase
CATALOG = [
    ("dashboard.view", "مشاهده داشبورد مجاز", "داشبورد", [], False),
    ("patients.view", "فهرست بیماران", "بیماران", [], False),
    (
        "patients.records.view",
        "مشاهده پرونده و یادداشت پزشکی",
        "بیماران",
        ["patients.view"],
        False,
    ),
    (
        "patients.records.edit",
        "ویرایش پرونده",
        "بیماران",
        ["patients.records.view"],
        False,
    ),
    (
        "intake.view",
        "مشاهده فرم و رضایت‌نامه بیمار",
        "بیماران",
        ["appointments.view"],
        False,
    ),
    ("appointments.view", "مشاهده نوبت‌ها و تقویم", "نوبت‌ها", [], False),
    (
        "appointments.edit",
        "تأیید و تغییر وضعیت نوبت",
        "نوبت‌ها",
        ["appointments.view"],
        False,
    ),
    ("appointments.cancel", "لغو نوبت", "نوبت‌ها", ["appointments.edit"], False),
    (
        "appointments.reschedule",
        "جابه‌جایی نوبت",
        "نوبت‌ها",
        ["appointments.view"],
        False,
    ),
    (
        "appointments.export",
        "خروجی اکسل نوبت‌ها",
        "نوبت‌ها",
        ["appointments.view"],
        False,
    ),
    ("consultations.view", "مشاهده گفتگو", "گفتگو", ["appointments.view"], False),
    ("consultations.send", "ارسال پیام", "گفتگو", ["consultations.view"], False),
    ("images.view", "مشاهده تصاویر خصوصی", "گفتگو", ["consultations.view"], False),
    ("waitlist.view", "مشاهده لیست انتظار", "نوبت‌ها", [], False),
    ("waitlist.edit", "ویرایش لیست انتظار", "نوبت‌ها", ["waitlist.view"], False),
    ("settings.view", "مشاهده تنظیمات مطب", "تنظیمات", [], False),
    ("settings.edit", "ویرایش تنظیمات مطب", "تنظیمات", ["settings.view"], False),
    ("schedule.view", "مشاهده برنامه و استثناها", "برنامه کاری", ["settings.view"], False),
    (
        "schedule.edit",
        "ویرایش ساعات کاری",
        "برنامه کاری",
        ["schedule.view", "settings.view"],
        False,
    ),
    ("schedule.create", "افزودن استثنای کاری", "برنامه کاری", ["schedule.view"], False),
    ("schedule.delete", "حذف استثنای کاری", "برنامه کاری", ["schedule.view"], False),
    ("services.view", "مشاهده خدمات", "خدمات", [], False),
    ("services.create", "افزودن خدمت", "خدمات", ["services.view"], False),
    ("services.edit", "ویرایش و غیرفعال‌سازی خدمت", "خدمات", ["services.view"], False),
    ("finance.view", "مشاهده مالی و پرداخت", "مالی", [], False),
    ("finance.refund", "رسیدگی به استرداد", "مالی", ["finance.view"], False),
    ("sms.view", "مشاهده پیامک و کمپین", "پیامک", [], False),
    ("sms.rules.edit", "ویرایش قواعد پیامک", "پیامک", ["sms.view"], False),
    ("sms.campaigns.create", "ساخت و پیش‌نمایش کمپین", "پیامک", ["sms.view"], False),
    ("sms.dispatch", "ارسال پیامک‌های صف", "پیامک", ["sms.view"], False),
    ("operations.run", "اجرای عملیات زمان‌بندی‌شده", "عملیات", [], False),
    ("audit.view", "مشاهده تاریخچه (شامل اطلاعات حساس)", "عملیات", [], False),
    ("roles.manage", "مدیریت نقش‌ها (فقط مدیرکل)", "مدیرکل", [], False),
    ("staff.manage", "مدیریت کارکنان (فقط مدیرکل)", "مدیرکل", [], False),
    ("secrets.manage", "مدیریت اسرار (مرحله ۳، فقط مدیرکل)", "مدیرکل", [], True),
    *[
        (
            f"articles.{action}",
            title,
            "مقالات",
            [] if action == "view" else ["articles.view"],
            True,
        )
        for action, title in [
            ("view", "مشاهده پیش‌نویس"),
            ("create", "نوشتن مقاله"),
            ("edit", "ویرایش مقاله"),
            ("delete", "حذف مقاله"),
            ("publish", "انتشار مقاله"),
        ]
    ],
    ("media.manage", "کتابخانه رسانه عمومی", "مقالات", [], True),
    *[
        (
            f"comments.{action}",
            title,
            "نظرات",
            [] if action == "view" else ["comments.view"],
            True,
        )
        for action, title in [
            ("view", "مشاهده نظرات"),
            ("create", "افزودن نظر"),
            ("edit", "ویرایش نظر"),
            ("delete", "حذف نظر"),
            ("publish", "انتشار نظر"),
        ]
    ],
]
CODES = {item[0] for item in CATALOG}
ROOT_ONLY = {"roles.manage", "staff.manage", "secrets.manage"}
SECRETARY = {
    "dashboard.view",
    "patients.view",
    "patients.records.view",
    "patients.records.edit",
    "intake.view",
    "appointments.view",
    "appointments.edit",
    "appointments.cancel",
    "appointments.reschedule",
    "appointments.export",
    "consultations.view",
    "consultations.send",
    "images.view",
    "waitlist.view",
    "waitlist.edit",
    "settings.view",
    "schedule.view",
    "services.view",
    "sms.view",
}
BUILTINS = {
    "superadmin": ("مدیرکل", set()),
    "admin": ("مدیر", {c for c, _, _, _, future in CATALOG if not future} - ROOT_ONLY),
    "secretary": ("منشی", SECRETARY),
    "accountant": ("حسابدار", {"dashboard.view", "finance.view", "finance.refund"}),
    "author": (
        "نویسنده",
        {"articles.view", "articles.create", "articles.edit", "media.manage"},
    ),
}


def seed_access(db: Session) -> None:
    existing = set(db.scalars(select(Permission.code)))
    db.add_all(Permission(code=code) for code in sorted(CODES - existing))
    db.flush()
    for slug, (name, codes) in BUILTINS.items():
        if not db.scalar(select(Role.id).where(Role.slug == slug)):
            db.add(
                Role(
                    slug=slug,
                    name=name,
                    is_system=True,
                    description="نقش پیش‌فرض",
                    permissions=list(
                        db.scalars(select(Permission).where(Permission.code.in_(codes)))
                    ),
                )
            )
    db.flush()


def assign_legacy_role(db: Session, staff: StaffUser) -> None:
    # Compatibility only at account creation/login, never promote a legacy label to owner.
    if not staff.roles and staff.role in {"admin", "secretary"}:
        role = db.scalar(select(Role).where(Role.slug == staff.role))
        if role:
            staff.roles = [role]
            db.flush()


def is_owner(staff: StaffUser) -> bool:
    return staff.is_active and any(
        r.slug == "superadmin" and r.is_system and r.is_active for r in staff.roles
    )


def permissions_for(staff: StaffUser) -> set[str]:
    if not staff.is_active:
        return set()
    if is_owner(staff):
        return CODES.copy()
    return {
        p.code
        for r in staff.roles
        if r.is_active
        for p in r.permissions
        if p.code in CODES - ROOT_ONLY
    }


def can(staff: StaffUser, code: str) -> bool:
    return code in permissions_for(staff)


def validate_permissions(codes: list[str]) -> set[str]:
    chosen = set(codes)
    if chosen - CODES or chosen & ROOT_ONLY:
        raise HTTPException(422, "مجوز ناشناخته یا ویژه مدیرکل قابل تخصیص نیست")
    for code, title, _, required, _ in CATALOG:
        if code in chosen and set(required) - chosen:
            raise HTTPException(422, f"پیش‌نیاز دسترسی «{title}» انتخاب نشده است")
    return chosen


def identity(staff: StaffUser) -> dict:
    return dict(
        id=staff.id,
        username=staff.username,
        full_name=staff.full_name,
        role=staff.role,
        role_ids=[r.id for r in staff.roles],
        role_titles=[r.name for r in staff.roles if r.is_active],
        permissions=sorted(permissions_for(staff)),
        is_superadmin=is_owner(staff),
        is_active=staff.is_active,
    )


def revoke_staff(db: Session, ids: list[int]) -> None:
    db.execute(
        update(AuthSession)
        .where(AuthSession.staff_id.in_(ids), AuthSession.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )
