#!/usr/bin/env bash
set -Eeuo pipefail

domain="${1:-drfarzadzamani.ir}"
deploy_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! "$domain" =~ ^[A-Za-z0-9.-]+$ ]]; then
    echo "دامنه معتبر نیست." >&2
    exit 1
fi

if [[ ${EUID} -ne 0 ]]; then
    echo "این اسکریپت باید با sudo اجرا شود." >&2
    exit 1
fi

if [[ ! -r /etc/os-release ]]; then
    echo "سیستم‌عامل قابل شناسایی نیست." >&2
    exit 1
fi
. /etc/os-release
case "${ID:-}" in
    ubuntu|debian) ;;
    *)
        echo "این اسکریپت فقط Ubuntu و Debian را پشتیبانی می‌کند: ${PRETTY_NAME:-unknown}" >&2
        exit 1
        ;;
esac

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates curl nginx rsync sqlite3 unzip util-linux

export PATH="/root/.local/bin:$PATH"
if ! command -v uv >/dev/null 2>&1; then
    curl -LsSf https://astral.sh/uv/install.sh | env UV_NO_MODIFY_PATH=1 sh
fi
install -o root -g root -m 0755 "$(command -v uv)" /usr/local/bin/uv

install -d -o www-data -g www-data -m 0750 /var/www/drzamani/releases
install -d -o www-data -g www-data -m 0750 /var/www/drzamani/shared
install -d -o www-data -g www-data -m 0700 /var/lib/drzamani/uploads
install -d -o www-data -g www-data -m 0700 /var/lib/drzamani/public-media
install -d -o www-data -g www-data -m 0750 /var/lib/drzamani/uv-cache
install -d -o www-data -g www-data -m 0750 /var/lib/drzamani/uv-python
install -d -o root -g root -m 0700 /var/backups/drzamani
install -d -o root -g www-data -m 0750 /etc/drzamani

if [[ ! -f /etc/drzamani/drzamani.env ]]; then
    install -o root -g www-data -m 0640 "$deploy_dir/env.production.example" /etc/drzamani/drzamani.env
fi

install -o root -g root -m 0644 "$deploy_dir/drzamani-api.service" /etc/systemd/system/drzamani-api.service
install -o root -g root -m 0644 "$deploy_dir/drzamani-jobs.service" /etc/systemd/system/drzamani-jobs.service
install -o root -g root -m 0644 "$deploy_dir/drzamani-jobs.timer" /etc/systemd/system/drzamani-jobs.timer

nginx_temp="$(mktemp /tmp/drzamani-nginx-XXXXXX)"
install -d -o root -g root -m 0755 /etc/nginx/snippets
install -o root -g root -m 0644 "$deploy_dir/drzamani-security-headers.conf" /etc/nginx/snippets/drzamani-security-headers.conf
install -o root -g root -m 0644 "$deploy_dir/drzamani-proxy-headers.conf" /etc/nginx/snippets/drzamani-proxy-headers.conf
sed "s/__DOMAIN__/${domain//\//\\/}/g" "$deploy_dir/nginx-drzamani-http.conf.template" > "$nginx_temp"
install -o root -g root -m 0644 "$nginx_temp" /etc/nginx/sites-available/drzamani
rm -f "$nginx_temp"
ln -sfn /etc/nginx/sites-available/drzamani /etc/nginx/sites-enabled/drzamani
rm -f /etc/nginx/sites-enabled/default

if [[ ! -f /var/www/drzamani/shared/maintenance.html ]]; then
    install -o www-data -g www-data -m 0644 /dev/stdin /var/www/drzamani/shared/maintenance.html <<'HTML'
<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>به‌روزرسانی سامانه</title><style>body{font-family:sans-serif;background:#f8fafc;color:#14344a;display:grid;place-items:center;min-height:100vh;margin:0}.box{background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:40px;text-align:center;max-width:480px}</style><div class="box"><h1>در حال به‌روزرسانی سامانه</h1><p>لطفاً چند دقیقه دیگر دوباره تلاش کنید.</p></div></html>
HTML
fi

systemctl daemon-reload
systemctl enable drzamani-api.service drzamani-jobs.timer nginx
nginx -t
systemctl restart nginx

echo "نصب پایه کامل شد. ابتدا /etc/drzamani/drzamani.env را تکمیل کنید، سپس deploy-release.sh را اجرا کنید."
