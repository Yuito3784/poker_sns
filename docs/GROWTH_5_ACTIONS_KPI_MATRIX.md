# ユーザー爆発的増加 5施策 — KPI優先度マトリクス & 実行仕様

**作成日**: 2026-03-05
**作成者**: Planning (常闇)
**ステータス**: Active
**目的**: ユーザーを爆発的に増やす5つのアクションの優先順位決定と実行仕様

---

## 1. KPI優先度マトリクス

### スコアリング基準
- **実装コスト**: 1(高コスト) ～ 5(低コスト) — Dev工数の逆数
- **ユーザー獲得インパクト**: 1(低) ～ 5(高) — 期待新規登録数
- **収益貢献度**: 1(低) ～ 5(高) — 有料転換への直結度
- **即効性**: 1(遅) ～ 5(即) — 効果発現までの速さ
- **総合スコア**: 加重平均 (インパクト×0.35 + 収益×0.25 + 即効性×0.25 + コスト×0.15)

| # | 施策 | コスト | インパクト | 収益 | 即効性 | **総合** | **優先順位** |
|---|------|--------|-----------|------|--------|---------|-------------|
| ① | インフルエンサー招待プログラム | 4 | 5 | 4 | 4 | **4.35** | **🥇 P0** |
| ② | OGP動的生成 + SNSバイラル | 3 | 4 | 3 | 3 | **3.40** | **🥈 P1** |
| ③ | 7日間無料トライアル | 3 | 3 | 5 | 4 | **3.75** | **🥈 P1** |
| ④ | ポーカーコミュニティ出稿 | 5 | 3 | 2 | 5 | **3.50** | **🥉 P2** |
| ⑤ | リファラルプログラム | 2 | 4 | 4 | 2 | **3.30** | **🥉 P2** |

### 推奨実行順序

```
Week 1: ① インフルエンサー招待 + ④ コミュニティ出稿（並行可）
Week 2: ③ 無料トライアル（Stripe拡張）
Week 3: ② OGP動的生成（SNSバイラルの基盤）
Week 4: ⑤ リファラルプログラム（①③の効果測定後に微調整）
```

---

## 2. 施策別 実行仕様

---

### 施策① インフルエンサー招待プログラム【P0】

**KPI目標**: 初月 10名のポーカーインフルエンサー招待 → 各インフルエンサー経由 50名登録 = **500名/月**

**概要**: 既存アフィリエイトモジュール (`backend/src/affiliates/`) を拡張し、ポーカーインフルエンサー向け特別招待プログラムを構築。

#### 実装範囲

**バックエンド (既存拡張)**:
- `affiliates.service.ts`: インフルエンサーティア追加（通常30% → インフルエンサー50%報酬率）
- `prisma/schema.prisma`: `AffiliatePartner`モデルに `tier` フィールド追加 (`STANDARD | INFLUENCER`)
- `affiliates.controller.ts`: インフルエンサー専用登録エンドポイント `POST /affiliates/influencer-apply`

**フロントエンド**:
- `/lp` LandingClient.tsx に「インフルエンサー優待枠」セクション追加
- `/partners` ページにティア別報酬率表示

**営業アクション（非開発）**:
- X (Twitter) でフォロワー1,000+のポーカー系アカウント30名をリストアップ
- DM テンプレート作成:「Poker SNS インフルエンサーパートナー募集 — 報酬率50%、専用バッジ付与」
- 最初の10名に直接DM送信

**検証基準**: インフルエンサー経由の登録がUTMトラッキングで計測可能であること

---

### 施策② OGP動的生成 + SNSバイラル【P1】

**KPI目標**: SNSシェア率 5% → 15%、シェア経由登録 200名/月

**概要**: 投稿がSNSでシェアされた際のOGPカード表示を最大化し、バイラル導線を構築。

#### 実装範囲

**バックエンド (新規)**:
- `backend/src/ogp/ogp.controller.ts`: `GET /ogp/post/:id` — 動的OG画像生成エンドポイント
- レスポンス: 1200×630px PNG（背景 `#0d1009` + ゴールド `#c9a84c` アクセント）
- Throttle: `@Throttle({ default: { limit: 30, ttl: 60000 } })` — 30req/min
- Cache-Control: `public, max-age=3600, s-maxage=86400`

**フロントエンド**:
- 各ページの `generateMetadata()` を完全実装（現在 `/post/[id]` のみ対応）
  - 対象: `/profile/[username]`, `/hashtag/[tag]`, `/explore`, `/lp`, `/partners`
- シェアボタン拡充: Facebook シェア + リンクコピー機能追加
- シェア時UTMパラメータ自動付与: `?utm_source=x&utm_medium=social&utm_campaign=post_share`

**参照ドキュメント**: `docs/DESIGN_SPEC_OGP_SHARE.md`, `docs/MARKETING_IMPLEMENTATION_SPEC.md`

**検証基準**: X/Facebook/LINEでシェアした際にリッチカードが表示されること

---

### 施策③ 7日間無料トライアル【P1】

**KPI目標**: 新規登録者のトライアル開始率 40%、トライアル→有料転換率 20% → **有料会員 +80名/月**（登録1,000名想定）

**概要**: Stripe Subscription のトライアル機能を活用し、新規ユーザーにPremiumを7日間体験させる。

#### 実装範囲

**バックエンド**:
- `subscriptions.service.ts`: `createTrialSubscription()` メソッド追加
  - Stripe API: `stripe.subscriptions.create({ trial_period_days: 7 })`
  - トライアル開始時にクレジットカード登録は必須（離脱防止）
- `subscriptions.controller.ts`: `POST /subscriptions/start-trial` エンドポイント
  - Throttle: `@Throttle({ default: { limit: 3, ttl: 86400000 } })` — 3回/日
  - バリデーション: 過去にトライアル利用済みユーザーは拒否
- `prisma/schema.prisma`: `User`モデルに `trialUsed Boolean @default(false)` 追加
- Webhook: `customer.subscription.trial_will_end` イベントハンドリング（3日前メール通知）

**フロントエンド**:
- `/pricing` ページ（`FUNNEL_ACTION_ITEMS.md` ACTION-02 に記載済み）に「7日間無料で試す」CTA
- 登録完了画面にトライアル開始モーダル
- トライアル残日数バナー（ヘッダー下部）

**QA境界値テスト（角巻さん設計済み）**:
- トライアル開始→6日23:59→7日0:00の自動解除
- トライアル中の有料切替
- トライアル期限切れ後の再登録拒否

**検証基準**: トライアル開始→7日後自動課金 or 自動解除が正常動作すること

---

### 施策④ ポーカーコミュニティ出稿【P2】

**KPI目標**: コミュニティ投稿経由 300名/月登録

**概要**: 国内外のポーカーコミュニティに直接告知。開発工数ほぼゼロ、マーケティングアクションのみ。

#### 実行アクション

**ターゲットコミュニティ一覧**:

| プラットフォーム | コミュニティ名 | 推定アクティブ | アクション |
|----------------|--------------|-------------|----------|
| X (Twitter) | #ポーカー #テキサスホールデム | 5,000+ | ハッシュタグ付き告知ポスト (1日2回) |
| Reddit | r/poker, r/pokerstrategy | 500,000+ | 紹介記事投稿（英語対応必要） |
| Discord | ポーカー Japan各サーバー | 3,000+ | サーバー管理者にパートナー提案 |
| note | ポーカー関連記事 | — | SEO記事シリーズ投稿（計画済み `NOTE_ARTICLE_SERIES_PLAN.md`） |
| YouTube | ポーカー解説チャンネル | — | コラボ or コメント欄告知 |

**投稿テンプレート（X用）**:
```
ポーカープレイヤーのためのSNS「Poker SNS」が登場。
ハンド共有・戦略議論・コミュニティ機能を搭載。
今なら Premium 7日間無料トライアル実施中。

🔗 [URL]?utm_source=x&utm_medium=social&utm_campaign=community_launch

#ポーカー #テキサスホールデム #PokerSNS
```

**バックエンド変更**:
- UTMトラッキング基盤のみ（ACTION-01、docs/FUNNEL_ACTION_ITEMS.md に仕様記載済み）

**検証基準**: UTM経由の登録が計測可能、チャネル別CVR追跡

---

### 施策⑤ リファラルプログラム【P2】

**KPI目標**: 既存ユーザーの10%がリファラル利用 → 紹介1名/人平均 = **100名/月**（既存1,000名想定）

**概要**: 既存ユーザーが友人を招待すると、双方にPremium1ヶ月無料を付与。

#### 実装範囲

**バックエンド (新規)**:
- `prisma/schema.prisma`:
  ```prisma
  model ReferralCode {
    id          String   @id @default(uuid())
    code        String   @unique
    userId      String
    user        User     @relation(fields: [userId], references: [id])
    usedBy      ReferralRedemption[]
    createdAt   DateTime @default(now())
  }

  model ReferralRedemption {
    id             String       @id @default(uuid())
    referralCodeId String
    referralCode   ReferralCode @relation(fields: [referralCodeId], references: [id])
    redeemedByUserId String
    redeemedBy     User         @relation(fields: [redeemedByUserId], references: [id])
    rewardGranted  Boolean      @default(false)
    createdAt      DateTime     @default(now())
  }
  ```
- `backend/src/referrals/referrals.module.ts`: 新規モジュール
- `referrals.service.ts`: コード生成、利用、報酬付与ロジック
- `referrals.controller.ts`:
  - `GET /referrals/my-code` — 自分のリファラルコード取得/生成
  - `POST /referrals/redeem` — リファラルコード利用（登録時）
  - Throttle: `@Throttle({ default: { limit: 5, ttl: 60000 } })`
- 報酬: Stripe `stripe.subscriptions.update()` でクーポン適用（紹介者・被紹介者双方）

**フロントエンド**:
- `/settings` ページに「友達を招待」セクション
  - リファラルコード表示 + コピーボタン
  - SNSシェアボタン（X, LINE）
  - 紹介実績一覧（何名招待、報酬ステータス）
- 登録フォーム: リファラルコード入力フィールド（オプション）

**検証基準**: リファラルコード経由登録 → 双方にPremium1ヶ月無料クーポン適用

---

## 3. Dev向け工数見積もり依頼

兎田さん（Dev）への依頼事項:

| 施策 | Planning概算 | 確認ポイント |
|------|-------------|-------------|
| ① インフルエンサー招待 | 1-2日 | アフィリエイトモジュール拡張のみ。tier追加の影響範囲は？ |
| ② OGP動的生成 | 3-4日 | OG画像生成ライブラリ選定（@vercel/og vs sharp+canvas）。既存opengraph-image.tsxの拡張で対応可能か？ |
| ③ 無料トライアル | 2-3日 | Stripe trialの実装経験ベースで。Webhookハンドラ追加のテスト工数含む |
| ④ コミュニティ出稿 | 0.5日 | UTMトラッキング基盤のみ。FUNNEL_ACTION_ITEMS.md ACTION-01 の工数 |
| ⑤ リファラル | 3-4日 | 新規モジュール作成。Stripeクーポン連携の複雑度は？ |

**合計概算: 10-14日**（並行作業で2-3週間）

---

## 4. セキュリティ要件（DevSecOps 獅白さん連携）

全新規エンドポイント共通:
- Throttle 必須（施策別に上記記載）
- 入力バリデーション: class-validator デコレータ必須
- Webhook: Stripe署名検証（既存修正済み基盤を流用）
- OGPエンドポイント: Cache-Control ヘッダー必須（外部大量リクエスト対策）
- リファラルコード: UUID v4（推測不可能）

---

## 5. 効果測定基盤（Ops 白上さん連携）

- UTMパラメータ体系: `docs/NOTE_UTM_SPEC.md` に準拠
- チャネル別ダッシュボード: 既存アフィリエイトモジュールのトラッキングデータ流用
- KPI追跡項目:
  - 施策別 新規登録数/日
  - 施策別 CVR (訪問→登録→有料転換)
  - インフルエンサー別 獲得数
  - リファラル利用率
  - トライアル→有料転換率

---

## 6. 次のアクション

| 担当 | アクション | 期限 |
|------|----------|------|
| Dev (兎田) | 工数見積もりフィードバック | 本日中 |
| Design (しぐれうい) | OGPテンプレート・リファラルカードモック | 本日中 |
| DevSecOps (獅白) | セキュリティ要件チェックリスト | 本日中 |
| QA (角巻) | トライアル境界値テストケース | 本日中 |
| Ops (白上) | UTM体系・効果測定基盤設計 | 本日中 |
| **Planning (常闇)** | **本ドキュメント配信 → 各部門キックオフ** | **完了** |
