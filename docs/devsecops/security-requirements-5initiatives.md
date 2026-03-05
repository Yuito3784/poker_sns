# Security Requirements Checklist — 5 User Growth Initiatives

**Author**: DevSecOps (角巻)
**Date**: 2026-03-05
**Status**: Merge Gate Baseline — Dev実装前に全項目を組み込むこと

---

## Overview

5施策の新規エンドポイントに対するセキュリティ要件を定義する。
既存パターン（@Throttle / Helmet CSP / Stripe Webhook署名検証 / ValidationPipe + DTO）を踏襲しつつ、施策固有のリスクに対応する。

---

## 施策別セキュリティ要件

### 1. Influencer Invite (インフルエンサー招待 — アフィリエイト拡張)

| # | 要件 | 詳細 | 優先度 |
|---|------|------|--------|
| 1-1 | Throttle | `POST /affiliates/invite` — `@Throttle({ default: { ttl: 60000, limit: 5 } })` | CRITICAL |
| 1-2 | Input Validation | DTO: `@IsEmail()` for invitee email, `@IsString() @MaxLength(200)` for message, `@IsOptional() @IsUrl()` for custom link | CRITICAL |
| 1-3 | Authorization | `@UseGuards(JwtAuthGuard)` + admin/partner role check | CRITICAL |
| 1-4 | Email Injection | Invite message はテンプレート固定、ユーザー入力をHTMLとして挿入しない | HIGH |
| 1-5 | Enumeration防止 | 招待結果に「既に登録済み」等の詳細を返さない（一律 "Invitation sent"） | MEDIUM |

### 2. OGP Dynamic Generation (Twitter/X連携 OGP画像生成)

| # | 要件 | 詳細 | 優先度 |
|---|------|------|--------|
| 2-1 | Throttle | `GET /posts/:id/ogp` — `@Throttle({ default: { ttl: 60000, limit: 30 } })` (外部クローラー対応で緩め、ただし上限あり) | CRITICAL |
| 2-2 | Cache-Control | `@Header('Cache-Control', 'public, max-age=600, s-maxage=1800')` — CDN/プロキシキャッシュ30分、ブラウザ10分 | CRITICAL |
| 2-3 | Content-Type | レスポンスは `image/png` を明示的に設定、SVG injection を防止 | HIGH |
| 2-4 | Input Validation | `:id` パラメータは `@IsUUID()` or valid CUID format で検証 | HIGH |
| 2-5 | CSP Header更新 | Helmet CSP `imgSrc` に OGP配信元ドメインを追加（self-hosted なら不要） | MEDIUM |
| 2-6 | Image Size Limit | 生成画像は 1200x630px / max 500KB に制限、DoS防止 | HIGH |
| 2-7 | Error Response | 存在しない投稿IDにはデフォルトOGP画像を返す（404ではなくfallback） | MEDIUM |
| 2-8 | SSR meta tags | `GET /posts/:id/meta` 既存エンドポイント（Throttle: 30, Cache: 300s）を流用、新規追加不要 | INFO |

### 3. Free Trial (7日間無料トライアル — Stripe連携)

| # | 要件 | 詳細 | 優先度 |
|---|------|------|--------|
| 3-1 | Throttle | `POST /subscriptions/trial` — `@Throttle({ default: { ttl: 60000, limit: 3 } })` (abuse防止で厳格) | CRITICAL |
| 3-2 | Webhook署名検証 | 既存 `Stripe.webhooks.constructEvent()` パターンを完全踏襲。新イベント `customer.subscription.trial_will_end` を switch case に追加 | CRITICAL |
| 3-3 | 重複トライアル防止 | DB level: `User` テーブルに `trialUsed: Boolean @default(false)` を追加、サービス層でチェック | CRITICAL |
| 3-4 | Idempotency | 既存 `subscriptionEvent.findUnique(stripeEventId)` パターンを踏襲 | CRITICAL |
| 3-5 | Input Validation | DTO: plan選択のみ `@IsEnum(TrialPlan)` — 他パラメータは受け付けない | HIGH |
| 3-6 | 自動解除の安全性 | Stripe側 `trial_end` 設定で自動課金/解除を制御。自前cronは使わない（Stripe webhookで状態同期） | HIGH |
| 3-7 | Payment Method要求 | Stripe Checkout に `payment_method_collection: 'always'` を設定（トライアル後の課金確保） | HIGH |
| 3-8 | Audit Log | トライアル開始/終了/変換イベントを `subscriptionEvent` テーブルに記録 | MEDIUM |

### 4. Community Posting (コミュニティ出稿 — UTMトラッキング)

| # | 要件 | 詳細 | 優先度 |
|---|------|------|--------|
| 4-1 | UTM Parameter Validation | フロントエンド LP で受け取る `utm_source`, `utm_medium`, `utm_campaign` は `@IsString() @MaxLength(100) @Matches(/^[a-zA-Z0-9_-]+$/)` | HIGH |
| 4-2 | Open Redirect防止 | LP からの遷移先URLはホワイトリスト制（自ドメインのみ） | CRITICAL |
| 4-3 | XSS防止 | UTMパラメータをDOM/HTMLに直接挿入しない、既存 `SanitizeInputPipe` を適用 | HIGH |
| 4-4 | Analytics Endpoint Throttle | `POST /analytics/track` (新規) — `@Throttle({ default: { ttl: 60000, limit: 30 } })` | HIGH |
| 4-5 | PII除外 | トラッキングデータにIPアドレス・User-Agent以外の個人情報を含めない | MEDIUM |

### 5. Referral Program (リファラルプログラム — リファラルコード)

| # | 要件 | 詳細 | 優先度 |
|---|------|------|--------|
| 5-1 | Throttle — コード生成 | `POST /referrals/generate` — `@Throttle({ default: { ttl: 60000, limit: 5 } })` | CRITICAL |
| 5-2 | Throttle — コード適用 | `POST /referrals/apply` — `@Throttle({ default: { ttl: 60000, limit: 5 } })` | CRITICAL |
| 5-3 | Referral Code Format | `crypto.randomBytes(6).toString('hex')` (12文字, 十分なエントロピー) — 推測不可 | HIGH |
| 5-4 | Self-Referral防止 | サービス層で `referrer.id !== referee.id` チェック | CRITICAL |
| 5-5 | Duplicate Application防止 | DB: `@@unique([refereeId])` — 1ユーザー1回のみ適用可能 | CRITICAL |
| 5-6 | Input Validation | `@IsString() @Length(12, 12) @Matches(/^[a-f0-9]+$/)` for referral code | HIGH |
| 5-7 | Reward Abuse防止 | リファラル報酬は referee がメール認証完了後に付与（アカウント作成直後は不可） | HIGH |
| 5-8 | Webhook連携 | リファラル経由でPremium加入した場合、既存Stripe webhook + `subscriptionEvent` で追跡 | HIGH |
| 5-9 | Maximum Referrals Cap | 1ユーザーあたりのリファラル上限を設定（例: 月50件）、大量不正防止 | MEDIUM |

---

## 共通セキュリティ要件（全施策適用）

| # | 要件 | 詳細 | 優先度 |
|---|------|------|--------|
| C-1 | Global ValidationPipe | 既存設定を維持: `whitelist: true, forbidNonWhitelisted: true, transform: true` | CRITICAL |
| C-2 | SanitizeInputPipe | 全新規エンドポイントに自動適用（Global Pipe） | CRITICAL |
| C-3 | Helmet | 既存設定維持。OGP画像配信でCSP調整が必要な場合のみ更新 | HIGH |
| C-4 | CORS | 既存 `CORS_ORIGINS` 設定を維持、新ドメイン追加時は環境変数で管理 | HIGH |
| C-5 | Error Disclosure防止 | 全新規エンドポイントで内部エラー詳細をレスポンスに含めない | HIGH |
| C-6 | Logging | セキュリティイベント（トライアル不正試行、リファラル abuse等）はログ出力 | MEDIUM |

---

## Merge Gate Criteria

PRマージ前に以下を確認すること:

- [ ] 全新規エンドポイントに `@Throttle()` が設定されている
- [ ] 全新規DTOに `class-validator` デコレータが設定されている
- [ ] Stripe連携エンドポイントは既存の署名検証パターンを踏襲している
- [ ] OGPエンドポイントに `Cache-Control` ヘッダーが設定されている
- [ ] リファラルコードに十分なエントロピーがある（12文字hex以上）
- [ ] Self-referral / duplicate application の防止ロジックが実装されている
- [ ] トライアル重複防止（`trialUsed` フラグ）が実装されている
- [ ] 新規エンドポイントのエラーレスポンスに内部情報が含まれていない
- [ ] `npm audit` で新規 HIGH/CRITICAL 脆弱性がないこと

---

## Appendix: Existing Patterns Reference

### Throttle 既存パターン
- 認証系: 3-5/min（sensitive）、10-20/min（standard）
- Read系: 20-30/min
- Write系: 10-15/min
- Payment系: 5/min
- Webhook: `@SkipThrottle()`

### Cache-Control 既存パターン
- Meta endpoints: `public, max-age=300, s-maxage=600`
- Sitemap: `public, max-age=3600, s-maxage=3600`
- Authenticated endpoints: キャッシュなし

### Stripe Webhook 既存パターン
```
Raw Body Middleware → @SkipThrottle → constructEvent(rawBody, signature, secret) → Idempotency Check → Event Handler
```
