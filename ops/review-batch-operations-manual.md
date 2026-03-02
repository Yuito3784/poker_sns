# レビュー一括消化 運用手順書

**対象リポジトリ**: Yuito3784/poker_sns
**作成日**: 2026-03-02
**担当**: Operations (白上)
**ステータス**: ドラフト → CEO承認後に運用開始

---

## 1. 背景と課題

- 「レビュー」ステータスのPRが100件以上滞留している
- CEOが全件確認する必要はない（セキュリティ関連のみCEO判断）
- 各カテゴリのチームリーダーに承認権限を委譲し、一括消化を実施する

## 2. カテゴリ分類と承認権限

| カテゴリ | 判定基準（ブランチ名キーワード） | 承認者 | CEO確認 |
|----------|-----------------------------------|--------|---------|
| security | security, auth, jwt, helmet, csrf | 獅白（DevSecOps）→ CEO | 必須 |
| infra | infra, docker, ci, cd, deploy, nginx | 獅白（DevSecOps） | 不要 |
| design | design, ui, ux, style, css, theme | 宝鐘（Design） | 不要 |
| code | 上記以外 | 兎田（Development） | 不要 |

### CEOエスカレーション基準

以下の **両方** に該当する場合のみCEOに確認を求める:

1. セキュリティ関連の変更である
2. 売上に影響する機能（決済、認証、ユーザーデータ）を含む

## 3. 実行手順

### Step 1: 事前確認（dry-run）

```bash
# dry-runで分類結果を確認（変更なし）
./ops/batch-review-close.sh
```

出力例:
```
レビュー待ちPR数: 105件
分類結果:
  code: 72件
  design: 15件
  infra: 12件
  security: 6件
```

### Step 2: 分類結果のレビュー

1. dry-run結果のログファイル (`ops/batch-review-*.log`) を確認
2. 各カテゴリの承認者がPR一覧を確認
3. セキュリティカテゴリのPRはCEOに報告

### Step 3: 承認実行

```bash
# 承認のみ実行（マージはしない）
DRY_RUN=false ./ops/batch-review-close.sh
```

### Step 4: CI確認 → マージ

```bash
# CIが全てパスしたPRのみマージ（squash merge + ブランチ削除）
DRY_RUN=false MERGE=true ./ops/batch-review-close.sh
```

### Step 5: リグレッション確認

マージ完了後、以下を確認:

1. CI/CDパイプラインが全件パス
2. ステージング環境でのヘルスチェック
3. 主要機能の動作確認（認証・投稿・決済）

## 4. ロールバック手順

問題が発生した場合:

```bash
# 直近のマージをrevertするPRを作成
gh pr create --repo Yuito3784/poker_sns \
  --title "Revert: batch merge rollback" \
  --body "一括マージによるリグレッション対応"
```

## 5. 今後の運用ルール

### 権限委譲後のフロー

1. PRが作成される
2. GitHub CODEOWNERSに基づき自動で適切なレビュアーがアサインされる
3. 各チームリーダーが自分のカテゴリのPRを承認
4. CIパス確認後にマージ
5. セキュリティ関連のみCEOに通知（Discord Webhook）

### 定期メンテナンス

- **毎週月曜**: 滞留PRの棚卸し（10件以上滞留で自動アラート）
- **毎月初**: 承認フローの振り返り・カテゴリ分類精度の検証

## 6. 関連ファイル

| ファイル | 説明 |
|----------|------|
| `ops/batch-review-close.sh` | 一括承認・マージスクリプト |
| `.github/workflows/ci-cd.yml` | CI/CDパイプライン定義 |
| `.github/CODEOWNERS` | パスベースの承認者自動アサイン（要作成） |
| `ops/review-delegation-design.md` | 権限委譲・自動化設計書 |
