# セキュリティ監視・攻撃検知・異常トラフィック通知 設計書

> Operations担当: 星街 / 白上
> 作成日: 2026-03-02
> 対象: poker_sns 本番環境
> 前提: 既存の `ops-monitoring-alerting.md`（ヘルスチェック・ディスク監視）を補完する位置づけ

---

## 1. 目的

既存のヘルスチェック（サービス死活・ディスク容量）に加え、以下を実現する:

1. **nginxアクセスログの構造化収集** — JSON形式でパース・集計可能にする
2. **攻撃検知** — ブルートフォース、パストラバーサル、スキャナー等の自動検出
3. **異常トラフィック通知** — 閾値ベースのアラート発報

---

## 2. アクセスログ構造化

### 2.1 現状の課題

- nginx デフォルトの `combined` ログフォーマットのみ（UTM用の `analytics` フォーマットは設計済みだが未適用）
- 構造化されていないためスクリプトでのパースが不安定
- リクエストレート、エラー率の可視化が困難

### 2.2 推奨ログフォーマット（JSON）

```nginx
# nginx-prod.conf の http ブロック（server の外側）に追加
log_format json_security escape=json
  '{'
    '"time":"$time_iso8601",'
    '"remote_addr":"$remote_addr",'
    '"request_method":"$request_method",'
    '"request_uri":"$request_uri",'
    '"status":$status,'
    '"body_bytes_sent":$body_bytes_sent,'
    '"request_time":$request_time,'
    '"http_referer":"$http_referer",'
    '"http_user_agent":"$http_user_agent",'
    '"upstream_response_time":"$upstream_response_time",'
    '"limit_req_status":"$limit_req_status"'
  '}';

# セキュリティ監視用アクセスログ
access_log /var/log/nginx/security.json json_security;

# 既存のアクセスログも維持
access_log /var/log/nginx/access.log combined;
```

### 2.3 ログローテーション追加

```
# /etc/logrotate.d/poker-sns に追記
/var/log/nginx/security.json {
    daily
    rotate 30
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

## 3. 攻撃検知スクリプト

### 3.1 統合セキュリティスキャン

```bash
#!/bin/bash
# /opt/poker-sns/scripts/security-scan.sh
# 15分ごとに実行し、攻撃パターンを検出してアラートを送信

set -euo pipefail

LOG="/var/log/nginx/security.json"
ALERT_LOG="/var/log/poker-sns/security-alerts.log"
ALERT_EMAIL="ops@example.com"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
WINDOW_MINUTES=15
ALERTS=()

log_alert() {
  local severity="$1"
  local message="$2"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$severity] $message" >> "$ALERT_LOG"
  ALERTS+=("[$severity] $message")
}

# 直近N分のログを抽出
SINCE=$(date -d "$WINDOW_MINUTES minutes ago" '+%Y-%m-%dT%H:%M' 2>/dev/null || date -v-${WINDOW_MINUTES}M '+%Y-%m-%dT%H:%M')
RECENT_LOG=$(mktemp)
jq -r "select(.time >= \"$SINCE\")" "$LOG" > "$RECENT_LOG" 2>/dev/null || true

if [ ! -s "$RECENT_LOG" ]; then
  rm -f "$RECENT_LOG"
  exit 0
fi

# -----------------------------------------------------------
# 検知ルール 1: ブルートフォース攻撃（認証系エンドポイント）
# 同一IPから15分間に20回以上の認証失敗（401/403）
# -----------------------------------------------------------
AUTH_BRUTE=$(jq -r 'select(
  (.request_uri | test("/auth/login|/auth/register|/auth/reset-password")) and
  (.status == 401 or .status == 403)
) | .remote_addr' "$RECENT_LOG" | sort | uniq -c | sort -rn | awk '$1 >= 20 {print $1, $2}')

if [ -n "$AUTH_BRUTE" ]; then
  log_alert "CRITICAL" "Brute-force detected on auth endpoints: $AUTH_BRUTE"
fi

# -----------------------------------------------------------
# 検知ルール 2: パストラバーサル / ディレクトリスキャン
# ../../, /etc/passwd, .env, wp-admin 等の攻撃パターン
# -----------------------------------------------------------
TRAVERSAL_COUNT=$(jq -r 'select(
  .request_uri | test("\\.\\.[\\/]|/etc/passwd|/proc/|/wp-admin|/wp-login|\\.env|/phpMyAdmin|/actuator|/\.git"; "i")
) | .remote_addr' "$RECENT_LOG" | wc -l | tr -d ' ')

if [ "$TRAVERSAL_COUNT" -gt 5 ]; then
  TRAVERSAL_IPS=$(jq -r 'select(
    .request_uri | test("\\.\\.[\\/]|/etc/passwd|/proc/|/wp-admin|/wp-login|\\.env|/phpMyAdmin|/actuator|/\\.git"; "i")
  ) | .remote_addr' "$RECENT_LOG" | sort | uniq -c | sort -rn | head -5)
  log_alert "HIGH" "Path traversal/scanner detected (${TRAVERSAL_COUNT} requests): Top IPs: $TRAVERSAL_IPS"
fi

# -----------------------------------------------------------
# 検知ルール 3: 異常リクエストレート（DDoS兆候）
# 同一IPから15分間に500リクエスト以上
# -----------------------------------------------------------
HIGH_RATE=$(jq -r '.remote_addr' "$RECENT_LOG" | sort | uniq -c | sort -rn | awk '$1 >= 500 {print $1, $2}')

if [ -n "$HIGH_RATE" ]; then
  log_alert "HIGH" "Abnormal request rate detected: $HIGH_RATE"
fi

# -----------------------------------------------------------
# 検知ルール 4: Rate Limit発動の頻発
# limit_req_statusが"REJECTED"のリクエストが50件以上
# -----------------------------------------------------------
REJECTED_COUNT=$(jq -r 'select(.limit_req_status == "REJECTED") | .remote_addr' "$RECENT_LOG" 2>/dev/null | wc -l | tr -d ' ')

if [ "$REJECTED_COUNT" -gt 50 ]; then
  REJECTED_IPS=$(jq -r 'select(.limit_req_status == "REJECTED") | .remote_addr' "$RECENT_LOG" | sort | uniq -c | sort -rn | head -5)
  log_alert "MEDIUM" "Rate limiting triggered ${REJECTED_COUNT} times. Top IPs: $REJECTED_IPS"
fi

# -----------------------------------------------------------
# 検知ルール 5: 4xx/5xxエラー率異常
# 15分間の全リクエスト中、5xx率が5%超 or 4xx率が30%超
# -----------------------------------------------------------
TOTAL=$(wc -l < "$RECENT_LOG" | tr -d ' ')
if [ "$TOTAL" -gt 100 ]; then
  ERR_5XX=$(jq -r 'select(.status >= 500) | .status' "$RECENT_LOG" | wc -l | tr -d ' ')
  ERR_4XX=$(jq -r 'select(.status >= 400 and .status < 500) | .status' "$RECENT_LOG" | wc -l | tr -d ' ')

  RATE_5XX=$((ERR_5XX * 100 / TOTAL))
  RATE_4XX=$((ERR_4XX * 100 / TOTAL))

  if [ "$RATE_5XX" -gt 5 ]; then
    log_alert "CRITICAL" "5xx error rate at ${RATE_5XX}% (${ERR_5XX}/${TOTAL} requests)"
  fi
  if [ "$RATE_4XX" -gt 30 ]; then
    log_alert "MEDIUM" "4xx error rate at ${RATE_4XX}% (${ERR_4XX}/${TOTAL} requests)"
  fi
fi

# -----------------------------------------------------------
# 検知ルール 6: SQLインジェクション試行
# -----------------------------------------------------------
SQLI_COUNT=$(jq -r 'select(
  .request_uri | test("UNION\\s+SELECT|OR\\s+1=1|DROP\\s+TABLE|;\\s*DELETE|/\\*.*\\*/"; "i")
) | .remote_addr' "$RECENT_LOG" 2>/dev/null | wc -l | tr -d ' ')

if [ "$SQLI_COUNT" -gt 0 ]; then
  SQLI_IPS=$(jq -r 'select(
    .request_uri | test("UNION\\s+SELECT|OR\\s+1=1|DROP\\s+TABLE|;\\s*DELETE|/\\*.*\\*/"; "i")
  ) | .remote_addr' "$RECENT_LOG" | sort -u | head -5)
  log_alert "CRITICAL" "SQL injection attempts detected (${SQLI_COUNT}): IPs: $SQLI_IPS"
fi

# -----------------------------------------------------------
# アラート送信
# -----------------------------------------------------------
rm -f "$RECENT_LOG"

if [ ${#ALERTS[@]} -gt 0 ]; then
  BODY=$(printf '%s\n' "${ALERTS[@]}")
  SUBJECT="[Poker SNS SECURITY] ${#ALERTS[@]} alert(s) detected"

  # メール送信
  echo "$BODY" | mail -s "$SUBJECT" "$ALERT_EMAIL" 2>/dev/null || true

  # Slack送信（Webhook設定済みの場合）
  if [ -n "$SLACK_WEBHOOK" ]; then
    SLACK_MSG=$(echo "$BODY" | sed 's/"/\\"/g' | tr '\n' '|' | sed 's/|/\\n/g')
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"$SUBJECT\n$SLACK_MSG\"}" > /dev/null 2>&1 || true
  fi
fi
```

### 3.2 cron設定

```cron
# 15分ごとにセキュリティスキャン
*/15 * * * * /opt/poker-sns/scripts/security-scan.sh
```

---

## 4. アラート閾値一覧

| ルール | 検知条件 | 深刻度 | 通知先 |
|--------|---------|--------|--------|
| ブルートフォース | 認証系に同一IPから15分で20回以上の401/403 | CRITICAL | Email + Slack |
| パストラバーサル/スキャナー | 攻撃パターンURLが15分で5件以上 | HIGH | Email + Slack |
| 異常リクエストレート | 同一IPから15分で500リクエスト以上 | HIGH | Email + Slack |
| Rate Limit頻発 | REJECTED応答が15分で50件以上 | MEDIUM | Email |
| 5xxエラー率 | 15分間で5%超（最低100リクエスト） | CRITICAL | Email + Slack |
| 4xxエラー率 | 15分間で30%超（最低100リクエスト） | MEDIUM | Email |
| SQLインジェクション | 攻撃パターンが1件以上 | CRITICAL | Email + Slack |

### 閾値チューニング方針

- 運用開始後2週間は**通知のみ**（自動ブロックなし）で誤検知率を観察
- 誤検知率が5%以下になったら `fail2ban` 連携による自動IP遮断を検討
- 閾値は月次で見直し、トラフィック増加に応じて調整

---

## 5. 自動IP遮断（Phase 2）

### 5.1 fail2ban連携設計

運用開始後の Phase 2 で導入を検討。Phase 1 では通知のみ。

```ini
# /etc/fail2ban/jail.d/poker-sns.conf
[poker-sns-auth]
enabled = true
filter = poker-sns-auth
logpath = /var/log/nginx/security.json
maxretry = 20
findtime = 900
bantime = 3600
action = iptables-multiport[name=poker-sns, port="80,443"]

[poker-sns-scanner]
enabled = true
filter = poker-sns-scanner
logpath = /var/log/nginx/security.json
maxretry = 5
findtime = 300
bantime = 86400
action = iptables-multiport[name=poker-sns, port="80,443"]
```

```ini
# /etc/fail2ban/filter.d/poker-sns-auth.conf
[Definition]
failregex = "remote_addr":"<HOST>".*"request_uri":"/(auth/login|auth/register)".*"status":(401|403)

# /etc/fail2ban/filter.d/poker-sns-scanner.conf
[Definition]
failregex = "remote_addr":"<HOST>".*"request_uri":".*(\.\./|/etc/passwd|\.env|wp-admin|wp-login|phpMyAdmin|/\.git)"
```

### 5.2 ホワイトリスト

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1
# 運用者IP、Stripe Webhook IP、Google Bot等を追加
```

---

## 6. 日次セキュリティサマリーレポート

```bash
#!/bin/bash
# /opt/poker-sns/scripts/daily-security-report.sh
# 毎日 7:00 に前日のセキュリティサマリーを生成

LOG="/var/log/nginx/security.json"
YESTERDAY=$(date -d yesterday '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d')
REPORT="/var/log/poker-sns/security-daily-${YESTERDAY}.txt"

echo "=======================================" > "$REPORT"
echo " Poker SNS Daily Security Report" >> "$REPORT"
echo " Date: $YESTERDAY" >> "$REPORT"
echo "=======================================" >> "$REPORT"
echo "" >> "$REPORT"

# 1. 総リクエスト数
TOTAL=$(grep "$YESTERDAY" "$LOG" | wc -l | tr -d ' ')
echo "Total Requests: $TOTAL" >> "$REPORT"
echo "" >> "$REPORT"

# 2. ステータスコード別集計
echo "--- Status Code Distribution ---" >> "$REPORT"
grep "$YESTERDAY" "$LOG" | jq -r '.status' | sort | uniq -c | sort -rn >> "$REPORT"
echo "" >> "$REPORT"

# 3. Top 20 IP (リクエスト数)
echo "--- Top 20 IPs by Request Count ---" >> "$REPORT"
grep "$YESTERDAY" "$LOG" | jq -r '.remote_addr' | sort | uniq -c | sort -rn | head -20 >> "$REPORT"
echo "" >> "$REPORT"

# 4. 攻撃パターン検出数
ATTACK_COUNT=$(grep "$YESTERDAY" "$LOG" | jq -r 'select(
  .request_uri | test("\\.\\.[\\/]|/etc/passwd|wp-admin|\\.env|phpMyAdmin|UNION|DROP|/\\.git"; "i")
)' 2>/dev/null | wc -l | tr -d ' ')
echo "Attack Pattern Requests: $ATTACK_COUNT" >> "$REPORT"
echo "" >> "$REPORT"

# 5. Rate Limit発動回数
RATE_LIMITED=$(grep "$YESTERDAY" "$LOG" | jq -r 'select(.limit_req_status == "REJECTED")' 2>/dev/null | wc -l | tr -d ' ')
echo "Rate Limited Requests: $RATE_LIMITED" >> "$REPORT"
echo "" >> "$REPORT"

# 6. 認証失敗 Top 10 IP
echo "--- Top 10 IPs with Auth Failures ---" >> "$REPORT"
grep "$YESTERDAY" "$LOG" | jq -r 'select(
  (.request_uri | test("/auth/")) and (.status == 401 or .status == 403)
) | .remote_addr' 2>/dev/null | sort | uniq -c | sort -rn | head -10 >> "$REPORT"
echo "" >> "$REPORT"

# 7. セキュリティアラート一覧
ALERT_COUNT=$(grep "$YESTERDAY" /var/log/poker-sns/security-alerts.log 2>/dev/null | wc -l | tr -d ' ')
echo "Security Alerts Triggered: $ALERT_COUNT" >> "$REPORT"
if [ "$ALERT_COUNT" -gt 0 ]; then
  echo "" >> "$REPORT"
  grep "$YESTERDAY" /var/log/poker-sns/security-alerts.log >> "$REPORT" 2>/dev/null
fi

echo "" >> "$REPORT"
echo "=======================================" >> "$REPORT"
echo "Report generated at $(date)" >> "$REPORT"

# メール送信
cat "$REPORT" | mail -s "[Poker SNS] Daily Security Report: $YESTERDAY" ops@example.com 2>/dev/null || true
```

### cron設定

```cron
# 毎日 7:00 にセキュリティ日次レポート
0 7 * * * /opt/poker-sns/scripts/daily-security-report.sh
```

---

## 7. docker-compose.yml への変更提案

nginxコンテナに `/var/log/nginx/` をホストにマウントしてログアクセスを可能にする:

```yaml
# docker-compose.yml の nginx サービスに追加
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - certbot-www:/var/www/certbot:ro
    - certbot-conf:/etc/letsencrypt:ro
    - nginx-logs:/var/log/nginx    # 追加: ログ永続化

volumes:
  nginx-logs:  # 追加
```

---

## 8. 既存crontabへの追加分まとめ

```cron
# === セキュリティ監視（本文書で追加分）===
*/15 * * * * /opt/poker-sns/scripts/security-scan.sh
0 7 * * * /opt/poker-sns/scripts/daily-security-report.sh
```

既存の crontab（ops-deploy-runbook.md記載）と統合した完全版:

```cron
# Poker SNS Operations - Complete Crontab
# --- ヘルスチェック・監視 ---
*/5 * * * *   /opt/poker-sns/scripts/healthcheck.sh
*/15 * * * *  /opt/poker-sns/scripts/security-scan.sh

# --- バックアップ ---
0 3 * * *     /opt/poker-sns/scripts/backup-db.sh >> /var/log/poker-sns/backup.log 2>&1
0 4 * * *     /opt/poker-sns/scripts/backup-uploads.sh >> /var/log/poker-sns/backup.log 2>&1

# --- レポート ---
0 6 * * *     /opt/poker-sns/scripts/utm-report.sh >> /var/log/poker-sns/utm-report.log 2>&1
0 7 * * *     /opt/poker-sns/scripts/daily-security-report.sh

# --- ディスク・メンテナンス ---
0 9 * * *     /opt/poker-sns/scripts/check-disk-usage.sh >> /var/log/poker-sns/disk-check.log 2>&1
0 2 * * 1     /opt/poker-sns/scripts/db-maintenance.sh >> /var/log/poker-sns/db-maintenance.log 2>&1
30 3 * * 0    /opt/poker-sns/scripts/cleanup-ogp.sh
```

---

## 9. 外部監視サービス連携（推奨）

| サービス | 用途 | 無料枠 | 導入優先度 |
|---------|------|-------|-----------|
| UptimeRobot | HTTPS外部死活監視 | 50モニター | P0（即時） |
| Better Stack | ログ集約+インシデント管理 | 1GB/月 | P1（DAU 500超で） |
| Cloudflare（DNS+WAF） | DDoS防御+Bot管理 | Free plan | P1（公開後即時検討） |

### UptimeRobot 設定推奨

| モニター | URL | 間隔 | アラート |
|---------|-----|------|---------|
| Frontend | `https://domain.com/` | 5分 | Email + Slack |
| API Health | `https://domain.com/api/health` | 5分 | Email + Slack |
| SSL Cert | `https://domain.com/` (SSL Monitor) | 日次 | 14日前通知 |
