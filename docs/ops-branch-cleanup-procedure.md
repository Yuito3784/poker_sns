# Operations: climpire/ ブランチ棚卸し・クリーンアップ手順書

**作成日:** 2026-03-05
**担当:** Operations (星街/音乃瀬)
**ステータス:** CEO確認待ち

---

## 1. 現状把握

### 対象ブランチ一覧 (ローカルのみ、リモートには未push)

| # | 旧ブランチ名 | ahead(main) | 固有コミット | 推奨リネーム先 | 備考 |
|---|-------------|-------------|-------------|---------------|------|
| 1 | `climpire/10d97a6d` | 12 | `docs(qa): ブランチリネーム対応のQA検証レポート` | `docs/qa-branch-rename-report` | QA検証レポート追加 |
| 2 | `climpire/13d019fd` | 11 | (共通コミットのみ) | 削除候補 | main対比で固有変更なし |
| 3 | `climpire/368938ba` | 11 | (共通コミットのみ) | 削除候補 | 現在のworktreeブランチ |
| 4 | `climpire/40e3703c` | 11 | `fix(ui): 全ページダークテーマ統一` | `fix/dark-theme-remaining-pages` | UI修正 |
| 5 | `climpire/55624ccc` | 11 | (共通コミットのみ) | 削除候補 | main対比で固有変更なし |
| 6 | `climpire/77f33030` | 12 | `docs(design): ブランチリネーム対応表にUI関連分類追加` | `docs/design-branch-rename-classification` | Design成果物 |
| 7 | `climpire/ae22cfbb` | 11 | `fix(ui): 全画面ダークテーマ統一 - 白背景ページを修正` | `fix/dark-theme-white-bg-fix` | UI修正(#4と類似) |
| 8 | `climpire/cca7a17c` | 10 | (共通コミットのみ) | 削除候補 | main対比で固有変更なし |
| 9 | `climpire/f7a1e707` | 11 | (共通コミットのみ) | 削除候補 | 現タスク用ブランチ |

### 重要な事実

- **リモートにclimpire/ブランチは存在しない** → リモート削除作業は不要
- **全ブランチがmain未マージ** → 固有変更のあるブランチは内容精査が必要
- **固有変更があるブランチ:** #1, #4, #6, #7 の4本
- **削除候補(固有変更なし):** #2, #3, #5, #8, #9 の5本

---

## 2. クリーンアップ手順

### Step 1: 固有変更なしブランチの削除

```bash
# 固有変更がないブランチを削除 (ローカルのみ)
git branch -D climpire/13d019fd
git branch -D climpire/55624ccc
git branch -D climpire/cca7a17c
# climpire/368938ba と climpire/f7a1e707 はworktree使用中のため、worktree削除後に対応
```

### Step 2: 固有変更ありブランチのリネーム

```bash
# #1: QA検証レポート
git branch -m climpire/10d97a6d docs/qa-branch-rename-report

# #4: ダークテーマ修正
git branch -m climpire/40e3703c fix/dark-theme-remaining-pages

# #6: Design分類追加
git branch -m climpire/77f33030 docs/design-branch-rename-classification

# #7: ダークテーマ白背景修正 (#4と重複の可能性あり、要確認)
git branch -m climpire/ae22cfbb fix/dark-theme-white-bg-fix
```

### Step 3: リネーム後の検証

```bash
# climpire/ プレフィックスのブランチが残っていないことを確認
git branch | grep climpire/
# worktree使用中の2本のみが表示されるはず

# リネーム後のブランチ一覧確認
git branch | grep -E '^  (fix|feature|docs)/'
```

### Step 4: worktreeブランチの後処理

worktree作業完了後に以下を実行:
```bash
# worktreeの削除
git worktree remove .climpire-worktrees/368938ba
git worktree remove .climpire-worktrees/f7a1e707  # パスは要確認

# 残ったブランチの削除
git branch -D climpire/368938ba
git branch -D climpire/f7a1e707
```

---

## 3. 原因分析

**なぜ `climpire/` プレフィックスが発生したか:**

climpire (Claw Empire) ツールが自動的にworktreeブランチを `climpire/<hash>` 形式で作成している。これはgit-workflow SKILL.mdで定義された `feature/*` / `fix/*` 命名規則に準拠していない。

**再発防止策:**

1. **pre-pushフック導入** (DevSecOps担当): `climpire/` プレフィックスでのpushを拒否
2. **climpireツール設定の確認**: ブランチ名生成ルールのカスタマイズが可能か調査
3. **CLAUDE.md への明記**: climpire worktree使用時もブランチ命名規則に従う旨を追記

---

## 4. 注意事項・リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| worktree使用中ブランチの強制削除 | HIGH | worktree作業完了後に削除する |
| #4と#7のダークテーマ修正が重複 | MEDIUM | diff比較で内容確認後、片方を採用 |
| リネーム後のCI/CD影響 | LOW | リモート未pushのためCI影響なし |

---

## 5. CEO確認依頼事項

1. 固有変更なしの5ブランチ(#2,#3,#5,#8,#9)を削除してよいか
2. 固有変更ありの4ブランチ(#1,#4,#6,#7)のリネーム先名称は適切か
3. #4と#7のダークテーマ修正の重複をどう扱うか(統合 or 両方残す)
4. 削除実行のタイミング(即時 or worktree作業全完了後)
