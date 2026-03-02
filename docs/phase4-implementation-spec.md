# Phase 4: プロダクト品質強化 - 実装仕様書

**作成**: Planning (水宮) | **日付**: 2026-03-02
**スコープ**: タスク 4-1 (セキュリティ強化) + タスク 4-2 (検索機能強化)

---

## タスク 4-1: セキュリティ強化

### 4-1-1: アカウントロックアウト機能

**現状**: `loginAttempts`/`lockedUntil` フィールドなし。ブルートフォース防御はThrottleのみ（IP単位、インメモリ）。

**Prisma Schema 変更**:
```prisma
model User {
  // 既存フィールド...
  loginAttempts  Int       @default(0)
  lockedUntil    DateTime?
}
```

**Auth Service 変更** (`auth.service.ts` `login()` メソッド):

```
1. ユーザー検索後、lockedUntil チェック
   - lockedUntil > now() → 「アカウントがロックされています。{残り分}分後に再試行してください」(429)
   - lockedUntil <= now() → loginAttempts=0, lockedUntil=null にリセットして続行

2. パスワード照合失敗時:
   - loginAttempts を +1 インクリメント
   - loginAttempts >= 5 → lockedUntil = now() + 15分 をセット
   - 「Invalid credentials」を返す（ロック状態を露出しない）

3. パスワード照合成功時:
   - loginAttempts=0, lockedUntil=null にリセット
   - buildAuthResponse() を返す
```

**テストケース** (Development実装):
| # | ケース | 期待結果 |
|---|--------|----------|
| 1 | 正常ログイン | loginAttempts=0 維持 |
| 2 | 1回失敗 | loginAttempts=1 |
| 3 | 5回連続失敗 | lockedUntil がセットされる |
| 4 | ロック中のログイン試行 | 429 + 適切なメッセージ |
| 5 | ロック期限切れ後のログイン | 正常にログイン可能、カウンターリセット |
| 6 | 4回失敗→成功 | loginAttempts=0 にリセット |

**注意点**:
- エラーメッセージでロック状態を露出しない（タイミング攻撃対策として、ロック中も同じ応答時間を維持）
- OAuth ログインはパスワード不要のためロックアウト対象外
- `prisma db push --accept-data-loss` でスキーマ適用（非インタラクティブ環境）

---

### 4-1-2: パスワード強度要件

**現状**: パスワードバリデーションなし（空文字以外すべて受理）。

**実装箇所**: `backend/src/auth/dto/` 内の DTO クラス

**バリデーションルール**:
- 最低8文字
- 英字（a-z or A-Z）を1文字以上含む
- 数字（0-9）を1文字以上含む

**適用対象 DTO**:
1. `RegisterDto.password` - 新規登録
2. `ResetPasswordDto.newPassword` - パスワードリセット
3. `ChangePasswordDto.newPassword` - パスワード変更

**実装方法**: class-validator の `@Matches` デコレータ

```typescript
@Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
  message: 'パスワードは8文字以上で、英字と数字を含む必要があります',
})
password: string;
```

**注意点**:
- 既存ユーザーのパスワードには影響しない（ログイン時チェックは不要）
- フロントエンド側にもバリデーションメッセージ表示を追加（UX向上、ただし必須ではない）

---

### 4-1-3: 期限切れトークンの定期クリーンアップ

**現状**: クリーンアップ機構なし。期限切れトークンがDBに無制限蓄積。

**必要パッケージ**: `@nestjs/schedule` (cron機能)

**実装**:

1. `npm install @nestjs/schedule` をbackendに追加
2. `app.module.ts` に `ScheduleModule.forRoot()` を追加
3. 新規ファイル: `backend/src/tasks/token-cleanup.service.ts`

```
@Injectable()
export class TokenCleanupService {
  constructor(private prisma: PrismaService) {}

  @Cron('0 3 * * *')  // 毎日 AM 3:00 (JST考慮: UTC 18:00 前日)
  async handleTokenCleanup() {
    const now = new Date();
    const results = await Promise.all([
      this.prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.magicLinkToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    ]);
    // Logger.log で削除件数を出力
  }
}
```

4. 新規ファイル: `backend/src/tasks/tasks.module.ts`
5. `app.module.ts` に `TasksModule` をインポート

**テストケース**:
| # | ケース | 期待結果 |
|---|--------|----------|
| 1 | 期限切れRefreshTokenが存在 | 削除される |
| 2 | 有効なRefreshTokenが存在 | 削除されない |
| 3 | 全4テーブルの期限切れレコード | すべて削除 |

---

### 4-1-4: OAuth セッション Redis 移行

**現状**: `Map<string, { data; expiresAt }>` インメモリ。プロセス再起動で消失、水平スケーリング不可。

**必要パッケージ**: `ioredis`
**インフラ変更**: `docker-compose.yml` + `docker-compose.prod.yml` に Redis サービス追加

**Docker Compose 追加**:
```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
  networks:
    - app-network
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 3
```

**Auth Service 変更**:

```
- oauthSessions Map → Redis SETEX (key: `oauth:${sessionId}`, TTL: 300秒)
- xStateStore Map → Redis SETEX (key: `xstate:${state}`, TTL: 600秒)
- storeOAuthSession(): redis.setex(`oauth:${id}`, 300, JSON.stringify(data))
- consumeOAuthSession(): redis.get → redis.del (アトミック: GETDELコマンド推奨)
```

**環境変数追加**: `REDIS_URL=redis://redis:6379`

**フォールバック戦略**: Redis未接続時はインメモリMap にフォールバック（開発環境向け）

**注意点**:
- Redis は ThrottlerModule のストアとしても将来利用可能（`@nestjs/throttler` の `ThrottlerStorageRedisService`）
- 現フェーズでは OAuth セッションのみ移行。Throttler の Redis 化は次フェーズで検討
- `.env.example` に `REDIS_URL` を追加

---

### 4-1-5: セキュリティテスト 28件の実装仕様

**テスト実行環境マトリクス**:

| カテゴリ | 件数 | 実行環境 | テストタイプ |
|----------|------|----------|-------------|
| bcrypt rounds (3.1) | 4件 | Jest 単体 | Unit |
| JWT セキュリティ (3.2) | 3件 | Jest + supertest | Unit + E2E |
| OAuth セッション (3.3) | 7件 | Jest 単体 (4件) + E2E (3件) | Unit + E2E |
| Helmet ヘッダー (3.4) | 5件 | NestJS E2E (supertest) | E2E |
| nginx ヘッダー (3.5) | 5件 | Docker Compose 起動状態 | Infrastructure |
| Stripe Webhook (3.6) | 4件 | Jest 単体 | Unit |

**ファイル配置**:
```
backend/src/auth/auth.service.spec.ts          ← 既存修正 + bcrypt/OAuth追加
backend/src/auth/auth.controller.e2e-spec.ts   ← 新規: JWT/OAuth/Helmet E2E
backend/src/subscriptions/subscriptions.service.spec.ts ← 新規: Stripe Webhook
backend/test/nginx-headers.e2e-spec.ts         ← 新規: Docker環境専用
```

**P0 (即時)**: 既存 `auth.service.spec.ts` の修正
- bcrypt rounds アサーション: `10` → `12` (3箇所)
- レスポンス形状: `{ accessToken, user }` → `{ accessToken, refreshToken, user }` + `subscriptionStatus`

**各テストの詳細仕様は `docs/qa-report.md` セクション3を参照**。

---

### 4-1-6: Rate Limit テスト 5件

**テストファイル**: `backend/src/auth/auth-throttle.e2e-spec.ts` (新規)

| # | エンドポイント | 制限 | テスト方法 |
|---|---------------|------|-----------|
| 1 | `POST /auth/register` | 5回/分 | 6回送信 → 6回目で 429 |
| 2 | `POST /auth/login` | 10回/分 | 11回送信 → 11回目で 429 |
| 3 | `POST /auth/verify-email` | 5回/分 | 6回送信 → 6回目で 429 |
| 4 | `POST /auth/forgot-password` | 3回/分 | 4回送信 → 4回目で 429 |
| 5 | `POST /auth/resend-verification` | 3回/分 | 4回送信 → 4回目で 429 |

**実装注意**:
- ThrottlerGuard はインメモリのためテスト間の TTL リセットが必要
- `beforeEach` でアプリケーションを再起動するか、TTL を短く設定したテスト用 ThrottlerModule を使う
- supertest の INestApplication で実際のHTTPリクエストを送信

---

## タスク 4-2: 検索機能強化

### 4-2-1: PostgreSQL 全文検索の導入

**現状**: `ILIKE` による `contains` 検索。インデックスなし、日本語未対応。

**推奨方式**: `pg_bigm` 拡張（2-gram ベース）

**選定理由**:
| 観点 | pg_bigm | pgroonga | tsvector (標準) |
|------|---------|----------|----------------|
| 日本語対応 | 2-gram で対応 | MeCab 形態素解析 | 辞書必要・設定複雑 |
| Docker対応 | PostgreSQL公式イメージ+拡張 | 専用Dockerイメージ必要 | 標準組込 |
| メンテナンス | 低 | 中（Groonga依存） | 低 |
| 検索精度 | 中（部分一致○） | 高（形態素解析） | 低（日本語不可） |
| インストール | `CREATE EXTENSION pg_bigm` | Groongaインストール必要 | 不要 |

**pg_bigm が最適な理由**: ポーカー用語（「AA」「フロップ」「3bet」等）は短い単語が多く、2-gram の部分一致が形態素解析より適している。インフラ変更も最小限。

**ただし MVP では pg_bigm 導入前に以下の段階的アプローチを推奨**:

#### Phase A: GIN trigramインデックス（即時実行可能）
PostgreSQL標準の `pg_trgm` 拡張を使用:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_post_content_trgm ON "Post" USING gin (content gin_trgm_ops);
CREATE INDEX idx_user_name_trgm ON "User" USING gin (name gin_trgm_ops);
CREATE INDEX idx_user_username_trgm ON "User" USING gin (username gin_trgm_ops);
```

- `pg_trgm` はPostgreSQL公式イメージに含まれている（追加インストール不要）
- 3文字以上のクエリで高速化される
- 既存の `ILIKE` クエリがそのままインデックス利用可能
- 日本語も3文字以上なら部分一致検索可能

#### Phase B: pg_bigm（日本語2文字検索が必要な場合）
- Dockerイメージを `postgres:16-alpine` → `pgbigm/pg_bigm:16` に変更
- 2文字の日本語クエリ（「AA」「SB」等）に対応

**推奨**: Phase A を先行実装。ユーザーフィードバック後に Phase B 検討。

---

### 4-2-2: 検索結果ページネーション

**現状**: `take: 50` 固定、カーソルなし。

**実装方式**: カーソルベースページネーション（既存の投稿フィードと統一）

**Search Service 変更**:
```typescript
searchPosts(query: string, userId: string, cursor?: string, limit: number = 20) {
  return this.prisma.post.findMany({
    where: { content: { contains: query, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,  // 次ページ存在チェック用に+1
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    // 既存の include/select...
  });
}

searchUsers(query: string, cursor?: string, limit: number = 20) {
  // 同様のカーソルベース実装
}
```

**Controller 変更**:
- クエリパラメータ追加: `?q=xxx&cursor=xxx&limit=20`
- レスポンス形状: `{ data: Post[], nextCursor: string | null, hasMore: boolean }`

---

### 4-2-3: 検索結果の関連度ランキング

**Phase A（pg_trgm使用時）の実装**:
```sql
SELECT *, similarity(content, '検索語') AS relevance
FROM "Post"
WHERE content ILIKE '%検索語%'
ORDER BY relevance DESC, "createdAt" DESC
```

Prisma では `$queryRaw` を使用:
```typescript
const posts = await this.prisma.$queryRaw`
  SELECT p.*, similarity(p.content, ${query}) as relevance
  FROM "Post" p
  WHERE p.content ILIKE ${'%' + query + '%'}
  ORDER BY relevance DESC, p."createdAt" DESC
  LIMIT ${limit + 1}
`;
```

**ランキング要素**（将来拡張）:
1. テキスト類似度（similarity）
2. いいね数（エンゲージメント）
3. 投稿日時（新しさ）

**MVP**: similarity のみでランキング。エンゲージメント加重は次フェーズ。

---

### 4-2-4: 検索フィルター

**新規クエリパラメータ**:
| パラメータ | 型 | 説明 | 例 |
|-----------|-----|------|-----|
| `q` | string | 検索キーワード（必須） | `q=3bet` |
| `type` | enum | `all` / `posts` / `hands` / `users` | `type=hands` |
| `period` | enum | `all` / `day` / `week` / `month` | `period=week` |
| `author` | string | ユーザーname/usernameで絞込 | `author=tanaka` |
| `cursor` | string | ページネーションカーソル | |
| `limit` | number | 件数（default: 20, max: 50） | |

**Service 実装**:
```typescript
interface SearchFilters {
  query: string;
  type?: 'all' | 'posts' | 'hands' | 'users';
  period?: 'all' | 'day' | 'week' | 'month';
  author?: string;
  cursor?: string;
  limit?: number;
}
```

**期間フィルターのWHERE条件**:
- `day`: `createdAt >= now() - 24h`
- `week`: `createdAt >= now() - 7d`
- `month`: `createdAt >= now() - 30d`

**ポーカーハンドフィルター**: `where: { isPokerHand: true }` を追加

---

### 4-2-5: 検索サジェスト機能

**エンドポイント**: `GET /search/suggestions?q=xxx`

**実装内容**:

1. **人気ハッシュタグ** (トップ10):
```typescript
// PostHashtag を集計して人気順
const trending = await this.prisma.postHashtag.groupBy({
  by: ['hashtagId'],
  _count: { hashtagId: true },
  orderBy: { _count: { hashtagId: 'desc' } },
  take: 10,
  where: {
    post: { createdAt: { gte: sevenDaysAgo } }
  }
});
```

2. **クエリ入力時のサジェスト** (プレフィックス一致):
```typescript
// ハッシュタグ名の前方一致
const suggestions = await this.prisma.hashtag.findMany({
  where: { name: { startsWith: query, mode: 'insensitive' } },
  take: 5,
  orderBy: { posts: { _count: 'desc' } }
});
```

3. **ユーザーサジェスト** (プレフィックス一致):
```typescript
const users = await this.prisma.user.findMany({
  where: {
    OR: [
      { username: { startsWith: query, mode: 'insensitive' } },
      { name: { startsWith: query, mode: 'insensitive' } },
    ]
  },
  take: 5,
  select: { id: true, name: true, username: true, avatarUrl: true }
});
```

**レスポンス形状**:
```json
{
  "hashtags": [{ "name": "3bet", "count": 42 }],
  "users": [{ "id": "...", "name": "...", "username": "...", "avatarUrl": "..." }]
}
```

**Rate Limit**: `@Throttle({ default: { ttl: 60000, limit: 30 } })` (サジェストは高頻度呼び出し)

---

## 実行順序・依存関係マトリクス

```
並行可能グループ A（依存なし、即時着手）:
├── 4-1-1: アカウントロックアウト
├── 4-1-2: パスワード強度要件
├── 4-1-3: Cron クリーンアップ
└── 4-2-2: 検索ページネーション

依存グループ B（インフラ変更後）:
├── 4-1-4: Redis 移行 ← Docker Compose 変更が前提
└── 4-2-1: pg_trgm 導入 ← DB拡張有効化が前提

依存グループ C（4-2-1 完了後）:
├── 4-2-3: 関連度ランキング ← pg_trgm の similarity() 利用
├── 4-2-4: 検索フィルター ← ページネーション(4-2-2)と合流
└── 4-2-5: 検索サジェスト

テスト（実装完了後）:
├── 4-1-5: セキュリティテスト28件 ← 単体テスト18件は先行、E2E 10件は後続
└── 4-1-6: Rate Limit テスト5件 ← E2E環境で実行
```

**推奨実行フロー**:
1. グループ A を4並行で実装開始
2. Docker Compose 変更（Redis追加）完了後、グループ B 着手
3. pg_trgm 導入確認後、グループ C 着手
4. 全実装完了後、テスト実装（4-1-5, 4-1-6）

---

## リスク・懸念事項

| リスク | 影響度 | 対策 |
|--------|--------|------|
| pg_bigm Docker イメージ変更 | 中 | Phase A (pg_trgm) で先行、pg_bigm は Phase B |
| Redis 追加によるインフラコスト | 低 | 128MB制限、Alpine イメージで最小化 |
| 既存テスト破損（bcrypt rounds） | 高 | P0 として最優先で修正 |
| Cron ジョブのタイムゾーン | 低 | UTC で設定、ログ出力で確認 |
| Rate Limit テストの安定性 | 中 | テスト用に TTL を短く設定 |

---

## 完了基準チェックリスト

### タスク 4-1 完了基準
- [ ] アカウントロックアウト: 5回失敗→15分ロック動作確認
- [ ] パスワード強度: 弱いパスワードで登録→バリデーションエラー
- [ ] Cron クリーンアップ: 手動トリガーで期限切れトークン削除確認
- [ ] Redis 移行: OAuth セッションが Redis に格納・消費される
- [ ] セキュリティテスト 28件: 全件パス
- [ ] Rate Limit テスト 5件: 全件パス

### タスク 4-2 完了基準
- [ ] 日本語ポーカー用語（「フロップ」「3bet」「AA」）で正確な検索結果
- [ ] ページネーション: 20件ずつ読み込み、無限スクロール対応
- [ ] 関連度ランキング: 類似度順でソートされる
- [ ] フィルター: 期間・種別・著者で絞り込み可能
- [ ] サジェスト: 入力中にハッシュタグ・ユーザー候補表示
