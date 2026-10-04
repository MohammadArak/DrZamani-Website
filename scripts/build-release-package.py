#!/usr/bin/env python3
"""Build the release ZIP that deploy/deploy-release.sh installs, plus a manifest that proves what is inside.

Run from the repository root after `npm run build` on a clean checkout:
    python scripts/build-release-package.py --output .work/drzamani-release.zip

The archive holds tracked files under api/ and deploy/, VERSION and the built public_html. It never
contains api/.env, databases, uploads or node_modules. The manifest (<archive>.manifest.json) records the
version, source commit, tree and per-file hashes so the package on the server can be compared with CI.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = (".env", ".db", ".sqlite", ".sqlite3", "__pycache__", ".venv", "node_modules")


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-c", f"safe.directory={ROOT}", *args], cwd=ROOT).decode().strip()


def tracked_files() -> list[str]:
    names = git("ls-files", "-z").split("\0")
    return [name for name in names if name and (name == "VERSION" or name.startswith(("api/", "deploy/")))]


def check_clean() -> None:
    if git("status", "--porcelain", "--untracked-files=no"):
        sys.exit("The working tree has uncommitted changes; commit them so the package matches a commit.")


def forbidden(name: str) -> bool:
    return any(part in name for part in FORBIDDEN) and not name.endswith(".example")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--allow-dirty", action="store_true", help="for local experiments only")
    args = parser.parse_args()
    if not args.allow_dirty:
        check_clean()
    public = ROOT / "public_html"
    if not (public / "index.html").is_file():
        sys.exit("public_html/index.html is missing; run `npm run build` first.")
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    files: dict[str, str] = {}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in tracked_files():
            if forbidden(name):
                continue
            data = (ROOT / name).read_bytes()
            archive.writestr(name, data)
            files[name] = hashlib.sha256(data).hexdigest()
        for file in sorted(public.rglob("*")):
            if file.is_file():
                relative = file.relative_to(ROOT).as_posix()
                archive.write(file, relative)
                files[relative] = hashlib.sha256(file.read_bytes()).hexdigest()
    manifest = {
        "version": version,
        "sourceCommit": git("rev-parse", "HEAD"),
        "sourceTree": git("rev-parse", "HEAD^{tree}"),
        "dirty": bool(args.allow_dirty),
        "archiveSha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
        "fileCount": len(files),
        "files": files,
    }
    manifest_path = args.output.with_suffix(".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{args.output} ({len(files)} files, sha256 {manifest['archiveSha256'][:16]}…) and {manifest_path.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
