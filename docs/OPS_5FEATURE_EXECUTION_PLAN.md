# Operations 実行計画: 5企画並行開発・devマージ運用

## 概要
月100万円達成に向けた5つの新機能（投げ銭・有料コンテンツ・サロン・トーナメント・コーチング）の並行開発における運用計画。

---

## 1. ブランチマージ順序（確定）

スキーマ変更の規模とコンフリクトリスクを考慮し、以下の順序でdevへマージする。

| 順序 | ブランチ名 | 機能 | スキーマ変更規模 | 理由 |
|------|-----------|------|-----------------|------|
| 1st | `feature/tipping` | 投げ銭・チップ | 小（Tip テーブル追加） | 既存テーブルへの影響最小、Stripe Connect基盤を先行構築 |
| 2nd | `feature/paid-content` | 有料コンテンツ販売 | 小（PaidContent + Purchase テーブル） | tipping で構築したStripe Connect基盤を再利用 |
| 3rd | `feature/salon` | 有料コミュニティ/サロン | 中（Salon, SalonMember, SalonPost 等） | Subscriptionモデルの多階層化が必要 |
| 4th | `feature/tournament` | トーナメント主催 | 中（Tournament, TournamentEntry 等） | イベント管理+決済の複合機能 |
| 5th | `feature/coaching` | プロコーチマッチング | 中（CoachProfile, Booking, Review 等） | 最も独立性が高く、後回しでもコンフリクト少 |

### マージルール
- 各ブランチは `dev` からの最新を取り込んでからPR作成
- マージ前に `prisma db push` の差分が既存データを破壊しないことを確認
- マージ後、次のブランチ担当者は即座に `dev` を rebase/merge して最新化

---

## 2. 環境変数追加計画

### 2-1. Stripe Connect（投げ銭・有料コンテンツで必要）

```env
# ========== Stripe Connect (投げ銭・有料コンテンツ) ==========
# Stripe Connect アカウント種別: Express（推奨）
# プラットフォーム手数料率（例: 0.10 = 10%）
STRIPE_CONNECT_PLATFORM_FEE_RATE=0.10

# Stripe Connect Webhook（Connect専用エンドポイント）
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_connect_xxx

# 投げ銭の最低額・最高額（円）
TIPPING_MIN_AMOUNT=100
TIPPING_MAX_AMOUNT=50000
```

### 2-2. 有料コンテンツ販売

```env
# ========== 有料コンテンツ ==========
# コンテンツ単価の上限（円）
PAID_CONTENT_MAX_PRICE=50000
```

### 2-3. サロン機能

```env
# ========== サロン（有料コミュニティ） ==========
# サロン月額の上限（円）
SALON_MAX_MONTHLY_PRICE=30000
```

### 2-4. トーナメント機能

```env
# ========== トーナメント ==========
# 参加費の上限（円）
TOURNAMENT_MAX_ENTRY_FEE=10000
```

### 2-5. コーチング機能

```env
# ========== コーチマッチング ==========
# レッスン料の上限（円）
COACHING_MAX_HOURLY_RATE=30000
```

### デプロイ時の追加手順
1. `.env.example` に上記変数を追記（各featureブランチで実施）
2. 本番サーバーの `.env` に値を設定
3. `docker-compose` の backend service に環境変数を追加
4. Stripe Dashboard で Connect 設定を有効化（Express アカウント）

---

## 3. Webhookエンドポイント追加計画

### 現状のWebhook構成
- `POST /api/subscriptions/webhook` — 既存Stripe Subscription用

### 追加予定
| エンドポイント | 用途 | 対応ブランチ |
|---------------|------|-------------|
| `POST /api/tipping/webhook` | Stripe Connect 投げ銭決済通知 | feature/tipping |
| `POST /api/paid-content/webhook` | 有料コンテンツ購入通知 | feature/paid-content |
| `POST /api/salon/webhook` | サロン課金状態変更通知 | feature/salon |
| `POST /api/tournament/webhook` | トーナメント参加費決済通知 | feature/tournament |

### Webhook共通要件
- Raw body パース設定を `main.ts` に追加（各エンドポイント分）
- 署名検証必須（`stripe-signature` ヘッダー）
- `@SkipThrottle()` 適用
- べき等性保証（イベントID重複チェック）
- 失敗時は `WebhookNotifierService` で通知

### Stripe Dashboard 設定
各Webhookエンドポイントを Stripe Dashboard に登録し、必要なイベントのみ受信する設定にする。

---

## 4. nginx.conf 更新計画

各Webhookエンドポイントへのプロキシ設定は既存の `/api/` ルールでカバーされるため、nginx.conf の構造変更は不要。ただし以下を確認：

- Rate limiting: Webhookエンドポイントは `/api/` の rate limit (30r/s) 内で十分
- Body size: 10MB制限は維持（Stripe Webhookペイロードは通常数KB）

---

## 5. CI/CD パイプライン対応

### 既存CI/CDへの影響
現在の `.github/workflows/ci-cd.yml` は `main` ブランチへのpush時にデプロイが走る構成。5ブランチ並行開発では以下を確認：

- **PRチェック**: 各featureブランチからdevへのPR時にテスト・ビルドが実行される
- **devマージ後**: devからmainへのPRでデプロイパイプラインが起動
- **スキーマ変更**: `prisma db push --accept-data-loss` をデプロイフローに含める

### 推奨追加事項
- 各featureブランチのPRにマージ順序のラベルを付与（`merge-order:1` 等）
- PRテンプレートに「スキーマ変更有無」チェック項目を追加

---

## 6. モニタリング・アラート追加

### 新機能向け監視項目

| 機能 | 監視対象 | アラート条件 |
|------|---------|-------------|
| 投げ銭 | Stripe Connect 送金エラー | 送金失敗率 > 1% |
| 有料コンテンツ | 購入決済エラー | 決済失敗率 > 5% |
| サロン | 月額課金更新失敗 | 更新失敗が3回連続 |
| トーナメント | 参加費決済・返金エラー | 返金処理失敗 |
| 全機能共通 | Webhook delivery 失敗 | Stripe Dashboard上の失敗率 > 5% |

### WebhookNotifierService 通知テンプレート
既存の `WebhookNotifierService` を利用して、各機能の決済エラー時にSlack/Discordへ自動通知する。

---

## 7. バックアップ・リカバリ

### スキーマ変更前チェックリスト
1. `scripts/backup-postgres.sh` で本番DBバックアップ取得
2. ステージング環境で `prisma db push` を先行実行して検証
3. 本番適用後、`scripts/health-check.sh` で稼働確認
4. 問題発生時は `scripts/restore-postgres.sh` でロールバック

---

## 8. 本番デプロイ順序（devマージ後）

```
dev → main PR作成 → CI/CDパイプライン実行 → デプロイ
```

各機能のdevマージ後、まとめてmainへマージするか、機能単位でmainへ出すかはCEO判断。推奨は2-3機能ごとにまとめてリリース：

- **Phase 1**: 投げ銭 + 有料コンテンツ（収益直結、早期リリース推奨）
- **Phase 2**: サロン + トーナメント
- **Phase 3**: コーチング

---

*Operations 星街 — 2026-03-05 作成*
