# Operations: `climpire/*` ブランチ棚卸し・クリーンアップ手順書

**作成日**: 2026-03-05
**担当**: Operations (白上)
**ステータス**: CEO承認待ち

---

## 1. 現状分析

### 問題
`climpire/*` プレフィックスのブランチが **19本** ローカルに存在し、`feature/*` / `fix/*` の命名規則（`.cursor/skills/git-workflow/SKILL.md`）に違反している。

### 影響
- git-workflow ルール違反がログに残存（`Merge climpire task ...` 形式のマージコミット）
- ブランチ一覧が肥大化し、運用上の可視性低下
- CI/CD トリガーが `feature/*` / `fix/*` に限定されている場合、これらブランチは対象外

---

## 2. `climpire/*` ブランチ一覧（19本）

| # | ブランチ名 | 最新コミット | 分類 |
|---|-----------|-------------|------|
| 1 | `climpire/10d97a6d` | `docs(qa): ブランチリネーム対応のQA検証レポート` | docs |
| 2 | `climpire/1343a3e6` | `chore: CLAUDE.md, package-lock...` | chore |
| 3 | `climpire/13d019fd` | `fix(git): pre-pushフックによるブランチ命名規則の強制` | fix |
| 4 | `climpire/2396a0dc` | `docs(qa): dark theme unification audit report` | docs |
| 5 | `climpire/2f6fddae` | `chore(devsecops): CI/CD branch filter audit` | chore |
| 6 | `climpire/368938ba` | `docs(ops): climpire/ブランチ棚卸し手順書` | docs |
| 7 | `climpire/40e3703c` | `fix(ui): 全ページダークテーマ統一` | fix |
| 8 | `climpire/55624ccc` | `fix(ui): 全画面ダークテーマ統一` | fix |
| 9 | `climpire/75f8fe41` | `chore: CLAUDE.md, package-lock...` | chore |
| 10 | `climpire/77f33030` | `docs(design): ブランチリネーム対応表にUI関連分類` | docs |
| 11 | `climpire/80f38ed7` | `chore: CLAUDE.md, package-lock...` | **現在の作業ブランチ** |
| 12 | `climpire/a5509a42` | `docs: add DevSecOps security audit report` | docs |
| 13 | `climpire/a9a0e596` | `docs(design): Git Workflow チートシート` | docs |
| 14 | `climpire/ae22cfbb` | `fix(ui): 全画面ダークテーマ統一` | fix |
| 15 | `climpire/c2877e3a` | `docs(qa): ブランチ命名規則違反の監査レポート` | docs |
| 16 | `climpire/cca7a17c` | `Merge climpire task fd2df0cb` | merge |
| 17 | `climpire/e6cca97e` | `docs(design): ブランチ命名規則のビジュアルフォーマット仕様` | docs |
| 18 | `climpire/f7a1e707` | `docs(planning): climpire/ブランチ問題の調査レポート` | docs |
| 19 | `climpire/ff4eedd9` | `docs(ops): ダークテーマ統一のステージング確認チェックリスト` | docs |

---

## 3. クリーンアップ手順チェックリスト

### Phase 1: 事前確認（破壊的操作の前に必ず実施）

- [ ] 各 `climpire/*` ブランチの変更が `main` または `dev` にマージ済みか確認
  ```bash
  for b in $(git branch --list 'climpire/*' | sed 's/^[* ]*//'); do
    merged=$(git branch --contains "$b" -a 2>/dev/null | grep -E '(main|dev)' | head -1)
    echo "$b -> ${merged:-NOT_MERGED}"
  done
  ```
- [ ] 未マージの変更がある場合、必要な成果物を `fix/branch-cleanup` ブランチにチェリーピック
- [ ] リモートに `climpire/*` ブランチが push されていないことを確認
  ```bash
  git branch -r --list 'origin/climpire/*'
  ```

### Phase 2: ローカルブランチ削除

- [ ] 現在の作業ブランチ（`climpire/80f38ed7`）の成果物をコミット・push
- [ ] `dev` ブランチに切り替え
  ```bash
  git checkout dev
  ```
- [ ] マージ済みの `climpire/*` ブランチを一括削除
  ```bash
  git branch --list 'climpire/*' | xargs git branch -d
  ```
- [ ] 未マージブランチは `-D`（強制削除）が必要 — CEO承認後に実行
  ```bash
  git branch --list 'climpire/*' | xargs git branch -D
  ```

### Phase 3: リモートクリーンアップ（リモートに存在する場合のみ）

- [ ] リモートの `climpire/*` ブランチを削除
  ```bash
  git push origin --delete <branch-name>
  ```
- [ ] ローカルのリモート追跡参照をプルーニング
  ```bash
  git fetch --prune
  ```

### Phase 4: 事後検証

- [ ] `git branch -a | grep climpire` で残存ブランチがないことを確認
- [ ] `git log --oneline -30` でマージ履歴のトレーサビリティを確認

---

## 4. 再発防止策（Operations視点）

### 即時対応
1. **pre-push フック**: `climpire/13d019fd` ブランチで作成済みの pre-push フックを `dev` にマージし、`feature/*`/`fix/*` 以外のブランチ名での push を拒否する

### 中期対応
2. **GitHub Branch Protection**: `dev` ブランチの protection rule で、マージ元ブランチ名のパターンを制限（GitHub Actions による自動チェック）
3. **定期棚卸し**: 月次で不要ブランチの棚卸しを実施、5本以上溜まったらアラート

---

## 5. 運用上の注意事項

- **作業ブランチ自体の問題**: この手順書作成も `climpire/80f38ed7` 上で行われている（ルール違反）。今後の作業は必ず `fix/branch-naming-convention` 等の正規名称で行うこと
- **マージコミットメッセージ**: 既存の `Merge climpire task xxx` メッセージはgit historyに残るが、rebase/rewriteは行わない（破壊的操作回避）
- **ワークツリー**: `.climpire-worktrees/` ディレクトリ内のワークツリーも、ブランチ削除時に orphan にならないよう `git worktree list` で確認してから削除する

---

## 6. CEO承認事項

以下について承認をお願いします:
1. 未マージの `climpire/*` ブランチの強制削除（`-D`）の許可
2. pre-push フックの `dev` マージ
3. クリーンアップ作業の実施タイミング
