#!/usr/bin/env python3
"""Package canonical tracked source and a documented gallery preview for another AI.

This is a source handoff, not a deployment artifact or a production backup.
Run on a clean commit; requires Git on PATH. Optional receipt/evidence must be
sanitized JSON files. No working directory recursion or Git history is shipped.
"""
import argparse
import hashlib
import io
import json
import subprocess
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN_PARTS = {".git", ".work", ".venv", "node_modules", "__pycache__", "public_html", "uploads", "public-media"}
GALLERY_FILES = {
    "index.html", "gallery.css", "gallery.js", "README.md", "DESIGN_NOTES.md",
    "AI_HANDOFF.md", "DELIVERY.json", "asset-checks.json", "browser-checks.json",
    "gallery-desktop.jpg", "gallery-mobile.jpg", "viewer-desktop.jpg", "viewer-mobile.jpg",
}


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", "-c", f"safe.directory={ROOT}", *args], cwd=ROOT)


def safe_path(name: str) -> None:
    p = PurePosixPath(name)
    if p.is_absolute() or ".." in p.parts or "\\" in name or ":" in name:
        raise ValueError(f"Unsafe archive path: {name}")
    if any(part in FORBIDDEN_PARTS for part in p.parts):
        raise ValueError(f"Runtime/private directory in source: {name}")
    if p.name.startswith(".env") and p.name != ".env.example":
        raise ValueError(f"Real environment file in source: {name}")
    if p.suffix.lower() in {".db", ".sqlite", ".sqlite3", ".log", ".pem", ".key"}:
        raise ValueError(f"Runtime/private file in source: {name}")
    if p.name == "clinic-settings.json" or p.name.endswith((".db-wal", ".db-shm")):
        raise ValueError(f"Local state in source: {name}")


def canonical_source() -> tuple[dict[str, bytes], str, str]:
    if git("status", "--porcelain").strip():
        raise ValueError("Commit or preserve pending changes first; source must be clean.")
    commit = git("rev-parse", "HEAD").decode().strip()
    tree = git("rev-parse", "HEAD^{tree}").decode().strip()
    expected = {}
    for record in git("ls-tree", "-rz", "--full-tree", "HEAD").split(b"\0"):
        if not record:
            continue
        meta, name = record.split(b"\t", 1)
        mode, kind, oid = meta.decode().split()
        if kind != "blob" or mode not in {"100644", "100755"}:
            raise ValueError("Submodules/symlinks require an explicit packaging policy.")
        expected[name.decode()] = oid
    with zipfile.ZipFile(io.BytesIO(git("-c", "core.autocrlf=false", "archive", "--format=zip", "HEAD"))) as z:
        files = {i.filename: z.read(i) for i in z.infolist() if not i.is_dir()}
    if files.keys() != expected.keys():
        raise ValueError("Archive does not match the complete Git tree.")
    for name, data in files.items():
        safe_path(name)
        oid = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        if oid != expected[name]:
            raise ValueError(f"Source bytes differ from Git: {name}")
    return files, commit, tree


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, help="Sanitized final PR/CI receipt")
    parser.add_argument("--evidence", type=Path, action="append", default=[], help="Sanitized historical JSON receipt")
    parser.add_argument("--gallery", action="store_true", help="Include the existing outputs/gallery-preview allowlist")
    args = parser.parse_args()
    source, commit, tree = canonical_source()
    payload = {f"project/{name}": data for name, data in source.items()}
    version = source["VERSION"].decode().strip()
    receipt = json.loads(args.receipt.read_text(encoding="utf-8-sig")) if args.receipt else {}
    if receipt.get("sourceCommit", commit) != commit:
        raise ValueError("Receipt sourceCommit does not match HEAD.")
    status = {"version": version, "sourceCommit": commit, "sourceTree": tree,
              "repository": "https://github.com/MohammadArak/DrZamani-Website",
              "trackedFileCount": len(source), "gitHistoryIncluded": False,
              "runtimeDataIncluded": False, "deploymentArtifact": False, "receipt": receipt}
    payload["PROJECT_STATUS.json"] = (json.dumps(status, ensure_ascii=False, indent=2) + "\n").encode()
    payload["AI_HANDOFF.md"] = source["docs/AI_TRANSFER_2026-10-05.md"]
    payload["PROMPT_FOR_NEXT_AI.md"] = source["docs/PROMPT_FOR_NEXT_AI.md"]
    payload["START_HERE.md"] = (
        "# بسته کامل ادامه پروژه دکتر زمانی\n\n"
        f"نسخه {version}؛ کامیت دقیق `{commit}`؛ tree `{tree}`.\n\n"
        "ابتدا AI_HANDOFF.md و PROJECT_STATUS.json را بخوانید. سورس کامل در project/ است؛ "
        "راهنمای اجرا در project/README.md و project/docs/AI_TRANSFER_2026-10-05.md آمده است. "
        "متن PROMPT_FOR_NEXT_AI.md را به AI بعدی بدهید.\n\n"
        "پیش‌نمایش مستقل گالری در previews/gallery/ (اگر همراه شده باشد) است. طرح‌های قدیمی "
        "مطالعه و motion تأیید نشده‌اند. شواهد تاریخی فقط برای SHA گزارش‌شده معتبرند.\n\n"
        "این بسته همه فایل‌های tracked را دارد، ولی تاریخچه Git، وابستگی نصب‌شده، ENV واقعی، "
        "دیتابیس، محتوای ویرایش‌شده در DB، رسانه خصوصی و build را ندارد. برای تاریخچه، مخزن "
        "مرجع را clone و کامیت دقیق را checkout کنید. برای اجرای محلی وابستگی‌ها را از lockfile نصب کنید. "
        "بسته deploy یا backup مطب نیست. رزرو/پرداخت production خاموش بماند؛ deploy مجوز جدا دارد.\n\n"
        "MANIFEST.json شامل اندازه و SHA256 همه فایل‌ها به‌جز خود manifest است. "
        "hash کل ZIP در فایل .sha256 کنار آن قرار دارد.\n"
    ).encode()
    for path in args.evidence:
        if path.suffix != ".json":
            raise ValueError("Evidence must be reviewed, sanitized JSON.")
        parsed = json.loads(path.read_text(encoding="utf-8-sig"))
        name = f"evidence/{path.name}"
        if name in payload:
            raise ValueError(f"Duplicate evidence filename: {path.name}")
        payload[name] = (json.dumps(parsed, ensure_ascii=False, indent=2) + "\n").encode()
    if args.gallery:
        gallery = ROOT / "outputs/gallery-preview"
        paths = [gallery / name for name in sorted(GALLERY_FILES)]
        paths += [gallery / f"assets/img/samples/{n}.jpg" for n in (1, 2, 3, 4, 8, 12)]
        paths += [gallery / "assets/img/logo/logo-dark-full.webp", gallery / "assets/fonts/optimized/dana-regular.woff2", gallery / "assets/fonts/optimized/dana-bold.woff2"]
        for path in paths:
            payload["previews/gallery/" + path.relative_to(gallery).as_posix()] = path.read_bytes()
    for name in payload:
        safe_path(name)
    inventory = {name: {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                 for name, data in sorted(payload.items())}
    payload["MANIFEST.json"] = (json.dumps({"sourceCommit": commit, "sourceTree": tree, "files": inventory}, indent=2) + "\n").encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(payload.items()):
            archive.writestr(name, data)
    with zipfile.ZipFile(args.output) as archive:
        if archive.testzip() is not None or len(set(archive.namelist())) != len(payload):
            raise ValueError("ZIP CRC or duplicate entry failure.")
        if set(archive.namelist()) != set(payload):
            raise ValueError("ZIP file inventory mismatch.")
        for name, expected in inventory.items():
            data = archive.read(name)
            if len(data) != expected["bytes"] or hashlib.sha256(data).hexdigest() != expected["sha256"]:
                raise ValueError(f"ZIP read-back mismatch: {name}")
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    args.output.with_suffix(args.output.suffix + ".sha256").write_text(f"{digest}  {args.output.name}\n", encoding="utf-8")
    validation = {"sourceCommit": commit, "sourceTree": tree, "trackedFiles": len(source),
                  "archiveFiles": len(payload), "archiveBytes": args.output.stat().st_size,
                  "archiveSha256": digest, "gitBlobComparison": "PASS", "pathPolicy": "PASS",
                  "zipCrc": "PASS", "manifestReadBack": "PASS", "secretScan": "separate check required"}
    args.output.with_suffix(".validation.json").write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(validation, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
