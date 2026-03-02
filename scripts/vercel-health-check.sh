#!/bin/bash
# =============================================================
# Vercel デプロイ後ヘルスチェックスクリプト
# フェーズ1: フロントエンド単体 (Vercel) の疎通確認
# フェーズ2: バックエンドAPI接続確認 (API URL設定後)
# Usage: ./scripts/vercel-health-check.sh <VERCEL_URL> [--with-api]
# =============================================================
set -euo pipefail

VERCEL_URL="${1:-}"
WITH_API="${2:-}"
EXIT_CODE=0
RESULTS=()

if [ -z "$VERCEL_URL" ]; then
  echo "Usage: $0 <VERCEL_URL> [--with-api]"
  echo "  VERCEL_URL: Vercel deployment URL (e.g. https://poker-sns.vercel.app)"
  echo "  --with-api: Also check backend API connectivity"
  exit 1
fi

# Remove trailing slash
VERCEL_URL="${VERCEL_URL%/}"

check_url() {
  local label="$1" url="$2" expected_status="${3:-200}"
  local status body_size
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 -L "$url" 2>/dev/null || echo "000")
  body_size=$(curl -s -L --max-time 15 "$url" 2>/dev/null | wc -c || echo "0")

  if [ "$status" = "$expected_status" ] && [ "$body_size" -gt 100 ]; then
    RESULTS+=("PASS  $label  HTTP $status  (${body_size}B)")
    return 0
  else
    RESULTS+=("FAIL  $label  HTTP $status  (${body_size}B, expected $expected_status)")
    return 1
  fi
}

echo "=============================================="
echo " Vercel Health Check - $(date '+%Y-%m-%d %H:%M:%S')"
echo " Target: $VERCEL_URL"
echo "=============================================="
echo ""

# ── Phase 1: Frontend pages ──────────────────────────
echo "[Phase 1] Frontend page rendering"

check_url "Top Page (/)" "$VERCEL_URL/" || EXIT_CODE=1
check_url "Landing Page (/lp)" "$VERCEL_URL/lp" || EXIT_CODE=1
check_url "Login Page (/login)" "$VERCEL_URL/login" || EXIT_CODE=1

# ── Phase 2: API connectivity (optional) ─────────────
if [ "$WITH_API" = "--with-api" ]; then
  echo ""
  echo "[Phase 2] Backend API connectivity"

  API_URL=$(curl -s -L "$VERCEL_URL/" 2>/dev/null | grep -o 'NEXT_PUBLIC_API_URL[^"]*' | head -1 || echo "")

  check_url "Health API (/api/health)" "$VERCEL_URL/api/health" || EXIT_CODE=1
fi

# ── Results ──────────────────────────────────────────
echo ""
echo "----------------------------------------------"
echo " Results"
echo "----------------------------------------------"
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo "----------------------------------------------"

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "  STATUS: ALL CHECKS PASSED"
else
  echo "  STATUS: SOME CHECKS FAILED"
fi

echo ""
exit "$EXIT_CODE"
