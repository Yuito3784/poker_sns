# プレミアムサブスクリプション 要件定義・設計書

## 1. 要件定義

### 1.1 目的

Poker SNS にプレミアム会員制度を導入し、月額課金による安定的な収益基盤（MRR）を確立する。

### 1.2 スコープ

- **Phase 1（本設計対象）**: Stripe決済による月額サブスクリプション + プレミアム機能の基盤
- 将来的な拡張: 年額プラン、ファミリープラン、AI ハンド分析、詳細統計ダッシュボード

### 1.3 機能要件

| No | 要件 | 詳細 |
|----|------|------|
| F1 | プラン管理 | 無料プラン（Free）とプレミアムプラン（Premium）の2種類を管理する |
| F2 | Stripe決済 | Stripe Checkout Session を使った月額課金フロー |
| F3 | Webhook処理 | Stripe Webhook でサブスクリプションの状態変更（開始・更新・キャンセル・失敗）を自動処理する |
| F4 | プレミアム機能 | プレミアム会員に対して以下の機能を提供する: |
|    | F4-1 | 広告非表示 |
|    | F4-2 | プロフィールにプレミアムバッジ表示 |
|    | F4-3 | 投稿の文字数上限拡張（280文字 → 1,000文字） |
| F5 | サブスク管理画面 | ユーザーが自分のサブスクリプション状態を確認・キャンセルできる画面 |
| F6 | Stripeカスタマーポータル | 支払い方法の変更・請求書確認は Stripe Customer Portal にリダイレクト |
| F7 | プラン状態の表示 | プロフィール等にプレミアム/無料の状態を表示する |

### 1.4 非機能要件

| No | 要件 | 詳細 |
|----|------|------|
| NF1 | セキュリティ | Stripe Webhook の署名検証を必ず行い、不正リクエストを拒否すること |
| NF2 | 冪等性 | Webhook は冪等に処理すること（同じイベントの再送に対応） |
| NF3 | 決済情報の非保持 | カード情報は一切サーバーに保存しない（Stripe側で管理） |
| NF4 | グレースピリオド | 決済失敗後も即座にプレミアム機能を停止せず、Stripeのリトライ期間（通常7日間）は維持する |
| NF5 | レスポンス | サブスク状態チェックはユーザーテーブルのフィールド参照のみで行い、毎回Stripe APIを呼ばないこと |

### 1.5 ユーザーフロー

```
【加入フロー】
設定画面 → 「プレミアムに加入」ボタン
  → バックエンドで Stripe Checkout Session 作成
  → Stripe決済画面にリダイレクト
  → 決済完了 → success URL にリダイレクト
  → Webhook で subscription.created 受信
  → DB の subscriptionStatus を "active" に更新

【解約フロー】
設定画面 → 「プランを解約」ボタン
  → バックエンドで Stripe Subscription を cancel_at_period_end に設定
  → 期間終了まではプレミアム機能を維持
  → Webhook で subscription.deleted 受信
  → DB の subscriptionStatus を "free" に更新

【支払い方法変更】
設定画面 → 「支払い情報を管理」ボタン
  → Stripe Customer Portal にリダイレクト
```

---

## 2. 設計

### 2.1 データモデル

#### User モデル拡張

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| subscriptionStatus | String | ○ | "free" / "active" / "canceled" / "past_due" |
| stripeCustomerId | String? | - | Stripe Customer ID |
| stripeSubscriptionId | String? | - | Stripe Subscription ID |
| subscriptionPeriodEnd | DateTime? | - | 現在の課金期間の終了日 |

```prisma
// User モデルに以下を追加
model User {
  // ... 既存フィールド
  subscriptionStatus    String    @default("free")  // "free" | "active" | "canceled" | "past_due"
  stripeCustomerId      String?   @unique
  stripeSubscriptionId  String?   @unique
  subscriptionPeriodEnd DateTime?
}
```

#### SubscriptionEvent モデル（監査ログ）

```prisma
model SubscriptionEvent {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeEventId   String   @unique  // 冪等性のためにユニーク
  eventType       String            // "checkout.session.completed", "invoice.paid", etc.
  status          String            // イベント処理後のステータス
  createdAt       DateTime @default(now())

  @@index([userId])
}
```

### 2.2 API 設計

#### POST /subscriptions/checkout

Stripe Checkout Session を作成し、決済URLを返す。

**認証**: 必須（JWT）

**レスポンス**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_xxx..."
}
```

**ロジック**
1. ユーザーの stripeCustomerId が無ければ Stripe Customer を作成
2. Stripe Checkout Session を mode: "subscription" で作成
3. success_url, cancel_url を設定
4. checkoutUrl を返却

#### POST /subscriptions/cancel

サブスクリプションを期間末でキャンセル。

**認証**: 必須（JWT）

**レスポンス**
```json
{
  "message": "サブスクリプションは現在の期間終了時にキャンセルされます。",
  "periodEnd": "2026-03-16T00:00:00.000Z"
}
```

**ロジック**
1. stripeSubscriptionId で Stripe API を呼び、cancel_at_period_end: true に設定
2. DB の subscriptionStatus を "canceled" に更新

#### POST /subscriptions/reactivate

キャンセル予約を取り消してサブスクリプションを再開。

**認証**: 必須（JWT）

**レスポンス**
```json
{
  "message": "サブスクリプションが再開されました。"
}
```

#### GET /subscriptions/status

現在のサブスクリプション状態を返す。

**認証**: 必須（JWT）

**レスポンス**
```json
{
  "status": "active",
  "periodEnd": "2026-03-16T00:00:00.000Z",
  "cancelAtPeriodEnd": false
}
```

#### POST /subscriptions/portal

Stripe Customer Portal の URL を返す。

**認証**: 必須（JWT）

**レスポンス**
```json
{
  "portalUrl": "https://billing.stripe.com/p/session/xxx..."
}
```

#### POST /subscriptions/webhook

Stripe Webhook エンドポイント（認証不要、署名検証のみ）。

**処理するイベント**
| イベント | 処理 |
|----------|------|
| checkout.session.completed | stripeCustomerId, stripeSubscriptionId を保存、status を "active" に |
| invoice.paid | subscriptionPeriodEnd を更新、status を "active" に |
| invoice.payment_failed | status を "past_due" に |
| customer.subscription.updated | cancel_at_period_end の変化を反映 |
| customer.subscription.deleted | status を "free" に、subscriptionId をクリア |

### 2.3 フロントエンド設計

#### 2.3.1 型の拡張

```typescript
// User 型に追加
export type User = {
  // ... 既存フィールド
  subscriptionStatus?: string;  // "free" | "active" | "canceled" | "past_due"
};
```

#### 2.3.2 プレミアムバッジコンポーネント

- **PremiumBadge**（新規）
  - 小さいバッジ: PostItem のユーザー名横、プロフィールヘッダー
  - 表示条件: `user.subscriptionStatus === "active" || user.subscriptionStatus === "canceled"`

#### 2.3.3 設定画面の拡張

- `/settings` ページにサブスクリプションセクションを追加
  - 無料会員: 「プレミアムに加入」ボタン + 特典一覧
  - プレミアム会員（active）: 現在のプラン表示 + 「プランを解約」+ 「支払い情報を管理」
  - キャンセル済み（canceled）: 「○月○日まで利用可能」 + 「プランを再開」
  - 支払い失敗（past_due）: 「支払いに問題があります」 + 「支払い情報を更新」

#### 2.3.4 広告非表示

- ホーム・トレンド・ブックマーク・ハッシュタグの各ページで、`subscriptionStatus` が "active" または "canceled" の場合、`AdCard` を表示しない

#### 2.3.5 投稿文字数制限

- 投稿フォームの文字数バリデーションを動的に変更
  - Free: 280文字
  - Premium: 1,000文字

### 2.4 ファイル構成

```
backend/
  prisma/
    schema.prisma               # User 拡張 + SubscriptionEvent 追加
  src/
    subscriptions/
      subscriptions.module.ts
      subscriptions.controller.ts
      subscriptions.service.ts

frontend/
  src/
    app/
      components/
        PremiumBadge.tsx        # 新規: プレミアムバッジ
      settings/
        page.tsx                # 変更: サブスクリプションセクション追加
    lib/
      types.ts                  # 変更: User 型に subscriptionStatus 追加
```

### 2.5 環境変数

```
# backend/.env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx          # Stripe Dashboard で作成した月額プランの Price ID
FRONTEND_URL=http://localhost:3000  # 既存
```

### 2.6 Stripe Dashboard 事前設定

1. Stripe アカウント作成（テストモード）
2. Product 作成: "Poker SNS Premium"
3. Price 作成: 月額 ¥980（または任意の金額）
4. Customer Portal の設定を有効化
5. Webhook エンドポイントの登録: `https://your-api.com/subscriptions/webhook`

---

## 3. 実装タスク一覧

1. [ ] Prisma: User モデル拡張（subscriptionStatus 等）+ SubscriptionEvent 追加 → マイグレーション
2. [ ] Backend: `npm install stripe`
3. [ ] Backend: subscriptions モジュール作成（controller, service, module）
4. [ ] Backend: POST /subscriptions/checkout 実装
5. [ ] Backend: POST /subscriptions/webhook 実装（署名検証 + イベント処理）
6. [ ] Backend: POST /subscriptions/cancel, /reactivate 実装
7. [ ] Backend: GET /subscriptions/status 実装
8. [ ] Backend: POST /subscriptions/portal 実装
9. [ ] Backend: buildAuthResponse に subscriptionStatus を含める
10. [ ] Backend: 投稿作成時の文字数制限をプランに応じて動的に変更
11. [ ] Frontend: User 型に subscriptionStatus 追加
12. [ ] Frontend: PremiumBadge コンポーネント作成
13. [ ] Frontend: 設定画面にサブスクリプションセクション追加
14. [ ] Frontend: 広告表示のプレミアム判定ロジック追加
15. [ ] Frontend: 投稿フォームの文字数制限を動的化
16. [ ] Frontend: PostItem / プロフィールにプレミアムバッジ表示
17. [ ] 動作確認: Stripe CLI でテスト Webhook 送信

---

## 4. 将来拡張（Phase 2）

- 年額プラン（2ヶ月分お得）
- AI ハンドレビュー機能（LLM でポーカーハンドを分析）
- 詳細統計ダッシュボード（ポジション別勝率、ストリート別アクション傾向）
- チーム/スタディグループ機能
- カスタムプロフィールテーマ
