"""Private coordinated snapshots. Call only after every writer has stopped.

No patient names, file lists, ENV values or database contents are logged. The
trusted receipt's manifest digest is required before restoring anything.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import sqlite3
import stat
import tempfile
import time
from contextlib import closing
from pathlib import Path


class RecoveryError(RuntimeError):
    pass


def safe_path(path: Path) -> Path:
    path = Path(path).absolute()
    if ".." in path.parts or any(p.is_symlink() for p in (path, *path.parents)):
        raise RecoveryError(
            "Symlinks and parent traversal are not allowed in state paths"
        )
    return path


def digest_file(path: Path) -> str:
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    return digest


def private_json(path: Path, value: dict) -> None:
    safe_path(path)
    temporary = path.with_name(path.name + ".next")
    safe_path(temporary)
    with temporary.open("w", encoding="utf8") as stream:
        os.chmod(temporary, 0o600)
        json.dump(value, stream, ensure_ascii=False, sort_keys=True, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)


def entries(path: Path) -> list[Path]:
    safe_path(path)
    if not path.exists():
        return []
    items = [path]
    if path.is_dir():
        for directory, directories, files in os.walk(path, followlinks=False):
            items.extend(Path(directory) / name for name in sorted(directories + files))
    for item in items:
        safe_path(item)
        if not (stat.S_ISDIR(item.stat().st_mode) or stat.S_ISREG(item.stat().st_mode)):
            raise RecoveryError("State contains an unsupported file type")
    return items


def inventory(path: Path) -> dict:
    result = {}
    for item in entries(path):
        relative = "." if item == path else item.relative_to(path).as_posix()
        info = item.stat()
        result[relative] = {
            "directory": item.is_dir(),
            "mode": stat.S_IMODE(info.st_mode),
            "uid": getattr(info, "st_uid", 0),
            "gid": getattr(info, "st_gid", 0),
        }
        if item.is_file():
            result[relative].update(size=info.st_size, sha256=digest_file(item))
    return result


def clone_private(source: Path, destination: Path) -> None:
    entries(source)
    safe_path(destination)
    if source.is_dir():
        shutil.copytree(source, destination, symlinks=False)
    else:
        shutil.copyfile(source, destination, follow_symlinks=False)
    for item in entries(destination):
        os.chmod(item, 0o700 if item.is_dir() else 0o600)


def check_database(path: Path) -> None:
    with closing(
        sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=3)
    ) as db:
        if db.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
            raise RecoveryError("Database integrity check failed")
        if db.execute("PRAGMA foreign_key_check").fetchall():
            raise RecoveryError("Database foreign-key check failed")


def _validate_targets(targets: dict[str, Path], destination: Path) -> dict[str, Path]:
    result = {name: safe_path(path) for name, path in targets.items()}
    if "database" not in result or any(
        not name.replace("_", "").isalnum() for name in result
    ):
        raise RecoveryError("Invalid snapshot resource labels")
    paths = [*result.values(), safe_path(destination)]
    for i, path in enumerate(paths):
        for other in paths[i + 1 :]:
            if path.is_relative_to(other) or other.is_relative_to(path):
                raise RecoveryError("Snapshot resources and backup must be disjoint")
    if result["database"].exists() and not result["database"].is_file():
        raise RecoveryError("Database path is not a regular file")
    return result


def create_snapshot(
    targets: dict[str, Path],
    destination: Path,
    metadata: dict,
    *,
    writers_stopped: bool,
) -> str:
    if not writers_stopped:
        raise RecoveryError("Writers must be stopped before a coordinated snapshot")
    targets = _validate_targets(targets, destination)
    destination = safe_path(destination)
    if destination.exists():
        raise RecoveryError("An existing snapshot cannot be overwritten")
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(destination.parent, 0o700)
    stage = Path(
        tempfile.mkdtemp(prefix=".snapshot-incomplete-", dir=destination.parent)
    )
    os.chmod(stage, 0o700)
    manifest = {"format": 1, "metadata": metadata, "resources": {}}
    for name, source in targets.items():
        original = inventory(source)
        manifest["resources"][name] = {"target": str(source), "original": original}
        if not original:
            continue
        output = stage / name
        if name == "database":
            with (
                closing(
                    sqlite3.connect(source.as_uri() + "?mode=ro", uri=True, timeout=3)
                ) as db,
                closing(sqlite3.connect(output)) as backup,
            ):
                deadline = time.monotonic() + 30

                def progress(_status, _remaining, _total, deadline=deadline):
                    if time.monotonic() > deadline:
                        raise RecoveryError(
                            "SQLite snapshot exceeded its bounded deadline"
                        )

                db.backup(backup, pages=128, progress=progress)
                # A standalone rollback-journal image never depends on a copied WAL.
                backup.execute("PRAGMA journal_mode=DELETE")
            os.chmod(output, 0o600)
            check_database(output)
        else:
            clone_private(source, output)
        manifest["resources"][name]["copied"] = inventory(output)
    private_json(stage / "manifest.json", manifest)
    digest = digest_file(stage / "manifest.json")
    verify_snapshot(targets, stage, digest)
    os.replace(stage, destination)
    return digest


def verify_snapshot(
    targets: dict[str, Path], snapshot: Path, expected_digest: str
) -> dict:
    targets = _validate_targets(targets, snapshot)
    snapshot = safe_path(snapshot)
    entries(snapshot)
    if (
        len(expected_digest) != 64
        or digest_file(snapshot / "manifest.json") != expected_digest
    ):
        raise RecoveryError(
            "Snapshot manifest digest does not match the trusted receipt"
        )
    manifest = json.loads((snapshot / "manifest.json").read_text(encoding="utf8"))
    if manifest.get("format") != 1 or set(manifest["resources"]) != set(targets):
        raise RecoveryError("Snapshot resources do not match this installation")
    if {p.name for p in snapshot.iterdir()} != {"manifest.json"} | {
        name for name, resource in manifest["resources"].items() if resource["original"]
    }:
        raise RecoveryError("Snapshot contains missing or unexpected resources")
    for name, target in targets.items():
        resource = manifest["resources"][name]
        if resource["target"] != str(target):
            raise RecoveryError("Snapshot target paths do not match this installation")
        current = inventory(snapshot / name)
        expected = resource.get("copied", {})
        # Ownership/mode at rest may differ on an off-site copy; contents must be exact.
        contents = lambda value: {
            k: {p: v for p, v in entry.items() if p not in {"mode", "uid", "gid"}}
            for k, entry in value.items()
        }
        if contents(current) != contents(expected):
            raise RecoveryError("Snapshot content verification failed")
        if name == "database" and current:
            check_database(snapshot / name)
    return manifest


def _apply_original_metadata(path: Path, original: dict) -> None:
    for relative, info in original.items():
        target = path if relative == "." else path / relative
        safe_path(target)
        if hasattr(os, "chown"):
            os.chown(target, info["uid"], info["gid"], follow_symlinks=False)
        os.chmod(target, info["mode"])


def restore_snapshot(
    targets: dict[str, Path],
    snapshot: Path,
    expected_digest: str,
    *,
    writers_stopped: bool,
) -> Path:
    if not writers_stopped:
        raise RecoveryError("Writers must be stopped before restore")
    manifest = verify_snapshot(targets, snapshot, expected_digest)
    targets = _validate_targets(targets, snapshot)
    # Keep replaced files and stale sidecars for inspection; never delete them silently.
    quarantine = Path(
        tempfile.mkdtemp(prefix=".restore-previous-", dir=snapshot.parent)
    )
    os.chmod(quarantine, 0o700)
    operations = []
    for name, target in targets.items():
        target.parent.mkdir(parents=True, exist_ok=True)
        stage = Path(tempfile.mkdtemp(prefix=".restore-stage-", dir=target.parent))
        os.chmod(stage, 0o700)
        replacement = None
        if manifest["resources"][name]["original"]:
            replacement = stage / "resource"
            clone_private(snapshot / name, replacement)
            _apply_original_metadata(
                replacement, manifest["resources"][name]["original"]
            )
        # If backups are on a different filesystem, previous-state quarantine belongs
        # beside the resource, so every move/replace remains on the same filesystem.
        old = stage / "previous"
        operations.append({"target": target, "old": old, "new": replacement})
        if name == "database":
            for suffix in ("-wal", "-shm", "-journal"):
                sidecar = safe_path(Path(str(target) + suffix))
                operations.append(
                    {"target": sidecar, "old": stage / suffix[1:], "new": None}
                )
    journal = {
        "status": "prepared",
        "operations": [
            {k: str(v) if v is not None else None for k, v in operation.items()}
            for operation in operations
        ],
    }
    private_json(quarantine / "restore-journal.json", journal)
    moved, applied = [], []
    try:
        for operation in operations:
            target, old, new = (operation[k] for k in ("target", "old", "new"))
            entries(target)
            if target.exists():
                os.replace(target, old)
                moved.append(operation)
            if new is not None:
                os.replace(new, target)
                applied.append(operation)
        journal["status"] = "restored"
        private_json(quarantine / "restore-journal.json", journal)
    except Exception:  # noqa: BLE001 -- revert partial filesystem changes on any ordinary failure
        # With maintenance and services stopped, restore the pre-restore state on
        # any ordinary exception. A killed process keeps its private journal.
        for operation in reversed(applied):
            os.replace(operation["target"], operation["new"])
        for operation in reversed(moved):
            os.replace(operation["old"], operation["target"])
        journal["status"] = "rolled-back-after-error"
        private_json(quarantine / "restore-journal.json", journal)
        raise RecoveryError("Restore failed; previous state retained") from None
    return quarantine
