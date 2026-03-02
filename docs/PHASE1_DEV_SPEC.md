# Phase 1 開発仕様書 — Dev部門向け

**作成日**: 2026-03-02
**対象**: 1-1-M1, 1-1-C1, 1-1-6, 1-1-7, 1-1-8, 1-1-9, 1-3-6

---

## 1. MailService 共通化 (1-1-M1) [P0 ブロッカー]

### 目的
`auth.service.ts` 内のnodemailer直接呼出を共通モジュールに切り出し、subscriptions モジュールからも利用可能にする。

### 現状
- `backend/src/auth/auth.service.ts` L290: `createMailTransporter()` private メソッド
- 3箇所でメール送信: verification (L139), password reset (L244), magic link (L496)
- 環境変数: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM

### 実装仕様

**ファイル構成:**
```
backend/src/mail/
  mail.module.ts        # MailModule (Global)
  mail.service.ts       # MailService
```

**MailService インターフェース:**
```typescript
@Injectable()
export class MailService {
  // 既存メール（auth.service.tsから移行）
  sendVerificationEmail(to: string, token: string): Promise<void>
  sendPasswordResetEmail(to: string, token: string): Promise<void>
  sendMagicLinkEmail(to: string, token: string): Promise<void>

  // 新規メール（課金関連）
  sendPaymentFailedNotice(to: string, userName: string): Promise<void>
  sendDisputeNotice(to: string, userName: string): Promise<void>
  sendRefundNotice(to: string, userName: string, amount: number): Promise<void>

  // 内部
  private createTransporter(): nodemailer.Transporter
  private sendMail(options: SendMailOptions): Promise<void>
}
```

**移行手順:**
1. `mail/` ディレクトリ + MailModule + MailService 作成
2. `@Global()` でアプリ全体から注入可能に
3. AuthService の `createMailTransporter()` と3つのメール送信ロジックを MailService に移行
4. AuthService に MailService を DI し、既存の3メール呼出を差し替え
5. SubscriptionsService に MailService を DI

**エラーハンドリング方針:**
- メール送信失敗は `console.warn` でログのみ（既存動作を踏襲）
- Webhook 処理本体は失敗しない（メール送信は best-effort）

---

## 2. @nestjs/schedule 導入 (1-1-C1) [P0 ブロッカー]

### 実装仕様

**インストール:**
```bash
npm install @nestjs/schedule
```

**AppModule 変更:**
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... existing imports
  ],
})
```

---

## 3. 決済失敗メール通知 (1-1-6) [P1]

### 依存: 1-1-M1 完了後

### 実装仕様
`subscriptions.service.ts` の `handleInvoicePaymentFailed()` に以下を追加:

```typescript
// 既存のDB更新後に追加
const user = await this.prisma.user.findUnique({
  where: { stripeCustomerId: invoice.customer as string },
  select: { email: true, displayName: true },
});
if (user?.email) {
  await this.mailService.sendPaymentFailedNotice(user.email, user.displayName);
}
```

**メール内容:**
- 件名: 「お支払いに問題があります - Poker SNS」
- 本文: 支払い方法の更新を促すリンク（Billing Portal URL）

---

## 4. charge.dispute.created ハンドラ (1-1-7) [P1]

### 実装仕様
`subscriptions.service.ts` の `handleWebhook` switch に追加:

```typescript
case 'charge.dispute.created':
  await this.handleDisputeCreated(event);
  break;
```

**handleDisputeCreated 処理:**
1. べき等性チェック（stripeEventId）
2. dispute.charge から payment_intent → customer を特定
3. ユーザーの `subscriptionStatus` を `'past_due'` に更新
4. SubscriptionEvent にログ記録
5. MailService でユーザーに通知（best-effort）
6. 管理者通知（ADMIN_EMAIL 環境変数宛にも送信 — 将来的に Slack 連携に切替可能）

---

## 5. charge.refunded ハンドラ (1-1-8) [P1]

### 実装仕様
`subscriptions.service.ts` の `handleWebhook` switch に追加:

```typescript
case 'charge.refunded':
  await this.handleChargeRefunded(event);
  break;
```

**handleChargeRefunded 処理:**
1. べき等性チェック（stripeEventId）
2. 全額返金の場合: `subscriptionStatus` → `'free'`、部分返金の場合: ステータス変更なし
3. SubscriptionEvent にログ記録（返金額を metadata に含む）
4. MailService でユーザーに返金通知

---

## 6. サブスクリプション日次同期バッチ (1-1-9) [P1]

### 依存: 1-1-C1 完了後

### 実装仕様

**ファイル:**
```
backend/src/subscriptions/subscription-sync.service.ts
```

```typescript
@Injectable()
export class SubscriptionSyncService {
  constructor(
    private prisma: PrismaService,
    private stripe: Stripe, // ConfigService経由で初期化
  ) {}

  @Cron('0 3 * * *') // 毎日 03:00 JST
  async syncSubscriptions(): Promise<void> {
    // 1. DB から subscriptionStatus が 'active' or 'past_due' のユーザー取得
    // 2. 各ユーザーの stripeSubscriptionId で Stripe API 問合せ
    // 3. Stripe 側のステータスと DB の差分を検出
    // 4. 差分がある場合は DB 更新 + ログ記録
    // 5. Stripe API エラーはキャッチしてログ、次のユーザーへ続行
  }
}
```

**Stripe→DB ステータスマッピング:**
| Stripe status | DB subscriptionStatus |
|---|---|
| active | active |
| past_due | past_due |
| canceled | free |
| unpaid | past_due |
| incomplete_expired | free |

**レート制限対策:**
- Stripe API は 100 req/sec。ユーザー数が増えた場合は `stripe.subscriptions.list()` でバッチ取得に切替

---

## 7. 広告管理 CRUD エンドポイント (1-3-6) [P1]

### 現状
- `GET /ads/feed` のみ実装（公開エンドポイント）
- Ad モデルは Prisma に定義済み
- 管理操作は DB 直接操作のみ

### 実装仕様

**エンドポイント:**
| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | /ads | Admin | 広告一覧（ページネーション、フィルタ） |
| POST | /ads | Admin | 広告作成 |
| PATCH | /ads/:id | Admin | 広告更新 |
| DELETE | /ads/:id | Admin | 広告削除（論理削除: isActive=false） |

**Admin ガード:**
- 既存の JWT Guard + ユーザーの role フィールドで判定
- role が存在しない場合は Prisma スキーマに `role String @default("user")` を追加

**CreateAdDto:**
```typescript
{
  title: string;        // 必須
  description?: string;
  imageUrl?: string;
  linkUrl: string;      // 必須
  advertiser: string;   // 必須
  sortOrder?: number;   // default: 0
  startAt: Date;        // 必須
  endAt: Date;          // 必須
}
```

---

## 既存テスト修正 [P0]

### 1-4-F1: auth.service.spec.ts
```diff
- expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
+ expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
```
3箇所すべて修正。

### 1-4-F2: posts.service.spec.ts
`create` テストの beforeEach に追加:
```typescript
mockPrismaService.user.findUnique.mockResolvedValue({
  subscriptionStatus: 'free',
});
```
