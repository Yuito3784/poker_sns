#!/usr/bin/env sh
# DB バックアップ（マイグレーション前に実行推奨）
# 使い方: DATABASE_URL="postgresql://..." ./scripts/backup-db.sh
# 要: pg_dump（例: brew install libpq で PATH に pg_dump を追加）

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL を設定してください"
  echo "例: DATABASE_URL=\"postgresql://user:pass@host:5432/dbname\" ./scripts/backup-db.sh"
  exit 1
fi

# backend/scripts から backend に移動
cd "$(dirname "$0")/.."
mkdir -p backups

OUTPUT="backups/backup-$(date +%Y%m%d-%H%M%S).sql"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump が見つかりません。"
  echo "  macOS: brew install libpq のあと、PATH に追加 (export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\")"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

pg_dump "$DATABASE_URL" --no-owner --no-acl -F p -f "$OUTPUT"
echo "Backup saved: $OUTPUT"
