# QA/QC: ブランチ命名規則違反 監査レポート

**作成者**: QA/QC 尾丸
**作成日**: 2026-03-05
**対象**: `climpire/*` プレフィックスブランチの命名規則違反調査

---

## 1. 検出結果サマリー

| 項目 | 値 |
|------|-----|
| 違反ブランチ数（ローカル） | 18本 |
| リモートpush済み | 0本（ローカル限定） |
| devマージ済み | 4本 |
| 未マージ | 14本 |
| マージコミット履歴（git log） | 30件以上 |

**判定**: git-workflow規則（`feature/*`/`fix/*` 形式）に違反。ただしリモート未pushのためユーザー影響なし。

---

## 2. 旧ブランチ名 → 新ブランチ名 対応表

### 2.1 現存するローカル `climpire/*` ブランチ一覧

| # | 旧ブランチ名 | 最新コミット内容 | devマージ済 | 推奨新ブランチ名 | 対処 |
|---|-------------|-----------------|------------|----------------|------|
| 1 | `climpire/10d97a6d` | docs(qa): ブランチリネーム対応のQA検証レポート | No | `docs/qa-branch-rename-verification` | cherry-pick → 削除 |
| 2 | `climpire/1343a3e6` | (base commit only) | Yes | — | 削除可 |
| 3 | `climpire/13d019fd` | fix(git): pre-pushフック・原因分析ドキュメント | No | `fix/branch-naming-pre-push-hook` | cherry-pick → 削除 |
| 4 | `climpire/2396a0dc` | docs(qa): dark theme unification audit report | No | `docs/qa-dark-theme-audit` | cherry-pick → 削除 |
| 5 | `climpire/2f6fddae` | chore(devsecops): CI/CD branch filter audit | No | `feature/devsecops-branch-filter-audit` | cherry-pick → 削除 |
| 6 | `climpire/368938ba` | docs(ops): climpire/ブランチ棚卸し手順書 | No | `docs/ops-branch-cleanup-runbook` | cherry-pick → 削除 |
| 7 | `climpire/40e3703c` | fix(ui): 全ページダークテーマ統一 | No | `fix/dark-theme-unification` | cherry-pick → 削除 |
| 8 | `climpire/55624ccc` | fix(ui): 全画面ダークテーマ統一 | No | `fix/dark-theme-felt-table` | cherry-pick → 削除 |
| 9 | `climpire/75f8fe41` | (base commit only) | Yes | — | 削除可 |
| 10 | `climpire/77f33030` | docs(design): ブランチリネーム対応表にUI分類追加 | No | `docs/design-branch-rename-ui-mapping` | cherry-pick → 削除 |
| 11 | `climpire/a5509a42` | docs: DevSecOps security audit report | No | `docs/devsecops-dark-theme-security` | cherry-pick → 削除 |
| 12 | `climpire/a9a0e596` | docs(design): Git Workflow チートシート | No | `docs/design-git-workflow-cheatsheet` | cherry-pick → 削除 |
| 13 | `climpire/ae22cfbb` | fix(ui): 全画面ダークテーマ統一 | No | `fix/dark-theme-pages` | cherry-pick → 削除 |
| 14 | `climpire/c2877e3a` | (current worktree) | Yes | — | 作業完了後削除 |
| 15 | `climpire/cca7a17c` | (base commit only) | Yes | — | 削除可 |
| 16 | `climpire/e6cca97e` | docs(design): ブランチ命名規則ビジュアルフォーマット | No | `docs/design-branch-naming-visual` | cherry-pick → 削除 |
| 17 | `climpire/f7a1e707` | docs(planning): climpireブランチ問題調査レポート | No | `docs/planning-branch-issue-report` | cherry-pick → 削除 |
| 18 | `climpire/ff4eedd9` | docs(ops): ダークテーマステージング確認手順書 | No | `docs/ops-dark-theme-staging-checklist` | cherry-pick → 削除 |

### 2.2 マージ済み（git log内）の旧 `climpire/*` ブランチ

| 旧ブランチ名 | マージコミット | 対応内容（推定） |
|-------------|--------------|-----------------|
| `climpire/fd2df0cb` | `86ad6d4` | auto-commit pending task changes |
| `climpire/4947f6df` | `077cfa2` | (不明、調査不要) |
| `climpire/345dab72` | `2ef37ea` | (不明、調査不要) |
| `climpire/e666a2c0` | `d2af56c` | (不明、調査不要) |
| `climpire/d79a7f2f` | `487a32d` | next.config standalone+turbopack |
| `climpire/8ee6da76` | `8a26fa3` | ci-cd.yml IMAGE_PREFIX |
| `climpire/793efb08` | `0af59b3` | Design UI section in decision-blockers |
| `climpire/77b3c510` | `67c1369` | ci-cd.yml resolve |
| `climpire/dea4c777` | `5c7f878` | QA deliverable docs |
| `climpire/d2e3476d` | `8585626` | page.tsx Tailwind fallback |
| `climpire/cece7d29` | `26c84ca` | ci-cd.yml IMAGE_PREFIX |
| `climpire/a84c05d1` | `cb7623f` | ci-cd.yml tr lowercase |
| `climpire/69cae25d` | `a7d1dff` | next.config standalone+turbopack |
| `climpire/66ded6ba` | `0e310df` | next.config.ts standalone |
| `climpire/45c1ce25` | `96e6447` | decision-blockers conflict |

> **注**: マージ済みブランチはgit logにコミットメッセージとして記録が残るため、トレーサビリティは維持されている。

---

## 3. トレーサビリティ検証

### 3.1 検証項目

| チェック項目 | 結果 | 備考 |
|------------|------|------|
| マージコミットに旧ブランチ名が記録されているか | OK | `Merge climpire task xxx (branch climpire/xxx)` 形式で全件記録あり |
| git log --all で旧ブランチのコミット追跡可能か | OK | ハッシュ値で追跡可能 |
| リモートに不正ブランチがpushされていないか | OK | `remotes/origin/climpire/*` は0件 |
| ブランチ削除後もコミットが孤立しないか | 要確認 | 未マージブランチのコミットはcherry-pick必須 |

### 3.2 リスク評価

| リスク | 重大度 | 対策 |
|-------|--------|------|
| 未マージブランチ削除でコミット喪失 | HIGH | cherry-pick/rebase後に削除する手順を厳守 |
| マージコミットメッセージと新ブランチ名の不一致 | LOW | 本対応表で対応関係を記録済み |
| 今後の`climpire/*`再発 | MEDIUM | pre-pushフック導入で防止 |

---

## 4. 再発防止: ブランチ名バリデーション仕様

### 4.1 pre-push Git フック仕様

```bash
#!/bin/bash
# .git/hooks/pre-push
# ブランチ名が feature/*, fix/*, docs/*, chore/*, hotfix/* 形式であることを検証

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)

# 許可パターン
ALLOWED_PATTERN="^(feature|fix|docs|chore|hotfix|release|dev|main)(/.*)?$"

if [[ -z "$BRANCH" ]]; then
  exit 0  # detached HEAD は許可
fi

if [[ "$BRANCH" == "main" || "$BRANCH" == "dev" ]]; then
  exit 0  # メインブランチは許可
fi

if [[ ! "$BRANCH" =~ $ALLOWED_PATTERN ]]; then
  echo "ERROR: ブランチ名 '$BRANCH' は命名規則に違反しています。"
  echo "許可形式: feature/*, fix/*, docs/*, chore/*, hotfix/*, release/*"
  echo "例: feature/add-user-auth, fix/dark-theme-color"
  exit 1
fi

exit 0
```

### 4.2 テストケース

| # | テスト入力 | 期待結果 | 検証理由 |
|---|----------|---------|---------|
| 1 | `feature/add-login` | PASS | 正規パターン |
| 2 | `fix/dark-theme` | PASS | 正規パターン |
| 3 | `docs/update-readme` | PASS | 正規パターン |
| 4 | `main` | PASS | メインブランチ許可 |
| 5 | `dev` | PASS | 開発ブランチ許可 |
| 6 | `climpire/abc123` | FAIL | 違反パターン — ブロックされること |
| 7 | `my-branch` | FAIL | プレフィックスなし — ブロックされること |
| 8 | `feature/` | PASS | 空サフィックスだが形式は合致 |
| 9 | `FEATURE/uppercase` | FAIL | 大文字は不許可 |
| 10 | (detached HEAD) | PASS | detached HEADは許可 |

### 4.3 導入手順

1. `.githooks/pre-push` にスクリプトを配置
2. `git config core.hooksPath .githooks` でプロジェクト全体に適用
3. CI/CD側でも同等のバリデーションを追加（GitHub Actions workflow）

---

## 5. QA/QC 推奨事項

| 優先度 | 推奨事項 |
|--------|---------|
| **HIGH** | 未マージ14ブランチのコミットをcherry-pick後に`git branch -d`で削除 |
| **HIGH** | pre-pushフックを`.githooks/`に配置し全開発者に適用 |
| **MEDIUM** | 本対応表をリポジトリ内に保管しトレーサビリティを確保 |
| **LOW** | GitHub Branch Protection Ruleでサーバーサイドでも命名規則を強制 |

---

## 6. 検証完了チェックリスト

- [x] 全`climpire/*`ローカルブランチの洗い出し完了
- [x] 旧→新ブランチ名の対応表作成完了
- [x] マージコミットのトレーサビリティ検証完了
- [x] リモートブランチの安全性確認完了
- [x] pre-pushフック仕様・テストケース策定完了
- [x] リスク評価と推奨事項の文書化完了
