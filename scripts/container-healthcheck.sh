#!/bin/bash
# =============================================================
# Docker コンテナ + Nginx ヘルスチェック（5分間隔）
# 既存の health-check.sh を補完し、コンテナレベル監視を追加
#
# crontab: */5 * * * * /opt/poker_sns/scripts/container-healthcheck.sh
#
# 環境変数:
#   DISCORD_WEBHOOK_URL  - Discord通知用 (任意)
#   SLACK_WEBHOOK_URL    - Slack通知用 (任意)
#   COMPOSE_DIR          - docker-compose.ymlのディレクトリ (デフォルト: /opt/poker_sns)
#   NGINX_ERROR_THRESHOLD - 5分間のnginxエラー閾値 (デフォルト: 50)
# =============================================================
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/opt/poker_sns}"
STATE_FILE="/tmp/poker_sns_container_health_state"
NGINX_ERROR_THRESHOLD="${NGINX_ERROR_THRESHOLD:-50}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
LOG_FILE="/var/log/poker_sns/container-healthcheck.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE" 2>/dev/null || echo "$*"
}

# ── 通知関数 ─────────────────────────────────────────────
notify() {
  local level="$1" title="$2" msg="$3"
  local discord_color slack_color

  case "$level" in
    error)   discord_color=15158332; slack_color="danger" ;;
    warning) discord_color=16776960; slack_color="warning" ;;
    ok)      discord_color=3066993;  slack_color="good" ;;
  esac

  # Discord
  if [ -n "$DISCORD_WEBHOOK" ]; then
    curl -s -H "Content-Type: application/json" \
      -d "{\"embeds\":[{\"title\":\"${title}\",\"description\":\"${msg}\",\"color\":${discord_color},\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
      "$DISCORD_WEBHOOK" >/dev/null 2>&1 || true
  fi

  # Slack
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"attachments\":[{\"color\":\"${slack_color}\",\"title\":\"${title}\",\"text\":\"${msg}\",\"footer\":\"poker_sns Container Health\",\"ts\":$(date +%s)}]}" \
      >/dev/null 2>&1 || true
  fi
}

# ── Docker コンテナ状態チェック ───────────────────────────
check_containers() {
  local issues=""
  local services=("db" "backend" "frontend" "nginx")

  cd "$COMPOSE_DIR"

  for svc in "${services[@]}"; do
    # コンテナ稼働状態
    local status
    status=$(docker compose ps --format '{{.State}}' "$svc" 2>/dev/null || echo "not_found")

    if [ "$status" != "running" ]; then
      issues="${issues}${svc}: not running (${status})\n"
      log "WARN: ${svc} is ${status}"

      # 自動再起動試行
      log "Attempting restart of ${svc}..."
      docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d "$svc" 2>/dev/null || true
      continue
    fi

    # ヘルスチェック状態 (healthcheck定義があるサービスのみ)
    local health
    health=$(docker compose ps --format '{{.Health}}' "$svc" 2>/dev/null || echo "")
    if [ -n "$health" ] && [ "$health" != "healthy" ] && [ "$health" != "" ]; then
      issues="${issues}${svc}: unhealthy (${health})\n"
      log "WARN: ${svc} health=${health}"
    fi
  done

  echo -n "$issues"
}

# ── Nginx エラーログ監視 ──────────────────────────────────
check_nginx_errors() {
  local nginx_container
  nginx_container=$(docker compose -f "$COMPOSE_DIR/docker-compose.yml" ps -q nginx 2>/dev/null || echo "")

  if [ -z "$nginx_container" ]; then
    echo "nginx container not found"
    return
  fi

  # 過去5分間のnginx エラーログをカウント
  local error_count
  error_count=$(docker logs "$nginx_container" --since 5m 2>&1 | grep -cE '\[(error|crit|alert|emerg)\]' || echo "0")

  # 5xxレスポンスのカウント
  local http5xx_count
  http5xx_count=$(docker logs "$nginx_container" --since 5m 2>&1 | grep -cE '" 5[0-9]{2} ' || echo "0")

  local issues=""
  if [ "$error_count" -gt "$NGINX_ERROR_THRESHOLD" ]; then
    issues="nginx error log: ${error_count} errors in last 5m (threshold: ${NGINX_ERROR_THRESHOLD})\n"
    log "WARN: nginx ${error_count} errors in 5m"
  fi

  if [ "$http5xx_count" -gt 10 ]; then
    issues="${issues}nginx 5xx responses: ${http5xx_count} in last 5m\n"
    log "WARN: nginx ${http5xx_count} 5xx responses in 5m"
  fi

  echo -n "$issues"
}

# ── ディスク使用量チェック ────────────────────────────────
check_disk() {
  local usage
  usage=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
  if [ "$usage" -gt 85 ]; then
    echo "Disk usage: ${usage}% (threshold: 85%)\n"
    log "WARN: Disk usage ${usage}%"

    # 古いDockerイメージを自動プルーン
    if [ "$usage" -gt 90 ]; then
      log "Auto-pruning unused Docker images..."
      docker image prune -f --filter "until=72h" >/dev/null 2>&1 || true
    fi
  fi
}

# ── メモリ使用量チェック ──────────────────────────────────
check_memory() {
  local mem_total mem_avail pct_used
  mem_total=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "0")
  mem_avail=$(grep MemAvailable /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "0")

  if [ "$mem_total" -gt 0 ]; then
    pct_used=$(( (mem_total - mem_avail) * 100 / mem_total ))
    if [ "$pct_used" -gt 90 ]; then
      echo "Memory usage: ${pct_used}% (threshold: 90%)\n"
      log "WARN: Memory usage ${pct_used}%"
    fi
  fi
}

# ── メイン処理 ────────────────────────────────────────────
main() {
  log "Starting container health check..."

  local all_issues=""
  all_issues+=$(check_containers)
  all_issues+=$(check_nginx_errors)
  all_issues+=$(check_disk)
  all_issues+=$(check_memory)

  PREV_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "")

  if [ -n "$all_issues" ]; then
    # 問題あり
    log "Issues found: $all_issues"

    if [ "$PREV_STATE" != "unhealthy" ]; then
      notify "error" "Container Health Alert" "$all_issues"
    fi
    echo "unhealthy" > "$STATE_FILE"
  else
    # 正常
    log "All checks passed"

    if [ "$PREV_STATE" = "unhealthy" ]; then
      notify "ok" "Container Health Recovered" "All services healthy. Issue resolved."
    fi
    echo "healthy" > "$STATE_FILE"
  fi
}

main "$@"
