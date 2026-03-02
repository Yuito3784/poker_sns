# Development成果物: CI/CDレビュー・Phase 5進捗報告

**担当**: Development (風真)
**日付**: 2026-03-02
**ステータス**: CI/CD修正適用済み / Phase 5実装レビュー完了

---

## 1. CI/CDブロッカー: IMAGE_PREFIX大文字問題

### 問題
`github.repository`は`Yuito3784/poker_sns`（大文字Y）を返すが、GHCRはすべて小文字のイメージ名を要求する。`docker-build`ジョブがpushステップで15秒以内に`invalid reference format`エラーで失敗していた。

### 修正内容 (78ec569ベース)
`.github/workflows/ci-cd.yml` に以下の変更を適用:

1. トップレベル`env:`から`IMAGE_PREFIX: ${{ github.repository }}`を**削除**
2. `docker-build`ジョブ内に新ステップ追加:
   ```yaml
   - name: Set lowercase image prefix
     run: echo "IMAGE_PREFIX=${GITHUB_REPOSITORY,,}" >> "$GITHUB_ENV"
   ```

### 技術レビュー結果

| 項目 | 判定 |
|------|------|
| 修正の正当性 | OK - `${VAR,,}`はbash 4+の小文字展開。GitHub Actions ubuntu-latestはbash 5.x搭載 |
| 影響範囲 | docker-buildジョブのみ。backend-test/frontend-buildには影響なし |
| 後方互換性 | OK - IMAGE_PREFIXを参照する箇所はdocker-buildジョブ内のみ |
| セキュリティ | OK - 環境変数の値操作のみ、シークレット露出なし |
| 競合コミット | da165cb（`tr`方式）と78ec569（bash展開方式）の2つが存在。78ec569を採用（env削除により二重定義を回避） |

**レビュー結論**: mainへのマージを推奨。CRITICAL修正、リスク極小。

---

## 2. Phase 5収益機能の実装状況 (56d3648)

別ブランチで以下の実装が完了済み（main未マージ）:

### 2a. AIハンド分析API
- **モデル**: `ai-analysis`モジュール新設
- **Prisma**: `AiAnalysis`, `AiAnalysisUsage`モデル追加
- **AI**: Claude API (claude-sonnet-4-6) 統合
- **制限**: プレミアムユーザー月5回まで
- **ファイル**: `backend/src/ai-analysis/` (controller, service, module)

### 2b. 統計ダッシュボード
- **モジュール**: `stats`モジュール新設
- **機能**: ポジション別統計、ストリート別アクション分析、直近結果の勝敗追跡
- **制限**: プレミアム限定
- **ファイル**: `backend/src/stats/` (controller, service, module)

### 2c. 年間プラン対応
- **変更**: Stripeチェックアウトに`plan`パラメータ追加（monthly/annual）
- **環境変数**: `STRIPE_ANNUAL_PRICE_ID`追加
- **ファイル**: `subscriptions.controller.ts`, `subscriptions.service.ts`

---

## 3. ブロッカー一覧

| # | ブロッカー | 重要度 | 担当 | 解決アクション |
|---|-----------|--------|------|---------------|
| 1 | CI/CD docker-build失敗 | CRITICAL | Dev/DevSecOps | 本ブランチの修正をmainマージ |
| 2 | Phase 5ブランチ main未マージ | HIGH | Dev | CI/CD修正マージ後に統合 |
| 3 | ANTHROPIC_API_KEY未設定 | MEDIUM | Ops/DevSecOps | GitHub Secretsに追加必要 |
| 4 | STRIPE_ANNUAL_PRICE_ID未設定 | MEDIUM | Ops | Stripe側で年間プラン商品作成 + Secrets追加 |

---

## 4. 次のアクション（優先順）

1. **CI/CD修正のmainマージ** → DevSecOps獅白さんの最終確認後、即マージ
2. **Phase 5ブランチのmain統合** → CI/CD通過確認後にPR作成・マージ
3. **環境変数セットアップ** → ANTHROPIC_API_KEY, STRIPE_ANNUAL_PRICE_ID をGitHub Secretsに登録
4. **フロントエンド対応** → AI分析UI、統計ダッシュボードUI、年間プラン選択UIの実装（デザインカンプ待ち）
5. **サブスク訴求CTA実装** → 宝鐘さんのデザインカンプ完成次第着手

---

## 5. QA/DevSecOps連携事項

- **雪花さん(QA)**: CI/CDマージ後のパイプライン全ステージ通過確認をお願いします。Phase 5 APIのテストケースはai-analysis, statsの各エンドポイント仕様を共有します。
- **獅白さん(DevSecOps)**: ANTHROPIC_API_KEYのシークレット管理方針（GitHub Secrets直接 or Vault経由）の判断をお願いします。CI/CDワークフロー修正の最終レビュー承認もお待ちしています。
