# 調査レポート: `climpire/` プレフィックス ブランチ問題

**作成日:** 2026-03-05
**担当:** 常闇（Planning）
**ステータス:** 分析完了・対策提案

---

## 1. 原因

**Climpire（エージェント自動オーケストレーション基盤）が、プロジェクトの git-workflow SKILL.md を参照せず、独自の命名規約 `climpire/<タスクハッシュ>` でブランチを自動生成していた。**

具体的な流れ:

1. Climpire がタスクを受け取ると、`.climpire-worktrees/<ハッシュ>/` に git worktree を作成
2. その際、ブランチ名を自動的に `climpire/<ハッシュ>` と命名
3. CLAUDE.md に記載された「`.cursor/skills/git-workflow/SKILL.md` を参照」という指示、および SKILL.md 内の `feature/*` / `fix/*` ブランチ規約が無視された
4. 結果として、規約外の `climpire/` プレフィックスブランチが大量に作成された

**根本原因:** Climpire の worktree 作成ロジックがプロジェクト固有のブランチ命名規約を考慮する仕組みを持っていない。

---

## 2. 現状の `climpire/` ブランチ一覧

### ローカルブランチ（9件）

| ブランチ名 | worktree パス |
|---|---|
| `climpire/10d97a6d` | `.climpire-worktrees/10d97a6d` |
| `climpire/13d019fd` | `.climpire-worktrees/13d019fd` |
| `climpire/368938ba` | `.climpire-worktrees/368938ba` |
| `climpire/40e3703c` | `.climpire-worktrees/40e3703c` |
| `climpire/55624ccc` | `.climpire-worktrees/55624ccc` |
| `climpire/77f33030` | `.climpire-worktrees/77f33030` |
| `climpire/ae22cfbb` | `.climpire-worktrees/ae22cfbb` |
| `climpire/cca7a17c` | `.climpire-worktrees/cca7a17c` |
| `climpire/f7a1e707` | `.climpire-worktrees/f7a1e707`（本レポート作成中） |

### リモートブランチ

リモートには `climpire/` ブランチは push されていない（確認済み）。

---

## 3. SKILL.md が定める正しいブランチ命名

```
feature/<タスク名>  — 新機能・UI変更・リファクタ
fix/<タスク名>      — バグ修正・既存挙動の修正
hotfix/<緊急修正名> — 緊急対応（運用上追加）
```

すべて `dev` ブランチから分岐し、作業完了後は `dev` へ PR を出す。

---

## 4. 再発防止策

### 即時対策（Dev/DevSecOps）

| # | 対策 | 担当 | 優先度 |
|---|---|---|---|
| 1 | `.githooks/pre-push` フックで許可プレフィックス (`feature/*`, `fix/*`, `hotfix/*`, `dev`, `main`) 以外の push を拒否 | 獅白（DevSecOps） | HIGH |
| 2 | `package.json` に `"prepare": "git config core.hooksPath .githooks"` を追加し、全開発者に自動適用 | 獅白（DevSecOps） | HIGH |
| 3 | 不要な `climpire/` ローカルブランチ + worktree の削除 | 星街（Ops） | HIGH |

### 中期対策（Planning/Ops）

| # | 対策 | 担当 | 優先度 |
|---|---|---|---|
| 4 | Climpire 設定で worktree ブランチ名テンプレートを `feature/climpire-<hash>` に変更（Climpire 側の設定変更が可能な場合） | 常闇（Planning） | MEDIUM |
| 5 | CLAUDE.md に「`climpire/` プレフィックスでのブランチ作成禁止」を明記 | 常闇（Planning） | MEDIUM |
| 6 | git-workflow チートシート作成（開発者・エージェント向け） | 宝鐘（Design） | LOW |

---

## 5. クリーンアップ手順（CEO 承認後に実行）

```bash
# 1. worktree 一覧確認
git worktree list

# 2. 各 worktree を削除（作業中でないもの）
git worktree remove .climpire-worktrees/<ハッシュ> --force

# 3. ローカルブランチを削除
git branch -D climpire/<ハッシュ>

# 4. リモートに push されていた場合（現時点では該当なし）
# git push origin --delete climpire/<ハッシュ>

# 5. 残存確認
git branch | grep climpire/
git branch -r | grep climpire/
```

**注意:** 現在アクティブな worktree（他エージェントが作業中のもの）は、作業完了後に削除する。

---

## 6. まとめ

- **原因:** Climpire の worktree 自動生成が SKILL.md のブランチ命名規約を無視していた
- **影響:** ローカルに規約外ブランチ9件が存在（リモートには未 push）
- **対策:** pre-push フックによる命名バリデーション + 不要ブランチの削除 + CLAUDE.md への明記
