#!/bin/bash
# uploads ディレクトリのバックアップ
# crontab 例: 0 4 * * * /opt/poker_sns/scripts/backup-uploads.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/poker_sns}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

# Docker volume のマウントポイントからバックアップ
VOLUME_PATH=$(docker volume inspect poker_sns_uploads --format '{{ .Mountpoint }}' 2>/dev/null || echo "")

if [ -z "$VOLUME_PATH" ]; then
  echo "ERROR: uploads volume not found"
  exit 1
fi

tar -czf "$BACKUP_FILE" -C "$VOLUME_PATH" .
echo "Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# 古いバックアップを削除
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "Cleaned backups older than ${RETENTION_DAYS} days"
