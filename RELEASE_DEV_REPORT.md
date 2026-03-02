# Development Release Readiness Report

**Date:** 2026-03-02
**担当:** Development (風真)
**ブランチ:** climpire/0c389e2f

---

## 1. 修正済み — CRITICAL/HIGH

### [CRITICAL] next.config.ts に `output: "standalone"` 未設定
- **影響:** Frontend Dockerfile が `.next/standalone` をコピーするが、Next.js が standalone 出力を生成しないため Docker ビルドが失敗する
- **修正:** `frontend/next.config.ts` に `output: "standalone"` を追加
- **コミット:** 56faae7

### [HIGH] 404/500 エラーページ未作成
- **影響:** ユーザーが存在しないURLにアクセスした際、デフォルトの白背景エラーページが表示されブランド体験を損なう
- **修正:** `frontend/src/app/not-found.tsx` (404) と `frontend/src/app/error.tsx` (500) を "The Felt Table" ダークテーマで作成
- **コミット:** 56faae7

### [MEDIUM] TOKEN_ENCRYPTION_KEY が docker-compose.yml (base) に未定義
- **影響:** SNS自動投稿機能のトークン暗号化キーが base compose から渡されない
- **修正:** `docker-compose.yml` の backend environment に `TOKEN_ENCRYPTION_KEY: ${TOKEN_ENCRYPTION_KEY:-}` を追加
- **コミット:** 56faae7

---

## 2. 検証済み — 問題なし

| 項目 | 状態 | 備考 |
|------|------|------|
| Backend Dockerfile: prisma generate | OK | builder ステージで `npx prisma generate` 実行済み |
| entrypoint.sh: prisma migrate deploy | OK | コンテナ起動時にマイグレーション自動適用 |
| Prisma migrations ディレクトリ | OK | 6件のマイグレーションファイル存在 |
| Health check endpoint | OK | `GET /health` — DB疎通確認付き、SkipThrottle 適用 |
| docker-compose.prod.yml: 必須環境変数 | OK | DB_PASSWORD, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TOKEN_ENCRYPTION_KEY すべて `?` バリデーション付き |
| Backend/Frontend ポート非公開 (prod) | OK | `ports: []` で直接アクセス不可、Nginx 経由のみ |
| ハードコードされたシークレット | OK | backend/src, frontend/src にシークレットのハードコードなし |
| nginx-prod.conf セキュリティヘッダー | OK | HSTS (includeSubDomains, preload), X-Content-Type-Options, X-Frame-Options, Referrer-Policy 設定済み |
| SSL/TLS 設定 | OK | TLSv1.2/1.3 のみ、強力な暗号スイート、セッションチケット無効 |
| Docker イメージ非 root ユーザー | OK | backend: nestjs(1001), frontend: nextjs(1001) |
| console.log/warn にシークレット漏洩 | OK | メール送信失敗のみ warn、トークン値は含まれない |

---

## 3. 本番デプロイ前の運用チェックリスト (Development → Ops)

- [ ] `.env` に全必須変数を設定 (.env.example 参照)
- [ ] `nginx-prod.conf` の `DOMAIN_PLACEHOLDER` を実際のドメインに置換
- [ ] Let's Encrypt 証明書取得: `docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d yourdomain.com`
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml build` でイメージビルド確認
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` でサービス起動
- [ ] `curl https://yourdomain.com/api/health` でヘルスチェック疎通確認
- [ ] レスポンスヘッダー検証: HSTS, X-Content-Type-Options, X-Frame-Options

---

## 4. MEDIUM/LOW — 警告のみ (コード変更なし)

| 項目 | 重要度 | 備考 |
|------|--------|------|
| nginx-prod.conf の DOMAIN_PLACEHOLDER | LOW | デプロイ手順書で対応 (Ops担当) |
| GA測定ID 未設定時の挙動 | LOW | `NEXT_PUBLIC_GA_MEASUREMENT_ID` 未設定でもエラーにならないことを確認推奨 |
| uploads ボリュームのバックアップ戦略 | LOW | Docker named volume のバックアップ手順を Ops が策定 |
