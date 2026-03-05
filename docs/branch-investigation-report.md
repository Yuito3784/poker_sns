# ブランチ命名・未マージ調査レポート

**作成者**: 常闇 (Planning)
**日付**: 2026-03-05

---

## 1. `climpire/` ブランチ名の由来

**結論**: Claw Empire（climpire）タスク管理システムが**自動生成**したブランチ名。

| 要素 | 説明 |
|------|------|
| `climpire/` | Claw Empire システムのプレフィックス |
| UUID (例: `2f6fddae`) | タスクIDに対応する一意識別子 |
| `.climpire-worktrees/` | 各タスク用に自動作成されたgit worktreeディレクトリ |

Git Workflowルール（`.cursor/skills/git-workflow/SKILL.md`）では `feature/*`, `fix/*` 形式を定めているが、Claw Empireの自動ブランチ生成がこの命名規則をバイパスしている。これはシステム上の制約であり、意図的な違反ではない。

---

## 2. 未マージ4ブランチの状態

### 調査結果一覧

| ブランチ | コミット | 内容 | devとの差分 | コンフリクト |
|---------|---------|------|-----------|------------|
| `climpire/2f6fddae` | `714fb42` | CI/CD branch filter audit & pre-push hook | 1コミット | **なし** |
| `climpire/368938ba` | `9dd2270` | Ops: ブランチ棚卸し手順書 | 1コミット | **なし** |
| `climpire/55624ccc` | `903c048` | UI: 全画面ダークテーマ統一 | 1コミット | **あり (6箇所)** |
| `climpire/ae22cfbb` | `917d760` | UI: 全画面ダークテーマ統一 (別版) | 1コミット | **あり (6箇所)** |

### 未マージの原因

1. **Worktreeが「Active変更中」のままクローズされていない** — 各worktreeディレクトリが残存しており、タスクが完了状態に遷移していない
2. **devへのマージプロセスが実行されていない** — コミットは存在するがマージコマンドが発行されていない
3. **UI統一ブランチ2本はコンフリクトあり** — 同じ6ファイルを変更しており、先にどちらかをマージすると後者は必ずコンフリクトする

---

## 3. UI統一ブランチの比較

両ブランチとも同じ6ファイルを変更（各108行の変更）:
- `forgot-password/page.tsx`
- `post/[id]/PostDetailClient.tsx`
- `privacy/page.tsx`
- `reset-password/page.tsx`
- `terms/page.tsx`
- `verify-email/page.tsx`

**差異**: `PostDetailClient.tsx`の変更行数が異なる（55624ccc: 68行, ae22cfbb: 74行）。他ファイルもわずかに異なる。**重複作業**であり、片方のみマージすべき。

---

## 4. 推奨アクション

### 即時マージ可能（コンフリクトなし）
1. **`climpire/2f6fddae`** → devにマージ（CI/CD audit + pre-push hook）
2. **`climpire/368938ba`** → devにマージ（棚卸し手順書）

### 要判定（コンフリクトあり・重複）
3. **`climpire/55624ccc` vs `climpire/ae22cfbb`** → Designチーム（宝鐘）がMEMORY.mdのテーマ仕様と照合し、正しい方を1本だけ選定してマージ。もう一方は削除。

### Worktreeクリーンアップ
4. マージ完了後、`git worktree remove` で不要なworktreeを削除

---

## 5. 現在のworktree一覧（全7個）

| Worktree | ブランチ | 用途 |
|----------|---------|------|
| メインリポジトリ | `dev` | メイン作業 |
| `0468f12a` | `climpire/0468f12a` | 本調査タスク |
| `2f6fddae` | `climpire/2f6fddae` | CI/CD audit（マージ待ち） |
| `368938ba` | `climpire/368938ba` | 棚卸し手順書（マージ待ち） |
| `55624ccc` | `climpire/55624ccc` | UI統一（マージ判定待ち） |
| `8043255d` | `fix/branch-naming-cleanup` | ブランチリネーム対応 |
| `ae22cfbb` | `climpire/ae22cfbb` | UI統一・別版（マージ判定待ち） |
| `b1b0c42d` | `climpire/b1b0c42d` | Design百鬼のサブタスク（作業中） |
