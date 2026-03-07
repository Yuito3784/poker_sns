# Operations 成果物: 5企画並行開発 運用デリバラブル

## ステータス: 完了
担当: Operations 星街
作成日: 2026-03-05

---

## 成果物一覧

### 1. ブランチマージ運用ルール

**マージ順序（確定）**: `feature/tipping` → `feature/paid-content` → `feature/salon` → `feature/tournament` → `feature/coaching`

**運用フロー**:
```
1. featureブランチで開発完了
2. devの最新をマージ/リベース
3. PRを作成（QAチェックリスト・SecOpsチェック項目を含む）
4. CEO承認後、devへマージ
5. 次のfeatureブランチ担当者はdevを即座に取り込み
6. 全機能マージ後、dev → main PRでデプロイ
```

### 2. 環境変数管理

**新規追加が必要な環境変数**: 合計8個
- Stripe Connect関連: 3個 (`STRIPE_CONNECT_PLATFORM_FEE_RATE`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `TIPPING_MIN_AMOUNT`/`TIPPING_MAX_AMOUNT`)
- 有料コンテンツ: 1個 (`PAID_CONTENT_MAX_PRICE`)
- サロン: 1個 (`SALON_MAX_MONTHLY_PRICE`)
- トーナメント: 1個 (`TOURNAMENT_MAX_ENTRY_FEE`)
- コーチング: 1個 (`COACHING_MAX_HOURLY_RATE`)

**設定場所**: `.env.example` → `.env` → docker-compose.yml backend service

### 3. Webhookエンドポイント追加

**追加予定**: 4エンドポイント
- `/api/tipping/webhook`
- `/api/paid-content/webhook`
- `/api/salon/webhook`
- `/api/tournament/webhook`

**共通要件**: Raw body パース、署名検証、べき等性、SkipThrottle、エラー通知

### 4. デプロイチェックリスト

各featureブランチのdevマージ → 本番デプロイ時に実施：

- [ ] DBバックアップ取得 (`scripts/backup-postgres.sh`)
- [ ] ステージングで `prisma db push` 検証
- [ ] 環境変数の追加・確認
- [ ] Stripe Dashboard で Webhook エンドポイント登録
- [ ] Stripe Connect 設定の有効化（投げ銭ブランチ初回のみ）
- [ ] `docker-compose build && docker-compose up -d`
- [ ] ヘルスチェック実行 (`scripts/health-check.sh`)
- [ ] Webhook配信テスト（Stripe CLIで `stripe trigger` 実行）
- [ ] WebhookNotifierService でSlack/Discord通知確認
- [ ] 問題時はロールバック (`scripts/restore-postgres.sh` + 前バージョンイメージ)

### 5. 監視・アラート設定

**追加監視項目**:
- 各機能の決済エラー率（閾値: 5%超でアラート）
- Stripe Connect 送金エラー（閾値: 1%超でアラート）
- Webhook delivery 失敗率（Stripe Dashboard監視）
- DB接続プール使用率（5機能追加で負荷増加の可能性）

**通知チャネル**: 既存 `WebhookNotifierService` (Slack/Discord) を活用

### 6. リリーススケジュール推奨

| Phase | 含む機能 | 推奨理由 |
|-------|---------|---------|
| Phase 1 | 投げ銭 + 有料コンテンツ | 収益直結、スキーマ変更小、早期リリースで収益化開始 |
| Phase 2 | サロン + トーナメント | 中規模スキーマ変更、Phase 1の運用実績を踏まえて展開 |
| Phase 3 | コーチング | 独立性高、最後でもコンフリクト少 |

### 7. 詳細ドキュメント

- 詳細な実行計画: `docs/OPS_5FEATURE_EXECUTION_PLAN.md`

---

## 他部門への依頼事項

### Devへ
- 各featureブランチで `.env.example` への変数追記を忘れずに
- `main.ts` の Raw body パース設定を各Webhookエンドポイントに追加
- `WebhookNotifierService` を各決済エラーハンドラに組み込み

### DevSecOpsへ
- 各Webhookエンドポイントの署名検証テスト
- Stripe Connect のCSRFトークン検証
- 金額改ざん防止のサーバーサイド検証確認

### QAへ
- 各機能のE2E決済テスト（正常・異常・二重課金防止）
- マージ順序に従ったスキーマ整合性テスト
- 環境変数未設定時の graceful degradation 確認

### Designへ
- 各決済UIのエラー状態デザイン（決済失敗・タイムアウト）
- ローディング状態のデザイン

---

*Operations 星街 — 2026-03-05*
