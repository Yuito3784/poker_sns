# 本番用 .env セキュリティ要件定義書

**作成**: DevSecOps チーム (角巻)
**日付**: 2026-03-02
**ステータス**: CEOドメイン・サーバー情報待ち（並行着手可能項目を先行定義）

---

## 1. シークレット生成要件

| 変数名 | 最小要件 | 生成コマンド |
|--------|----------|-------------|
| `DB_PASSWORD` | 英数記号混合 20文字以上 | `openssl rand -base64 24` |
| `JWT_SECRET` | 64バイトランダム hex (128文字) | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `TOKEN_ENCRYPTION_KEY` | 32バイトランダム hex (64文字) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

## 2. 環境変数カテゴリ別セキュリティ分類

### CRITICAL（漏洩時に即時被害）
| 変数 | 説明 | 要件 |
|------|------|------|
| `DB_PASSWORD` | PostgreSQL パスワード | docker-compose.prod.yml で `?` 必須チェック済み |
| `JWT_SECRET` | JWT署名キー | 同上。デフォルト値 `change-me-in-production` は本番起動不可 |
| `STRIPE_SECRET_KEY` | Stripe API キー (sk_live_*) | 同上。テストキー混入防止のため `sk_live_` プレフィックスを手動確認 |
| `STRIPE_WEBHOOK_SECRET` | Webhook 署名検証キー | 同上 |
| `TOKEN_ENCRYPTION_KEY` | SNS自動投稿トークン暗号化キー | 同上 |

### HIGH（漏洩時にアカウント乗っ取りリスク）
| 変数 | 説明 | 要件 |
|------|------|------|
| `GOOGLE_CLIENT_SECRET` | Google OAuth シークレット | 空の場合 OAuth 無効（許容） |
| `LINE_CLIENT_SECRET` | LINE Login シークレット | 同上 |
| `X_CLIENT_SECRET` | X (Twitter) OAuth シークレット | 同上 |
| `SMTP_PASS` | SMTP パスワード | 空の場合メール送信不可（本番では必須） |

### MEDIUM（漏洩時に機能悪用リスク）
| 変数 | 説明 | 要件 |
|------|------|------|
| `X_AUTOPOST_CLIENT_SECRET` | X自動投稿用 | オプション機能 |
| `YOUTUBE_CLIENT_SECRET` | YouTube自動投稿用 | オプション機能 |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram自動投稿用 | オプション機能 |

### PUBLIC（フロントエンドに埋め込まれる値）
| 変数 | 説明 | 要件 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | API エンドポイント | `https://<ドメイン>/api` 形式 |
| `NEXT_PUBLIC_SITE_URL` | サイト URL | `https://<ドメイン>` 形式 |

## 3. .env ファイル管理ルール

1. **パーミッション**: `chmod 600 .env`（オーナーのみ読み書き可）
2. **gitignore**: `.env` は `.gitignore` に記載済み（確認済み）
3. **バックアップ**: .env は暗号化した上でオフラインバックアップを保持
4. **ローテーション**: JWT_SECRET と TOKEN_ENCRYPTION_KEY は 90日ごとにローテーション推奨
5. **監査**: `.env.example` にプレースホルダーのみ記載し、実値は絶対にコミットしない

## 4. docker-compose.prod.yml セキュリティ検証結果

| チェック項目 | 結果 | 備考 |
|-------------|------|------|
| DB パスワード必須チェック (`?`) | OK | `${DB_PASSWORD:?DB_PASSWORD is required in production}` |
| JWT_SECRET 必須チェック | OK | 同上 |
| Stripe キー必須チェック | OK | 2キーとも必須化済み |
| TOKEN_ENCRYPTION_KEY 必須チェック | OK | 必須化済み |
| バックエンドポート非公開 | OK | `ports: []` で Nginx 経由のみ |
| フロントエンドポート非公開 | OK | 同上 |
| DB ポート非公開 | OK | dev用 `docker-compose.yml` でも外部非公開（セキュリティ修正済み） |

## 5. CEOへの確認依頼事項

以下の情報が確定次第、.env の最終版を生成できます:

1. **本番ドメイン名** → `API_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_*`, `SMTP_FROM` に反映
2. **Stripe 本番 API キー** → `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
3. **SMTP サービス情報** → `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
4. **OAuth 各プロバイダーのクライアント ID/Secret** → Google, LINE, X
5. **自動投稿機能の利用可否** → `X_AUTOPOST_*`, `YOUTUBE_*`, `INSTAGRAM_*`
