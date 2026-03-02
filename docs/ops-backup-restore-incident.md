# バックアップ・リストア・インシデント対応手順書

> Operations担当: 星街 / 白上
> 作成日: 2026-03-02
> 対象: poker_sns 本番環境
> 前提: 既存の `ops-deploy-runbook.md`（デプロイ手順内のバックアップ）を包括的に拡張

---

## 1. バックアップ戦略概要

### 1.1 バックアップ対象と方式

| 対象 | 方式 | 頻度 | 保持期間 | 保存先 |
|------|------|------|---------|--------|
| PostgreSQL (poker_sns DB) | `pg_dump` 論理バックアップ | 日次 03:00 | 30日 | `/opt/poker-sns/backups/db/` |
| uploadsボリューム | tar.gz 圧縮 | 日次 04:00 | 30日 | `/opt/poker-sns/backups/uploads/` |
| デプロイ前DBスナップショット | `pg_dump` | デプロイ毎 | 直近5世代 | `/opt/poker-sns/backups/pre-deploy/` |
| .env + docker-compose設定 | ファイルコピー | 変更時手動 | 永続 | `/opt/poker-sns/backups/config/` |
| nginx設定 | ファイルコピー | 変更時手動 | 永続 | `/opt/poker-sns/backups/config/` |

### 1.2 RPO/RTO目標

| 指標 | 目標 | 根拠 |
|------|------|------|
| RPO (Recovery Point Objective) | 24時間 | 日次バックアップ間隔 |
| RTO (Recovery Time Objective) | 1時間 | DB復旧 + サービス再起動 |

---

## 2. バックアップスクリプト

### 2.1 PostgreSQL日次バックアップ

```bash
#!/bin/bash
# /opt/poker-sns/scripts/backup-db.sh
set -euo pipefail

BACKUP_DIR="/opt/poker-sns/backups/db"
COMPOSE="/opt/poker-sns/docker-compose.yml"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/poker_sns-${DATE}.sql.gz"
RETENTION_DAYS=30
LOG="/var/log/poker-sns/backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DB-BACKUP] $1" >> "$LOG"; }

mkdir -p "$BACKUP_DIR"

# バックアップ実行（圧縮付き）
log "Starting DB backup..."
docker compose -f "$COMPOSE" exec -T db \
  pg_dump -U postgres --format=plain --no-owner poker_sns | \
  gzip > "$BACKUP_FILE"

# バックアップ検証（ファイルサイズが0でないことを確認）
FILE_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo 0)
if [ "$FILE_SIZE" -lt 1024 ]; then
  log "ERROR: Backup file too small (${FILE_SIZE} bytes). Backup may have failed."
  echo "CRITICAL: DB backup failed - file too small" | \
    mail -s "[Poker SNS] Backup Failure" ops@example.com 2>/dev/null || true
  exit 1
fi

log "Backup completed: $BACKUP_FILE ($(numfmt --to=iec $FILE_SIZE 2>/dev/null || echo "${FILE_SIZE}B"))"

# 古いバックアップの削除
DELETED=$(find "$BACKUP_DIR" -name "poker_sns-*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l | tr -d ' ')
if [ "$DELETED" -gt 0 ]; then
  log "Cleaned up $DELETED old backup(s) (>${RETENTION_DAYS} days)"
fi

# 現在のバックアップ数をログ
COUNT=$(ls -1 "$BACKUP_DIR"/poker_sns-*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}')
log "Backup inventory: $COUNT files, total $TOTAL_SIZE"
```

### 2.2 uploadsボリューム日次バックアップ

```bash
#!/bin/bash
# /opt/poker-sns/scripts/backup-uploads.sh
set -euo pipefail

BACKUP_DIR="/opt/poker-sns/backups/uploads"
DATE=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/uploads-${DATE}.tar.gz"
RETENTION_DAYS=30
LOG="/var/log/poker-sns/backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [UPLOADS-BACKUP] $1" >> "$LOG"; }

mkdir -p "$BACKUP_DIR"

log "Starting uploads backup..."
docker run --rm \
  -v poker_sns_uploads:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/uploads-${DATE}.tar.gz" -C /data .

FILE_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo 0)
log "Backup completed: uploads-${DATE}.tar.gz ($(numfmt --to=iec $FILE_SIZE 2>/dev/null || echo "${FILE_SIZE}B"))"

# 古いバックアップの削除
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +${RETENTION_DAYS} -delete
```

### 2.3 設定ファイルバックアップ

```bash
#!/bin/bash
# /opt/poker-sns/scripts/backup-config.sh
# 設定変更時に手動実行
set -euo pipefail

BACKUP_DIR="/opt/poker-sns/backups/config"
DATE=$(date +%Y%m%d-%H%M%S)
TARGET="$BACKUP_DIR/config-${DATE}"

mkdir -p "$TARGET"

cd /opt/poker-sns
cp -f .env "$TARGET/.env" 2>/dev/null || echo "WARN: .env not found"
cp -f docker-compose.yml "$TARGET/"
cp -f docker-compose.prod.yml "$TARGET/"
cp -f nginx-prod.conf "$TARGET/"
cp -f nginx-prod-active.conf "$TARGET/" 2>/dev/null || true

echo "[$(date)] Config backup saved to $TARGET"
```

---

## 3. リストア手順

### 3.1 PostgreSQLリストア

```bash
# ====================================================
# PostgreSQL リストア手順
# 実行条件: データ破損、誤削除、マイグレーション失敗時
# 所要時間目安: 15-30分（データサイズに依存）
# ====================================================

# Step 1: バックアップファイルの選択
ls -la /opt/poker-sns/backups/db/
# → 復旧したい日時のファイルを特定
# 例: poker_sns-20260301-030001.sql.gz

# Step 2: 復旧対象バックアップの整合性確認
gunzip -t /opt/poker-sns/backups/db/poker_sns-YYYYMMDD-HHMMSS.sql.gz
# → "OK" が出力されること

# Step 3: アプリケーション停止（DB接続を遮断）
cd /opt/poker-sns
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop backend frontend

# Step 4: 既存DBを削除して再作成
docker compose exec -T db psql -U postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'poker_sns' AND pid <> pg_backend_pid();"

docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS poker_sns;"
docker compose exec -T db psql -U postgres -c "CREATE DATABASE poker_sns;"

# Step 5: バックアップからリストア
gunzip -c /opt/poker-sns/backups/db/poker_sns-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose exec -T db psql -U postgres poker_sns

# Step 6: リストア検証
docker compose exec -T db psql -U postgres poker_sns -c "
  SELECT 'users' AS table_name, COUNT(*) FROM users
  UNION ALL
  SELECT 'posts', COUNT(*) FROM posts
  UNION ALL
  SELECT 'notifications', COUNT(*) FROM notifications;"

# Step 7: アプリケーション再起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend frontend

# Step 8: 動作確認
curl -s http://localhost:3001/api/health | jq .
```

### 3.2 uploadsボリュームリストア

```bash
# ====================================================
# uploads ボリューム リストア手順
# 実行条件: ファイル破損、誤削除時
# ====================================================

# Step 1: バックアップファイルの選択
ls -la /opt/poker-sns/backups/uploads/

# Step 2: バックエンド停止
docker compose stop backend

# Step 3: 既存データのバックアップ（念のため）
docker run --rm \
  -v poker_sns_uploads:/data:ro \
  -v /opt/poker-sns/backups:/backup \
  alpine tar czf /backup/uploads-pre-restore-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Step 4: ボリューム内容をクリアしてリストア
docker run --rm \
  -v poker_sns_uploads:/data \
  -v /opt/poker-sns/backups/uploads:/backup:ro \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/uploads-YYYYMMDD.tar.gz -C /data"

# Step 5: バックエンド再起動
docker compose up -d backend
```

### 3.3 設定ファイルリストア

```bash
# Step 1: 設定バックアップの確認
ls -la /opt/poker-sns/backups/config/

# Step 2: 必要なファイルを復元
cp /opt/poker-sns/backups/config/config-YYYYMMDD-HHMMSS/.env /opt/poker-sns/.env
cp /opt/poker-sns/backups/config/config-YYYYMMDD-HHMMSS/docker-compose.yml /opt/poker-sns/

# Step 3: 全サービス再起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 4. インシデント対応手順書

### 4.1 インシデント深刻度分類

| レベル | 名称 | 定義 | 対応SLA |
|--------|------|------|---------|
| SEV-1 | 緊急 | サービス全面停止、データ漏洩の疑い | 即時対応（30分以内に着手） |
| SEV-2 | 重大 | 主要機能の障害（認証不可、投稿不可等） | 1時間以内に着手 |
| SEV-3 | 警告 | 一部機能の劣化（遅延、エラー率上昇等） | 4時間以内に着手 |
| SEV-4 | 軽微 | 軽微な不具合、パフォーマンス低下 | 翌営業日対応 |

### 4.2 インシデント対応フロー

```
検知 → 初期評価(SEV判定) → エスカレーション → 調査 → 対処 → 復旧確認 → 事後分析
```

### 4.3 SEV-1: サービス全面停止

```bash
# ====================================================
# SEV-1 対応手順: サービス全面停止
# ====================================================

# 1. 状況把握（2分以内）
ssh deploy@production-server
cd /opt/poker-sns
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=50 db
docker compose logs --tail=50 nginx
df -h
free -h

# 2. 問題の切り分け
# 2a. nginx自体が停止 → nginx再起動
docker compose restart nginx

# 2b. バックエンドエラー → バックエンド再起動
docker compose restart backend

# 2c. DB接続不可 → DB確認
docker compose exec -T db pg_isready -U postgres
docker compose logs --tail=50 db

# 2d. ディスク満杯 → 緊急クリーンアップ
docker system prune -f
docker builder prune -f
find /var/log/nginx/ -name "*.gz" -mtime +7 -delete

# 3. 全サービス再起動（上記で解決しない場合）
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. 復旧確認
curl -s -o /dev/null -w "%{http_code}" https://domain.com/api/health
curl -s -o /dev/null -w "%{http_code}" https://domain.com/
```

### 4.4 SEV-1: セキュリティインシデント（データ漏洩疑い）

```bash
# ====================================================
# セキュリティインシデント対応手順
# ====================================================

# 1. 証拠保全（最優先）
mkdir -p /opt/poker-sns/incident/$(date +%Y%m%d)
cp /var/log/nginx/security.json /opt/poker-sns/incident/$(date +%Y%m%d)/
cp /var/log/nginx/access.log /opt/poker-sns/incident/$(date +%Y%m%d)/
docker compose logs > /opt/poker-sns/incident/$(date +%Y%m%d)/all-containers.log

# 2. 攻撃元IPの特定と遮断
# （iptablesで即座にブロック）
# iptables -A INPUT -s {ATTACKER_IP} -j DROP

# 3. JWT_SECRETの緊急ローテーション（セッションハイジャック疑い時）
# .envのJWT_SECRETを新しい値に変更
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# → 全ユーザーが再ログイン必要になる

# 4. DBパスワード変更（DB侵入疑い時）
# .envのDB_PASSWORDを変更 → docker compose再起動

# 5. 影響範囲の調査
# 不審なDBクエリの確認
docker compose exec -T db psql -U postgres poker_sns -c "
  SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 20;"

# 6. 関係者への通知
# - CEOへ即報告
# - 該当ユーザーへの通知（個人情報漏洩の場合は法的義務）
```

### 4.5 SEV-2: デプロイ失敗時のロールバック

```bash
# ====================================================
# デプロイ失敗 → ロールバック手順
# ====================================================

# 1. 問題のあるデプロイの特定
git log --oneline -5

# 2. 前回の安定版コミットに戻す
git checkout {LAST_STABLE_COMMIT_HASH}

# 3. イメージ再ビルド
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache backend frontend

# 4. 再デプロイ
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend frontend

# 5. スキーマ変更を伴う場合 → DBもロールバック
# pre-deployバックアップを使用（ops-deploy-runbook.md 参照）
docker compose exec -T db psql -U postgres -c "DROP DATABASE poker_sns;"
docker compose exec -T db psql -U postgres -c "CREATE DATABASE poker_sns;"
gunzip -c /opt/poker-sns/backups/pre-deploy/pre-deploy-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose exec -T db psql -U postgres poker_sns

# 6. 復旧確認
curl -s http://localhost:3001/api/health | jq .
docker compose logs --tail=20 backend | grep -i error
```

### 4.6 SEV-3: パフォーマンス劣化

```bash
# ====================================================
# パフォーマンス劣化 調査・対処手順
# ====================================================

# 1. リソース使用状況の確認
docker stats --no-stream
free -h
top -bn1 | head -20
df -h

# 2. PostgreSQLスロークエリの確認
docker compose exec -T db psql -U postgres poker_sns -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE state != 'idle'
  ORDER BY duration DESC
  LIMIT 10;"

# 3. コネクションプール確認
docker compose exec -T db psql -U postgres poker_sns -c "
  SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# 4. nginxの接続状況
docker compose exec -T nginx sh -c "cat /proc/net/sockstat"

# 5. 応急処置: バックエンドの再起動
docker compose restart backend

# 6. DB VACUUM（テーブル肥大化時）
docker compose exec -T db psql -U postgres poker_sns -c "VACUUM ANALYZE;"
```

---

## 5. 事後分析(ポストモーテム)テンプレート

```
=======================================
インシデント ポストモーテム
=======================================

日時: YYYY-MM-DD HH:MM - HH:MM (JST)
深刻度: SEV-X
影響範囲: [全ユーザー / 特定機能 / 特定ユーザー]
対応者: [名前]

1. タイムライン
- HH:MM 検知（方法: アラート/ユーザー報告/監視）
- HH:MM 調査開始
- HH:MM 原因特定
- HH:MM 対処完了
- HH:MM 復旧確認

2. 根本原因
[原因の詳細記述]

3. 影響
- ダウンタイム: XX分
- 影響ユーザー数: 約XX人
- データ損失: あり/なし

4. 対処内容
[実施した対処の詳細]

5. 再発防止策
| 施策 | 担当 | 期限 | ステータス |
|------|------|------|-----------|
| ... | ... | ... | ... |

6. 教訓
[得られた教訓]
=======================================
```

---

## 6. バックアップ検証手順（月次）

バックアップの復旧可能性を月次で検証する:

```bash
#!/bin/bash
# /opt/poker-sns/scripts/verify-backup.sh
# 毎月1日にバックアップの復旧テストを実施

set -euo pipefail
LOG="/var/log/poker-sns/backup-verify.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [VERIFY] $1" >> "$LOG"; }

# 最新のDBバックアップを一時DBにリストア
LATEST_BACKUP=$(ls -t /opt/poker-sns/backups/db/poker_sns-*.sql.gz | head -1)
log "Verifying backup: $LATEST_BACKUP"

# テスト用DBを作成
docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS poker_sns_verify;"
docker compose exec -T db psql -U postgres -c "CREATE DATABASE poker_sns_verify;"

# リストア
gunzip -c "$LATEST_BACKUP" | \
  docker compose exec -T db psql -U postgres poker_sns_verify > /dev/null 2>&1

# テーブル数とレコード数を確認
TABLE_COUNT=$(docker compose exec -T db psql -U postgres poker_sns_verify -t -c "
  SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

USER_COUNT=$(docker compose exec -T db psql -U postgres poker_sns_verify -t -c "
  SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")

# クリーンアップ
docker compose exec -T db psql -U postgres -c "DROP DATABASE poker_sns_verify;"

if [ "$TABLE_COUNT" -gt 0 ]; then
  log "PASS: Backup verified - $TABLE_COUNT tables, $USER_COUNT users"
  echo "Backup verification PASSED" | \
    mail -s "[Poker SNS] Monthly Backup Verification: PASS" ops@example.com 2>/dev/null || true
else
  log "FAIL: Backup verification failed - 0 tables restored"
  echo "CRITICAL: Backup verification FAILED" | \
    mail -s "[Poker SNS] Monthly Backup Verification: FAIL" ops@example.com 2>/dev/null || true
fi
```

### cron設定

```cron
# 毎月1日 5:00 にバックアップ検証
0 5 1 * * /opt/poker-sns/scripts/verify-backup.sh >> /var/log/poker-sns/backup-verify.log 2>&1
```

---

## 7. オフサイトバックアップ（Phase 2推奨）

本番データの冗長性を確保するため、オフサイトバックアップの導入を推奨:

| 方式 | コスト目安 | 導入優先度 |
|------|----------|-----------|
| rsync to 別VPS | ~¥500/月 | P1（売上発生後） |
| AWS S3 (Glacier) | ~¥100/月 (100GB) | P2（DAU 1,000超で） |
| Backblaze B2 | ~¥50/月 (100GB) | P1（コスト最優先時） |

```bash
# rsync例: 日次でリモートサーバーにバックアップをミラー
rsync -avz --delete \
  /opt/poker-sns/backups/ \
  backup@remote-server:/backups/poker-sns/
```
