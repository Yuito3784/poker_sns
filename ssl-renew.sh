#!/bin/bash
# =============================================================
# SSL 証明書自動更新 + nginx リロードスクリプト
# crontab に登録: 0 3 * * * /path/to/poker_sns/ssl-renew.sh >> /var/log/ssl-renew.log 2>&1
# =============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "[$(date)] SSL renewal check started"

# Attempt certificate renewal
$COMPOSE run --rm certbot renew --quiet

# Reload nginx to pick up renewed certificates
NGINX_CONTAINER=$($COMPOSE ps -q nginx 2>/dev/null)
if [ -n "$NGINX_CONTAINER" ]; then
  docker exec "$NGINX_CONTAINER" nginx -s reload
  echo "[$(date)] nginx reloaded successfully"
else
  echo "[$(date)] WARNING: nginx container not found, skipping reload"
fi

echo "[$(date)] SSL renewal check completed"
