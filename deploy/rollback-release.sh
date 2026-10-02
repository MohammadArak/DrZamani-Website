#!/usr/bin/env bash
set -Eeuo pipefail
if [[ ${EUID} -ne 0 || $# -ne 2 ]]; then
    echo "استفاده: sudo ./rollback-release.sh PREVIOUS_RELEASE_ID SUCCESSFUL_DEPLOYMENT_RECEIPT_ID" >&2
    echo "بازگشت فقط با بکاپ هماهنگ و رسید متناظر؛ کد و دیتابیس جداگانه بازگردانده نمی‌شوند." >&2
    exit 1
fi
exec python3 "$(dirname -- "${BASH_SOURCE[0]}")/release_manager.py" rollback "$1" "$2"
