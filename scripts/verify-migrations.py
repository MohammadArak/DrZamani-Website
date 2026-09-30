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
        db.commit()
    migrate("head")
    with closing(sqlite3.connect(database)) as db:
        assert db.execute("SELECT COUNT(*) FROM staff_users").fetchone()[0] == 1
        assert db.execute("SELECT revoked_at FROM auth_sessions").fetchone()[0] is not None
        assert "staff_state_hash" in {row[1] for row in db.execute("PRAGMA table_info(auth_sessions)")}
        assert db.execute("SELECT COUNT(*) FROM auth_rate_limits").fetchone()[0] == 0
    migrate("20260828_0012", "downgrade")
    with closing(sqlite3.connect(database)) as db:
        assert "staff_state_hash" not in {row[1] for row in db.execute("PRAGMA table_info(auth_sessions)")}
        assert db.execute("SELECT COUNT(*) FROM staff_users").fetchone()[0] == 1
    migrate("head")
    with closing(sqlite3.connect(database)) as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []
        schema = db.execute("SELECT sql FROM sqlite_master WHERE name='appointments'").fetchone()[0]
        assert "uq_appointments_payment_id" in schema

print("PASS: fresh migration, existing staff session, downgrade/re-upgrade, integrity, foreign keys and payment uniqueness.")
