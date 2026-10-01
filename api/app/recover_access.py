"""Explicit SSH/server-only owner recovery; no HTTP bypass, no credentials printed."""
import argparse
import json
from sqlalchemy import select, text

from .access import is_owner, revoke_staff
from .activity import record_audit
from .database import SessionLocal
from .models import StaffUser
from .runtime_settings import checkpoint, state


def main():
    parser = argparse.ArgumentParser(description="بازیابی محدود دسترسی مدیرکل از محیط خصوصی سرور")
    parser.add_argument("--username", required=True)
    parser.add_argument("--disable-captcha", action="store_true")
    parser.add_argument("--reset-mfa", action="store_true")
    parser.add_argument("--reason", required=True)
    args = parser.parse_args()
    if not (args.disable_captcha or args.reset_mfa) or not args.reason.strip() or len(args.reason) > 300:
        parser.error("حداقل یک عملیات و دلیل کوتاه لازم است")
    print("فقط روی سرور خصوصی و پس از احراز هویت مالک اجرا شود؛ نشست کارکنان باطل می‌شود.")
    if input(f"برای تأیید RECOVER {args.username.lower()} را بنویسید: ").strip() != "RECOVER " + args.username.lower():
        return 1
    with SessionLocal() as db:
        db.execute(text("BEGIN IMMEDIATE"))
        owner = db.scalar(select(StaffUser).where(StaffUser.username == args.username.lower()))
        if not owner or not is_owner(owner):
            print("حساب مدیرکل فعال پیدا نشد")
            return 1
        row = state(db)
        values = json.loads(row.overrides_json)
        changed = []
        if args.disable_captcha:
            values.update(turnstile_enabled=False, google_enabled=False)
            changed.extend(["turnstile_enabled", "google_enabled"])
        if args.reset_mfa:
            values["mfa_required_owners"] = False
            changed.append("mfa_required_owners")
            if owner.mfa:
                owner.mfa.enabled = False
                owner.mfa.secret_json = "{}"; owner.mfa.recovery_hashes_json = "[]"
                owner.mfa.pending_json = owner.mfa.pending_id = owner.mfa.pending_expires_at = None
                owner.mfa.revision += 1
        checkpoint(db, row, owner, changed)
        row.overrides_json = json.dumps(values)
        revoke_staff(db, list(db.scalars(select(StaffUser.id))))
        record_audit(db, action="access.server_recovery", entity_type="staff_user", entity_id=owner.id,
            actor_staff_id=owner.id, summary="بازیابی از محیط خصوصی سرور", details={"operations": changed, "reason": args.reason.strip()})
        db.commit()
    print("بازیابی ثبت شد؛ نشست‌ها باطل و فعال‌سازی دوباره نیازمند تأیید است.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
