# QA/QC 成果物: 5収益機能 テスト戦略 & 実装ガイド

**作成者:** 尾丸 (QA/QC)
**作成日:** 2026-03-05
**関連文書:** `QA_5FEATURES_MERGE_CRITERIA.md`, `qa-phase5-test-plan.md`

---

## 1. テスト戦略概要

### 1.1 テストピラミッド

```
        /  E2E (手動)  \        ← 決済フロー確認・UI検証
       / Integration     \      ← API + DB + Stripe Mock
      /   Unit Tests      \     ← Service層ロジック
     /   Schema Validation  \   ← Prisma スキーマ整合性
```

### 1.2 テスト環境

| 環境 | 用途 | Stripe |
|------|------|--------|
| Unit Test (Jest) | Service層ロジック検証 | jest.mock |
| Docker Compose | 結合テスト (API + PostgreSQL) | Stripe Test Keys |
| ステージング | E2E + 手動検証 | Stripe Test Mode |

### 1.3 マージ順序とテスト依存

```
feature/tipping ──────→ dev マージ (1st)
                            ↓ 回帰テスト
feature/paid-content ─→ dev マージ (2nd)
                            ↓ 回帰テスト
feature/salon ────────→ dev マージ (3rd)
                            ↓ 回帰テスト
feature/tournament ───→ dev マージ (4th)
                            ↓ 回帰テスト
feature/coaching ─────→ dev マージ (5th)
                            ↓ 全回帰テスト
```

各マージ後に必ず `npm run test` 全パス + `npm run build` 成功を確認。

---

## 2. Unit Test 仕様 (各ブランチで Dev が実装)

### 2.1 投げ銭 (tipping.service.spec.ts)

```
describe('TippingService')
  describe('createTip')
    ✓ 有効な金額(100-100,000)でTip作成成功
    ✓ 最低金額未満(99)で BadRequestException
    ✓ 最高金額超過(100,001)で BadRequestException
    ✓ 負の金額で BadRequestException
    ✓ 小数点金額で BadRequestException
    ✓ 自分自身への投げ銭で BadRequestException
    ✓ 存在しない投稿で NotFoundException
    ✓ ブロックユーザーへの投げ銭で ForbiddenException
    ✓ Stripe PaymentIntent作成が呼ばれる
    ✓ 金額はサーバーサイドで確定(リクエスト改ざん不可)

  describe('handleTipWebhook')
    ✓ payment_intent.succeeded → Tip.status='COMPLETED'
    ✓ payment_intent.payment_failed → Tip.status='FAILED'
    ✓ 無効署名で BadRequestException
    ✓ 重複イベントでスキップ(冪等)

  describe('getTipHistory')
    ✓ 送信履歴の取得
    ✓ 受信履歴の取得
    ✓ ページネーション動作
```

### 2.2 有料コンテンツ (paid-content.service.spec.ts)

```
describe('PaidContentService')
  describe('createPaidContent')
    ✓ Premiumユーザーが有料コンテンツ作成成功
    ✓ フリーユーザーで ForbiddenException
    ✓ 価格100-50,000円の範囲バリデーション
    ✓ previewLengthの設定が保存される

  describe('getContent')
    ✓ 未購入ユーザー: プレビューのみ(fullContent=null)
    ✓ 購入済みユーザー: 全文返却
    ✓ 作成者: 全文返却(購入不要)
    ✓ 未認証: 401

  describe('purchaseContent')
    ✓ Stripe Checkout Session作成成功
    ✓ 自分のコンテンツ購入で BadRequestException
    ✓ 二重購入で ConflictException or 既存購入返却
    ✓ 価格はDB値を使用(クライアント値無視)

  describe('handlePurchaseWebhook')
    ✓ checkout.session.completed → 購入レコード作成
    ✓ 無効署名で BadRequestException
    ✓ 重複処理スキップ
```

### 2.3 サロン (salons.service.spec.ts)

```
describe('SalonsService')
  describe('createSalon')
    ✓ Premiumユーザーがサロン作成成功
    ✓ Stripe Product/Price作成が呼ばれる
    ✓ フリーユーザーで ForbiddenException

  describe('joinSalon')
    ✓ Stripe Subscription作成 → Membership作成
    ✓ 既参加で ConflictException
    ✓ オーナー参加で BadRequestException
    ✓ BANユーザー参加で ForbiddenException

  describe('leaveSalon')
    ✓ Stripe Subscription cancel → status=CANCELED
    ✓ periodEnd まで閲覧権限維持

  describe('webhookHandlers')
    ✓ invoice.paid → ACTIVE更新
    ✓ invoice.payment_failed → PAST_DUE
    ✓ subscription.deleted → CANCELED
```

### 2.4 トーナメント (tournaments.service.spec.ts)

```
describe('TournamentsService')
  describe('createTournament')
    ✓ トーナメント作成成功(有料/無料)
    ✓ 開始日が未来であること

  describe('joinTournament')
    ✓ 参加登録 + 決済(有料の場合)
    ✓ 定員超過で BadRequestException
    ✓ 二重参加で ConflictException
    ✓ 開始済みで BadRequestException

  describe('cancelTournament')
    ✓ 開催者のみキャンセル可能
    ✓ 非開催者で ForbiddenException
    ✓ キャンセル時に全参加者返金処理開始
```

### 2.5 コーチング (coaching.service.spec.ts)

```
describe('CoachingService')
  describe('createProfile')
    ✓ コーチプロフィール作成成功
    ✓ 重複作成で ConflictException

  describe('bookSession')
    ✓ 予約 + Stripe決済
    ✓ 自分への予約で BadRequestException
    ✓ 過去日時で BadRequestException
    ✓ 枠が埋まっている場合 ConflictException

  describe('cancelBooking')
    ✓ 24時間前: 返金処理
    ✓ 24時間以内: 返金不可 BadRequestException

  describe('completeAndReview')
    ✓ 完了済みレッスンにレビュー投稿
    ✓ 未完了レッスンで BadRequestException
```

---

## 3. 決済セキュリティ テスト要件 (DevSecOps連携)

### 3.1 全機能共通: Stripe Webhook検証パターン

既存の `subscriptions.webhook.spec.ts` パターンを踏襲。各機能のWebhookハンドラーで以下を必須テスト:

```typescript
// テストパターン (各機能で実装)
describe('Webhook Security', () => {
  it('有効署名でイベント処理成功', async () => { ... });
  it('無効署名で BadRequestException', async () => { ... });
  it('WEBHOOK_SECRET未設定で BadRequestException', async () => { ... });
  it('重複イベントで冪等処理', async () => { ... });
});
```

### 3.2 金額改ざん防止チェック

| 機能 | チェック内容 |
|------|------------|
| 投げ銭 | PaymentIntent.amount はサーバー側のTip.amountから設定 |
| 有料コンテンツ | Checkout Session.line_items.priceはDB値 |
| サロン | Subscription.priceはサーバー側のSalon.priceIdから設定 |
| トーナメント | PaymentIntent.amountはDB値のTournament.entryFee |
| コーチング | PaymentIntent.amountはDB値のCoachProfile.hourlyRate × 時間 |

### 3.3 認可境界マトリクス

| エンドポイント | 未認証 | Free | Premium | Owner | Admin |
|--------------|--------|------|---------|-------|-------|
| POST /tips | 401 | 200 | 200 | - | 200 |
| POST /paid-content | 401 | 403 | 200 | - | 200 |
| GET /paid-content/:id (全文) | 401 | 購入要 | 購入要 | 200 | 200 |
| POST /salons | 401 | 403 | 200 | - | 200 |
| POST /salons/:id/join | 401 | 200 | 200 | 400 | 200 |
| POST /tournaments | 401 | 200 | 200 | - | 200 |
| POST /coaching/book | 401 | 200 | 200 | 400 | 200 |

---

## 4. データ整合性チェック手順

### 4.1 スキーママイグレーション検証

各ブランチマージ前に実行:

```bash
# 1. 既存データのバックアップ
docker exec poker-db pg_dump -U postgres poker_sns > backup_pre_migration.sql

# 2. スキーマ適用
cd backend && npx prisma db push --accept-data-loss

# 3. 既存データ整合性確認
docker exec poker-db psql -U postgres poker_sns -c "
  SELECT COUNT(*) as users FROM \"User\";
  SELECT COUNT(*) as posts FROM \"Post\";
  SELECT COUNT(*) as subs FROM \"SubscriptionEvent\";
"

# 4. 全APIスモークテスト
curl -s http://localhost:4000/api/health | jq .
npm run test
```

### 4.2 CASCADE削除テスト

| 親テーブル削除 | 子テーブル動作 | 確認方法 |
|-------------|-------------|---------|
| User削除 | Tip CASCADE削除 | User削除後にTipレコード=0 |
| Post削除 | PaidContent CASCADE削除 | Post削除後にPaidContentレコード=0 |
| User削除 | SalonMembership CASCADE削除 | 確認 |
| User削除 | CoachBooking CASCADE削除 | 確認 |
| Tournament削除 | TournamentParticipant CASCADE削除 | 確認 |

---

## 5. テスト実行スケジュール

| フェーズ | タイミング | 担当 | テスト種別 |
|---------|----------|------|----------|
| 1 | 各ブランチPR作成時 | Dev | Unit Test全パス + Build成功 |
| 2 | QAレビュー時 | QA/QC | チェックリスト検証 (QA_5FEATURES_MERGE_CRITERIA.md) |
| 3 | SecOpsレビュー時 | DevSecOps | セキュリティ項目検証 |
| 4 | devマージ後 | QA/QC | 回帰テスト (既存機能への影響確認) |
| 5 | 全機能マージ後 | QA/QC | 統合E2Eテスト |

---

## 6. 品質ゲート (Go/No-Go基準)

### Go条件 (全て満たすこと)

- [ ] Unit Test カバレッジ: 新規Service層 80%以上
- [ ] 共通マージ基準 A~D 全項目パス
- [ ] 個別機能テストケース 全パス
- [ ] Stripe Webhook署名検証テスト 4パターン全パス
- [ ] 金額改ざん防止テスト パス
- [ ] 認可境界テスト 全パス
- [ ] 既存テスト回帰 全パス (`npm run test`)
- [ ] ビルド成功 (Backend + Frontend)
- [ ] スキーマ変更後の既存データ整合性確認済み

### No-Go条件 (1つでも該当でブロック)

- 決済関連のUnit Testが1件でも失敗
- Webhook署名検証が未実装
- 金額がクライアントサイドで確定される実装
- 認可チェック漏れ (未認証でアクセス可能)
- 既存テストが1件でも失敗

---

*本文書は各ブランチのマージ時にQA/QCが検証基準として使用する。Dev実装完了後にQA/QCへレビュー依頼すること。*
