# Phase 3 タスク 3-1: X (Twitter) 自動投稿 — 統合実行計画書

**Author:** Planning (常闇)
**Date:** 2026-03-02
**Status:** Approved for Development

---

## 0. 方針決定: CEO指示 vs チーム補完の統合

### CEOオリジナル 12項目の修正点

| CEO項目 | 修正内容 | 根拠 |
|---------|---------|------|
| 3-1-2: BullMQ + Redis | **pg-boss + @nestjs/schedule に変更** | Ops提案: インフラ増加ゼロ、PostgreSQL既存活用、リトライ/DLQ組み込み |
| 3-1-4: SnsApiToken | **SnsOAuthToken に名称変更、暗号化仕様をDevSecOps設計に準拠** | AES-256-GCM、IV/authTag個別保存 |
| 3-1-9: レートリミット | **X API Freeプラン前提の定数設計を追加** | 月1,500件、日次50件、15分15件 |

### Dev補完 3項目の組み込み

| 補完項目 | 組み込み先 |
|---------|-----------|
| Redis docker-compose追加 | **不要に変更** (pg-boss採用のため) |
| AES-256暗号化ユーティリティ | サブタスク ST-03 (TokenVaultService) |
| X API Freeプラン月1,500件上限 | サブタスク ST-07 (レートリミット管理) |

---

## 1. 依存関係 DAG (実行順序)

```
Phase A: 基盤レイヤー (並行可能)
  ST-01: @nestjs/schedule + pg-boss 導入 ─────────────┐
  ST-02: Prisma Schema (SnsAutoPost + SnsOAuthToken) ─┤
  ST-03: TokenVaultService (AES-256-GCM暗号化) ───────┘
         │
         ▼
Phase B: コアロジック (ST-01~03 完了後)
  ST-04: sns-auto-post モジュールスキャフォールド ──────┐
  ST-05: コンテンツ変換 + サニタイズ (並行可) ──────────┤
         │
         ▼
Phase C: X API連携 (ST-04~05 完了後)
  ST-06: platforms/twitter.service.ts (X API v2) ──────┐
         │
         ▼
Phase D: 運用ロジック (ST-06 完了後、並行可)
  ST-07: レートリミット管理 ───────────────────────────┐
  ST-08: トレンド投稿選定ロジック ─────────────────────┤
  ST-09: Cronジョブ設定 (pg-boss + Schedule) ──────────┤
  ST-10: リトライロジック (pg-boss native) ────────────┤
         │
         ▼
Phase E: 通知・管理 (Phase D 完了後、並行可)
  ST-11: Slack通知連携 ────────────────────────────────┐
  ST-12: 管理API (history/toggle/stats) ──────────────┘
```

---

## 2. 全サブタスク詳細仕様

### ST-01: @nestjs/schedule + pg-boss 導入

**CEO対応:** 3-1-1 + 3-1-2 (修正版)

#### パッケージインストール
```bash
cd backend
npm install @nestjs/schedule pg-boss
```

#### app.module.ts 変更
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),  // 追加
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    // ... 既存モジュール
    SnsAutoPostModule,  // 新規追加（ST-04で作成）
  ],
})
```

#### pg-boss 初期化サービス
```
新規: backend/src/common/pgboss.service.ts

- PgBossService (OnModuleInit)
- constructor: new PgBoss({ connectionString: process.env.DATABASE_URL })
- onModuleInit: await this.boss.start()
- onModuleDestroy: await this.boss.stop()
- エクスポート: boss インスタンス
```

**完了条件:** `npm run build` 成功、pg-boss テーブルが PostgreSQL に自動作成される

---

### ST-02: Prisma Schema 追加

**CEO対応:** 3-1-3 + 3-1-4

#### SnsAutoPost モデル
```prisma
model SnsAutoPost {
  id           String   @id @default(uuid())
  postId       String
  post         Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  platform     String   // "x" | "youtube" | "instagram"
  externalId   String?  // プラットフォーム側の投稿ID
  status       String   @default("pending") // pending | posted | failed
  content      String   // 変換済みテキスト
  mediaUrl     String?
  scheduledAt  DateTime?
  postedAt     DateTime?
  errorMessage String?
  retryCount   Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([status])
  @@index([platform, status])
  @@index([postId, platform], name: "unique_post_platform")
  @@unique([postId, platform])
  @@map("sns_auto_posts")
}

model SnsOAuthToken {
  id           String   @id @default(uuid())
  platform     String   @unique // "x" | "youtube" | "instagram"
  tokenEnc     Bytes    // AES-256-GCM encrypted access token
  refreshEnc   Bytes?   // AES-256-GCM encrypted refresh token
  iv           Bytes    // 12 bytes IV
  authTag      Bytes    // 16 bytes GCM auth tag
  refreshIv    Bytes?
  refreshTag   Bytes?
  expiresAt    DateTime
  scopes       String[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("sns_oauth_tokens")
}

model SnsRateLimit {
  id        String   @id @default(uuid())
  platform  String   // "x" | "youtube" | "instagram"
  period    String   // "daily" | "monthly" | "15min"
  count     Int      @default(0)
  limit     Int
  resetAt   DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([platform, period])
  @@map("sns_rate_limits")
}
```

#### Post モデルへのリレーション追加
```prisma
model Post {
  // ... 既存フィールド
  snsAutoPosts  SnsAutoPost[]  // 追加
}
```

**実行:** `npx prisma db push --accept-data-loss`

**完了条件:** テーブル作成成功、既存テーブルへの影響なし

---

### ST-03: TokenVaultService (AES-256-GCM暗号化)

**CEO対応:** 3-1-4 (暗号化部分)、Dev補完: AES-256ユーティリティ

#### ファイル構成
```
新規: backend/src/common/token-vault.service.ts
```

#### 仕様
```typescript
// DevSecOps設計 (docs/DEVSECOPS_DELIVERABLE_SNS_AUTOPOST.md Section 1.4) 準拠

@Injectable()
export class TokenVaultService {
  private readonly key: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 12;

  constructor() {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be 64-char hex (32 bytes)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): { enc: Buffer; iv: Buffer; tag: Buffer }
  decrypt(enc: Buffer, iv: Buffer, tag: Buffer): string

  // Prisma経由のCRUD
  async getToken(platform: string): Promise<string | null>
  async storeToken(platform: string, accessToken: string, refreshToken?: string, expiresAt: Date, scopes: string[]): Promise<void>
  async refreshIfExpired(platform: string): Promise<string>  // 30秒前にプロアクティブリフレッシュ
}
```

**セキュリティ要件:**
- S3: IV は暗号化ごとに新規生成
- S4: 復号結果はメモリ上のみ、ログ出力禁止
- S5: リフレッシュトークン使用後は即座にDB更新

**完了条件:** encrypt/decrypt の単体テスト通過、`TOKEN_ENCRYPTION_KEY` 未設定時にプロセス起動エラー

---

### ST-04: sns-auto-post モジュールスキャフォールド

**CEO対応:** 3-1-5

#### ディレクトリ構成
```
backend/src/sns-auto-post/
├── sns-auto-post.module.ts
├── sns-auto-post.service.ts       # オーケストレーション
├── sns-auto-post.controller.ts    # 管理API (ST-12)
├── sns-content.service.ts         # コンテンツ変換 (ST-05)
├── sns-scheduler.service.ts       # Cronジョブ (ST-09)
├── platforms/
│   ├── platform.interface.ts      # 共通インターフェース
│   └── twitter.service.ts         # X API v2 (ST-06)
└── dto/
    └── sns-auto-post.dto.ts
```

#### platform.interface.ts
```typescript
export interface SnsPlatformService {
  readonly platform: string;

  postContent(content: string, mediaUrl?: string): Promise<{ externalId: string }>;
  deletePost(externalId: string): Promise<void>;
  validateToken(): Promise<boolean>;
  getAccountInfo(): Promise<{ username: string; followersCount: number }>;
}
```

#### sns-auto-post.module.ts
```typescript
@Module({
  imports: [NotificationsModule],  // Slack通知用に将来拡張
  controllers: [SnsAutoPostController],
  providers: [
    SnsAutoPostService,
    SnsContentService,
    SnsSchedulerService,
    TwitterService,
    TokenVaultService,
    PgBossService,
    PrismaService,
  ],
})
export class SnsAutoPostModule {}
```

**完了条件:** モジュール登録、`npm run build` 成功

---

### ST-05: コンテンツ変換 + サニタイズ

**CEO対応:** 3-1-7

#### ファイル
```
backend/src/sns-auto-post/sns-content.service.ts
```

#### 仕様 (DevSecOps Section 3.3 準拠)
```typescript
@Injectable()
export class SnsContentService {
  // 共通サニタイズ
  sanitizeBase(post: { content: string; id: string; hashtags: string[] }): SanitizedContent {
    // 1. 制御文字除去
    // 2. 連続改行正規化 (3行→2行)
    // 3. Unicode方向制御文字除去 (RTL override attack防止)
    // 4. ゼロ幅文字除去
    // 5. URL: 自ドメイン固定生成 (FRONTEND_URL/post/{id})
    // 6. ハッシュタグ: 英数字・日本語のみ
  }

  // X向け変換
  formatForTwitter(base: SanitizedContent): string {
    // 280文字制限
    // t.co短縮URL = 23文字固定
    // ハッシュタグ最大3つ: #ポーカー #pokersns #ハンドレビュー
    // 切り詰め時は '…' で終端
    // UTMパラメータ付与: ?utm_source=twitter_auto&utm_medium=social
  }
}
```

**ハッシュタグ戦略:**
- 固定: `#ポーカー`, `#pokersns`
- 可変 (投稿内容から): `#ハンドレビュー`, `#テキサスホールデム`, `#ポーカー戦略` 等
- ポーカーハンド投稿の場合: `#ハンド分析` を追加

**完了条件:** 280文字境界テスト通過、日本語マルチバイト文字の正確なカウント

---

### ST-06: Twitter Service (X API v2)

**CEO対応:** 3-1-5 (twitter.service.ts)

#### ファイル
```
backend/src/sns-auto-post/platforms/twitter.service.ts
```

#### 仕様
```typescript
@Injectable()
export class TwitterService implements SnsPlatformService {
  readonly platform = 'x';
  private readonly API_BASE = 'https://api.twitter.com/2';

  constructor(
    private readonly tokenVault: TokenVaultService,
    private readonly prisma: PrismaService,
  ) {}

  // POST /2/tweets
  async postContent(content: string, mediaUrl?: string): Promise<{ externalId: string }> {
    const token = await this.tokenVault.refreshIfExpired('x');
    // メディアがある場合: POST https://upload.twitter.com/1.1/media/upload.json
    // ツイート投稿: POST /2/tweets { text, media?: { media_ids } }
    // レスポンスから data.id を externalId として返す
  }

  // DELETE /2/tweets/:id
  async deletePost(externalId: string): Promise<void>

  // GET /2/users/me
  async validateToken(): Promise<boolean>
  async getAccountInfo(): Promise<{ username: string; followersCount: number }>
}
```

#### X API認証フロー
```
初回トークン取得 (管理者手動):
  1. Admin APIで X Developer Portal のOAuth 2.0認証URLを生成
  2. 管理者がブラウザでアプリ認可
  3. コールバックで authorization_code 取得
  4. POST /2/oauth2/token で access_token + refresh_token 取得
  5. TokenVaultService で暗号化保存

自動リフレッシュ:
  - expiresAt の30秒前にプロアクティブリフレッシュ
  - POST /2/oauth2/token { grant_type: refresh_token }
  - 新トークンで暗号化更新
```

**環境変数:** `X_AUTOPOST_CLIENT_ID`, `X_AUTOPOST_CLIENT_SECRET` (ログイン用とは別)

**完了条件:** ツイート投稿・削除のE2Eテスト通過 (X Developer Sandbox)

---

### ST-07: レートリミット管理

**CEO対応:** 3-1-9、Dev補完: X API Freeプラン定数設計

#### レートリミット定数 (X API Freeプラン前提)

| 制約 | 値 | アラート閾値 (80%) | 自動停止 (100%) |
|------|------|------|------|
| 月次上限 | 1,500 tweets | 1,200 | 1,500 |
| 日次上限 | 50 tweets | 40 | 50 |
| 15分上限 | 15 tweets (推定) | 12 | 15 |
| アプリレベル | 300 requests/15min | 240 | 300 |

#### 実装
```typescript
// SnsAutoPostService内

async checkRateLimit(platform: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  // SnsRateLimit テーブルからカウント取得
  // 各 period (daily/monthly/15min) をチェック
  // 80% 到達時: WARNING ログ + Slack通知
  // 100% 到達時: allowed=false を返す
}

async incrementRateCount(platform: string): Promise<void> {
  // 全period のカウントをインクリメント
  // resetAt を過ぎている場合はカウントリセット
}
```

#### リセットタイミング
- 15分: 自動 (resetAt 判定)
- 日次: 毎日 00:00 UTC
- 月次: 毎月1日 00:00 UTC

**完了条件:** 80%/100%閾値でのSlack通知動作確認

---

### ST-08: トレンド投稿選定ロジック

**CEO対応:** 3-1-6

#### 選定条件
```typescript
async selectTrendingPosts(): Promise<Post[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24時間以内

  return this.prisma.post.findMany({
    where: {
      createdAt: { gte: since },
      parentPostId: null,  // トップレベル投稿のみ
      content: { not: '' },
      // 20文字以上
      // 既に自動投稿済み (SnsAutoPost) を除外
      snsAutoPosts: { none: { platform: 'x' } },
      // ブロック多数のユーザーを除外
      author: {
        blockedBy: { _count: { lt: 5 } },  // 5件以上ブロックされているユーザーを除外
      },
    },
    orderBy: [
      // ポーカーハンド投稿を優先
      { isPokerHand: 'desc' },
      // いいね数 or リポスト数で並べ替え
      { likes: { _count: 'desc' } },
      { reposts: { _count: 'desc' } },
    ],
    // いいね >= 5 OR リポスト >= 3 のフィルター (having相当)
    // → Prismaでは直接 having が使えないため、取得後にアプリ側でフィルタ
    take: 20,
    include: {
      author: { select: { username: true, name: true } },
      hashtags: { include: { hashtag: true } },
      _count: { select: { likes: true, reposts: true } },
    },
  });

  // アプリ側フィルタ: _count.likes >= 5 || _count.reposts >= 3
  // 20文字未満を除外: [...post.content].length >= 20
}
```

**既存コード参照:** `posts.service.ts` の `getTrending()` メソッドのソートロジックを流用

**完了条件:** 選定条件に合致する投稿のみが返されること

---

### ST-09: Cronジョブ設定

**CEO対応:** 3-1-8

#### スケジュール
```typescript
@Injectable()
export class SnsSchedulerService {
  private autoPostEnabled = true;

  // 毎時00分: トレンド投稿を検出 → SnsAutoPost に pending で登録
  @Cron('0 * * * *')
  async detectTrendingPosts(): Promise<void> {
    if (!this.autoPostEnabled) return;
    // selectTrendingPosts() で候補取得
    // SnsAutoPost に status=pending で INSERT (既存チェック: @@unique([postId, platform]))
    // pg-boss にジョブ投入: boss.send('sns-post-x', { snsAutoPostId })
  }

  // 15分毎: pending の投稿を処理
  @Cron('*/15 * * * *')
  async processPendingPosts(): Promise<void> {
    if (!this.autoPostEnabled) return;
    // pg-boss.fetch('sns-post-x') で未処理ジョブ取得
    // レートリミットチェック
    // X API送信
    // ステータス更新 (posted/failed)
  }

  // 有効/無効切り替え (管理API用)
  toggle(enabled: boolean): void {
    this.autoPostEnabled = enabled;
  }
}
```

#### pg-boss ジョブ登録
```typescript
// ジョブ名: 'sns-post-x'
// ジョブデータ: { snsAutoPostId: string }
// オプション: { retryLimit: 3, retryDelay: 60, retryBackoff: true, expireInMinutes: 30 }
```

**重複実行防止:** pg-boss はジョブ単位でロックを取得するため、同一ジョブの2重実行は発生しない

**完了条件:** Cronジョブが正常に起動し、pg-bossキューにジョブが投入される

---

### ST-10: リトライロジック

**CEO対応:** 3-1-10

#### pg-boss ネイティブリトライ
```
pg-boss 設定:
  retryLimit: 3
  retryDelay: 60 (秒) — 1回目: 1分後
  retryBackoff: true    — 2回目: 5分後、3回目: 15分後 (指数バックオフ)
  expireInMinutes: 30   — 30分超過でexpired
```

#### リトライ対象/除外
| HTTPステータス | 動作 |
|--------------|------|
| 429 (Rate Limited) | リトライ + `Retry-After` ヘッダー尊重 |
| 500, 502, 503 | リトライ |
| TIMEOUT | リトライ |
| 401, 403 | **リトライ除外** → DLQ直行 + Slack CRITICAL |
| 400 | **リトライ除外** → DLQ直行 (コンテンツ問題) |

#### DLQ (Dead Letter Queue)
```
pg-boss: 3回リトライ超過 → 自動的にfailedキューへ
  → SnsAutoPost.status = 'failed'
  → SnsAutoPost.errorMessage = エラー詳細
  → Slack #poker-sns-alerts に通知
```

**完了条件:** 429/500系のリトライ動作、401/400のDLQ即時移行を確認

---

### ST-11: Slack通知連携

**CEO対応:** 3-1-11

#### 実装
```
新規: backend/src/common/slack.service.ts

@Injectable()
export class SlackService {
  private readonly webhookUrl = process.env.SLACK_WEBHOOK_URL;

  async notify(channel: string, message: SlackMessage): Promise<void> {
    // Incoming Webhook で POST
    // webhookUrl 未設定時はログ出力のみ (開発環境対応)
  }
}
```

#### 通知テンプレート

| イベント | チャネル | 内容 |
|---------|---------|------|
| 投稿成功 | #poker-sns-ops | `[X] 自動投稿成功: "{content}" → {externalId}` |
| 投稿失敗 (リトライ中) | #poker-sns-ops | `[X] 投稿失敗 (retry {n}/3): {errorMessage}` |
| DLQ到達 | #poker-sns-alerts | `[CRITICAL] 自動投稿DLQ: postId={id}, error={msg}` |
| レート80%到達 | #poker-sns-ops | `[WARNING] X レート制限80%: {count}/{limit}` |
| レート100%到達 | #poker-sns-alerts | `[CRITICAL] X レート制限到達: 自動投稿一時停止` |
| トークン失効 | #poker-sns-alerts | `[CRITICAL] X OAuthトークン失効: 手動更新必要` |

#### 環境変数追加
```
SLACK_WEBHOOK_URL=  # Slack Incoming Webhook URL (未設定時はログのみ)
```

**完了条件:** 各テンプレートでのSlack通知受信確認

---

### ST-12: 管理API

**CEO対応:** 3-1-12

#### エンドポイント
```
GET  /sns-auto-post/history?page=1&limit=20&platform=x&status=posted
POST /sns-auto-post/toggle  { enabled: boolean }
GET  /sns-auto-post/stats?period=7d
```

#### 認証: 管理者のみ (将来的にAdmin Guard追加、MVP期は JWT認証のみ)

#### レスポンス例

```typescript
// GET /history
{
  data: SnsAutoPost[],
  total: number,
  page: number,
  limit: number
}

// POST /toggle
{ enabled: boolean, message: "Auto-posting enabled/disabled" }

// GET /stats
{
  period: "7d",
  total: 142,
  posted: 135,
  failed: 7,
  successRate: 95.07,
  rateLimits: {
    x: { daily: { count: 23, limit: 50 }, monthly: { count: 892, limit: 1500 } }
  }
}
```

**完了条件:** 各エンドポイントの正常レスポンス確認

---

## 3. 実行順序とバッチ分割

### Batch 1 (Phase A — 基盤、並行実行可)

| ST | タスク | 依存 | 推定工数 |
|----|--------|------|---------|
| ST-01 | @nestjs/schedule + pg-boss | なし | 0.5日 |
| ST-02 | Prisma Schema追加 | なし | 0.5日 |
| ST-03 | TokenVaultService | なし | 1日 |

### Batch 2 (Phase B — コア、Batch 1完了後)

| ST | タスク | 依存 | 推定工数 |
|----|--------|------|---------|
| ST-04 | モジュールスキャフォールド | ST-01,02 | 0.5日 |
| ST-05 | コンテンツ変換 + サニタイズ | なし(並行可) | 1日 |

### Batch 3 (Phase C — API連携、Batch 2完了後)

| ST | タスク | 依存 | 推定工数 |
|----|--------|------|---------|
| ST-06 | TwitterService (X API v2) | ST-03,04 | 1.5日 |

### Batch 4 (Phase D — 運用ロジック、Batch 3完了後、並行可)

| ST | タスク | 依存 | 推定工数 |
|----|--------|------|---------|
| ST-07 | レートリミット管理 | ST-02,06 | 0.5日 |
| ST-08 | トレンド投稿選定 | ST-02 | 0.5日 |
| ST-09 | Cronジョブ設定 | ST-01,06,07,08 | 1日 |
| ST-10 | リトライロジック | ST-01,06 | 0.5日 |

### Batch 5 (Phase E — 通知・管理、Batch 4完了後、並行可)

| ST | タスク | 依存 | 推定工数 |
|----|--------|------|---------|
| ST-11 | Slack通知 | ST-09,10 | 0.5日 |
| ST-12 | 管理API | ST-02,09 | 0.5日 |

**合計推定工数: 8.5日**

---

## 4. レートリミット設計要件 (X API Freeプラン)

### 制約定数

```typescript
// backend/src/sns-auto-post/constants.ts

export const X_RATE_LIMITS = {
  FREE_PLAN: {
    MONTHLY_LIMIT: 1500,      // 月間ツイート上限
    DAILY_LIMIT: 50,          // 日次ツイート上限 (1500/30)
    PER_15MIN_LIMIT: 15,      // 15分間上限 (推定)
    APP_REQUESTS_15MIN: 300,  // アプリレベル API リクエスト/15分
    ALERT_THRESHOLD: 0.8,     // 80% でアラート
    STOP_THRESHOLD: 1.0,      // 100% で自動停止
  },
} as const;

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_SEC: 60,     // 1分
  BACKOFF_MULTIPLIER: 5,     // 1分 → 5分 → 15分 (概算)
  JOB_EXPIRE_MIN: 30,
} as const;

export const CRON_SCHEDULES = {
  DETECT_TRENDING: '0 * * * *',      // 毎時00分
  PROCESS_PENDING: '*/15 * * * *',    // 15分毎
} as const;
```

### 投稿ペース計算

```
Freeプラン: 1,500件/月
→ 1日あたり: 50件
→ 1時間あたり: ~2件 (余裕を持って)
→ 毎時Cron: 最大2件をpendingに登録
→ 15分Cron: 1件ずつ処理 (レートリミット尊重)

実運用推奨: 1日10~20件 (バーストを避け、月間で均等配分)
```

---

## 5. 環境変数追加まとめ

```bash
# .env.example に追加
TOKEN_ENCRYPTION_KEY=          # 32バイトhex (必須)
X_AUTOPOST_CLIENT_ID=          # X Developer App (自動投稿専用)
X_AUTOPOST_CLIENT_SECRET=      # X Developer App Secret
SLACK_WEBHOOK_URL=             # Slack Incoming Webhook (未設定時はログのみ)
```

---

## 6. docker-compose.yml 変更

**Redis追加は不要** (pg-boss採用のため)

`docker-compose.prod.yml` に `TOKEN_ENCRYPTION_KEY` 必須化のみ追加 (既に記載済み)

---

## 7. ブロッキングイシュー (開発着手前に解決必要)

| ID | 項目 | 担当 | 状態 |
|----|------|------|------|
| BLOCK-01 | X Developer Account + App 作成 (自動投稿用、ログイン用とは別) | Ops | 未着手 |
| BLOCK-02 | Slack Workspace + Webhook URL 設定 | Ops | 未着手 |
| BLOCK-03 | TOKEN_ENCRYPTION_KEY 生成・本番環境への設定 | DevSecOps | 未着手 |

---

## 8. クロスリファレンス (既存ドキュメント)

| ドキュメント | 参照セクション |
|------------|---------------|
| `docs/SNS_AUTO_POST_TECHNICAL_SPEC.md` | Section 2.1 (X API v2 プラン比較) |
| `docs/OPS_DELIVERABLE_SNS_AUTOPOST.md` | Section 1 (pg-boss選定理由)、Section 2 (リトライ/DLQ)、Section 4 (レートリミット) |
| `docs/DEVSECOPS_DELIVERABLE_SNS_AUTOPOST.md` | Section 1 (暗号化ストア)、Section 3 (サニタイズ) |
| `docs/QA_DELIVERABLE_SNS_AUTOPOST.md` | 全セクション (162テストケース) |
| `docs/QA_SNS_AUTOPOST_ERROR_HANDLING_TEST.md` | リトライポリシー基準 |

---

**End of Execution Plan**
