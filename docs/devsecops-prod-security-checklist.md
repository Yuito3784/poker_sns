# 本番デプロイ前セキュリティチェックリスト

作成: DevSecOps 角巻 / 2026-03-02
ステータス: 監査完了・修正済み

---

## 1. 環境変数・シークレット管理

| # | チェック項目 | 重要度 | 状態 | 対応 |
|---|---|---|---|---|
| 1.1 | `JWT_SECRET` に本番用ランダム値が設定されている | CRITICAL | FIXED | `docker-compose.prod.yml` でデフォルト値を無効化。未設定時はコンテナ起動失敗 |
| 1.2 | `DB_PASSWORD` に本番用強パスワードが設定されている | CRITICAL | FIXED | 同上 |
| 1.3 | `STRIPE_SECRET_KEY` が設定されている | CRITICAL | FIXED | 同上 |
| 1.4 | `STRIPE_WEBHOOK_SECRET` が設定されている | CRITICAL | FIXED | 同上 |
| 1.5 | `.env` ファイルが `.gitignore` に含まれている | HIGH | OK | 確認済み |
| 1.6 | `.env.example` に実際のシークレットが含まれていない | HIGH | OK | プレースホルダーのみ |

## 2. コンテナセキュリティ

| # | チェック項目 | 重要度 | 状態 | 対応 |
|---|---|---|---|---|
| 2.1 | Backend Dockerfile に非 root ユーザー設定 | HIGH | FIXED | `nestjs:nodejs` ユーザー追加 (UID 1001) |
| 2.2 | Frontend Dockerfile に非 root ユーザー設定 | HIGH | FIXED | `nextjs:nodejs` ユーザー追加 (UID 1001) |
| 2.3 | PostgreSQL ポートが外部に公開されていない | HIGH | OK | `docker-compose.yml` で `ports` 未設定 (内部ネットワークのみ) |
| 2.4 | Backend/Frontend ポートが本番で非公開 | HIGH | OK | `docker-compose.prod.yml` で `ports: []` |
| 2.5 | `NODE_ENV=production` が設定されている | MEDIUM | OK | 両 Dockerfile で設定済み |

## 3. SSL/TLS

| # | チェック項目 | 重要度 | 状態 | 対応 |
|---|---|---|---|---|
| 3.1 | Let's Encrypt 証明書取得スクリプトが動作可能 | HIGH | OK | `setup-ssl.sh` 確認済み |
| 3.2 | SSL 自動更新 + nginx リロードスクリプトが存在 | HIGH | FIXED | `ssl-renew.sh` を新規作成 |
| 3.3 | TLS 1.2/1.3 のみ許可 | HIGH | OK | `nginx-prod.conf` で設定済み |
| 3.4 | HSTS ヘッダー (includeSubDomains + preload) | HIGH | OK | 設定済み (max-age=63072000) |
| 3.5 | HTTP → HTTPS リダイレクト | HIGH | OK | nginx port 80 → 301 redirect |

## 4. nginx セキュリティ

| # | チェック項目 | 重要度 | 状態 | 対応 |
|---|---|---|---|---|
| 4.1 | `server_tokens off` (バージョン非表示) | MEDIUM | FIXED | `nginx-prod.conf` に追加 |
| 4.2 | `X-Content-Type-Options: nosniff` | HIGH | OK | 設定済み |
| 4.3 | `X-Frame-Options: DENY` | HIGH | OK | 設定済み |
| 4.4 | `Referrer-Policy` | MEDIUM | OK | `strict-origin-when-cross-origin` 設定済み |
| 4.5 | API レート制限 | HIGH | OK | `limit_req_zone` 設定済み (general: 30r/s, auth: 5r/s) |
| 4.6 | `client_max_body_size` 制限 | MEDIUM | OK | 10M に設定済み |
| 4.7 | gzip 圧縮有効化 | MEDIUM | FIXED | `nginx-prod.conf` に追加 |

## 5. パフォーマンス (キャッシュ)

| # | チェック項目 | 重要度 | 状態 | 対応 |
|---|---|---|---|---|
| 5.1 | `/uploads/` に Cache-Control ヘッダー | MEDIUM | OK | `public, max-age=2592000` (30日) |
| 5.2 | `/_next/static/` に immutable キャッシュ | MEDIUM | FIXED | `public, max-age=31536000, immutable` (1年) |

## 6. アプリケーションセキュリティ (既存)

| # | チェック項目 | 重要度 | 状態 |
|---|---|---|---|
| 6.1 | bcrypt rounds 12 | OK | `auth.service.ts` 3箇所で確認済み |
| 6.2 | JWT クエリパラム抽出削除 | OK | `jwt.strategy.ts` で削除済み |
| 6.3 | OAuth セッション方式 (base64 URL 非使用) | OK | サーバーサイド一時セッション実装済み |
| 6.4 | Helmet (CSP, HSTS, frameguard, noSniff) | OK | 設定済み |
| 6.5 | Stripe webhook 署名検証 | OK | `constructEvent()` + idempotency check |
| 6.6 | verify-email に Throttle | OK | 設定済み |
| 6.7 | Prisma migrate deploy (本番) | OK | `entrypoint.sh` で実行 |

## 7. 本番デプロイ時の必須手順

```bash
# 1. .env を作成 (必須環境変数がないとコンテナ起動に失敗します)
cp .env.example .env
# → 全ての値を本番用に設定

# 2. JWT_SECRET を生成
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. SSL 証明書を取得
./setup-ssl.sh yourdomain.com admin@yourdomain.com

# 4. 本番起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 5. SSL 自動更新 cron を登録
crontab -e
# 追加: 0 3 * * * /path/to/poker_sns/ssl-renew.sh >> /var/log/ssl-renew.log 2>&1
```

---

## MEDIUM/LOW 警告事項 (コード修正なし)

| # | 項目 | 重要度 | 推奨対応 |
|---|---|---|---|
| W1 | CSP ヘッダーを nginx 側でも追加 | MEDIUM | Helmet で設定済みだが nginx でも二重設定すると堅牢。将来的に対応 |
| W2 | Docker イメージのサイズ最適化 | LOW | `.dockerignore` の追加で不要ファイルをビルドコンテキストから除外 |
| W3 | ログローテーション設定 | LOW | `docker compose` のログドライバーで `max-size`/`max-file` を設定 |
| W4 | DB バックアップ自動化 | MEDIUM | cron で `pg_dump` を定期実行 (runbook に手順あり) |
