#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 || $# -ne 1 ]]; then
    echo "استفاده: sudo ./rollback-release.sh RELEASE_ID" >&2
    exit 1
fi

target="$(readlink -m -- "/var/www/drzamani/releases/$1")"
case "$target" in
    /var/www/drzamani/releases/*) ;;
    *) echo "شناسه نسخه معتبر نیست." >&2; exit 1 ;;
esac
[[ -d "$target/api" && -d "$target/public_html" ]] || { echo "نسخه پیدا نشد." >&2; exit 1; }

current="$(readlink -f /var/www/drzamani/current)"
rollback_active=false

recover_rollback() {
    local exit_code=$?
    trap - ERR
    if [[ "$rollback_active" == true ]]; then
        systemctl stop drzamani-api.service 2>/dev/null || true
        ln -sfn "$current" /var/www/drzamani/current.next
        mv -Tf /var/www/drzamani/current.next /var/www/drzamani/current
        systemctl start drzamani-api.service drzamani-jobs.timer 2>/dev/null || true
        rm -f /var/www/drzamani/maintenance.flag
    fi
    exit "$exit_code"
}
trap recover_rollback ERR

touch /var/www/drzamani/maintenance.flag
rollback_active=true
systemctl stop drzamani-jobs.timer drzamani-api.service
ln -s "$target" /var/www/drzamani/current.next
mv -Tf /var/www/drzamani/current.next /var/www/drzamani/current
systemctl start drzamani-api.service

if ! "$(dirname -- "$0")/health-check.sh"; then
    systemctl stop drzamani-api.service || true
    ln -s "$current" /var/www/drzamani/current.next
    mv -Tf /var/www/drzamani/current.next /var/www/drzamani/current
    systemctl start drzamani-api.service drzamani-jobs.timer
    rm -f /var/www/drzamani/maintenance.flag
    echo "Rollback سالم نبود و نسخه اولیه دوباره فعال شد." >&2
    exit 1
fi

systemctl start drzamani-jobs.timer
rm -f /var/www/drzamani/maintenance.flag
rollback_active=false
trap - ERR
echo "نسخه $1 فعال شد. دیتابیس downgrade نشد."
