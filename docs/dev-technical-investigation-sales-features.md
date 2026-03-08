# 営業施策向け機能 技術調査メモ & 概算工数

> 作成: Development チーム (兎田)
> 日付: 2026-03-08
> 目的: 桃鈴さんの「営業5施策×各部門サブタスクのマトリクス表」への工数根拠提供

---

## 1. リファラルコード機能（招待リンク生成・トラッキングAPI）

### 既存資産

| 項目 | 状態 | ファイル |
|------|------|----------|
| AffiliatePartner モデル | ✅ 実装済 | `prisma/schema.prisma` |
| AffiliateClick トラッキング | ✅ 実装済 | `backend/src/affiliates/affiliates.service.ts` |
| Affiliate リダイレクト＆クリック記録 | ✅ 実装済 | `backend/src/affiliates/affiliates.controller.ts` |
| ユーザー紹介コード | ❌ 未実装 | — |
| リファラル報酬追跡 | ❌ 未実装 | — |

### 必要な実装

#### DB スキーマ変更

```prisma
// User モデルに追加
referralCode      String?   @unique
referredById      String?
referredBy        User?     @relation("Referrals", fields: [referredById], references: [id])
referredUsers     User[]    @relation("Referrals")

// 新規モデル
model ReferralReward {
  id             String   @id @default(uuid())
  referrerId     String
  referrer       User     @relation(fields: [referrerId], references: [id], onDelete: Cascade)
  referredUserId String?
  rewardType     String   // "signup" | "subscription"
  status         String   @default("pending") // "pending" | "earned" | "paid"
  createdAt      DateTime @default(now())
  @@index([referrerId, createdAt])
}
```

#### バックエンド新規モジュール: `backend/src/referrals/`

- **ReferralsService**: コード生成（nanoid ベース）、バリデーション、統計取得
- **ReferralsController**: `GET /referrals/me`, `GET /referrals/:code/validate`, `GET /referrals/me/stats`
- **AuthService 連携**: `register()` に `referralCode` パラメータ追加、登録時の紐付け処理

#### フロントエンド

- 設定画面に紹介コード表示 + コピーボタン
- 紹介統計ダッシュボード（招待数・報酬状態）
- 登録フォームで `?ref=CODE` クエリパラメータ自動取得

### 概算工数

| タスク | 工数 |
|--------|------|
| DB スキーマ + マイグレーション | 0.5日 |
| Referrals モジュール（Service + Controller） | 1.5日 |
| AuthService 登録フロー統合 | 0.5日 |
| フロントエンド UI（設定画面・統計） | 1日 |
| テスト + 結合確認 | 0.5日 |
| **合計** | **4日** |

### リスク・注意点
- 既存 Affiliates モジュールのクリックトラッキングパターンを流用可能（低リスク）
- 報酬ロジックはビジネス要件次第で複雑度が変動する
- コード衝突チェックは nanoid (8文字) で実用上問題なし

---

## 2. 無料トライアル期間の Stripe Subscription 対応

### 既存資産

| 項目 | 状態 | ファイル |
|------|------|----------|
| Stripe Checkout Session 作成 | ✅ 実装済 | `backend/src/subscriptions/subscriptions.service.ts` |
| Webhook 処理（6イベント対応） | ✅ 実装済 | 同上 |
| 冪等性チェック（SubscriptionEvent） | ✅ 実装済 | 同上 |
| サブスク管理（キャンセル・再開・ポータル） | ✅ 実装済 | 同上 |
| 月額 ¥980 / 年額 ¥9,800 価格設定 | ✅ 環境変数 | `.env.example` |
| トライアル期間 | ❌ 未対応 | — |

### 必要な実装

#### Stripe API 変更（最小限）

```typescript
// createCheckoutSession() に trial_period_days を追加するだけ
session = await stripe.checkout.sessions.create({
  customer: customerId,
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  subscription_data: {
    trial_period_days: parseInt(process.env.SUBSCRIPTION_TRIAL_DAYS || '14'),
  },
  success_url: ...,
  cancel_url: ...,
});
```

#### Webhook 追加対応

- `customer.subscription.trial_will_end` イベントハンドラ追加（通知トリガー用）
- 既存の `checkout.session.completed` / `invoice.paid` ハンドラでトライアル状態を正しく処理

#### DB スキーマ変更

```prisma
// User モデルに追加（任意、Stripe 側でも管理されるが表示用）
trialEndsAt       DateTime?
```

#### フロントエンド

- 設定画面のサブスク表示でトライアル状態の分岐追加
- 「14日間無料で試す」CTA テキスト変更
- トライアル残日数カウントダウン表示

### 概算工数

| タスク | 工数 |
|--------|------|
| Stripe checkout に trial_period_days 追加 | 0.25日 |
| Webhook ハンドラ追加 (`trial_will_end`) | 0.5日 |
| DB スキーマ + ステータス表示ロジック | 0.5日 |
| フロントエンド UI 変更 | 0.5日 |
| Stripe テスト環境での結合テスト | 0.5日 |
| **合計** | **2.25日** |

### リスク・注意点
- **最もローリスクな施策**: Stripe が `trial_period_days` をネイティブサポートしており、既存 webhook 基盤が堅牢
- トライアル→有料の自動切替は Stripe 側で処理されるため、バックエンド追加ロジックは最小限
- メール通知機能は現状未実装（Resend 等の導入が別途必要、ここでは工数外）

---

## 3. LP 上の CTA 最適化用 A/B テスト基盤

### 既存資産

| 項目 | 状態 | ファイル |
|------|------|----------|
| LP ページ（全セクション実装済） | ✅ 512行 | `frontend/src/app/lp/LandingClient.tsx` |
| GA4 基盤（gtag + カスタムイベント） | ✅ 実装済 | `frontend/src/lib/analytics.ts` |
| OGP 画像自動生成 | ✅ 実装済 | `frontend/src/app/lp/opengraph-image.tsx` |
| CTA ボタン（5箇所） | ✅ 実装済 | `LandingClient.tsx` |
| CTA クリックトラッキング | ❌ 未実装 | LP の CTA に analytics イベント未設置 |
| A/B テスト基盤 | ❌ 未実装 | — |
| フィーチャーフラグ | ❌ 未実装 | — |

### 推奨アプローチ: 軽量クライアントサイド A/B テスト

外部サービス（Optimizely 等）を使わず、GA4 + cookie ベースの軽量実装を推奨。

#### Phase 1: CTA トラッキング追加（前提作業）

```typescript
// analytics.ts に追加
lpCtaClick: (ctaId: string, variant?: string) =>
  gtagEvent("lp_cta_click", { cta_id: ctaId, variant: variant || "control" }),
lpView: (variant?: string) =>
  gtagEvent("lp_page_view", { variant: variant || "control" }),
```

#### Phase 2: A/B テスト基盤

```typescript
// frontend/src/lib/ab-test.ts (新規)
export function getVariant(experimentId: string, variants: string[]): string {
  const key = `ab_${experimentId}`;
  // cookie から既存割り当てを取得、なければランダム割り当て＆保存
  const existing = getCookie(key);
  if (existing && variants.includes(existing)) return existing;
  const variant = variants[Math.floor(Math.random() * variants.length)];
  setCookie(key, variant, 30); // 30日保持
  return variant;
}

// React Hook
export function useABTest(experimentId: string, variants: string[]): string {
  const [variant, setVariant] = useState("control");
  useEffect(() => {
    setVariant(getVariant(experimentId, variants));
  }, [experimentId]);
  return variant;
}
```

#### LP での使用例

```tsx
const variant = useABTest("lp_cta_2026q1", ["control", "large_button", "urgency_copy"]);

// CTA レンダリング
{variant === "large_button" && <LargeCtaButton />}
{variant === "urgency_copy" && <UrgencyCtaButton />}
{variant === "control" && <DefaultCtaButton />}
```

#### バックエンド（任意、Phase 3）

サーバーサイドでの実験管理が必要になった場合のみ：
- `Experiment` / `ExperimentVariant` モデル追加
- 実験管理 API（作成・終了・結果取得）
- ユーザーごとのバリアント永続化

### 概算工数

| タスク | 工数 |
|--------|------|
| **Phase 1**: CTA トラッキング（analytics.ts + LP 5箇所） | 0.5日 |
| **Phase 2**: A/B テストユーティリティ + Hook | 1日 |
| **Phase 2**: LP への組み込み（バリアント分岐） | 0.5日 |
| **Phase 2**: GA4 でのレポート設定ガイド作成 | 0.25日 |
| テスト + 動作確認 | 0.5日 |
| **合計（Phase 1+2）** | **2.75日** |
| Phase 3（サーバーサイド管理、任意） | +3日 |

### リスク・注意点
- Cookie ベースの割り当てはブラウザ跨ぎで一貫しないが、LP の A/B テストには十分
- GA4 でのコンバージョン分析は Google Analytics 側のセグメント設定が必要（Ops 連携）
- SSR 時の hydration mismatch を避けるため、`useEffect` での遅延割り当てが必須

---

## 全体サマリー

| 施策 | 工数 | リスク | 既存基盤活用度 | 優先度推奨 |
|------|------|--------|----------------|------------|
| リファラルコード | 4日 | 低〜中 | ★★★☆☆ | 高（ユーザー獲得直結） |
| 無料トライアル | 2.25日 | 低 | ★★★★★ | 最高（最小工数で最大効果） |
| A/B テスト基盤 | 2.75日 | 低 | ★★★★☆ | 中（効果測定の土台） |
| **合計** | **9日** | — | — | — |

### 推奨実装順序

1. **無料トライアル** → 最小工数・Stripe ネイティブ対応で即効性あり
2. **CTA トラッキング + A/B テスト** → 効果測定基盤を先に整備
3. **リファラルコード** → ユーザー獲得チャネルとして最後に構築

### 他部門への依存事項

- **Design**: A/B テストのバリアント UI デザイン（宝鐘さん）
- **QA**: リファラルトラッキング・Stripe 連携の結合テスト項目（雪花さん）
- **DevSecOps**: リファラル API のレートリミット設定、トライアル悪用防止策（獅白さん）
- **Ops**: GA4 コンバージョンレポート設定、Stripe webhook 監視（星街さん）
