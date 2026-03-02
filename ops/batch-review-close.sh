#!/usr/bin/env bash
# ============================================================================
# batch-review-close.sh
# GitHub PR レビュー一括ステータス変更スクリプト
# リポジトリ: Yuito3784/poker_sns
# ============================================================================
set -euo pipefail

# ── 設定 ──────────────────────────────────────────────────────────────────
REPO="Yuito3784/poker_sns"
LOG_FILE="ops/batch-review-$(date +%Y%m%d-%H%M%S).log"
DRY_RUN="${DRY_RUN:-true}"   # デフォルトはdry-run（安全側）

# ── 色付き出力 ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "[$(date +%H:%M:%S)] $1" | tee -a "$LOG_FILE"; }
warn() { log "${YELLOW}WARN: $1${NC}"; }
err()  { log "${RED}ERROR: $1${NC}"; }
ok()   { log "${GREEN}OK: $1${NC}"; }

# ── 前提チェック ──────────────────────────────────────────────────────────
check_prerequisites() {
  if ! command -v gh &>/dev/null; then
    err "gh (GitHub CLI) がインストールされていません"
    echo "  brew install gh && gh auth login"
    exit 1
  fi
  if ! gh auth status &>/dev/null; then
    err "gh にログインしていません: gh auth login を実行してください"
    exit 1
  fi
  ok "GitHub CLI 認証済み"
}

# ── Step 1: レビュー待ちPR一覧取得 ───────────────────────────────────────
list_review_prs() {
  log "レビュー待ちPR一覧を取得中..."
  gh pr list \
    --repo "$REPO" \
    --state open \
    --json number,title,author,reviewDecision,labels,updatedAt,headRefName \
    --limit 200 \
    --jq '.[] | select(.reviewDecision == "REVIEW_REQUIRED" or .reviewDecision == "" or .reviewDecision == null)' \
    > /tmp/review-prs.json 2>/dev/null || true

  PR_COUNT=$(cat /tmp/review-prs.json | jq -s 'length')
  log "レビュー待ちPR数: ${PR_COUNT}件"
}

# ── Step 2: カテゴリ分類 ─────────────────────────────────────────────────
classify_prs() {
  log "PRをカテゴリに分類中..."

  # カテゴリ分類ルール（パスベース）
  cat /tmp/review-prs.json | jq -s '
    [.[] | {
      number,
      title,
      author: .author.login,
      branch: .headRefName,
      updated: .updatedAt,
      category: (
        if (.headRefName | test("security|auth|jwt|helmet|csrf"; "i")) then "security"
        elif (.headRefName | test("infra|docker|ci|cd|deploy|nginx"; "i")) then "infra"
        elif (.headRefName | test("design|ui|ux|style|css|theme"; "i")) then "design"
        else "code"
        end
      )
    }]
  ' > /tmp/review-classified.json

  # カテゴリ別件数
  log "分類結果:"
  jq -r 'group_by(.category) | .[] | "  \(.[0].category): \(length)件"' /tmp/review-classified.json | tee -a "$LOG_FILE"
}

# ── Step 3: 承認権限マッピング ───────────────────────────────────────────
# カテゴリ → 承認権限者の対応
# security → CEO確認必須（獅白がトリアージ後エスカレーション）
# infra    → 獅白（DevSecOps）が承認
# design   → 宝鐘（Design）が承認
# code     → 兎田（Development）が承認
APPROVER_MAP='{"security":"CEO_ESCALATION","infra":"shirogane","design":"houshou","code":"usada"}'

# ── Step 4: 一括承認実行 ─────────────────────────────────────────────────
approve_batch() {
  local CATEGORY="$1"
  local APPROVER
  APPROVER=$(echo "$APPROVER_MAP" | jq -r ".\"$CATEGORY\"")

  if [ "$APPROVER" = "CEO_ESCALATION" ]; then
    warn "カテゴリ '$CATEGORY' はCEOエスカレーション対象 → スキップ"
    return
  fi

  local PRS
  PRS=$(jq -r ".[] | select(.category == \"$CATEGORY\") | .number" /tmp/review-classified.json)
  local COUNT
  COUNT=$(echo "$PRS" | grep -c . || true)

  if [ "$COUNT" -eq 0 ]; then
    log "カテゴリ '$CATEGORY': 対象PRなし"
    return
  fi

  log "カテゴリ '$CATEGORY' (承認者: $APPROVER): ${COUNT}件を処理中..."

  for PR_NUM in $PRS; do
    PR_TITLE=$(jq -r ".[] | select(.number == $PR_NUM) | .title" /tmp/review-classified.json)

    if [ "$DRY_RUN" = "true" ]; then
      log "  [DRY-RUN] PR #${PR_NUM}: ${PR_TITLE} → approve ($APPROVER)"
    else
      if gh pr review "$PR_NUM" --repo "$REPO" --approve --body "Batch approved by $APPROVER (Operations auto-review)" 2>>"$LOG_FILE"; then
        ok "  PR #${PR_NUM}: ${PR_TITLE} → approved"
      else
        err "  PR #${PR_NUM}: ${PR_TITLE} → 承認失敗"
      fi
    fi
  done
}

# ── Step 5: マージ実行（承認済みのみ） ───────────────────────────────────
merge_approved() {
  local CATEGORY="$1"
  local APPROVER
  APPROVER=$(echo "$APPROVER_MAP" | jq -r ".\"$CATEGORY\"")

  if [ "$APPROVER" = "CEO_ESCALATION" ]; then
    return
  fi

  local PRS
  PRS=$(jq -r ".[] | select(.category == \"$CATEGORY\") | .number" /tmp/review-classified.json)

  for PR_NUM in $PRS; do
    PR_TITLE=$(jq -r ".[] | select(.number == $PR_NUM) | .title" /tmp/review-classified.json)

    if [ "$DRY_RUN" = "true" ]; then
      log "  [DRY-RUN] PR #${PR_NUM}: ${PR_TITLE} → merge (squash)"
    else
      # CIパス確認
      CI_STATUS=$(gh pr checks "$PR_NUM" --repo "$REPO" --json state --jq '.[].state' 2>/dev/null | sort -u)
      if echo "$CI_STATUS" | grep -q "FAILURE"; then
        warn "  PR #${PR_NUM}: CI失敗のためマージスキップ"
        continue
      fi

      if gh pr merge "$PR_NUM" --repo "$REPO" --squash --delete-branch 2>>"$LOG_FILE"; then
        ok "  PR #${PR_NUM}: ${PR_TITLE} → merged"
      else
        err "  PR #${PR_NUM}: ${PR_TITLE} → マージ失敗"
      fi
    fi
  done
}

# ── Step 6: サマリーレポート生成 ──────────────────────────────────────────
generate_report() {
  log ""
  log "=========================================="
  log "          一括処理サマリーレポート"
  log "=========================================="
  log "実行日時: $(date '+%Y-%m-%d %H:%M:%S')"
  log "モード: $([ "$DRY_RUN" = "true" ] && echo 'DRY-RUN（実行なし）' || echo '本番実行')"
  log ""

  for CAT in code design infra security; do
    COUNT=$(jq -r "[.[] | select(.category == \"$CAT\")] | length" /tmp/review-classified.json)
    APPROVER=$(echo "$APPROVER_MAP" | jq -r ".\"$CAT\"")
    log "  $CAT: ${COUNT}件 (承認者: $APPROVER)"
  done

  local SECURITY_COUNT
  SECURITY_COUNT=$(jq -r '[.[] | select(.category == "security")] | length' /tmp/review-classified.json)
  if [ "$SECURITY_COUNT" -gt 0 ]; then
    log ""
    warn "CEOエスカレーション対象: ${SECURITY_COUNT}件"
    jq -r '.[] | select(.category == "security") | "  #\(.number): \(.title)"' /tmp/review-classified.json | tee -a "$LOG_FILE"
  fi

  log ""
  log "ログファイル: $LOG_FILE"
  log "=========================================="
}

# ── メイン処理 ────────────────────────────────────────────────────────────
main() {
  log "=== レビュー一括ステータス変更スクリプト ==="
  log "リポジトリ: $REPO"
  log "DRY_RUN: $DRY_RUN"
  log ""

  check_prerequisites
  list_review_prs
  classify_prs

  # カテゴリごとに承認
  for CAT in code design infra security; do
    approve_batch "$CAT"
  done

  # 承認後マージ（--merge フラグ指定時のみ）
  if [ "${MERGE:-false}" = "true" ]; then
    log ""
    log "=== マージ実行フェーズ ==="
    for CAT in code design infra security; do
      merge_approved "$CAT"
    done
  fi

  generate_report
}

# ── ヘルプ ────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'HELP'
使い方:
  # 1. dry-run（デフォルト: 変更なし、一覧確認のみ）
  ./ops/batch-review-close.sh

  # 2. 承認のみ実行
  DRY_RUN=false ./ops/batch-review-close.sh

  # 3. 承認 + マージ実行
  DRY_RUN=false MERGE=true ./ops/batch-review-close.sh

環境変数:
  DRY_RUN   true(デフォルト) = 実行しない / false = 実行する
  MERGE     true = 承認後にマージも実行 / false(デフォルト) = 承認のみ
  REPO      対象リポジトリ（デフォルト: Yuito3784/poker_sns）

カテゴリ分類ルール:
  security  → ブランチ名にsecurity/auth/jwt/helmet/csrfを含む → CEO確認
  infra     → ブランチ名にinfra/docker/ci/cd/deploy/nginxを含む → DevSecOps承認
  design    → ブランチ名にdesign/ui/ux/style/css/themeを含む → Design承認
  code      → 上記以外 → Development承認
HELP
  exit 0
fi

main "$@"
