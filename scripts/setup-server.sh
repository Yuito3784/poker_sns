#!/bin/bash
# =============================================================
# VPS 初期セットアップスクリプト (Ubuntu 22.04+)
# 使い方: sudo ./scripts/setup-server.sh
# =============================================================
set -euo pipefail

echo "=== Poker SNS サーバー初期セットアップ ==="

# ── 1. ファイアウォール設定 ───────────────────────────────
echo "--- ファイアウォール設定 ---"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP (ACME + redirect)
ufw allow 443/tcp    # HTTPS
ufw --force enable
echo "UFW enabled: SSH(22), HTTP(80), HTTPS(443)"

# ── 2. Docker インストール (未インストール時のみ) ────────
if ! command -v docker &>/dev/null; then
  echo "--- Docker インストール ---"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# ── 3. ディレクトリ作成 ──────────────────────────────────
echo "--- ディレクトリ作成 ---"
mkdir -p /opt/poker_sns
mkdir -p /var/backups/poker_sns
mkdir -p /var/log/poker_sns

# ── 4. logrotate 設定 ────────────────────────────────────
echo "--- logrotate 設定 ---"
cp /opt/poker_sns/scripts/logrotate-poker-sns.conf /etc/logrotate.d/poker-sns

# ── 5. cron 設定 ─────────────────────────────────────────
echo "--- cron 設定 ---"
CRON_BACKUP="0 3 * * * /opt/poker_sns/scripts/backup-postgres.sh >> /var/log/poker_sns/backup.log 2>&1"
CRON_SSL="0 4 * * 1 /opt/poker_sns/ssl-renew.sh >> /var/log/poker_sns/ssl-renew.log 2>&1"
CRON_PRUNE="0 5 * * 0 docker image prune -af >> /var/log/poker_sns/docker-prune.log 2>&1"

(crontab -l 2>/dev/null | grep -v poker_sns; echo "$CRON_BACKUP"; echo "$CRON_SSL"; echo "$CRON_PRUNE") | crontab -
echo "Cron jobs registered: daily backup 03:00, weekly SSL 04:00 Mon, weekly prune 05:00 Sun"

# ── 6. スクリプト実行権限 ────────────────────────────────
chmod +x /opt/poker_sns/scripts/*.sh
chmod +x /opt/poker_sns/setup-ssl.sh
chmod +x /opt/poker_sns/ssl-renew.sh

echo ""
echo "=== セットアップ完了 ==="
echo "次のステップ:"
echo "  1. .env ファイルを /opt/poker_sns/.env に配置"
echo "  2. docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
echo "  3. ./setup-ssl.sh yourdomain.com admin@example.com"
