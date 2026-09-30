from __future__ import annotations

import os
import tempfile
from pathlib import Path


TEST_ROOT = Path(tempfile.mkdtemp(prefix="drzamani-tests-"))
os.environ["APP_ENV"] = "development"
os.environ["APP_DEBUG"] = "true"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_ROOT / 'test.db'}"
os.environ["UPLOAD_DIR"] = str(TEST_ROOT / "uploads")
os.environ["SMS_PROVIDER"] = "console"
os.environ["BOOTSTRAP_ADMIN_USERNAME"] = "admin"
os.environ["BOOTSTRAP_ADMIN_PASSWORD"] = "TestAdminPassword123!"
