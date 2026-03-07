#!/usr/bin/env bash
# ops-branch-cleanup.sh
# climpire/* ブランチの棚卸し・クリーンアップスクリプト
# Usage: bash scripts/ops-branch-cleanup.sh [--dry-run | --delete]
# Default: --dry-run (削除は行わず一覧表示のみ)

set -euo pipefail

MODE="${1:---dry-run}"
PROTECTED_PATTERNS="^(main|dev|feature/|fix/)$"

echo "=== climpire/* ブランチ棚卸しスクリプト ==="
echo "モード: $MODE"
echo ""

# 1. ローカル climpire/* ブランチ一覧
LOCAL_BRANCHES=$(git branch --list 'climpire/*' | sed 's/^[* ]*//')
LOCAL_COUNT=$(echo "$LOCAL_BRANCHES" | grep -c . || true)

echo "--- ローカル climpire/* ブランチ: ${LOCAL_COUNT}本 ---"

if [ "$LOCAL_COUNT" -eq 0 ]; then
    echo "climpire/* ブランチはありません。"
    exit 0
fi

# 2. 各ブランチのマージ状態チェック
echo ""
echo "| ブランチ | mainにマージ済み | devにマージ済み | ステータス |"
echo "|----------|----------------|----------------|-----------|"

CURRENT_BRANCH=$(git branch --show-current)
DELETABLE=()
SKIPPED=()

for branch in $LOCAL_BRANCHES; do
    in_main=$(git branch --merged main 2>/dev/null | grep -q "^ *${branch}$" && echo "Yes" || echo "No")
    in_dev=$(git branch --merged dev 2>/dev/null | grep -q "^ *${branch}$" && echo "Yes" || echo "No")

    if [ "$branch" = "$CURRENT_BRANCH" ]; then
        status="CURRENT (skip)"
        SKIPPED+=("$branch")
    elif [ "$in_main" = "Yes" ] || [ "$in_dev" = "Yes" ]; then
        status="DELETABLE"
        DELETABLE+=("$branch")
    else
        status="UNMERGED"
        SKIPPED+=("$branch")
    fi

    echo "| $branch | $in_main | $in_dev | $status |"
done

echo ""
echo "削除可能: ${#DELETABLE[@]}本 / スキップ: ${#SKIPPED[@]}本"

# 3. リモート climpire/* ブランチチェック
REMOTE_BRANCHES=$(git branch -r --list 'origin/climpire/*' 2>/dev/null | sed 's/^ *//' || true)
REMOTE_COUNT=$(echo "$REMOTE_BRANCHES" | grep -c . || true)

echo ""
echo "--- リモート climpire/* ブランチ: ${REMOTE_COUNT}本 ---"
if [ "$REMOTE_COUNT" -gt 0 ]; then
    echo "$REMOTE_BRANCHES"
fi

# 4. ワークツリーチェック
echo ""
echo "--- 関連ワークツリー ---"
git worktree list 2>/dev/null | grep climpire || echo "(なし)"

# 5. 削除実行
if [ "$MODE" = "--delete" ]; then
    echo ""
    echo "=== 削除実行 ==="

    for branch in "${DELETABLE[@]}"; do
        echo "削除中: $branch"
        git branch -d "$branch" 2>&1 || echo "  -> -d 失敗。-D が必要（CEO承認後に実行）"
    done

    if [ "$REMOTE_COUNT" -gt 0 ]; then
        echo ""
        echo "リモートブランチの削除は手動で実行してください:"
        echo "$REMOTE_BRANCHES" | while read -r rb; do
            echo "  git push origin --delete ${rb#origin/}"
        done
    fi

    echo ""
    echo "完了。git fetch --prune を実行してリモート参照をクリーンアップしてください。"
else
    echo ""
    echo "=== ドライラン完了 ==="
    echo "実際に削除するには: bash scripts/ops-branch-cleanup.sh --delete"
fi
