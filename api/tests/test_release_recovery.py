"""Real disposable DB/media operations; infrastructure commands are simulated.

Linux coordinator tests exercise actual symlink switches/locks with a fake
service adapter. They do not claim production systemd/provider acceptance.
"""

import json
import os
import sqlite3
import sys
import time
import zipfile
from contextlib import closing
from pathlib import Path

import pytest

DEPLOY = Path(__file__).resolve().parents[2] / "deploy"
sys.path.insert(0, str(DEPLOY))
import release_manager as release
import state_snapshot as snapshot

sys.path.pop(0)

LINUX = pytest.mark.skipif(
    sys.platform != "linux",
    reason="Unix symlink/service coordinator; portable snapshot tests run on Windows",
)


def database(path, values=("old",)):
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path)) as db:
        db.execute("CREATE TABLE IF NOT EXISTS records (value TEXT)")
        db.execute("DELETE FROM records")
        db.executemany("INSERT INTO records VALUES (?)", [(v,) for v in values])
        db.commit()


def rows(path):
    with closing(sqlite3.connect(path)) as db:
        return db.execute("SELECT value FROM records ORDER BY rowid").fetchall()


@pytest.fixture
def resources(tmp_path):
    root = tmp_path / "state with spaces"
    root.mkdir()
    targets = {
        "database": root / "records.db",
        "public_media": root / "public",
        "private_uploads": root / "private",
        "env": root / "environment",
    }
    database(targets["database"])
    for name in ("public_media", "private_uploads"):
        targets[name].mkdir()
        (targets[name] / "synthetic.bin").write_bytes(name.encode())
    targets["env"].write_text("SYNTHETIC_SETTING=old\n", encoding="utf8")
    return targets, tmp_path / "backups/synthetic"


def content(targets):
    return {
        name: (
            rows(path)
            if name == "database" and path.exists()
            else {
                p.relative_to(path).as_posix(): p.read_bytes()
                for p in path.rglob("*")
                if p.is_file()
            }
            if path.is_dir()
            else path.read_bytes()
            if path.exists()
            else None
        )
        for name, path in targets.items()
    }


def test_wal_rows_media_environment_and_stale_sidecars_restore_together(resources):
    targets, backup = resources
    with closing(sqlite3.connect(targets["database"])) as live:
        live.execute("PRAGMA journal_mode=WAL")
        live.execute("INSERT INTO records VALUES ('in-wal')")
        live.commit()
        digest = snapshot.create_snapshot(
            targets, backup, {"fixture": True}, writers_stopped=True
        )
        assert rows(backup / "database") == [("old",), ("in-wal",)]
    before = content(targets)
    database(targets["database"], ("new",))
    for name in ("public_media", "private_uploads"):
        (targets[name] / "synthetic.bin").write_bytes(b"modified")
        (targets[name] / "new.bin").write_bytes(b"new")
    targets["env"].write_text("SYNTHETIC_SETTING=new\n", encoding="utf8")
    for suffix in ("-wal", "-shm", "-journal"):
        Path(str(targets["database"]) + suffix).write_bytes(b"stale fixture sidecar")
    journal = snapshot.restore_snapshot(targets, backup, digest, writers_stopped=True)
    assert content(targets) == before
    assert all(
        not Path(str(targets["database"]) + suffix).exists()
        for suffix in ("-wal", "-shm", "-journal")
    )
    assert (
        json.loads((journal / "restore-journal.json").read_text(encoding="utf8"))[
            "status"
        ]
        == "restored"
    )
    # Pre-restore state is preserved in resource-local quarantine rather than deleted.
    assert list(targets["database"].parent.glob(".restore-stage-*/previous"))
    if sys.platform == "linux":
        assert backup.stat().st_mode & 0o777 == 0o700
        assert (backup / "env").stat().st_mode & 0o777 == 0o600


@pytest.mark.parametrize("change", ["media", "manifest", "extra", "missing"])
def test_bad_snapshot_is_rejected_before_any_live_resource_changes(resources, change):
    targets, backup = resources
    digest = snapshot.create_snapshot(targets, backup, {}, writers_stopped=True)
    if change == "media":
        (backup / "public_media/synthetic.bin").write_bytes(b"corrupt")
    elif change == "manifest":
        (backup / "manifest.json").write_text("{}", encoding="utf8")
    elif change == "extra":
        (backup / "unexpected").write_bytes(b"unexpected")
    else:
        (backup / "env").unlink()
    before = content(targets)
    with pytest.raises((snapshot.RecoveryError, FileNotFoundError)):
        snapshot.restore_snapshot(targets, backup, digest, writers_stopped=True)
    assert content(targets) == before
    assert not list(backup.parent.glob(".restore-previous-*"))


def test_initial_install_restore_preserves_new_files_in_quarantine(tmp_path):
    root = tmp_path / "state"
    root.mkdir()
    targets = {"database": root / "new.db", "public_media": root / "public"}
    backup = tmp_path / "backups/initial"
    digest = snapshot.create_snapshot(targets, backup, {}, writers_stopped=True)
    database(targets["database"], ("new",))
    targets["public_media"].mkdir()
    (targets["public_media"] / "new.bin").write_bytes(b"synthetic")
    snapshot.restore_snapshot(targets, backup, digest, writers_stopped=True)
    assert not targets["database"].exists() and not targets["public_media"].exists()
    assert list(root.glob(".restore-stage-*/previous"))


def test_snapshot_and_restore_require_writer_stop_acknowledgement(resources):
    targets, backup = resources
    with pytest.raises(snapshot.RecoveryError):
        snapshot.create_snapshot(targets, backup, {}, writers_stopped=False)
    assert not backup.exists()
    digest = snapshot.create_snapshot(targets, backup, {}, writers_stopped=True)
    with pytest.raises(snapshot.RecoveryError):
        snapshot.restore_snapshot(targets, backup, digest, writers_stopped=False)


def test_overlapping_resources_or_backup_are_refused(resources):
    targets, backup = resources
    targets["public_media"] = targets["private_uploads"] / "nested"
    with pytest.raises(snapshot.RecoveryError):
        snapshot.create_snapshot(targets, backup, {}, writers_stopped=True)


@LINUX
def test_symlink_in_media_or_backup_parent_is_refused(resources, tmp_path):
    targets, backup = resources
    outside = tmp_path / "outside"
    outside.write_bytes(b"must not copy")
    link = targets["public_media"] / "link"
    link.symlink_to(outside)
    with pytest.raises(snapshot.RecoveryError):
        snapshot.create_snapshot(targets, backup, {}, writers_stopped=True)
    assert not backup.exists()
    link.unlink()
    alias = tmp_path / "alias"
    alias.symlink_to(targets["public_media"], target_is_directory=True)
    with pytest.raises(snapshot.RecoveryError):
        snapshot.create_snapshot(targets, alias / "snapshot", {}, writers_stopped=True)


def test_restore_rename_failure_rolls_back_already_replaced_resources(
    resources, monkeypatch
):
    targets, backup = resources
    digest = snapshot.create_snapshot(targets, backup, {}, writers_stopped=True)
    database(targets["database"], ("pre-restore",))
    (targets["public_media"] / "synthetic.bin").write_bytes(b"pre-restore")
    before = content(targets)
    original = os.replace
    failed = False

    def replace(source, destination):
        nonlocal failed
        if (
            not failed
            and Path(destination) == targets["public_media"]
            and Path(source).name == "resource"
        ):
            failed = True
            raise OSError("synthetic rename failure")
        return original(source, destination)

    monkeypatch.setattr(snapshot.os, "replace", replace)
    with pytest.raises(snapshot.RecoveryError):
        snapshot.restore_snapshot(targets, backup, digest, writers_stopped=True)
    assert failed and content(targets) == before


def test_invalid_foreign_keys_do_not_produce_a_completed_snapshot(resources):
    targets, backup = resources
    with closing(sqlite3.connect(targets["database"])) as db:
        db.execute("CREATE TABLE parent(id INTEGER PRIMARY KEY)")
        db.execute("CREATE TABLE child(parent_id REFERENCES parent(id))")
        db.execute("INSERT INTO child VALUES (999)")
        db.commit()
    with pytest.raises(snapshot.RecoveryError):
        snapshot.create_snapshot(targets, backup, {}, writers_stopped=True)
    assert not backup.exists()


def built_package(path, additions=None):
    files = {
        "VERSION": "1.16.0",
        "api/pyproject.toml": "[project]\nname='fixture'\n",
        "api/uv.lock": "version=1",
        "api/alembic.ini": "[alembic]",
        "public_html/index.html": "<p>synthetic built fixture</p>",
        "deploy/drzamani-security-headers.conf": "new-security",
        "deploy/drzamani-proxy-headers.conf": "new-proxy",
    }
    files.update(additions or {})
    with zipfile.ZipFile(path, "w") as z:
        for name, value in files.items():
            # Preserve malformed raw names even when the Windows ZipInfo
            # constructor would otherwise normalize backslashes for the fixture.
            info = zipfile.ZipInfo(name)
            info.filename = name
            info.orig_filename = name
            z.writestr(info, value)
    return path


@pytest.mark.parametrize(
    "bad", ["../outside", "/outside", "api\\outside", "C:/outside", "api/.env"]
)
def test_unsafe_or_secret_bearing_release_archive_is_refused(tmp_path, bad):
    archive = built_package(tmp_path / "package.zip", {bad: "synthetic"})
    with pytest.raises(snapshot.RecoveryError):
        release.extract_package(archive, tmp_path / "release")
    assert not (tmp_path / "release").exists()


def test_source_only_package_is_not_a_deployable_build(tmp_path):
    archive = tmp_path / "source.zip"
    with zipfile.ZipFile(archive, "w") as z:
        z.writestr("VERSION", "1.16.0")
    with pytest.raises(snapshot.RecoveryError):
        release.extract_package(archive, tmp_path / "release")


class FakeRuntime(release.Runtime):
    def storage_targets(self, layout, target):
        return release.read_targets(layout, target / "api/.venv/bin/python")

    def __init__(self, layout, *, timer=True, job=True, fail=None):
        self.layout = layout
        self.units = {release.API: True, release.TIMER: timer, release.JOB: job}
        self.events = []
        self.fail = fail
        self.failed = False

    def active(self, unit):
        return self.units[unit]

    def stop(self, unit):
        self.events.append(("stop", unit))
        if self.fail == "stop-job" and unit == release.JOB:
            raise snapshot.RecoveryError("synthetic stop failure")
        self.units[unit] = False

    def start(self, unit):
        self.events.append(("start", unit))
        self.units[unit] = True
        if self.fail == "resume-once" and unit == release.TIMER and not self.failed:
            self.failed = True
            raise snapshot.RecoveryError("synthetic timer failure")

    def prepare(self, target, layout):
        self.events.append(("prepare", str(target)))
        if self.fail == "prepare":
            raise snapshot.RecoveryError("synthetic dependency failure")
        python = target / "api/.venv/bin/python"
        python.parent.mkdir(parents=True)
        python.write_text(
            '#!/usr/bin/env bash\nexec "' + sys.executable + '" "$@"\n', encoding="utf8"
        )
        python.chmod(0o700)

    def migrate(self, target, layout):
        assert not any(self.units.values()), (
            "migration started while a fixture writer was active"
        )
        self.events.append(("migrate", str(target)))
        database(layout.data / "records.db", ("new",))
        (layout.data / "public/new.bin").write_bytes(b"new public fixture")
        (layout.data / "private/new.bin").write_bytes(b"new private fixture")
        if self.fail == "migration":
            raise snapshot.RecoveryError("synthetic migration failure")

    def health(self, expected):
        self.events.append(("health", expected))
        if self.fail == "health" and expected == "1.16.0":
            raise snapshot.RecoveryError("synthetic health failure")
        if self.fail == "all-health":
            raise snapshot.RecoveryError("synthetic health failure")
        if self.fail == "old-health-once" and expected == "1.15.0" and not self.failed:
            self.failed = True
            raise snapshot.RecoveryError("synthetic rollback health failure")

    def nginx(self):
        self.events.append(("nginx",))
        if self.fail == "nginx-once" and not self.failed:
            self.failed = True
            raise snapshot.RecoveryError("synthetic nginx failure")


@pytest.fixture
def installation(tmp_path):
    layout = release.Layout(tmp_path / "isolated installation with spaces")
    for path in (layout.releases, layout.data, layout.env.parent, layout.snippets):
        path.mkdir(parents=True, exist_ok=True)
    old = layout.releases / "old-release"
    (old / "api/.venv/bin").mkdir(parents=True)
    (old / "VERSION").write_text("1.15.0", encoding="utf8")
    # Only existence is needed for selecting the old immutable rollback release.
    (old / "api/.venv/bin/python").write_text("fixture", encoding="utf8")
    layout.current.symlink_to(old, target_is_directory=True)
    database(layout.data / "records.db")
    for name in ("public", "private"):
        (layout.data / name).mkdir()
        (layout.data / name / "old.bin").write_bytes(b"old fixture")
    layout.env.write_text(
        f'DATABASE_URL="sqlite:///{layout.data / "records.db"}"\nUPLOAD_DIR="{layout.data / "private"}"\nPUBLIC_MEDIA_DIR="{layout.data / "public"}"\nSMS_PROVIDER=disabled\nBOOKING_ENABLED=false\n',
        encoding="utf8",
    )
    for name in ("security", "proxy"):
        (layout.snippets / f"drzamani-{name}-headers.conf").write_text(
            "old-" + name, encoding="utf8"
        )
    targets = {
        "database": layout.data / "records.db",
        "public_media": layout.data / "public",
        "private_uploads": layout.data / "private",
        "env": layout.env,
        "security": layout.snippets / "drzamani-security-headers.conf",
        "proxy": layout.snippets / "drzamani-proxy-headers.conf",
    }
    return layout, targets, built_package(tmp_path / "built fixture.zip")


@LINUX
@pytest.mark.parametrize("timer", [True, False])
def test_success_stops_running_job_and_preserves_timer_policy(installation, timer):
    layout, targets, package = installation
    runtime = FakeRuntime(layout, timer=timer, job=timer)
    manager = release.ReleaseManager(layout, runtime)
    identifier = manager.deploy(package)
    assert layout.current.resolve().name == identifier
    assert not layout.maintenance.exists() and runtime.units[release.TIMER] == timer
    assert runtime.events.index(("stop", release.JOB)) < next(
        i for i, e in enumerate(runtime.events) if e[0] == "migrate"
    )
    receipt = json.loads(
        (layout.backups / (identifier + ".json")).read_text(encoding="utf8")
    )
    assert receipt["status"] == "success" and receipt["previous_release"].endswith(
        "old-release"
    )
    assert rows(targets["database"]) == [("new",)]


@LINUX
@pytest.mark.parametrize(
    "failure", ["migration", "health", "nginx-once", "resume-once"]
)
def test_deploy_failure_restores_code_db_media_and_snippets_together(
    installation, failure
):
    layout, targets, package = installation
    before = content(targets)
    runtime = FakeRuntime(layout, fail=failure)
    with pytest.raises(snapshot.RecoveryError):
        release.ReleaseManager(layout, runtime).deploy(package)
    assert layout.current.resolve().name == "old-release"
    assert content(targets) == before and not layout.maintenance.exists()
    assert runtime.units[release.API] and runtime.units[release.TIMER]


@LINUX
def test_failed_writer_stop_does_not_snapshot_migrate_or_reopen(installation):
    layout, targets, package = installation
    before = content(targets)
    runtime = FakeRuntime(layout, fail="stop-job")
    with pytest.raises(snapshot.RecoveryError):
        release.ReleaseManager(layout, runtime).deploy(package)
    assert layout.maintenance.exists() and content(targets) == before
    assert not any(e[0] in {"migrate", "start"} for e in runtime.events)
    assert (
        "stop",
        release.API,
    ) in runtime.events  # Other writers are still stopped after one failure.


@LINUX
def test_failed_recovery_health_retains_maintenance_and_stops_services(installation):
    layout, targets, package = installation
    runtime = FakeRuntime(layout, fail="all-health")
    with pytest.raises(snapshot.RecoveryError):
        release.ReleaseManager(layout, runtime).deploy(package)
    assert layout.maintenance.exists() and not any(runtime.units.values())
    assert layout.current.resolve().name == "old-release" and rows(
        targets["database"]
    ) == [("old",)]


@LINUX
def test_explicit_rollback_uses_matching_coordinated_snapshot(installation):
    layout, targets, package = installation
    before = content(targets)
    runtime = FakeRuntime(layout)
    manager = release.ReleaseManager(layout, runtime)
    identifier = manager.deploy(package)
    database(targets["database"], ("later fixture edit",))
    (targets["public_media"] / "later.bin").write_bytes(b"later fixture")
    manager.rollback("old-release", identifier)
    assert layout.current.resolve().name == "old-release" and content(targets) == before
    assert not layout.maintenance.exists()


@LINUX
def test_failed_rollback_recovers_full_pre_rollback_state(installation):
    layout, targets, package = installation
    runtime = FakeRuntime(layout)
    manager = release.ReleaseManager(layout, runtime)
    identifier = manager.deploy(package)
    before = content(targets)
    runtime.fail = "old-health-once"
    with pytest.raises(snapshot.RecoveryError):
        manager.rollback("old-release", identifier)
    assert layout.current.resolve().name == identifier and content(targets) == before
    assert not layout.maintenance.exists()


@LINUX
def test_wrong_receipt_and_existing_maintenance_refuse_without_touching_state(
    installation,
):
    layout, targets, package = installation
    runtime = FakeRuntime(layout)
    manager = release.ReleaseManager(layout, runtime)
    manager.deploy(package)
    before = content(targets)
    runtime.events.clear()
    with pytest.raises(snapshot.RecoveryError):
        manager.rollback("old-release", "unknown-receipt")
    assert content(targets) == before and not runtime.events
    for payload in (
        "not json",
        "[]",
        '{"status":"success","previous_release":"wrong"}',
    ):
        (layout.backups / "bad-receipt.json").write_text(payload, encoding="utf8")
        with pytest.raises(snapshot.RecoveryError):
            manager.rollback("old-release", "bad-receipt")
        assert content(targets) == before and not runtime.events
    layout.maintenance.touch()
    with pytest.raises(snapshot.RecoveryError):
        manager.deploy(package)
    assert content(targets) == before and not any(
        e[0] in {"stop", "migrate", "start"} for e in runtime.events
    )


@LINUX
def test_deploy_and_rollback_share_nonblocking_installation_lock(tmp_path):
    path = tmp_path / "lock"
    with release.installation_lock(path), pytest.raises(snapshot.RecoveryError):  # noqa: SIM117 -- inner acquisition must be inside raises
        with release.installation_lock(path):
            pytest.fail("second lock acquired")
    with release.installation_lock(path):
        pass


@LINUX
def test_command_timeout_stops_child_writers_before_recovery(tmp_path):
    marker = tmp_path / "late-writer-marker"
    ready = tmp_path / "writer-started"
    child = "import time,pathlib,sys;pathlib.Path(sys.argv[2]).touch();time.sleep(2);pathlib.Path(sys.argv[1]).write_text('unexpected write')"
    parent = "import subprocess,sys;subprocess.run([sys.executable,'-c',sys.argv[1],sys.argv[2],sys.argv[3]])"
    with pytest.raises(release.subprocess.TimeoutExpired):
        release.Runtime().run(
            [sys.executable, "-c", parent, child, str(marker), str(ready)], timeout=1
        )
    assert ready.exists(), (
        "fixture child never started; timeout test would be inconclusive"
    )
    time.sleep(2.1)
    assert not marker.exists(), (
        "timed-out child continued writing after its parent was stopped"
    )


def test_production_storage_reader_drops_root_before_release_python(
    tmp_path, monkeypatch
):
    layout = release.Layout(tmp_path)
    commands = []
    values = {
        "DATABASE_URL": "sqlite:///" + str(layout.data / "records.db"),
        "UPLOAD_DIR": str(layout.data / "private"),
        "PUBLIC_MEDIA_DIR": str(layout.data / "public"),
    }

    def run(args, **kwargs):
        commands.append(args)
        assert kwargs["capture_output"] and kwargs["timeout"] == 60
        return release.subprocess.CompletedProcess(args, 0, json.dumps(values))

    monkeypatch.setattr(release.subprocess, "run", run)
    target = layout.releases / "fixture"
    paths = release.Runtime().storage_targets(layout, target)
    assert commands[0][:5] == [
        "runuser",
        "-u",
        "www-data",
        "--",
        str(target / "api/.venv/bin/python"),
    ]
    assert paths["database"] == layout.data / "records.db"
