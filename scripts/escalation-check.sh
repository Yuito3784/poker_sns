#!/bin/bash
# =============================================================
# エスカレーション付きヘルスチェック + タスク棚卸しスクリプト
# 既存 health-check.sh を補完し、エスカレーションルールを統合
# crontab: */5 * * * * /opt/poker_sns/scripts/escalation-check.sh
# =============================================================
set -euo pipefail

# ── 設定 ──────────────────────────────────────────────────
DOMAIN="${HEALTH_CHECK_DOMAIN:-localhost}"
DISCORD_OPS_ALERTS="${DISCORD_OPS_ALERTS_URL:-}"
DISCORD_OPS_URGENT="${DISCORD_OPS_URGENT_URL:-}"
DISCORD_OPS_EMERGENCY="${DISCORD_OPS_EMERGENCY_URL:-}"
STATE_FILE="/var/log/poker-sns/escalation-state.json"
LOG_FILE="/var/log/poker-sns/escalation.log"
DEPLOY_FLAG="/tmp/poker_sns_deploying"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

# ── 状態ファイル初期化 ────────────────────────────────────
if [ ! -f "$STATE_FILE" ]; then
  echo '{"alerts":{}}' > "$STATE_FILE"
fi

# ── エスカレーションレベル判定 ─────────────────────────────
get_level() {
  local count="$1"
  local initial_level="${2:-L1}"

  if [ "$initial_level" = "L3" ]; then
    echo "L3"
    return
  fi

  if [ "$count" -ge 6 ]; then
    echo "L3"
  elif [ "$count" -ge 3 ]; then
    echo "L2"
  elif [ "$count" -ge 2 ]; then
    echo "L1"
  else
    echo "L0"
  fi
}

# ── Discord通知（レベル別） ───────────────────────────────
notify() {
  local level="$1" title="$2" desc="$3" count="$4"

  local webhook=""
  local color=0

  case "$level" in
    L0) return 0 ;;  # L0はログのみ
    L1) webhook="$DISCORD_OPS_ALERTS"; color=16776960 ;;   # yellow
    L2) webhook="$DISCORD_OPS_URGENT"; color=16744448 ;;   # orange
    L3) webhook="$DISCORD_OPS_EMERGENCY"; color=16711680 ;; # red
  esac

  # フォールバック: 上位チャンネル未設定時はalertsへ
  [ -z "$webhook" ] && webhook="$DISCORD_OPS_ALERTS"
  [ -z "$webhook" ] && { log "No webhook configured for $level"; return 0; }

  # デプロイ中はL1抑制
  if [ -f "$DEPLOY_FLAG" ] && [ "$level" = "L1" ]; then
    log "Suppressed L1 notification during deploy: $title"
    return 0
  fi

  local mention=""
  [ "$level" = "L3" ] && mention="@here "

  curl -s -H "Content-Type: application/json" \
    -d "{\"content\":\"${mention}\",\"embeds\":[{\"title\":\"[$level] $title\",\"description\":\"$desc\nConsecutive: ${count}x\",\"color\":$color,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
    "$webhook" > /dev/null 2>&1 || true

  log "NOTIFIED $level: $title (count=$count)"
}

# ── 状態更新 + エスカレーション判定 ───────────────────────
# jq が必要: apt-get install jq
process_alert() {
  local alert_key="$1" description="$2" initial_level="${3:-L1}"

  # 現在の状態読み取り
  local current_count
  current_count=$(jq -r ".alerts[\"$alert_key\"].consecutive_count // 0" "$STATE_FILE")
  local new_count=$((current_count + 1))

  local prev_level
  prev_level=$(jq -r ".alerts[\"$alert_key\"].current_level // \"\"" "$STATE_FILE")

  local new_level
  new_level=$(get_level "$new_count" "$initial_level")

  # 状態更新
  local now
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local tmp
  tmp=$(mktemp)
  jq ".alerts[\"$alert_key\"] = {
    \"consecutive_count\": $new_count,
    \"current_level\": \"$new_level\",
    \"last_checked\": \"$now\",
    \"description\": \"$description\"
  }" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"

  log "ALERT $alert_key: count=$new_count level=$new_level (prev=$prev_level)"

  # レベルが上がった場合のみ通知
  if [ "$new_level" != "$prev_level" ] && [ "$new_level" != "L0" ]; then
    notify "$new_level" "$alert_key" "$description" "$new_count"
  fi
}

# ── アラート解消 ──────────────────────────────────────────
clear_alert() {
  local alert_key="$1"
  local prev_level
  prev_level=$(jq -r ".alerts[\"$alert_key\"].current_level // \"\"" "$STATE_FILE")

  if [ -n "$prev_level" ] && [ "$prev_level" != "" ]; then
    local prev_count
    prev_count=$(jq -r ".alerts[\"$alert_key\"].consecutive_count // 0" "$STATE_FILE")

    if [ "$prev_count" -gt 0 ]; then
      # 復旧通知
      local webhook="${DISCORD_OPS_ALERTS:-}"
      if [ -n "$webhook" ]; then
        curl -s -H "Content-Type: application/json" \
          -d "{\"embeds\":[{\"title\":\"[RESOLVED] $alert_key\",\"description\":\"Service recovered. Was at $prev_level for ${prev_count} checks.\",\"color\":3066993,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
          "$webhook" > /dev/null 2>&1 || true
      fi
      log "RESOLVED $alert_key (was $prev_level, count=$prev_count)"
    fi

    # 状態クリア
    local tmp
    tmp=$(mktemp)
    jq "del(.alerts[\"$alert_key\"])" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
  fi
}

# ── チェック実行 ──────────────────────────────────────────

# 1. API ヘルスチェック
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN/api/health" 2>/dev/null || echo "000")
if [ "$API_CODE" != "200" ]; then
  process_alert "api_health_failure" "API /health returned HTTP $API_CODE" "L1"
else
  clear_alert "api_health_failure"
fi

# 2. フロントエンド確認
LP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN/lp" 2>/dev/null || echo "000")
if [ "$LP_CODE" != "200" ]; then
  process_alert "frontend_lp_failure" "LP /lp returned HTTP $LP_CODE" "L1"
else
  clear_alert "frontend_lp_failure"
fi

# 3. ディスク使用率
DISK_USAGE=$(df / 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
if [ -n "$DISK_USAGE" ]; then
  if [ "$DISK_USAGE" -ge 95 ]; then
    process_alert "disk_critical" "Host disk at ${DISK_USAGE}% (>=95%)" "L3"
  elif [ "$DISK_USAGE" -ge 90 ]; then
    process_alert "disk_high" "Host disk at ${DISK_USAGE}% (>=90%)" "L2"
    clear_alert "disk_critical"
  elif [ "$DISK_USAGE" -ge 80 ]; then
    process_alert "disk_warning" "Host disk at ${DISK_USAGE}% (>=80%)" "L1"
    clear_alert "disk_high"
    clear_alert "disk_critical"
  else
    clear_alert "disk_warning"
    clear_alert "disk_high"
    clear_alert "disk_critical"
  fi
fi

log "CHECK COMPLETE: api=$API_CODE lp=$LP_CODE disk=${DISK_USAGE}%"
