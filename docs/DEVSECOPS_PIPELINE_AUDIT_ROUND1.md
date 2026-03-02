# DevSecOps 本番デプロイパイプライン監査レポート

**担当:** 角巻 (DevSecOps)
**日時:** 2026-03-02
**対象:** poker_sns 本番デプロイパイプライン

---

## 監査サマリー

| 検証項目 | 結果 | 重要度 |
|---------|------|--------|
| Docker Compose 本番構成 | PASS (修正後) | - |
| Frontend Dockerfile ビルド | **FIXED** — `output: "standalone"` 追加 | CRITICAL |
| Backend Dockerfile ビルド | PASS | - |
| nginx-prod.conf パス整合性 | PASS (DOMAIN_PLACEHOLDER 要置換) | - |
| 環境変数 必須チェック | PASS (5変数に `:?` 制約あり) | - |
| SSL/TLS 証明書 | 未設定 (ドメイン未取得のため) | BLOCKER |
| CI/CD パイプライン | PASS (GitHub Actions 構成済) | - |
| セキュリティヘッダー | PASS (Helmet + nginx 二重防御) | - |

**総合判定: コード側はデプロイ可能。CEO事業判断 3 件が未決のためブロック中。**

---

## 1. Docker Compose 本番構成ビルド検証

### 構成ファイル
- `docker-compose.yml` — ベース定義
- `docker-compose.prod.yml` — 本番オーバーライド
- `docker-compose.staging.yml` — ステージング用

### 本番オーバーライド確認結果
- backend/frontend の `ports: []` — 直接アクセス遮断 ✅
- リソース制限 (memory/cpus) 設定済 ✅
- DB: `POSTGRES_PASSWORD: ${DB_PASSWORD:?}` — 未設定時エラー ✅
- 起動コマンド: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` ✅

### CRITICAL 修正: Frontend next.config.ts

**問題:** `frontend/Dockerfile` L21 で `.next/standalone` をコピーするが、`next.config.ts` に `output: "standalone"` が未設定。Docker ビルドが確実に失敗する。

**修正内容:**
```typescript
// frontend/next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",  // ← 追加
  turbopack: {
    root: __dirname,
  },
};
```

**影響:** この修正なしでは本番・ステージング両方の Docker イメージビルドが不可能。

---

## 2. nginx-prod.conf パス整合性

### 検証結果: PASS

| 項目 | 設定値 | 状態 |
|-----|--------|------|
| マウントパス | `./nginx-prod.conf:/etc/nginx/conf.d/default.conf:ro` | ✅ |
| upstream frontend | `server frontend:3000` | ✅ |
| upstream backend | `server backend:3001` | ✅ |
| API rewrite | `^/api/(.*) /$1 break` | ✅ |
| SSE パス | `/api/notifications/stream` | ✅ |
| uploads プロキシ | `proxy_pass http://backend` | ✅ |
| OG image cache | `/var/cache/nginx/og_images` | ✅ |
| certbot ACME | `/.well-known/acme-challenge/` → `/var/www/certbot` | ✅ |

### 要対応: DOMAIN_PLACEHOLDER 置換
`nginx-prod.conf` 内の `DOMAIN_PLACEHOLDER` (4箇所) をデプロイ時に実ドメインに置換する必要あり。

```
server_name DOMAIN_PLACEHOLDER;                          # L33, L49
ssl_certificate     /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;   # L51
ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;     # L52
```

**推奨:** デプロイスクリプトで `sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx-prod.conf` を実行。

### セキュリティヘッダー (nginx 層)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` ✅
- `X-Content-Type-Options: nosniff` ✅
- `X-Frame-Options: DENY` ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅
- `server_tokens off` ✅

### Rate Limiting
- `api_general: 30r/s` (burst=20) — 一般 API
- `api_auth: 5r/s` (burst=10) — 認証エンドポイント
- `og_crawl: 10r/s` (burst=30) — OG メタ取得
- `lp_page: 20r/s` (burst=40) — LP 流入対策

---

## 3. 環境変数チェック

### 本番必須 (`:?` 制約で未設定時起動不可)

| 変数 | 使用箇所 | 制約 |
|------|---------|------|
| `DB_PASSWORD` | db, backend | ✅ `:?` |
| `JWT_SECRET` | backend | ✅ `:?` |
| `STRIPE_SECRET_KEY` | backend | ✅ `:?` |
| `STRIPE_WEBHOOK_SECRET` | backend | ✅ `:?` |
| `TOKEN_ENCRYPTION_KEY` | backend | ✅ `:?` |

### WARNING: デフォルト空値の変数 (設定推奨)

| 変数 | 影響 | 重要度 |
|------|------|--------|
| `STRIPE_PRICE_ID` | サブスク機能が動作しない | HIGH |
| `SMTP_*` 系 | メール送信不可 (認証・パスワードリセット) | HIGH |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth 不可 | MEDIUM |
| `LINE_CLIENT_ID/SECRET` | LINE ログイン不可 | MEDIUM |
| `X_CLIENT_ID/SECRET` | X ログイン不可 | MEDIUM |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 計測なし | LOW |

### ビルド時変数 (GitHub Secrets で設定必要)

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_API_URL` | フロントエンド API 接続先 |
| `NEXT_PUBLIC_SITE_URL` | サイト URL (OGP 等) |

---

## 4. SSL 証明書

### 現状: 未設定 (ドメイン未取得のためブロック)

**取得手順 (ドメイン確定後):**
```bash
# 1. nginx-prod.conf の DOMAIN_PLACEHOLDER を置換
sed -i "s/DOMAIN_PLACEHOLDER/yourdomain.com/g" nginx-prod.conf

# 2. 初回は HTTP のみで起動 (SSL 設定を一時コメントアウト)
# 3. certbot で証明書取得
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos

# 4. SSL 設定を有効化して再起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**自動更新:** certbot コンテナが 12 時間ごとに `certbot renew` を実行 ✅

---

## 5. CI/CD パイプライン検証

### GitHub Actions ワークフロー (`ci-cd.yml`)

| ジョブ | トリガー | 状態 |
|--------|---------|------|
| `backend-test` | push/PR → main | ✅ npm ci → prisma generate → test → build |
| `frontend-build` | push/PR → main | ✅ npm ci → build (with build args) |
| `docker-build` | main push のみ | ✅ GHCR push (latest + SHA tag) |
| `deploy` | main push のみ | ✅ SSH → pull → up -d → health check |

### 必要な GitHub Secrets

| Secret | 用途 | 状態 |
|--------|------|------|
| `DEPLOY_HOST` | サーバー IP/ドメイン | CEO判断待ち |
| `DEPLOY_USER` | SSH ユーザー名 | CEO判断待ち |
| `DEPLOY_SSH_KEY` | SSH 秘密鍵 | CEO判断待ち |
| `NEXT_PUBLIC_API_URL` | フロント API URL | CEO判断待ち |
| `NEXT_PUBLIC_SITE_URL` | サイト URL | CEO判断待ち |
| `DISCORD_WEBHOOK_URL` | デプロイ通知 | 任意 |
| `GITHUB_TOKEN` | GHCR 認証 | 自動提供 ✅ |

---

## 6. CEOへの報告: ブロッカー一覧

### 技術的ブロッカー (修正済)

| # | 内容 | 重要度 | 対応 |
|---|------|--------|------|
| 1 | Frontend `output: "standalone"` 未設定 | CRITICAL | **本レポートで修正済** |

### CEO事業判断待ちブロッカー (技術チームでは解決不可)

| # | ブロッカー | 必要な判断 | 判断後の作業時間 |
|---|-----------|-----------|----------------|
| 1 | 本番サーバーがない | VPS選定・契約 | 契約後 2h でセットアップ |
| 2 | ドメインがない | ドメイン名決定・取得 | 取得後 1h で DNS + SSL 設定 |
| 3 | Stripe本番キーがない | Stripe 本番モード切替承認 | 承認後 30min で設定 |

**CEO判断後のデプロイ所要時間: 約 3 時間 (初回セットアップ含む)**

---

## 7. デプロイ手順書 (CEO判断後の実行手順)

```
1. VPS にログイン、Docker + Docker Compose インストール
2. リポジトリ clone → /opt/poker_sns
3. .env.example → .env にコピー、本番値を設定
4. nginx-prod.conf の DOMAIN_PLACEHOLDER を置換
5. DNS A レコードを VPS IP に設定
6. HTTP のみで初回起動 → certbot で SSL 証明書取得
7. docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
8. GitHub Secrets にデプロイ情報を設定
9. 以降は main push で自動デプロイ
```

---

*DevSecOps 角巻 — 2026-03-02*
