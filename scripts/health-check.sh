#!/bin/bash
# =============================================================
# ヘルスチェック + Discord 通知スクリプト
# UptimeRobot の補完として、サーバー内部からも監視
# crontab: */5 * * * * /opt/poker_sns/scripts/health-check.sh
# =============================================================
set -euo pipefail

DOMAIN="${HEALTH_CHECK_DOMAIN:-localhost}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"
STATE_FILE="/tmp/poker_sns_health_state"

check_endpoint() {
  local name="$1" url="$2"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  echo "$name:$status"
}

notify_discord() {
  local color="$1" title="$2" desc="$3"
  [ -z "$DISCORD_WEBHOOK" ] && return 0
  curl -s -H "Content-Type: application/json" \
    -d "{\"embeds\":[{\"title\":\"$title\",\"description\":\"$desc\",\"color\":$color,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
    "$DISCORD_WEBHOOK" || true
}

# ── チェック実行 ─────────────────────────────────────────
API_STATUS=$(check_endpoint "API" "https://$DOMAIN/api/health")
LP_STATUS=$(check_endpoint "LP" "https://$DOMAIN/lp")

CURRENT_STATE="$API_STATUS|$LP_STATUS"
PREV_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "")

# ── 状態変化時のみ通知 ───────────────────────────────────
if [ "$CURRENT_STATE" != "$PREV_STATE" ]; then
  API_CODE="${API_STATUS##*:}"
  LP_CODE="${LP_STATUS##*:}"

  if [ "$API_CODE" = "200" ] && [ "$LP_CODE" = "200" ]; then
    if [ -n "$PREV_STATE" ]; then
      notify_discord 3066993 "Service Recovered" "API: $API_CODE, LP: $LP_CODE"
    fi
  else
    DETAILS=""
    [ "$API_CODE" != "200" ] && DETAILS="API /health: HTTP $API_CODE\n"
    [ "$LP_CODE" != "200" ] && DETAILS="${DETAILS}LP /lp: HTTP $LP_CODE"
    notify_discord 15158332 "Service DOWN" "$DETAILS"
  fi
fi

echo "$CURRENT_STATE" > "$STATE_FILE"
