# DevSecOps 監査レポート: Claw Empire ブランチ生成設定

**担当**: DevSecOps 角巻
**日付**: 2026-03-05
**対象**: `.climpire.json` 設定変更に伴うセキュリティ・整合性監査

---

## 1. 現行設定の確認

### `.climpire.json`（メインリポジトリルート）
```json
{
  "branchPrefix": "feature"
}
```

**問題**: `branchPrefix: "feature"` が設定済みだが、Claw Empire は依然として `climpire/<ハッシュID>` 形式でブランチを生成している（現在11本のローカルブランチが存在）。これは Claw Empire のワークツリー管理ロジックが `.climpire.json` の `branchPrefix` 設定を無視し、内部のハードコードされた命名規則を使用していることを示す。

### ブランチ命名規則（SKILL.md）
- 許可: `feature/*`, `fix/*`, `hotfix/*`, `dev`, `main`
- 現行の `climpire/*` は **違反**

---

## 2. GitHub Branch Protection 設定との整合性チェック

**結果**: `gh` CLI に `GH_TOKEN` が未設定のため API 経由での Branch Protection ルール確認が不可。

### 推奨事項（CRITICAL）
以下の Branch Protection ルールが GitHub 上で設定されていることを確認すべき:

| ブランチ | 推奨ルール |
|----------|-----------|
| `main` | Require PR, Require approvals (≥1), No force push, No deletions |
| `dev` | Require PR, No force push |

**現行リスク**: Branch Protection が未設定の場合、`climpire/*` ブランチからの直接マージや、`main` への force push が技術的に可能な状態。

---

## 3. pre-push フックによるガードレール

**ステータス**: `.githooks/pre-push` にブランチ名バリデーションが **実装済み**

```
allowed_pattern="^(feature|fix|hotfix)/.+$|^(dev|main)$"
```

**評価**:
- `climpire/*` ブランチの push は **拒否される**（正常動作）
- ただし `core.hooksPath` が設定されていないため、**フックが有効化されていない可能性あり**

### 推奨修正（HIGH）
```bash
git config core.hooksPath .githooks
```
これを `.climpire.json` 修正と合わせて実施すること。

---

## 4. `.climpire.json` 修正の影響分析

### 修正候補

Claw Empire プラットフォーム側の設定（管理画面/CLI）でブランチ命名テンプレートを変更する必要がある。リポジトリ側の `.climpire.json` だけでは不十分な可能性が高い。

以下の設定プロパティの存在を Claw Empire ドキュメントで確認すべき:
- `branchPrefix` — 現行設定済みだが無視されている
- `branchNameTemplate` — 例: `feature/{taskType}-{taskId}`
- `baseBranch` — ワークツリーの起点ブランチ（`dev` であるべき）

### セキュリティ上の懸念

| 項目 | 重要度 | 説明 |
|------|--------|------|
| ブランチ名にタスクハッシュのみ | MEDIUM | ブランチの目的が不明瞭、コードレビュー時に混乱を招く |
| `dev` ベースでない可能性 | HIGH | ワークツリーが `main` の HEAD から作成されている場合、マージ時に意図しない差分が発生するリスク |
| `core.hooksPath` 未設定 | HIGH | pre-push フックが機能せず、不正ブランチ名での push が通る |
| Branch Protection 未確認 | CRITICAL | リモート側のガードレールが存在しない可能性 |

---

## 5. 残存 `climpire/` ブランチのリスク

- 現在11本のローカル `climpire/` ブランチが存在
- リモートには push されていない（pre-push フックまたは未 push）
- クリーンアップ手順は `docs/climpire-branch-cleanup.md` に記載済み

**推奨**: CEO 承認後、全 `climpire/` ワークツリーとブランチを一括削除

---

## 6. 対応推奨サマリー

| # | アクション | 重要度 | 担当 |
|---|-----------|--------|------|
| 1 | Claw Empire プラットフォーム側でブランチ命名テンプレートを `feature/{taskType}-{taskId}` に変更 | CRITICAL | CEO/Platform Admin |
| 2 | GitHub Branch Protection ルール確認・設定（`GH_TOKEN` 設定後） | CRITICAL | DevSecOps |
| 3 | `git config core.hooksPath .githooks` の全環境適用 | HIGH | DevSecOps/Ops |
| 4 | `.climpire.json` に `baseBranch: "dev"` 追加を検討 | HIGH | Development |
| 5 | 既存 `climpire/` ブランチ・ワークツリーのクリーンアップ | MEDIUM | Ops |
| 6 | 修正後のテストブランチ生成による動作検証 | HIGH | QA/QC |
