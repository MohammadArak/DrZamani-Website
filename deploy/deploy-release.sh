#!/usr/bin/env bash
set -Eeuo pipefail
if [[ ${EUID} -ne 0 || $# -ne 1 ]]; then
    echo "استفاده: sudo ./deploy-release.sh /path/drzamani-built-release.zip" >&2
    exit 1
fi
exec python3 "$(dirname -- "${BASH_SOURCE[0]}")/release_manager.py" deploy "$1"
