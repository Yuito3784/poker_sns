#!/bin/bash
# =============================================================
# PostgreSQL 日次バックアップスクリプト
# crontab: 0 3 * * * /opt/poker_sns/scripts/backup-postgres.sh >> /var/log/poker_sns/backup.log 2>&1
# =============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml"

# ── 設定 ──────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/var/backups/poker_sns}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/poker_sns_$TIMESTAMP.sql.gz"

# S3/GCS アップロード先 (空ならスキップ)
S3_BUCKET="${S3_BUCKET:-}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"

notify_discord() {
  local color="$1" title="$2" desc="$3"
  [ -z "$DISCORD_WEBHOOK" ] && return 0
  curl -s -H "Content-Type: application/json" \
    -d "{\"embeds\":[{\"title\":\"$title\",\"description\":\"$desc\",\"color\":$color}]}" \
    "$DISCORD_WEBHOOK" || true
}

echo "[$(date)] Backup started"

mkdir -p "$BACKUP_DIR"

# ── ダンプ取得 ────────────────────────────────────────────
DB_CONTAINER=$($COMPOSE ps -q db 2>/dev/null)
if [ -z "$DB_CONTAINER" ]; then
  echo "[$(date)] ERROR: db container not found"
  notify_discord 15158332 "Backup FAILED" "db container not found"
  exit 1
fi

docker exec "$DB_CONTAINER" pg_dump -U postgres -Fc poker_sns | gzip > "$BACKUP_FILE"
FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Dump created: $BACKUP_FILE ($FILESIZE)"

# ── S3/GCS アップロード ──────────────────────────────────
if [ -n "$S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/postgres/$(basename "$BACKUP_FILE")" --quiet
  echo "[$(date)] Uploaded to s3://$S3_BUCKET"
fi

# ── 古いバックアップ削除 ─────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "poker_sns_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "[$(date)] Deleted $DELETED old backups (retention: ${RETENTION_DAYS}d)"

# ── 通知 ─────────────────────────────────────────────────
notify_discord 3066993 "Backup OK" "poker_sns backup: $FILESIZE, deleted $DELETED old files"

echo "[$(date)] Backup completed"
