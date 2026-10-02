"""Explicit root-only deploy/rollback; importing this module never deploys.

Tests inject an isolated filesystem layout and runtime. The public CLI has no
sandbox/root override and always uses the existing production installation.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import stat
import subprocess
import sys
import time
import uuid
import zipfile
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.request import urlopen

from state_snapshot import (
    RecoveryError,
    create_snapshot,
    entries,
    private_json,
    restore_snapshot,
    safe_path,
    verify_snapshot,
)

API = "drzamani-api.service"
JOB = "drzamani-jobs.service"
TIMER = "drzamani-jobs.timer"
UNITS = (API, JOB, TIMER)
RELEASE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}\Z")


@dataclass(frozen=True)
class Layout:
    root: Path = Path("/")

    def path(self, value: str) -> Path:
        return self.root / value.lstrip("/")

    @property
    def releases(self):
        return self.path("/var/www/drzamani/releases")

    @property
    def current(self):
        return self.path("/var/www/drzamani/current")

    @property
    def maintenance(self):
        return self.path("/var/www/drzamani/maintenance.flag")

    @property
    def data(self):
        return self.path("/var/lib/drzamani")

    @property
    def backups(self):
        return self.path("/var/backups/drzamani")

    @property
    def env(self):
        return self.path("/etc/drzamani/drzamani.env")

    @property
    def snippets(self):
        return self.path("/etc/nginx/snippets")

    @property
    def lock(self):
        return self.path("/run/lock/drzamani-deploy.lock")


def version(release: Path) -> str:
    value = (release / "VERSION").read_text(encoding="utf8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", value):
        raise RecoveryError("Release VERSION is invalid")
    return value


def read_targets(
    layout: Layout, python: Path, *, prefix: tuple[str, ...] = ()
) -> dict[str, Path]:
    # Use the release's locked dotenv package. stdout contains only storage paths;
    # stderr is suppressed so a configuration error cannot print ENV contents.
    program = """import json,sys
from dotenv import dotenv_values
d=dotenv_values(sys.argv[1],interpolate=False)
print(json.dumps({k:d.get(k) for k in ('DATABASE_URL','UPLOAD_DIR','PUBLIC_MEDIA_DIR')}))
"""
    result = subprocess.run(
        [*prefix, str(python), "-c", program, str(layout.env)],
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )
    if result.returncode:
        raise RecoveryError("Storage configuration could not be read")
    values = json.loads(result.stdout)
    database = values.get("DATABASE_URL") or ""
    if not database.startswith("sqlite:///") or "?" in database or "#" in database:
        raise RecoveryError("Only a persistent SQLite DATABASE_URL is supported")
    paths = {
        "database": Path(database[len("sqlite:///") :]),
        "private_uploads": Path(values.get("UPLOAD_DIR") or ""),
        "public_media": Path(values.get("PUBLIC_MEDIA_DIR") or ""),
    }
    for path in paths.values():
        if not path.is_absolute() or not safe_path(path).is_relative_to(
            safe_path(layout.data)
        ):
            raise RecoveryError(
                "All storage paths must be explicit and inside persistent storage"
            )
    paths.update(
        env=layout.env,
        security=layout.snippets / "drzamani-security-headers.conf",
        proxy=layout.snippets / "drzamani-proxy-headers.conf",
    )
    return paths


def extract_package(archive: Path, destination: Path) -> None:
    safe_path(destination)
    if destination.exists():
        raise RecoveryError("Release directory already exists")
    with zipfile.ZipFile(archive) as package:
        seen, total = set(), 0
        for item in package.infolist():
            path = PurePosixPath(item.filename)
            if (
                not item.filename
                or item.orig_filename != item.filename
                or "\x00" in item.orig_filename
                or path.is_absolute()
                or ".." in path.parts
                or "\\" in item.filename
                or ":" in item.filename
                or path.as_posix().casefold() in seen
                or stat.S_ISLNK(item.external_attr >> 16)
            ):
                raise RecoveryError("Release archive has unsafe or duplicate paths")
            seen.add(path.as_posix().casefold())
            total += item.file_size
        if total > 2 * 1024**3 or len(seen) > 100000:
            raise RecoveryError("Release archive exceeds bounded extraction limits")
        required = {
            "VERSION",
            "api/pyproject.toml",
            "api/uv.lock",
            "api/alembic.ini",
            "public_html/index.html",
            "deploy/drzamani-security-headers.conf",
            "deploy/drzamani-proxy-headers.conf",
        }
        names = {item.filename for item in package.infolist() if not item.is_dir()}
        if not required.issubset(names) or "api/.env" in names:
            raise RecoveryError(
                "A built release package is required; source ZIP alone is insufficient"
            )
        destination.mkdir(parents=True, mode=0o700)
        package.extractall(destination)
    for item in entries(destination):
        os.chmod(item, 0o700 if item.is_dir() else 0o600)
    version(destination)


class Runtime:
    """Production adapter: command output stays private; errors expose no payloads."""

    def storage_targets(self, layout: Layout, release: Path) -> dict[str, Path]:
        # A service-owned venv must never execute its Python/dependencies as root.
        return read_targets(
            layout,
            release / "api/.venv/bin/python",
            prefix=("runuser", "-u", "www-data", "--"),
        )

    def run(
        self, args: list[str], *, cwd: Path | None = None, timeout: int = 120
    ) -> str:
        process = subprocess.Popen(
            args,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True,
        )
        try:
            stdout, _stderr = process.communicate(timeout=timeout)
        except (
            BaseException
        ):  # Interrupted command descendants must stop before restore.
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.communicate(timeout=15)
            raise
        if process.returncode:
            raise RecoveryError(
                "An infrastructure command failed; maintenance is retained if recovery fails"
            )
        return stdout.strip()

    def active(self, unit: str) -> bool:
        result = subprocess.run(
            ["systemctl", "show", "--property=ActiveState", "--value", unit],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        if result.returncode:
            raise RecoveryError("Service state could not be established")
        state = result.stdout.strip()
        if state not in {
            "active",
            "activating",
            "reloading",
            "inactive",
            "failed",
            "deactivating",
        }:
            raise RecoveryError("Unexpected service state")
        return state in {"active", "activating", "reloading", "deactivating"}

    def stop(self, unit: str) -> None:
        self.run(["systemctl", "stop", unit], timeout=150)
        if self.active(unit):
            raise RecoveryError("A writer did not stop")

    def start(self, unit: str) -> None:
        self.run(["systemctl", "start", unit], timeout=150)

    def prepare(self, release: Path, layout: Layout) -> None:
        import pwd

        owner = pwd.getpwnam("www-data")
        for path in (release, *release.rglob("*")):
            os.chown(path, owner.pw_uid, owner.pw_gid, follow_symlinks=False)
        self.run(
            [
                "runuser",
                "-u",
                "www-data",
                "--",
                "env",
                f"UV_CACHE_DIR={layout.data / 'uv-cache'}",
                f"UV_PYTHON_INSTALL_DIR={layout.data / 'uv-python'}",
                "uv",
                "sync",
                "--project",
                str(release / "api"),
                "--frozen",
                "--no-dev",
            ],
            timeout=600,
        )

    def migrate(self, release: Path, layout: Layout) -> None:
        self.run(
            [
                "runuser",
                "-u",
                "www-data",
                "--",
                str(release / "api/.venv/bin/python"),
                "-m",
                "alembic",
                "-c",
                str(release / "api/alembic.ini"),
                "upgrade",
                "head",
            ],
            cwd=release / "api",
            timeout=600,
        )

    def nginx(self) -> None:
        self.run(["nginx", "-t"])
        self.run(["systemctl", "reload", "nginx"])

    def health(self, expected_version: str) -> None:
        for _attempt in range(20):
            try:
                with urlopen("http://127.0.0.1:8000/api/health", timeout=3) as response:
                    value = json.loads(response.read(4096))
                if (
                    value.get("status") == "ok"
                    and value.get("version") == expected_version
                ):
                    return
            except (OSError, ValueError):
                pass
            time.sleep(1)
        raise RecoveryError("API health or expected version check failed")


@contextmanager
def installation_lock(path: Path):
    import fcntl

    safe_path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+") as stream:
        try:
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RecoveryError(
                "Another release or rollback holds the installation lock"
            ) from None
        try:
            yield
        finally:
            fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


class ReleaseManager:
    def __init__(self, layout: Layout, runtime: Runtime):
        self.layout, self.runtime = layout, runtime

    def current(self) -> Path | None:
        path = self.layout.current
        if not path.exists() and not path.is_symlink():
            return None
        if not path.is_symlink():
            raise RecoveryError("Current release must be an installation-owned symlink")
        target = path.resolve(strict=True)
        if target.parent != self.layout.releases.resolve() or not RELEASE_ID.fullmatch(
            target.name
        ):
            raise RecoveryError("Current release points outside the release directory")
        return target

    def switch(self, target: Path | None) -> None:
        current = self.layout.current
        if target is None:
            if current.is_symlink():
                current.unlink()
            return
        if target.parent != self.layout.releases or not RELEASE_ID.fullmatch(
            target.name
        ):
            raise RecoveryError("Release target is outside the installation")
        temporary = current.with_name("current-" + uuid.uuid4().hex)
        temporary.symlink_to(target, target_is_directory=True)
        os.replace(temporary, current)

    def stop_writers(self) -> None:
        # Stop the timer before its running job, then the API. No ignored failures.
        failed = False
        for unit in (TIMER, JOB, API):
            try:
                self.runtime.stop(unit)
            except Exception:  # noqa: BLE001 -- attempt every writer stop after one failure
                failed = True
        if failed:
            raise RecoveryError(
                "Not all writers could be stopped; no snapshot or migration is admitted"
            )

    def resume_jobs(self, states: dict) -> None:
        if states[TIMER]:
            self.runtime.start(TIMER)
        elif states[JOB]:
            self.runtime.start(JOB)

    def states(self) -> dict:
        return {unit: self.runtime.active(unit) for unit in UNITS}

    def _operation(
        self,
        target: Path,
        targets: dict,
        previous: Path | None,
        snapshot: Path,
        digest: str,
        states: dict,
        receipt: Path,
        *,
        migrate: bool,
        restore_from: tuple | None = None,
    ) -> None:
        switched = False
        try:
            if restore_from is not None:
                restore_snapshot(targets, *restore_from, writers_stopped=True)
            if migrate:
                self.runtime.migrate(target, self.layout)
            self.switch(target)
            switched = True
            self.runtime.start(API)
            self.runtime.health(version(target))
            if migrate:
                for name in ("security", "proxy"):
                    source = target / "deploy" / targets[name].name
                    safe_path(targets[name])
                    shutil.copyfile(source, targets[name])
                    os.chmod(targets[name], 0o644)
            self.runtime.nginx()
            self.resume_jobs(states)
            private_json(
                receipt,
                {
                    "status": "success",
                    "release": str(target),
                    "previous_release": str(previous) if previous else None,
                    "snapshot": snapshot.name,
                    "snapshot_digest": digest,
                    "version": version(target),
                },
            )
            self.layout.maintenance.unlink()
        except BaseException:  # noqa: BLE001 -- interrupted release must attempt recovery
            # An interrupted or failed recovery never reopens writes automatically.
            try:
                self.stop_writers()
                restore_snapshot(targets, snapshot, digest, writers_stopped=True)
                if switched:
                    self.switch(previous)
                self.runtime.nginx()
                if previous is not None and states[API]:
                    self.runtime.start(API)
                    self.runtime.health(version(previous))
                self.resume_jobs(states)
                private_json(
                    receipt,
                    {
                        "status": "recovered-after-failure",
                        "snapshot": snapshot.name,
                        "snapshot_digest": digest,
                        "previous_release": str(previous) if previous else None,
                    },
                )
                if previous is not None:
                    self.layout.maintenance.unlink()
            except BaseException:  # noqa: BLE001 -- failed recovery must retain maintenance
                try:
                    self.stop_writers()
                except BaseException:  # noqa: BLE001, S110 -- retain maintenance; CLI reports failure
                    pass
                raise RecoveryError(
                    "Recovery is incomplete: maintenance retained and writers must remain stopped"
                ) from None
            raise RecoveryError(
                "Release operation failed; coordinated previous state restored"
            ) from None

    def _begin(
        self, release: Path, previous: Path | None, targets: dict, operation_id: str
    ) -> tuple:
        if self.layout.maintenance.exists():
            raise RecoveryError(
                "Existing maintenance flag requires inspection; no automatic retry"
            )
        states = self.states()
        self.layout.maintenance.parent.mkdir(parents=True, exist_ok=True)
        self.layout.maintenance.touch(mode=0o600)
        # Failure here leaves maintenance in place and does not migrate or resume.
        self.stop_writers()
        snapshot = self.layout.backups / ("before-" + operation_id)
        digest = create_snapshot(
            targets,
            snapshot,
            {
                "release": str(previous) if previous else None,
                "version": version(previous) if previous else None,
                "service_states": states,
            },
            writers_stopped=True,
        )
        return snapshot, digest, states, self.layout.backups / (operation_id + ".json")

    def deploy(self, archive: Path) -> str:
        with installation_lock(self.layout.lock):
            previous = self.current()
            identifier = (
                datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
                + "-"
                + uuid.uuid4().hex[:12]
            )
            release = self.layout.releases / identifier
            extract_package(archive, release)
            if not self.layout.env.is_file():
                raise RecoveryError("Installation ENV is missing")
            (release / "api/.env").symlink_to(self.layout.env)
            self.runtime.prepare(release, self.layout)
            targets = self.runtime.storage_targets(self.layout, release)
            snapshot, digest, states, receipt = self._begin(
                release, previous, targets, identifier
            )
            self._operation(
                release,
                targets,
                previous,
                snapshot,
                digest,
                states,
                receipt,
                migrate=True,
            )
            return identifier

    def rollback(self, release_id: str, deployment_id: str) -> str:
        if not RELEASE_ID.fullmatch(release_id) or not RELEASE_ID.fullmatch(
            deployment_id
        ):
            raise RecoveryError("Invalid release or deployment receipt ID")
        with installation_lock(self.layout.lock):
            previous = self.current()
            target = safe_path(self.layout.releases / release_id)
            if (
                previous is None
                or target == previous
                or not (target / "api/.venv/bin/python").is_file()
            ):
                raise RecoveryError(
                    "Rollback release is unavailable or already current"
                )
            original_receipt = safe_path(
                self.layout.backups / (deployment_id + ".json")
            )
            try:
                receipt_data = json.loads(original_receipt.read_text(encoding="utf8"))
            except (OSError, ValueError) as error:
                raise RecoveryError(
                    "Deployment receipt is unavailable or invalid"
                ) from error
            if not isinstance(receipt_data, dict):
                raise RecoveryError("Deployment receipt must be an object")
            if receipt_data.get("status") != "success" or receipt_data.get(
                "previous_release"
            ) != str(target):
                raise RecoveryError(
                    "Rollback must use the matching successful deployment receipt"
                )
            snapshot_name = receipt_data.get("snapshot", "")
            if not isinstance(snapshot_name, str) or not RELEASE_ID.fullmatch(
                snapshot_name
            ):
                raise RecoveryError("Invalid snapshot ID")
            snapshot_digest = receipt_data.get("snapshot_digest")
            if not isinstance(snapshot_digest, str) or not re.fullmatch(
                r"[a-f0-9]{64}", snapshot_digest
            ):
                raise RecoveryError("Invalid snapshot digest")
            restore_from = (
                self.layout.backups / snapshot_name,
                snapshot_digest,
            )
            targets = self.runtime.storage_targets(self.layout, previous)
            manifest = verify_snapshot(targets, *restore_from)
            if manifest["metadata"].get("release") != str(target):
                raise RecoveryError("Snapshot and rollback code do not match")
            identifier = "rollback-" + uuid.uuid4().hex
            snapshot, digest, states, receipt = self._begin(
                target, previous, targets, identifier
            )
            self._operation(
                target,
                targets,
                previous,
                snapshot,
                digest,
                states,
                receipt,
                migrate=False,
                restore_from=restore_from,
            )
            return identifier


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Explicit coordinated release/rollback; never enables booking"
    )
    sub = parser.add_subparsers(dest="action", required=True)
    deploy = sub.add_parser("deploy")
    deploy.add_argument("archive", type=Path)
    rollback = sub.add_parser("rollback")
    rollback.add_argument("release_id")
    rollback.add_argument("deployment_id")
    args = parser.parse_args()
    if sys.platform != "linux" or os.geteuid() != 0:
        parser.error(
            "Release operations require an explicitly authorized root session on Linux"
        )

    def interrupted(_number, _frame):
        raise RecoveryError("Release operation interrupted")

    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        manager = ReleaseManager(Layout(), Runtime())
        result = (
            manager.deploy(args.archive)
            if args.action == "deploy"
            else manager.rollback(args.release_id, args.deployment_id)
        )
        print("Release operation completed; private receipt ID: " + result)
        return 0
    except Exception:  # noqa: BLE001 -- never expose command stderr or secret payloads
        # Fixed message: no command stderr, ENV, filenames or medical contents.
        print(
            "Release operation failed. Inspect maintenance and private recovery receipts; do not resume writers blindly.",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
