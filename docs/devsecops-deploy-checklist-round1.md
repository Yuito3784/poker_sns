# DevSecOps Deploy Checklist — Round 1

作成: DevSecOps 角巻 / 2026-03-02
ステータス: 全項目検証完了

---

## A. セキュリティ修正検証結果 (全7項目 PASS)

| # | 修正内容 | ファイル | 行番号 | 状態 |
|---|---------|---------|--------|------|
| 1 | Helmet (CSP, HSTS includeSubDomains+preload, frameguard, noSniff) | `backend/src/main.ts` | L18-43 | PASS |
| 2 | nginx セキュリティヘッダー (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) | `nginx-prod.conf` | L61-64 | PASS |
| 3 | PostgreSQL ポート外部非公開 | `docker-compose.yml` | L2-15 | PASS |
| 4 | bcrypt rounds 12 (3箇所) | `backend/src/auth/auth.service.ts` | L50, L204, L276 | PASS |
| 5 | JWT query param抽出 削除 | `backend/src/auth/jwt.strategy.ts` | L13 | PASS |
| 6 | Stripe webhook 署名検証失敗時 400 返却 | `backend/src/subscriptions/subscriptions.controller.ts` | L72-74 | PASS |
| 7 | verify-email に @Throttle 追加 | `backend/src/auth/auth.controller.ts` | L60 | PASS |

---

## B. 本番デプロイチェックリスト

### B-1. nginx-prod.conf 反映確認

- [x] `server_tokens off` でバージョン非公開
- [x] HTTP→HTTPS 301リダイレクト設定
- [x] SSL/TLS: TLSv1.2 + TLSv1.3 のみ許可
- [x] HSTS: `max-age=63072000; includeSubDomains; preload`
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] Rate limiting: auth=5r/s, API=30r/s, LP=20r/s, OG crawler=10r/s
- [x] `client_max_body_size 10M`
- [x] SSE notifications: buffering off, cache off
- [x] OG image cache: 24h valid, stale on error
- [ ] **要対応**: `DOMAIN_PLACEHOLDER` を実ドメインに置換

### B-2. Dockerイメージビルド構成確認

**Backend (`backend/Dockerfile`)**
- [x] Multi-stage build (builder → runner)
- [x] `node:20-alpine` ベース
- [x] `npm ci --omit=dev` で本番最小依存
- [x] 非rootユーザー `nestjs:nodejs` (UID 1001)
- [x] `NODE_ENV=production`
- [x] Prisma client生成 → dist + prisma スキーマコピー
- [x] `entrypoint.sh` でマイグレーション実行

**Frontend (`frontend/Dockerfile`)**
- [x] Multi-stage build (builder → runner)
- [x] `node:20-alpine` ベース
- [x] Next.js standalone output
- [x] 非rootユーザー `nextjs:nodejs` (UID 1001)
- [x] `NODE_ENV=production`
- [x] ビルド時 `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` 注入

### B-3. docker-compose.yml 構成確認

- [x] PostgreSQL: healthcheck 付き、外部ポート非公開
- [x] Backend: db依存 (service_healthy 条件)、healthcheck 付き
- [x] Frontend: backend依存
- [x] nginx: 80/443 のみ外部公開
- [x] certbot: 自動更新 (12h間隔)
- [x] volumes: pgdata, uploads, certbot-www, certbot-conf

---

## C. 環境変数シークレット棚卸し

### CRITICAL (未設定時サービス起動不可)

| 変数名 | 用途 | 生成方法 |
|--------|------|---------|
| `DB_PASSWORD` | PostgreSQL パスワード | `openssl rand -base64 32` |
| `JWT_SECRET` | JWT署名キー (64byte) | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `STRIPE_SECRET_KEY` | Stripe API キー | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 署名検証 | Stripe Dashboard → Webhooks |
| `STRIPE_PRICE_ID` | Premium プラン Price ID | Stripe Dashboard → Products |

### HIGH (機能停止リスク)

| 変数名 | 用途 | 未設定時の影響 |
|--------|------|---------------|
| `SMTP_HOST` / `SMTP_PASS` | メール送信 | メール認証・パスワードリセット不可 |
| `SMTP_FROM` | 送信元アドレス | デフォルト: `noreply@pokersns.com` |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google OAuth | Googleログイン不可 |
| `LINE_CLIENT_ID` / `SECRET` | LINE Login | LINEログイン不可 |
| `X_CLIENT_ID` / `SECRET` | X (Twitter) OAuth | Xログイン不可 |

### MEDIUM (オプション機能)

| 変数名 | 用途 | 未設定時の影響 |
|--------|------|---------------|
| `TOKEN_ENCRYPTION_KEY` | SNS自動投稿トークン暗号化 | 自動投稿機能停止 |
| `X_AUTOPOST_CLIENT_ID` / `SECRET` | X自動投稿 | X自動投稿不可 |
| `YOUTUBE_CLIENT_ID` / `SECRET` | YouTube自動投稿 | YouTube自動投稿不可 |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram自動投稿 | Instagram自動投稿不可 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics | アクセス解析なし |

### フロントエンド (ビルド時注入)

| 変数名 | 用途 | 設定場所 |
|--------|------|---------|
| `NEXT_PUBLIC_API_URL` | APIエンドポイント | `docker-compose.yml` build args |
| `NEXT_PUBLIC_SITE_URL` | サイトURL | `docker-compose.yml` build args |

---

## D. デプロイ手順 (本番サーバー)

```bash
# 1. ドメイン設定
sed -i 's/DOMAIN_PLACEHOLDER/yourdomain.com/g' nginx-prod.conf

# 2. 環境変数ファイル作成
cp .env.example .env
# .env を編集して全CRITICAL変数を設定

# 3. nginx本番設定を反映
cp nginx-prod.conf nginx.conf

# 4. SSL証明書取得 (初回)
docker compose up -d nginx
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d yourdomain.com \
  --email your@email.com --agree-tos

# 5. ビルド & 起動
docker compose up -d --build

# 6. ヘルスチェック
curl -s https://yourdomain.com/api/health
curl -sI https://yourdomain.com | grep -E '(Strict-Transport|X-Content-Type|X-Frame|Referrer)'
```

---

## E. Vercelデプロイ (フロントエンド単体)

フロントエンドをVercelにデプロイする場合の環境変数:

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_API_URL` | バックエンドAPIの公開URL (例: `https://api.yourdomain.com`) |
| `NEXT_PUBLIC_SITE_URL` | フロントエンドURL (Vercel自動設定) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 測定ID |

**注意**: バックエンドAPIが公開URLを持っていない場合、認証・データ表示等は動作しない (UI表示のみ)。

---

## F. QA連携: スモークテスト対象 (雪花さん指摘3項目)

| # | テスト項目 | 検証方法 | DevSecOps確認 |
|---|-----------|---------|--------------|
| 1 | 認証フロー (JWT更新・OAuth一時セッション消費) | POST /auth/login → refresh → /auth/refresh | インフラ側: rate limit 5r/s 設定済み |
| 2 | Stripe決済 webhook署名検証 | POST /subscriptions/webhook (invalid sig → 400) | 署名失敗時400返却コード確認済み |
| 3 | Helmet/CSPヘッダー実適用 | `curl -sI` でレスポンスヘッダー確認 | main.ts Helmet設定 + nginx-prod.conf ヘッダー二重適用 |

---

## 判定: リリース可

全セキュリティ修正検証済み。本番デプロイはドメイン確定・シークレット設定後即時実行可能。
