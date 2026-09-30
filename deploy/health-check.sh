#!/usr/bin/env bash
set -Eeuo pipefail

attempts="${1:-20}"
for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl --fail --silent --show-error --max-time 3 http://127.0.0.1:8000/api/health >/dev/null; then
        echo "API سالم است."
        exit 0
    fi
    sleep 1
done
echo "API پس از ${attempts} تلاش پاسخ سالم نداد." >&2
exit 1
