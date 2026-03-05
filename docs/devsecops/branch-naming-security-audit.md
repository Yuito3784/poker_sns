# DevSecOps 成果物 — ブランチ命名規則違反の監査と再発防止

**作成**: DevSecOps チーム (角巻)
**日付**: 2026-03-05
**対象**: poker_sns ブランチ命名規則の CI/セキュリティ整合性

---

## 1. 現状分析

### 違反ブランチ一覧

ローカルに `climpire/*` 形式のブランチが **20本** 存在。
git-workflow ルール（`feature/*` / `fix/*` のみ）に違反。

```
climpire/10d97a6d, climpire/1343a3e6, climpire/13d019fd, climpire/20285910,
climpire/2396a0dc, climpire/2f6fddae, climpire/368938ba, climpire/40e3703c,
climpire/55624ccc, climpire/75f8fe41, climpire/77f33030, climpire/80f38ed7,
climpire/a5509a42, climpire/a9a0e596, climpire/ae22cfbb, climpire/c2877e3a,
climpire/cca7a17c, climpire/e6cca97e, climpire/f7a1e707, climpire/ff4eedd9
```

正規ブランチ: `fix/branch-naming-cleanup` (1本のみ)

---

## 2. CI/CD トリガーとの整合性確認

### 現行 CI ワークフロー (`ci-cd.yml`) のブランチ設定

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### 影響評価

| 項目 | 影響 | 深刻度 |
|------|------|--------|
| CI テスト実行 | `climpire/*` ブランチへの push では CI が**実行されない** | MEDIUM |
| Docker ビルド・デプロイ | `main` push 時のみ → 影響なし | - |
| PR 作成時 | `main` 向け PR で CI 実行 → 正常動作 | - |
| `dev` ブランチ CI | `dev` への push/PR で CI 未実行 | MEDIUM |

### 推奨: CI トリガーに `dev` を追加

現在 `dev` ブランチへの push/PR で CI が走らない。git-workflow では `dev` が統合ブランチのため、追加すべき。

```yaml
# 推奨設定
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]
```

> **判定: WARNING（コード変更は本タスクスコープ外）**
> ブランチ命名違反の直接的なセキュリティリスクは低いが、CI が走らないブランチでの作業はコード品質の担保が弱まる。

---

## 3. Branch Protection 推奨設定

GitHub リポジトリ設定で以下を推奨:

### `main` ブランチ保護

| 設定項目 | 推奨値 | 理由 |
|----------|--------|------|
| Require PR before merging | ON | 直接 push 防止 |
| Required approvals | 1 (CEO) | git-workflow ルール準拠 |
| Require status checks | ON | CI パス必須 |
| Required checks | `backend-test`, `frontend-build` | ビルド・テスト担保 |
| Require branches to be up to date | ON | 古いベースからのマージ防止 |
| Allow force pushes | OFF | 履歴改変防止 |
| Allow deletions | OFF | 誤削除防止 |

### `dev` ブランチ保護

| 設定項目 | 推奨値 | 理由 |
|----------|--------|------|
| Require PR before merging | ON | 直接コミット防止 |
| Required approvals | 1 | 最低限のレビュー |
| Require status checks | ON | CI パス必須 |
| Allow force pushes | OFF | 履歴改変防止 |

---

## 4. 再発防止: ブランチ名バリデーション

### 方法 A: Git pre-push フック（ローカル）

```bash
#!/bin/sh
# .git/hooks/pre-push
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if ! echo "$BRANCH" | grep -qE '^(main|dev|feature/.+|fix/.+)$'; then
  echo "ERROR: Branch name '$BRANCH' does not match allowed patterns."
  echo "Allowed: main, dev, feature/*, fix/*"
  exit 1
fi
```

> ローカルフックは `--no-verify` で回避可能。強制力は低い。

### 方法 B: GitHub Actions ブランチ名チェック（推奨）

```yaml
# .github/workflows/branch-name-check.yml
name: Branch Name Check
on:
  push:
    branches-ignore: [main, dev]
  pull_request:

jobs:
  check-branch-name:
    runs-on: ubuntu-latest
    steps:
      - name: Validate branch name
        run: |
          BRANCH="${GITHUB_HEAD_REF:-${GITHUB_REF_NAME}}"
          if ! echo "$BRANCH" | grep -qE '^(main|dev|feature/.+|fix/.+)$'; then
            echo "::error::Branch name '${BRANCH}' violates naming convention."
            echo "Allowed patterns: feature/*, fix/*"
            exit 1
          fi
          echo "Branch name '${BRANCH}' is valid."
```

> **判定: WARNING（コード変更は本タスクスコープ外）**
> CEO 承認後に方法 B を導入推奨。方法 A は補助的に併用可。

---

## 5. `climpire/*` ブランチの処理方針

| ステップ | 内容 | 担当 |
|----------|------|------|
| 1 | 各 `climpire/*` ブランチの作業内容を確認 | Development |
| 2 | マージ済み・不要なブランチを特定 | QA/QC |
| 3 | 未マージで必要な変更は `feature/*` / `fix/*` にチェリーピック | Development |
| 4 | 不要ブランチをリモート・ローカルから削除 | Operations |
| 5 | 旧→新ブランチ名の対応表を作成・保存 | QA/QC |

---

## 6. セキュリティリスク評価まとめ

| リスク | 深刻度 | 対応 |
|--------|--------|------|
| 命名規則違反ブランチで CI 未実行 | MEDIUM | CI トリガーに `dev` 追加 + ブランチ名チェック CI 導入 |
| Branch protection 未設定 | MEDIUM | GitHub 設定で `main` / `dev` 保護ルール追加 |
| ローカルフック未導入 | LOW | pre-push フック配布（補助的） |
| 既存 `climpire/*` ブランチ残存 | LOW | 対応表作成後に削除 |

**全項目 WARNING レベル（即時コード修正不要）。CEO 承認後に順次対応推奨。**
