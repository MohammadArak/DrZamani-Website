#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
    echo "این اسکریپت باید با sudo اجرا شود." >&2
    exit 1
fi
if [[ $# -ne 1 ]]; then
    echo "استفاده: sudo ./deploy-release.sh /path/drzamani-full.zip" >&2
    exit 1
fi

project_zip="$(readlink -f -- "$1")"
[[ -f "$project_zip" ]] || { echo "فایل پیدا نشد: $project_zip" >&2; exit 1; }
unzip -tq "$project_zip" >/dev/null
[[ -f /etc/drzamani/drzamani.env ]] || { echo "فایل تنظیمات production وجود ندارد." >&2; exit 1; }
command -v uv >/dev/null 2>&1 || { echo "uv نصب نیست؛ install-vps.sh را اجرا کنید." >&2; exit 1; }

exec 9>/run/lock/drzamani-deploy.lock
flock -n 9 || { echo "یک انتشار دیگر در حال اجراست." >&2; exit 1; }

release_id="$(date -u +%Y%m%d%H%M%S)-$$"
release_dir="/var/www/drzamani/releases/$release_id"
previous_release="$(readlink -f /var/www/drzamani/current 2>/dev/null || true)"
database_path="/var/lib/drzamani/appointments_v2.db"
backup_path=""
maintenance_active=false

recover_on_error() {
    local exit_code=$?
    trap - ERR
    if [[ "$maintenance_active" == true ]]; then
        systemctl stop drzamani-api.service 2>/dev/null || true
        if [[ -n "$previous_release" ]]; then
            ln -sfn "$previous_release" /var/www/drzamani/current.next
            mv -Tf /var/www/drzamani/current.next /var/www/drzamani/current
        fi
        if [[ -n "$backup_path" && -f "$backup_path" ]]; then
            install -o www-data -g www-data -m 0600 "$backup_path" "$database_path"
        fi
        [[ -n "$previous_release" ]] && systemctl start drzamani-api.service 2>/dev/null || true
        systemctl start drzamani-jobs.timer 2>/dev/null || true
        rm -f /var/www/drzamani/maintenance.flag
    fi
    exit "$exit_code"
}
trap recover_on_error ERR

install -d -o www-data -g www-data -m 0750 "$release_dir"
unzip -q "$project_zip" -d "$release_dir"
[[ -f "$release_dir/api/pyproject.toml" && -f "$release_dir/api/uv.lock" ]] || {
    echo "ساختار بسته معتبر نیست: api/pyproject.toml یا api/uv.lock پیدا نشد." >&2
    exit 1
}
[[ -f "$release_dir/public_html/index.html" ]] || {
    echo "ساختار بسته معتبر نیست: public_html/index.html پیدا نشد." >&2
    exit 1
}
ln -s /etc/drzamani/drzamani.env "$release_dir/api/.env"
chown -R www-data:www-data "$release_dir"
runuser -u www-data -- env \
    UV_CACHE_DIR=/var/lib/drzamani/uv-cache \
    UV_PYTHON_INSTALL_DIR=/var/lib/drzamani/uv-python \
    uv sync --project "$release_dir/api" --frozen --no-dev

touch /var/www/drzamani/maintenance.flag
maintenance_active=true
systemctl stop drzamani-jobs.timer 2>/dev/null || true
systemctl stop drzamani-api.service 2>/dev/null || true

if [[ -f "$database_path" ]]; then
    backup_path="/var/backups/drzamani/appointments-$(date -u +%Y%m%d%H%M%S).db"
    sqlite3 "$database_path" ".backup '$backup_path'"
    chmod 0600 "$backup_path"
fi

if ! runuser -u www-data -- bash -c "cd '$release_dir/api' && UV_CACHE_DIR=/var/lib/drzamani/uv-cache UV_PYTHON_INSTALL_DIR=/var/lib/drzamani/uv-python uv run --frozen --no-sync alembic upgrade head"; then
    if [[ -n "$backup_path" ]]; then
        install -o www-data -g www-data -m 0600 "$backup_path" "$database_path"
    fi
    [[ -n "$previous_release" ]] && systemctl start drzamani-api.service || true
    systemctl start drzamani-jobs.timer 2>/dev/null || true
    rm -f /var/www/drzamani/maintenance.flag
    echo "Migration شکست خورد؛ دیتابیس و سرویس قبلی بازیابی شدند." >&2
    exit 1
fi

ln -s "$release_dir" /var/www/drzamani/current.next
mv -Tf /var/www/drzamani/current.next /var/www/drzamani/current
systemctl daemon-reload
systemctl restart drzamani-api.service

if ! "$(dirname -- "$0")/health-check.sh"; then
    systemctl stop drzamani-api.service || true
    if [[ -n "$previous_release" ]]; then
        ln -s "$previous_release" /var/www/drzamani/current.next
        mv -Tf /var/www/drzamani/current.next /var/www/drzamani/current
    fi
    if [[ -n "$backup_path" ]]; then
        install -o www-data -g www-data -m 0600 "$backup_path" "$database_path"
    fi
    [[ -n "$previous_release" ]] && systemctl start drzamani-api.service || true
    systemctl start drzamani-jobs.timer 2>/dev/null || true
    rm -f /var/www/drzamani/maintenance.flag
    echo "نسخه جدید سالم نبود؛ کد و دیتابیس قبلی بازیابی شدند." >&2
    exit 1
fi

systemctl start drzamani-jobs.timer
nginx -t
systemctl reload nginx
rm -f /var/www/drzamani/maintenance.flag
maintenance_active=false
trap - ERR
echo "نسخه $release_id با موفقیت منتشر شد."
