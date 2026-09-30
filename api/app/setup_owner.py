"""Interactive, explicit owner creation/promotion for a new installation."""

import argparse
import getpass
import re
from sqlalchemy import select, text
from .access import revoke_staff, seed_access
from .activity import record_audit
from .database import SessionLocal
from .models import Role, StaffUser
from .security import hash_password


def main():
    parser = argparse.ArgumentParser(
        description="Create an owner; or explicitly promote an existing staff account"
    )
    parser.add_argument("--username", required=True)
    parser.add_argument("--name", default="مدیرکل")
    parser.add_argument("--promote-existing", action="store_true")
    args = parser.parse_args()
    username = args.username.strip().lower()
    if (
        not re.fullmatch(r"[a-z0-9_.-]{3,80}", username)
        or not 2 <= len(args.name.strip()) <= 120
    ):
        raise SystemExit("Invalid username or name")
    password = None
    if not args.promote_existing:
        password = getpass.getpass("New owner password (minimum 12 characters): ")
        if not 12 <= len(password) <= 128 or password != getpass.getpass(
            "Repeat password: "
        ):
            raise SystemExit("Password length or confirmation invalid")
    with SessionLocal() as db:
        db.execute(text("BEGIN IMMEDIATE"))
        seed_access(db)
        staff = db.scalar(select(StaffUser).where(StaffUser.username == username))
        if args.promote_existing:
            if not staff or not staff.is_active:
                raise SystemExit("Existing active staff account not found")
        else:
            if staff:
                raise SystemExit(
                    "Username exists; promotion requires --promote-existing"
                )
            staff = StaffUser(
                username=username,
                full_name=args.name.strip(),
                role="custom",
                password_hash=hash_password(password),
            )
            db.add(staff)
            db.flush()
        owner = db.scalar(select(Role).where(Role.slug == "superadmin"))
        if owner not in staff.roles:
            staff.roles.append(owner)
        revoke_staff(db, [staff.id])
        record_audit(
            db,
            action="access.owner_setup",
            entity_type="staff",
            entity_id=staff.id,
            summary="تعیین صریح مدیرکل از ابزار نصب",
            details={"promoted_existing": args.promote_existing},
        )
        db.commit()
    print("Owner configured. No password or token is printed.")


if __name__ == "__main__":
    main()
