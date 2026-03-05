# climpire/ ブランチ問題 — 原因分析と対応手順

## 原因

Climpire（自動エージェントオーケストレーター）がタスク実行時に `git worktree add` でワークツリーを作成し、
独自の `climpire/<ハッシュID>` 形式でブランチを命名していた。

これは以下のルールに違反：
- **CLAUDE.md**: 「作業開始前に必ず `.cursor/skills/git-workflow/SKILL.md` を参照すること」
- **SKILL.md**: ブランチは `feature/*` または `fix/*` のみ許可

Climpire は CLAUDE.md / SKILL.md を参照せず、独自のワークツリー管理ロジックで
ブランチ名を生成していたことが根本原因。

## 影響範囲

- ローカルのみ（リモートには push されていない）
- 9本の `climpire/` ブランチ、10個のワークツリーディレクトリが存在

## クリーンアップ手順（CEO確認後に実行）

### Step 1: ワークツリーの削除

```bash
cd /Users/yuito/Desktop/poker_sns

# ワークツリー一覧を確認
git worktree list

# 各ワークツリーを削除（--force は未コミット変更がある場合に必要）
for wt in .climpire-worktrees/*/; do
  git worktree remove --force "$wt" 2>/dev/null
done

# 残存確認
git worktree list
```

### Step 2: climpire/ ブランチの削除

```bash
# 対象ブランチ一覧
git branch | grep climpire/

# 一括削除
git branch | grep 'climpire/' | xargs git branch -D

# 削除確認
git branch | grep climpire/
# → 出力なしであれば完了
```

### Step 3: .climpire-worktrees ディレクトリの削除

```bash
rm -rf .climpire-worktrees/
```

## 再発防止策

### 1. pre-push フック（実装済み）

`.githooks/pre-push` にブランチ名バリデーションを追加。
`feature/*`, `fix/*`, `hotfix/*`, `dev`, `main` 以外のブランチ名での push を拒否する。

### 2. hooksPath の設定

各開発者（およびエージェント）は以下を実行：

```bash
git config core.hooksPath .githooks
```

### 3. CLAUDE.md への明記

エージェントが CLAUDE.md を確実に参照し、SKILL.md のブランチ命名規則に従うよう
CLAUDE.md に git-workflow 参照の指示が既に記載済み。
