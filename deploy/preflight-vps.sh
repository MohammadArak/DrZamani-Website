#!/usr/bin/env bash
set -u

domain="${1:-drfarzadzamani.ir}"
echo "=== Dr Zamani VPS preflight ==="
if [[ -r /etc/os-release ]]; then
    . /etc/os-release
    echo "OS=${PRETTY_NAME:-unknown}"
else
    echo "OS=unknown"
fi
echo "ARCH=$(uname -m)"
echo "KERNEL=$(uname -r)"
echo "CPU=$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo unknown)"
awk '/MemTotal/ {printf "MEMORY_MB=%d\n", $2 / 1024}' /proc/meminfo 2>/dev/null
df -Pm / | awk 'NR==2 {printf "ROOT_FREE_MB=%s\n", $4}'

for command_name in nginx uv sqlite3 unzip curl systemctl; do
    if command -v "$command_name" >/dev/null 2>&1; then
        echo "COMMAND_${command_name}=yes"
    else
        echo "COMMAND_${command_name}=no"
    fi
done

echo "DNS_IPV4_BEGIN"
getent ahostsv4 "$domain" 2>/dev/null | awk '{print $1}' | sort -u || true
echo "DNS_IPV4_END"

if command -v ss >/dev/null 2>&1; then
    ss -ltnH 2>/dev/null | awk '$4 ~ /:22$|:80$|:443$|:8000$/ {print "LISTEN=" $4}'
fi

if [[ -f /etc/drzamani/drzamani.env ]]; then
    echo "PRODUCTION_ENV=present"
    for key in SECRET_KEY FARAZ_API_KEY FARAZ_PATTERN_CODE FARAZ_LINE_NUMBER ZARINPAL_MERCHANT_ID; do
        if grep -Eq "^${key}=(|CHANGE_ME)$" /etc/drzamani/drzamani.env; then
            echo "ENV_${key}=missing"
        elif grep -Eq "^${key}=.+" /etc/drzamani/drzamani.env; then
            echo "ENV_${key}=configured"
        else
            echo "ENV_${key}=missing"
        fi
    done
else
    echo "PRODUCTION_ENV=absent"
fi

for unit in drzamani-api.service drzamani-jobs.timer nginx.service; do
    state="$(systemctl is-active "$unit" 2>/dev/null || true)"
    case "$state" in
        active|inactive|failed|activating|deactivating) ;;
        *) state="unknown" ;;
    esac
    echo "UNIT_${unit}=$state"
done

echo "=== END (no secret values printed) ==="
