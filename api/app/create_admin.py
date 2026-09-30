from __future__ import annotations

import argparse
import getpass

from sqlalchemy import select

from .database import SessionLocal
from .models import StaffUser
from .access import seed_access, assign_legacy_role
from .security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a Dr Zamani appointment administrator")
    parser.add_argument("--username", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    password = getpass.getpass("Admin password (minimum 12 characters): ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters")
    username = args.username.strip().lower()
    with SessionLocal.begin() as db:
        seed_access(db)
        if db.scalar(select(StaffUser).where(StaffUser.username == username)):
            raise SystemExit("Username already exists")
        db.add(
            StaffUser(
                username=username,
                full_name=args.name.strip(),
                password_hash=hash_password(password),
                role="admin",
            )
        )
        db.flush()
        assign_legacy_role(db, db.scalar(select(StaffUser).where(StaffUser.username == username)))
    print("Administrator created (not a superadmin; use app.setup_owner for explicit owner setup)")


if __name__ == "__main__":
    main()

