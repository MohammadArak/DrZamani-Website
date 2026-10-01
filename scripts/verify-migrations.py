"""Run with the API virtualenv; only a disposable, newly created SQLite DB is used."""

import os
from contextlib import closing
from pathlib import Path
import sqlite3
import subprocess
import sys
from tempfile import TemporaryDirectory


api = Path(__file__).resolve().parents[1] / "api"
with TemporaryDirectory(prefix="drzamani-migrations-") as directory:
    database = Path(directory) / "migration-test.db"
    env = dict(
        os.environ, APP_ENV="test", APP_DEBUG="false", SMS_PROVIDER="disabled",
        DATABASE_URL=f"sqlite:///{database.as_posix()}",
    )

    def migrate(target, operation="upgrade"):
        subprocess.run(
            [sys.executable, "-m", "alembic", operation, target],
            cwd=api, env=env, check=True,
        )

    migrate("20260828_0012")
    with closing(sqlite3.connect(database)) as db:
        db.execute("INSERT INTO staff_users (username,full_name,password_hash,role,is_active,created_at,updated_at) VALUES ('migration-fixture','Fixture','test-hash','admin',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
        db.execute("INSERT INTO auth_sessions (token_hash,staff_id,expires_at,created_at) VALUES ('test-hash',1,'2099-01-01',CURRENT_TIMESTAMP)")
        db.execute("INSERT INTO clinic_settings (id,doctor_name,specialty,office_phone,updated_at) VALUES (1,'Migration doctor','Fixture','08633333333',CURRENT_TIMESTAMP)")
        db.commit()
    migrate("head")
    with closing(sqlite3.connect(database)) as db:
        assert db.execute("SELECT COUNT(*) FROM staff_users").fetchone()[0] == 1
        assert db.execute("SELECT revoked_at FROM auth_sessions").fetchone()[0] is not None
        assert "staff_state_hash" in {row[1] for row in db.execute("PRAGMA table_info(auth_sessions)")}
        assert db.execute("SELECT COUNT(*) FROM auth_rate_limits").fetchone()[0] == 0
        assert db.execute("SELECT r.slug FROM staff_roles sr JOIN roles r ON r.id=sr.role_id WHERE sr.staff_id=1").fetchone()[0] == "admin"
        assert db.execute("SELECT COUNT(*) FROM staff_roles sr JOIN roles r ON r.id=sr.role_id WHERE r.slug='superadmin'").fetchone()[0] == 0
        assert db.execute("SELECT COUNT(*) FROM roles WHERE is_system=1").fetchone()[0] == 5
        assert db.execute("SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.slug='admin' AND rp.permission_code IN ('roles.manage','staff.manage','secrets.manage')").fetchone()[0] == 0
        assert db.execute("SELECT revision,overrides_json FROM system_settings WHERE id=1").fetchone() == (1, '{}')
        assert db.execute("SELECT revision,seo_title,office_phone FROM clinic_settings WHERE id=1").fetchone() == (1, '', '08633333333')
        assert db.execute("SELECT COUNT(*) FROM setting_revisions").fetchone()[0] == 0
        for name in ['staff_mfa','mfa_challenges','bot_challenges','captcha_attestations']:
            assert db.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0] == 0
        db.execute("INSERT INTO staff_mfa (staff_id,enabled,secret_json) VALUES (1,1,'{\"encrypted\":\"fixture\"}')")
        db.execute("UPDATE system_settings SET overrides_json='{\"patient_session_days\":3,\"google_enabled\":false}'")
        db.execute("INSERT INTO setting_revisions (revision,snapshot_json,changed_keys_json,created_at) VALUES (1,'{\"overrides\":{\"patient_session_days\":2,\"mfa_required_owners\":false},\"clinic\":{}}','[\"patient_session_days\",\"mfa_required_owners\"]',CURRENT_TIMESTAMP)")
        db.execute("INSERT INTO auth_sessions (token_hash,staff_id,expires_at,created_at) VALUES ('mfa-migration-session',1,'2099-01-01',CURRENT_TIMESTAMP)")
        db.commit()
    migrate("20260930_0015", "downgrade")
    with closing(sqlite3.connect(database)) as db:
        assert db.execute("SELECT is_active FROM staff_users WHERE id=1").fetchone()[0] == 0
        assert db.execute("SELECT revoked_at FROM auth_sessions WHERE token_hash='mfa-migration-session'").fetchone()[0] is not None
        assert db.execute("SELECT overrides_json FROM system_settings").fetchone()[0] == '{"patient_session_days": 3}'
        assert 'mfa_required_owners' not in db.execute("SELECT snapshot_json FROM setting_revisions").fetchone()[0]
        assert db.execute("SELECT name FROM sqlite_master WHERE name IN ('staff_mfa','bot_challenges','mfa_challenges','captcha_attestations')").fetchall() == []
    migrate("head")
    migrate("20260828_0012", "downgrade")
    with closing(sqlite3.connect(database)) as db:
        assert "staff_state_hash" not in {row[1] for row in db.execute("PRAGMA table_info(auth_sessions)")}
        assert db.execute("SELECT COUNT(*) FROM staff_users").fetchone()[0] == 1
        assert db.execute("SELECT office_phone FROM clinic_settings WHERE id=1").fetchone()[0] == '08633333333'
        assert 'seo_title' not in {row[1] for row in db.execute('PRAGMA table_info(clinic_settings)')}
        assert db.execute("SELECT name FROM sqlite_master WHERE name IN ('system_settings','setting_revisions')").fetchall() == []
    migrate("head")
    with closing(sqlite3.connect(database)) as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []
        schema = db.execute("SELECT sql FROM sqlite_master WHERE name='appointments'").fetchone()[0]
        assert "uq_appointments_payment_id" in schema
        assert db.execute("SELECT revision,seo_description,seo_image_url,office_phone FROM clinic_settings WHERE id=1").fetchone() == (1, '', '', '08633333333')

print("PASS: fresh migration, staff/clinic data, disabled MFA defaults, populated MFA rollback/session revocation/overlay cleanup, downgrade/re-upgrade, integrity, foreign keys and payment uniqueness.")
