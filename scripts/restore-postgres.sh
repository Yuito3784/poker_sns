#!/bin/bash
# =============================================================
# PostgreSQL リストアスクリプト
# 使い方: ./scripts/restore-postgres.sh /path/to/backup.sql.gz
# =============================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ]; then
  echo "使い方: $0 <バックアップファイル.sql.gz>"
  echo ""
  echo "利用可能なバックアップ:"
  ls -lh /var/backups/poker_sns/poker_sns_*.sql.gz 2>/dev/null || echo "  (ローカルバックアップなし)"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: ファイルが見つかりません: $BACKUP_FILE"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml"

echo "=== PostgreSQL リストア ==="
echo "バックアップ: $BACKUP_FILE"
echo ""
read -p "警告: 現在のデータは上書きされます。続行しますか? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "中止しました"
  exit 0
fi

DB_CONTAINER=$($COMPOSE ps -q db 2>/dev/null)
if [ -z "$DB_CONTAINER" ]; then
  echo "ERROR: db container not found. Run: docker compose up -d db"
  exit 1
fi

echo "[$(date)] Stopping backend..."
$COMPOSE stop backend

echo "[$(date)] Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" pg_restore -U postgres -d poker_sns --clean --if-exists -Fc 2>/dev/null || \
  gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U postgres -d poker_sns

echo "[$(date)] Restarting backend..."
$COMPOSE start backend

echo "[$(date)] Waiting for health check..."
sleep 10
$COMPOSE exec backend wget -q --spider http://localhost:3001/health && echo "Health check: OK" || echo "Health check: FAILED"

echo "[$(date)] Restore completed"
