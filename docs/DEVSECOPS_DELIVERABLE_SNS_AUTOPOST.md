# DevSecOps Deliverable: SNS Auto-Post Security Architecture

**Author:** 角巻 (DevSecOps)
**Date:** 2026-03-02
**Status:** Review Ready

---

## Executive Summary

本成果物は、SNS自動投稿機能（X / YouTube / Instagram Reels）導入に際し、DevSecOps観点から必要な3つのセキュリティ要件を設計・仕様化したものである。

| # | 要件 | 重要度 | 状態 |
|---|------|--------|------|
| 1 | SNS自動投稿用OAuthトークンの暗号化ストア設計 | CRITICAL | 設計完了 |
| 2 | OG画像動的生成エンドポイントのレートリミット＋CDNキャッシュ戦略 | HIGH | 設計完了 + 既存修正済み箇所あり |
| 3 | 自動投稿コンテンツのサニタイズ要件 | HIGH | 設計完了 |

---

## 1. SNS自動投稿用OAuthトークン — 暗号化ストア設計

### 1.1 問題定義

SNS自動投稿には以下のOAuthトークンが必要:

| Platform | Token Type | Lifetime | Refresh |
|----------|-----------|----------|---------|
| X (Twitter) API v2 | OAuth 2.0 Bearer + Refresh | Access: 2h / Refresh: 6mo | Yes |
| YouTube Data API v3 | OAuth 2.0 Bearer + Refresh | Access: 1h / Refresh: indefinite | Yes |
| Instagram Graph API | Long-lived Token | 60 days | Yes (refresh before expiry) |

**現状リスク:** `.env`直書きだと以下の問題が発生する:
- トークンローテーション時にコンテナ再起動が必要
- `.env`がGitに誤コミットされるとトークン全漏洩
- 複数プラットフォームのトークンが単一ファイルに混在
- トークンの有効期限管理ができない

### 1.2 推奨アーキテクチャ: DB暗号化ストア

**Phase 1（MVP — 現インフラで実現可能）:**

```
┌─────────────────────────────────────────┐
│  PostgreSQL (既存)                        │
│  ┌───────────────────────────────────┐   │
│  │ sns_oauth_tokens テーブル          │   │
│  │  id          UUID PK              │   │
│  │  platform    ENUM(X,YT,IG)        │   │
│  │  token_enc   BYTEA (AES-256-GCM)  │   │
│  │  refresh_enc BYTEA (AES-256-GCM)  │   │
│  │  expires_at  TIMESTAMP            │   │
│  │  scopes      TEXT[]               │   │
│  │  created_at  TIMESTAMP            │   │
│  │  updated_at  TIMESTAMP            │   │
│  └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
         ▲
         │ Prisma ORM
         │
┌────────┴────────────────────────┐
│  TokenVaultService (NestJS)      │
│  - encrypt(plaintext, key)       │
│  - decrypt(ciphertext, key)      │
│  - getToken(platform) → string   │
│  - refreshIfExpired(platform)    │
│  - rotateAll()                   │
└─────────────────────────────────┘
         ▲
         │ AES-256-GCM Key
         │
    ENV: TOKEN_ENCRYPTION_KEY
    (32-byte hex, docker-compose.prod.yml で必須化)
```

### 1.3 Prisma Schema追加 (設計)

```prisma
model SnsOAuthToken {
  id           String   @id @default(uuid())
  platform     String   // "x" | "youtube" | "instagram"
  tokenEnc     Bytes    // AES-256-GCM encrypted access token
  refreshEnc   Bytes?   // AES-256-GCM encrypted refresh token
  iv           Bytes    // Initialization vector (12 bytes)
  authTag      Bytes    // GCM auth tag (16 bytes)
  refreshIv    Bytes?
  refreshTag   Bytes?
  expiresAt    DateTime
  scopes       String[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([platform])
  @@map("sns_oauth_tokens")
}
```

### 1.4 暗号化仕様

```typescript
// TokenVaultService — 暗号化/復号の設計
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// 暗号化
function encrypt(plaintext: string, key: Buffer): { enc: Buffer; iv: Buffer; tag: Buffer } {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { enc, iv, tag };
}

// 復号
function decrypt(enc: Buffer, key: Buffer, iv: Buffer, tag: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
```

### 1.5 セキュリティ要件

| # | 要件 | 理由 |
|---|------|------|
| S1 | `TOKEN_ENCRYPTION_KEY` は `.env` に格納し、`docker-compose.prod.yml` で `${TOKEN_ENCRYPTION_KEY:?...}` 必須化 | 起動時に未設定検知 |
| S2 | 暗号化キーは `crypto.randomBytes(32).toString('hex')` で生成 | AES-256に必要な256bit |
| S3 | IV は暗号化ごとに新規生成（再利用禁止） | GCMのIV再利用はキー漏洩に直結 |
| S4 | トークン復号はメモリ上のみ、ログ出力禁止 | 平文トークンの永続化防止 |
| S5 | リフレッシュトークン使用後は即座にDB更新 | トークンローテーション対応 |
| S6 | `expiresAt` の30秒前にプロアクティブリフレッシュ | 投稿失敗防止（既存JWT方式と同様） |
| S7 | 管理画面経由のトークン登録時もHTTPS + JWT認証必須 | 管理者のみアクセス |

### 1.6 環境変数追加 (.env.example)

```bash
# ========== SNS Auto-Post (自動投稿) ==========
# トークン暗号化キー（必須: 32バイトランダム hex）
# 生成: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_ENCRYPTION_KEY=replace_with_32_byte_random_hex_string

# X (Twitter) API — 自動投稿用アプリ認証
# https://developer.twitter.com/ → Projects & Apps
# プラン: Basic ($100/mo, 50K tweets/mo) 推奨
X_AUTOPOST_CLIENT_ID=
X_AUTOPOST_CLIENT_SECRET=

# YouTube Data API v3 — 自動投稿用
# https://console.cloud.google.com/ → API & Services
# quota: 10,000 units/day (upload=1600 units)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# Instagram Graph API — 自動投稿用
# https://developers.facebook.com/ → Instagram Graph API
# Business/Creator アカウント必須
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
```

### 1.7 docker-compose.prod.yml 追加

```yaml
backend:
  environment:
    - TOKEN_ENCRYPTION_KEY=${TOKEN_ENCRYPTION_KEY:?TOKEN_ENCRYPTION_KEY is required}
```

---

## 2. OG画像動的生成エンドポイント — レートリミット＋CDNキャッシュ戦略

### 2.1 現状（実装済み）

| 項目 | 状態 | 詳細 |
|------|------|------|
| `GET /posts/:id/meta` | 対応済み | `@Throttle 30/min` + `Cache-Control: public, max-age=300, s-maxage=600` |
| Root OG画像 | 対応済み | `opengraph-image.tsx` (Edge Runtime, 静的) |
| Post OG画像 | 対応済み | `post/[id]/opengraph-image.tsx` (Edge Runtime, 動的) |
| nginx rate limit | 対応済み | `api_general:10m rate=30r/s` + `burst=20 nodelay` |

### 2.2 SNS自動投稿に伴う追加対策

自動投稿で各SNSに大量のURL共有が行われると、SNSクローラーからの同時アクセスが急増する。

#### 2.2.1 nginx: OG専用レートリミットゾーン追加

```nginx
# nginx-prod.conf に追加
limit_req_zone $binary_remote_addr zone=og_crawl:10m rate=10r/s;

# OGメタ取得用（SNSクローラー対策）
location ~ ^/api/posts/[^/]+/meta$ {
    limit_req zone=og_crawl burst=30 nodelay;
    rewrite ^/api/(.*) /$1 break;
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # CDN/Proxy向けキャッシュ指示
    proxy_hide_header Cache-Control;
    add_header Cache-Control "public, max-age=300, s-maxage=3600";
    add_header X-Robots-Tag "noindex";
}
```

#### 2.2.2 nginx: OG画像生成エンドポイントのProxy Cache

Next.js Edge Runtimeで生成されるOG画像はCPU負荷が高い。nginx層でキャッシュする。

```nginx
# nginx-prod.conf の http コンテキストに追加
proxy_cache_path /var/cache/nginx/og_images
    levels=1:2
    keys_zone=og_image_cache:10m
    max_size=500m
    inactive=7d
    use_temp_path=off;

# OG画像リクエスト用ロケーション
location ~ ^/post/[^/]+/opengraph-image {
    proxy_cache og_image_cache;
    proxy_cache_valid 200 24h;
    proxy_cache_valid 404 1m;
    proxy_cache_key $uri;
    proxy_cache_use_stale error timeout updating;

    proxy_pass http://frontend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;

    add_header X-Cache-Status $upstream_cache_status;
    add_header Cache-Control "public, max-age=86400, s-maxage=604800";
}
```

#### 2.2.3 キャッシュ戦略まとめ

| レイヤー | 対象 | TTL | 目的 |
|----------|------|-----|------|
| **SNSプラットフォーム** | OGPカード | X: ~7日, FB: 手動更新まで | プラットフォーム側キャッシュ |
| **nginx proxy_cache** | OG画像 (`/opengraph-image`) | 24h (200), 1min (404) | CPU負荷軽減 |
| **nginx response header** | `/posts/:id/meta` | max-age=300, s-maxage=3600 | CDN/Proxy活用 |
| **NestJS @Throttle** | `/posts/:id/meta` | 30 req/60s per IP | アプリ層防御 |
| **nginx limit_req** | `/api/posts/*/meta` | 10r/s + burst 30 | L7防御 |
| **Next.js ISR** | Post detail page | revalidate=60s | SSRキャッシュ |

#### 2.2.4 バイラルトラフィックシナリオ

自動投稿が成功し、1つのポストがX上で10K+ impressionを獲得した場合:

```
Timeline:
T+0s    自動投稿がXに公開
T+1s    Twitterbot が /post/:id のOGPをクロール
         → nginx proxy_cache MISS → Next.js Edge Runtime で OG画像生成
         → キャッシュ保存 (24h TTL)
T+2s~   Twitterbot 2回目以降
         → nginx proxy_cache HIT → バックエンドアクセスなし
T+30m   ユーザークリック流入開始
         → /post/:id (Next.js ISR, 60s revalidate)
         → /api/posts/:id (NestJS, 通常API)
T+1h    ピーク: 1000 concurrent users
         → nginx rate limit (30r/s per IP) で問題なし
         → DB接続プール がボトルネック候補 → Ops管轄
```

**結論:** 現在のnginx + NestJS Throttle + Next.js ISR のスタックで、上記シナリオのセキュリティ面は対応可能。スケーラビリティ（DB接続プール、水平スケーリング）はOpsチーム管轄。

---

## 3. 自動投稿コンテンツのサニタイズ要件

### 3.1 データフロー分析

```
poker_sns投稿 (ユーザー入力)
    │
    ▼
SNS Auto-Post Service
    │
    ├──► X: POST /2/tweets { text: "..." }
    │
    ├──► YouTube: videos.insert { snippet.description: "..." }
    │
    └──► Instagram: POST /{ig-user-id}/media { caption: "..." }
```

**入力:** poker_snsユーザーが作成したポスト内容 (最大500文字, Premium: 2000文字)
**出力:** 各SNSプラットフォーム向けに変換されたテキスト + URL + ハッシュタグ

### 3.2 サニタイズ済み項目（既存）

| レイヤー | 対策 | 状態 |
|----------|------|------|
| 入力時 | `SanitizeInputPipe` (sanitize-html, 全タグ除去) | 済 |
| DB保存時 | Prisma parameterized queries (SQL injection防止) | 済 |
| 表示時 | React自動エスケープ (XSS防止) | 済 |

**結論:** poker_snsのDB内のポスト内容は、入力時点でHTMLタグが除去済み。

### 3.3 自動投稿時の追加サニタイズ要件

DBに保存済みのクリーンテキストを各SNS APIに送信する際、追加で以下の処理が必要:

#### 3.3.1 共通サニタイズ (全プラットフォーム)

```typescript
// sns-content-sanitizer.ts — 設計

interface SanitizedContent {
  text: string;         // サニタイズ済みテキスト
  url: string;          // poker_sns投稿URL
  hashtags: string[];   // ハッシュタグ配列
  truncated: boolean;   // 文字数制限で切り詰めたか
}

function sanitizeForSns(post: { content: string; id: string; hashtags: string[] }): SanitizedContent {
  let text = post.content;

  // 1. 制御文字の除去 (NUL, BEL, etc.)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. 連続改行の正規化 (3行以上 → 2行)
  text = text.replace(/\n{3,}/g, '\n\n');

  // 3. Unicode方向制御文字の除去 (RTL override attack防止)
  text = text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');

  // 4. ゼロ幅文字の除去 (ホモグラフ攻撃防止)
  text = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // 5. URL を poker_sns ドメインに限定
  const url = `${process.env.FRONTEND_URL}/post/${post.id}`;

  // 6. ハッシュタグ: 英数字・日本語のみ許可
  const hashtags = post.hashtags
    .map(tag => tag.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF_]/g, ''))
    .filter(tag => tag.length > 0 && tag.length <= 50);

  return { text, url, hashtags, truncated: false };
}
```

#### 3.3.2 X (Twitter) 固有サニタイズ

```typescript
function sanitizeForX(base: SanitizedContent): string {
  const MAX_LENGTH = 280;
  const urlLength = 23; // t.co短縮URL固定長

  // 本文 + URL + ハッシュタグが280文字に収まるように切り詰め
  const hashtagStr = base.hashtags.slice(0, 3).map(t => `#${t}`).join(' ');
  const suffix = `\n\n${base.url}\n${hashtagStr}`;
  const suffixLength = urlLength + 1 + hashtagStr.length + 2;
  const maxTextLength = MAX_LENGTH - suffixLength;

  let text = base.text;
  if ([...text].length > maxTextLength) {
    text = [...text].slice(0, maxTextLength - 1).join('') + '…';
  }

  return `${text}\n\n${base.url}\n${hashtagStr}`;
}
```

#### 3.3.3 YouTube 固有サニタイズ

```typescript
function sanitizeForYouTube(base: SanitizedContent): { title: string; description: string } {
  // タイトル: 100文字以内
  const title = [...base.text].slice(0, 97).join('') +
    ([...base.text].length > 97 ? '...' : '');

  // 説明文: 5000文字以内、URLとハッシュタグを末尾に
  const description = [
    base.text,
    '',
    `詳細はこちら: ${base.url}`,
    '',
    base.hashtags.map(t => `#${t}`).join(' '),
    '',
    'Poker SNS - ポーカーハンドを共有しよう',
  ].join('\n');

  return {
    title: title.slice(0, 100),
    description: description.slice(0, 5000),
  };
}
```

#### 3.3.4 Instagram 固有サニタイズ

```typescript
function sanitizeForInstagram(base: SanitizedContent): string {
  const MAX_LENGTH = 2200;

  // Instagram: URLはキャプション内でクリッカブルにならない
  // → プロフィールリンクに誘導
  const caption = [
    base.text,
    '',
    'プロフィールのリンクから詳細を見る',
    '',
    base.hashtags.slice(0, 30).map(t => `#${t}`).join(' '),
  ].join('\n');

  return [...caption].slice(0, MAX_LENGTH).join('');
}
```

### 3.4 セキュリティ要件まとめ

| # | 要件 | 重要度 | 理由 |
|---|------|--------|------|
| C1 | 制御文字・Unicode方向制御文字の除去 | HIGH | RTL override攻撃、ターミナル制御文字攻撃の防止 |
| C2 | ゼロ幅文字の除去 | HIGH | ホモグラフ攻撃（見た目が同じ別文字列）の防止 |
| C3 | URL は自ドメイン固定生成（ユーザー入力URL不使用） | CRITICAL | オープンリダイレクト・フィッシングURL防止 |
| C4 | ハッシュタグの文字種制限 | MEDIUM | 特殊文字によるAPI側のインジェクション防止 |
| C5 | 各プラットフォームの文字数制限遵守 | MEDIUM | API拒否によるサイレント投稿失敗の防止 |
| C6 | 自動投稿テキストにユーザー入力URLを含めない | CRITICAL | 悪意あるリンクの拡散防止 |
| C7 | APIレスポンスのエラーメッセージをログに記録（トークン値除外） | HIGH | デバッグ可能性の確保＋トークン漏洩防止 |

### 3.5 ログ出力ポリシー

```typescript
// OK: エラー内容のログ
logger.error(`X auto-post failed for post ${postId}: ${error.message}`);

// NG: トークン値のログ
logger.error(`X API error with token ${accessToken}: ${error.message}`);

// OK: レスポンスステータスのログ
logger.warn(`Instagram API returned ${response.status} for post ${postId}`);

// NG: レスポンスボディ全体のログ（トークン含む可能性）
logger.debug(`API response: ${JSON.stringify(response.data)}`);
```

---

## 4. 追加セキュリティ検討事項

### 4.1 APIキー権限分離

| Platform | 自動投稿用 | ユーザーログイン用 | 理由 |
|----------|-----------|-------------------|------|
| X | 別アプリ（`X_AUTOPOST_CLIENT_*`） | 既存（`X_CLIENT_*`） | 権限スコープが異なる（write vs read） |
| YouTube | 専用Service Account | N/A | 特定チャンネルへのアップロード権限のみ |
| Instagram | 専用Long-lived Token | N/A | Business API用の別資格情報 |

**理由:** ユーザーログイン用のOAuth資格情報に自動投稿権限を付与すると、資格情報漏洩時の被害範囲が拡大する。投稿用とログイン用は分離すること。

### 4.2 自動投稿ジョブのセキュリティ境界

```
┌──────────────────────────────────────────┐
│  Backend (NestJS)                         │
│                                           │
│  ┌──────────────┐   ┌──────────────────┐ │
│  │ Auth Module   │   │ AutoPost Module   │ │
│  │ (user OAuth)  │   │ (system OAuth)    │ │
│  │              │   │                    │ │
│  │ X_CLIENT_*   │   │ X_AUTOPOST_*      │ │
│  │ (read scope) │   │ (write scope)     │ │
│  └──────────────┘   └──────────────────┘ │
│       ▲ 分離         ▲                    │
│       │              │                    │
│       │    TokenVaultService              │
│       │    (暗号化ストア経由)              │
│       │              │                    │
└───────┴──────────────┴────────────────────┘
```

### 4.3 CI/CDパイプライン追加チェック

自動投稿機能の導入に伴い、CI/CDで以下のチェックを追加:

| # | チェック | 対象 | 方法 |
|---|---------|------|------|
| CI-1 | シークレットのハードコード検出 | `*.ts`, `*.tsx` | `gitleaks` or `trufflehog` |
| CI-2 | `.env` ファイルのコミット防止 | `.gitignore` | pre-commit hook |
| CI-3 | 依存パッケージの脆弱性スキャン | `package-lock.json` | `npm audit --audit-level=high` |
| CI-4 | Dockerイメージの脆弱性スキャン | Dockerfile | `trivy image` |

---

## 5. 実装優先度＋ロードマップ

| Phase | 項目 | 担当 | 前提条件 |
|-------|------|------|----------|
| **P0** | `TOKEN_ENCRYPTION_KEY` を `.env.example` + `docker-compose.prod.yml` に追加 | DevSecOps | なし |
| **P0** | Prisma schema に `SnsOAuthToken` model 追加 | Development | P0完了後 |
| **P1** | `TokenVaultService` 実装 (暗号化/復号/リフレッシュ) | Development | Schema追加後 |
| **P1** | nginx OG画像キャッシュ設定追加 | DevSecOps/Ops | なし |
| **P1** | `sns-content-sanitizer` 実装 | Development | なし |
| **P2** | 各SNS自動投稿サービス実装 | Development | P1完了後 |
| **P2** | CI/CDシークレットスキャン追加 | DevSecOps | なし |
| **P3** | 管理画面からのトークン登録UI | Development/Design | P1完了後 |

---

## 6. コード変更 (CRITICAL/HIGH — 即時適用)

### 6.1 `.env.example` への追記

```diff
+ # ========== SNS Auto-Post (自動投稿) ==========
+ # トークン暗号化キー (32バイトランダム hex)
+ # 生成: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
+ TOKEN_ENCRYPTION_KEY=replace_with_32_byte_random_hex_string
+
+ # X (Twitter) API — 自動投稿用 (ログイン用とは別アプリ)
+ X_AUTOPOST_CLIENT_ID=
+ X_AUTOPOST_CLIENT_SECRET=
+
+ # YouTube Data API v3 — 自動投稿用
+ YOUTUBE_CLIENT_ID=
+ YOUTUBE_CLIENT_SECRET=
+
+ # Instagram Graph API — 自動投稿用
+ INSTAGRAM_ACCESS_TOKEN=
+ INSTAGRAM_BUSINESS_ACCOUNT_ID=
```

### 6.2 `docker-compose.prod.yml` への追記

```diff
  backend:
    environment:
+     - TOKEN_ENCRYPTION_KEY=${TOKEN_ENCRYPTION_KEY:?TOKEN_ENCRYPTION_KEY is required for SNS auto-post}
```

### 6.3 `nginx-prod.conf` — OG画像キャッシュ＋専用レートリミット追加

```diff
  limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
  limit_req_zone $binary_remote_addr zone=api_auth:10m rate=5r/s;
+ limit_req_zone $binary_remote_addr zone=og_crawl:10m rate=10r/s;
+
+ proxy_cache_path /var/cache/nginx/og_images
+     levels=1:2
+     keys_zone=og_image_cache:10m
+     max_size=500m
+     inactive=7d
+     use_temp_path=off;

  server {
      ...
+     # OG meta endpoint — SNSクローラー専用レート制限
+     location ~ ^/api/posts/[^/]+/meta$ {
+         limit_req zone=og_crawl burst=30 nodelay;
+         rewrite ^/api/(.*) /$1 break;
+         proxy_pass http://backend;
+         proxy_http_version 1.1;
+         proxy_set_header Host $host;
+         proxy_set_header X-Real-IP $remote_addr;
+         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
+         proxy_set_header X-Forwarded-Proto $scheme;
+     }
+
+     # OG画像キャッシュ (Next.js Edge Runtime生成)
+     location ~ ^/post/[^/]+/opengraph-image {
+         proxy_cache og_image_cache;
+         proxy_cache_valid 200 24h;
+         proxy_cache_valid 404 1m;
+         proxy_cache_key $uri;
+         proxy_cache_use_stale error timeout updating;
+         proxy_pass http://frontend;
+         proxy_http_version 1.1;
+         proxy_set_header Host $host;
+         add_header X-Cache-Status $upstream_cache_status;
+         add_header Cache-Control "public, max-age=86400, s-maxage=604800";
+     }
+
      location /api/ {
          ...
```

---

## 7. MEDIUM/LOW 警告事項 (コード修正なし・報告のみ)

| # | 項目 | 重要度 | 推奨 |
|---|------|--------|------|
| W1 | OAuth in-memory session → Redis移行 | MEDIUM | 水平スケーリング時に必要。現状シングルインスタンスでは問題なし |
| W2 | YouTube API quotaモニタリング | MEDIUM | 10,000 units/day、upload=1,600 units。1日6動画が上限 |
| W3 | Instagram Graph API rate limit (200 calls/hour) | MEDIUM | 自動投稿頻度をOps側ジョブスケジューラと調整必要 |
| W4 | X API Basic plan費用 ($100/mo) | LOW | 月間50K投稿上限。費用対効果をPlanning側と協議 |
| W5 | CSPの `connect-src` に各SNS APIドメイン追加不要（バックエンド投稿のため） | LOW | フロントからSNS APIを直接叩かない設計であることを確認 |

---

## 8. クロスチーム依存関係

| 成果物 | 依存先チーム | 入力内容 |
|--------|-------------|----------|
| Prisma Schema (`SnsOAuthToken`) | Development | Section 1.3 の設計 |
| `TokenVaultService` 実装 | Development | Section 1.4 の暗号化仕様 |
| `sns-content-sanitizer` 実装 | Development | Section 3.3 の変換ロジック |
| nginx OG cache設定 | Operations | Section 6.3 の設定差分 |
| 自動投稿エラー異常系テスト | QA/QC | Section 3.4 の要件表 |
| SNSテンプレート画像サイズ | Design | OG 1200x630, Reels 1080x1920, YT 1280x720 |
| APIプラン選定・費用承認 | Planning | Section 1.6 + W4 |
| ジョブスケジューラ障害検知 | Operations | Section 3.5 ログポリシー |

---

**End of DevSecOps Deliverable**
