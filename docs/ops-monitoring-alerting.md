# ディスク容量監視・アラート・運用監視 設計書

## 1. 監視対象

| 対象 | パス | 閾値 | 優先度 |
|------|------|------|--------|
| uploadsボリューム | Docker volume `poker_sns_uploads` | 80% | HIGH |
| PostgreSQLデータ | Docker volume `poker_sns_pgdata` | 85% | CRITICAL |
| ホストディスク全体 | `/` | 90% | CRITICAL |
| nginxログ | `/var/log/nginx/` | 5GB | MEDIUM |
| アプリログ | `/var/log/poker-sns/` | 2GB | MEDIUM |

---

## 2. ヘルスチェック・監視スクリプト

### 2.1 統合ヘルスチェック

```bash
#!/bin/bash
# /opt/poker-sns/scripts/healthcheck.sh
# 全サービスのヘルスチェックを実行

set -euo pipefail
ALERT_EMAIL="ops@example.com"
LOG="/var/log/poker-sns/healthcheck.log"
ERRORS=()

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"; }

# 1. Docker コンテナ稼働確認
for svc in backend frontend nginx db; do
  STATUS=$(docker compose -f /opt/poker-sns/docker-compose.yml ps --format json "$svc" 2>/dev/null | jq -r '.State' 2>/dev/null || echo "unknown")
  if [ "$STATUS" != "running" ]; then
    ERRORS+=("CRITICAL: Container '$svc' is $STATUS")
    log "CRITICAL: Container '$svc' is $STATUS"
  fi
done

# 2. バックエンドAPI応答確認
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3001/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  ERRORS+=("CRITICAL: Backend API returned HTTP $HTTP_CODE")
  log "CRITICAL: Backend API returned HTTP $HTTP_CODE"
fi

# 3. PostgreSQL接続確認
docker compose -f /opt/poker-sns/docker-compose.yml exec -T db pg_isready -U postgres > /dev/null 2>&1
if [ $? -ne 0 ]; then
  ERRORS+=("CRITICAL: PostgreSQL is not ready")
  log "CRITICAL: PostgreSQL is not ready"
fi

# 4. ディスク使用量チェック
check_disk() {
  local path="$1"
  local threshold="$2"
  local label="$3"
  local usage
  usage=$(df "$path" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
  if [ -n "$usage" ] && [ "$usage" -ge "$threshold" ]; then
    ERRORS+=("HIGH: Disk usage for $label at ${usage}% (threshold: ${threshold}%)")
    log "HIGH: Disk $label at ${usage}%"
  fi
}

check_disk "/" 90 "host-root"

# 5. Docker volumeサイズ確認
UPLOADS_SIZE=$(docker run --rm -v poker_sns_uploads:/data alpine du -sm /data 2>/dev/null | awk '{print $1}')
if [ -n "$UPLOADS_SIZE" ] && [ "$UPLOADS_SIZE" -gt 10240 ]; then
  ERRORS+=("MEDIUM: Uploads volume at ${UPLOADS_SIZE}MB (>10GB)")
  log "MEDIUM: Uploads volume at ${UPLOADS_SIZE}MB"
fi

# 6. SSL証明書期限チェック
CERT_FILE="/etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem"
if [ -f "$CERT_FILE" ]; then
  EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo 0)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  if [ "$DAYS_LEFT" -lt 14 ]; then
    ERRORS+=("HIGH: SSL certificate expires in ${DAYS_LEFT} days")
    log "HIGH: SSL cert expires in ${DAYS_LEFT} days"
  fi
fi

# アラート送信
if [ ${#ERRORS[@]} -gt 0 ]; then
  BODY=$(printf '%s\n' "${ERRORS[@]}")
  echo "$BODY" | mail -s "[Poker SNS ALERT] ${#ERRORS[@]} issue(s) detected" "$ALERT_EMAIL"
  log "ALERT sent: ${#ERRORS[@]} issues"
else
  log "OK: All checks passed"
fi
```

### cron設定
```
# 5分ごとにヘルスチェック
*/5 * * * * /opt/poker-sns/scripts/healthcheck.sh
```

---

## 3. ログローテーション設定

```
# /etc/logrotate.d/poker-sns
/var/log/poker-sns/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}

/var/log/nginx/access.log /var/log/nginx/error.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        docker compose -f /opt/poker-sns/docker-compose.yml exec -T nginx nginx -s reopen
    endscript
}
```

---

## 4. PostgreSQLメンテナンス

```bash
#!/bin/bash
# /opt/poker-sns/scripts/db-maintenance.sh

# VACUUM ANALYZE（週次）
docker compose -f /opt/poker-sns/docker-compose.yml exec -T db \
  psql -U postgres -d poker_sns -c "VACUUM ANALYZE;"

# テーブルサイズレポート
docker compose -f /opt/poker-sns/docker-compose.yml exec -T db \
  psql -U postgres -d poker_sns -c "
    SELECT schemaname, tablename,
           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  "
```

### cron設定
```
# 毎週月曜 2:00にDBメンテナンス
0 2 * * 1 /opt/poker-sns/scripts/db-maintenance.sh >> /var/log/poker-sns/db-maintenance.log 2>&1
```

---

## 5. アラート通知チャネル

### Phase 1（MVP）: メール通知
- ops@example.comへのメール送信
- 最小構成、外部依存なし

### Phase 2: Slack/Discord Webhook
```bash
# Slackへのアラート送信例
send_slack_alert() {
  local message="$1"
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"🚨 Poker SNS Alert: $message\"}"
}
```

### Phase 3: Uptime監視サービス
| サービス | 用途 | 無料枠 |
|---------|------|-------|
| UptimeRobot | 外部HTTP監視 | 50モニター |
| Better Stack | ログ集約+アラート | 1GBログ/月 |

---

## 6. 障害対応ランブック

### コンテナクラッシュ時
```bash
# 1. 状況確認
docker compose ps
docker compose logs --tail=50 {service-name}

# 2. 単一サービス再起動
docker compose restart {service-name}

# 3. 全サービス再起動
docker compose down && docker compose up -d

# 4. イメージ再ビルドが必要な場合
docker compose build --no-cache {service-name}
docker compose up -d {service-name}
```

### ディスク容量逼迫時
```bash
# 1. 使用量確認
df -h
docker system df

# 2. 未使用Dockerリソース削除
docker system prune -f          # 停止コンテナ、未使用ネットワーク
docker image prune -f           # dangling images
docker builder prune -f         # ビルドキャッシュ

# 3. 古いnginxログ削除
find /var/log/nginx/ -name "*.gz" -mtime +30 -delete

# 4. OGP画像クリーンアップ（緊急時）
find /var/lib/docker/volumes/poker_sns_uploads/_data/ogp/ -atime +7 -delete
```

### PostgreSQL接続不可時
```bash
# 1. コンテナ状態確認
docker compose logs --tail=100 db

# 2. ヘルスチェック
docker compose exec db pg_isready -U postgres

# 3. 再起動
docker compose restart db

# 4. バックアップからのリストア（最終手段）
docker compose down
docker volume rm poker_sns_pgdata
docker compose up -d db
cat /opt/poker-sns/backups/latest.sql | docker compose exec -T db psql -U postgres
```
