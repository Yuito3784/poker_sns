# DevSecOps リリース準備成果物
**作成日:** 2026-03-02
**作成者:** DevSecOps 角巻
**対象:** poker_sns 本番デプロイ前セキュリティ・インフラ整備

---

## 概要

CEOからのリリース状況確認に対し、DevSecOps観点で本番デプロイ前に必要な3項目を検証・整理した。コードベースのセキュリティ実装は完了済みであり、残作業はインフラ側の設定・運用手順の確定が中心。

---

## 1. 本番用 .env 秘密情報管理方針

### 1-1. 現状評価: OK

| 項目 | 状態 | 根拠 |
|------|------|------|
| `.env` が `.gitignore` に含まれている | OK | `.env`, `.env.local`, `.env*.local` すべて除外 |
| `.env` が git 履歴に含まれていない | OK | `git log --all --diff-filter=A` で確認済み |
| `.env.example` にシークレット値が含まれていない | OK | プレースホルダーのみ |
| `docker-compose.prod.yml` で必須変数を強制 | OK | `${VAR:?error}` 構文で未設定時起動失敗 |

### 1-2. 必須環境変数一覧と生成方法

| 変数 | 生成方法 | 注意事項 |
|------|----------|----------|
| `DB_PASSWORD` | 20文字以上のランダム文字列 | `openssl rand -base64 24` |
| `JWT_SECRET` | 64バイトランダムhex | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `TOKEN_ENCRYPTION_KEY` | 32バイトランダムhex | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `STRIPE_SECRET_KEY` | Stripe本番ダッシュボード | `sk_live_` プレフィックス確認 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook設定画面 | `whsec_` プレフィックス確認 |
| `STRIPE_PRICE_ID` | Stripe Products画面 | `price_` プレフィックス確認 |
| `SMTP_PASS` | メールサービスAPIキー | Resend推奨 (`re_` プレフィックス) |

### 1-3. 本番サーバーでの管理方針

```
推奨方式: ファイルベース .env + ファイルパーミッション制限
```

| 手順 | コマンド |
|------|---------|
| .env 作成 | `cp .env.example .env && chmod 600 .env` |
| 所有者制限 | `chown root:root .env` (root以外読み取り不可) |
| 確認 | `ls -la .env` → `-rw-------` であること |

> **将来的改善:** Docker Secrets または HashiCorp Vault への移行をスケールアウト時に検討。MVP段階ではファイルベースで十分。

---

## 2. SSL証明書の本番設定検証計画

### 2-1. 既存スクリプト評価: OK

| コンポーネント | 状態 | 詳細 |
|---------------|------|------|
| `setup-ssl.sh` | OK | Let's Encrypt webroot方式、ドメイン引数で自動設定 |
| `ssl-renew.sh` | OK | certbot renew + nginx reload、ログ出力付き |
| `nginx-prod.conf` TLS設定 | OK | TLS 1.2/1.3、ECDHE暗号、セッションチケット無効 |
| HSTS | OK | max-age=63072000, includeSubDomains, preload |
| HTTP→HTTPS redirect | OK | port 80 → 301 redirect |

### 2-2. デプロイ時SSL設定手順

```bash
# 1. ドメイン・メールを指定してSSL取得
./setup-ssl.sh yourdomain.com admin@yourdomain.com

# 2. 証明書取得確認
docker compose exec certbot certbot certificates

# 3. SSL自動更新cron登録
echo "0 3 * * * $(pwd)/ssl-renew.sh >> /var/log/ssl-renew.log 2>&1" | crontab -

# 4. 更新テスト (dry-run)
docker compose exec certbot certbot renew --dry-run
```

### 2-3. デプロイ後SSL検証チェックリスト

| # | 検証項目 | 方法 | 期待値 |
|---|----------|------|--------|
| 1 | 証明書有効期限 | `echo | openssl s_client -connect domain:443 2>/dev/null | openssl x509 -dates` | 90日以内 |
| 2 | TLSバージョン | `nmap --script ssl-enum-ciphers -p 443 domain` | TLS 1.2 + 1.3 のみ |
| 3 | HSTS ヘッダー | `curl -sI https://domain | grep strict` | max-age=63072000 |
| 4 | HTTP→HTTPS | `curl -sI http://domain` | 301 → https:// |
| 5 | SSL Labs評価 | https://www.ssllabs.com/ssltest/ | A+ |

---

## 3. セキュリティヘッダー本番検証計画

### 3-1. 二重防御構成 (Helmet + nginx)

| ヘッダー | Helmet (backend) | nginx-prod.conf | 状態 |
|----------|-----------------|-----------------|------|
| Content-Security-Policy | `default-src 'self'` + 詳細設定 | (Helmetに委任) | OK |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | `max-age=63072000; includeSubDomains; preload` | OK (二重) |
| X-Content-Type-Options | `nosniff` | `nosniff` | OK (二重) |
| X-Frame-Options | `DENY` | `DENY` | OK (二重) |
| Referrer-Policy | (Helmet default) | `strict-origin-when-cross-origin` | OK |
| X-XSS-Filter | `1; mode=block` | (Helmetに委任) | OK |

### 3-2. デプロイ後ヘッダー検証コマンド

```bash
# API エンドポイント
curl -sI https://yourdomain.com/api/health | grep -iE \
  "strict-transport|x-content-type|x-frame|content-security|referrer-policy"

# フロントエンド
curl -sI https://yourdomain.com/ | grep -iE \
  "strict-transport|x-content-type|x-frame|referrer-policy"

# 期待出力:
# strict-transport-security: max-age=63072000; includeSubDomains; preload
# x-content-type-options: nosniff
# x-frame-options: DENY
# referrer-policy: strict-origin-when-cross-origin
```

### 3-3. 外部スキャンツール推奨

| ツール | URL | 用途 |
|--------|-----|------|
| SecurityHeaders.com | https://securityheaders.com/ | ヘッダー総合評価 (A+目標) |
| Mozilla Observatory | https://observatory.mozilla.org/ | セキュリティベストプラクティス |
| SSL Labs | https://www.ssllabs.com/ssltest/ | TLS構成評価 |

---

## 4. 依存パッケージセキュリティ監査

### 4-1. npm audit 結果 (2026-03-02)

**Backend (18 vulnerabilities):**

| 深刻度 | 件数 | 主要パッケージ | 対応方針 |
|--------|------|---------------|----------|
| HIGH | 12 | `serialize-javascript` (RCE via RegExp) → webpack依存チェーン | `npm audit fix` で対応可能な範囲で修正。webpack依存はdev-only、本番ランタイムに影響なし |
| MODERATE | 5 | 各種間接依存 | `npm audit fix` |
| LOW | 1 | 軽微 | 対応不要 |

> **注:** HIGH の `serialize-javascript` 脆弱性は `@nestjs/cli` → `webpack` → `terser-webpack-plugin` の devDependency チェーン。本番 Docker イメージでは `npm ci --omit=dev` により除外されるためランタイムリスクなし。

**Frontend (3 vulnerabilities):**

| 深刻度 | 件数 | パッケージ | 対応方針 |
|--------|------|-----------|----------|
| HIGH | 2 | `next` (DoS via Image Optimizer, PPR endpoint) | `npm audit fix --force` で next@16.1.6 へ更新推奨 |
| MODERATE | 1 | `minimatch` (ReDoS) | eslint devDependency、本番影響なし |

### 4-2. 推奨アクション

```bash
# Backend: 安全な自動修正
cd backend && npm audit fix

# Frontend: Next.js 更新 (breaking change注意)
cd frontend && npm audit fix --force
# → next@16.1.6 への更新。ビルド確認必須
```

---

## 5. 6領域サブタスク整理 (Planning補完計画への入力)

Planningが整理した6領域のうち、DevSecOps担当・関連のサブタスクを以下に分解:

| 領域 | DevSecOps担当サブタスク | 依存関係 | 状態 |
|------|----------------------|----------|------|
| (1) サーバー・ドメイン・DNS確保 | サーバーSSHアクセスキー管理方針策定 | CEO承認待ち | BLOCKED |
| (2) 本番用.env・秘密情報管理 | .env生成手順書 + パーミッション設定 | なし | **本成果物で完了** |
| (3) SSL設定・自動更新 | SSL取得・検証・cron設定手順 | サーバー確保後 | **手順書完了、実行待ち** |
| (4) セキュリティヘッダ検証 | ヘッダー検証コマンド + 外部スキャン計画 | デプロイ後 | **検証計画完了** |
| (5) OGP・ブランドアセット確認 | (Design担当、DevSecOps関与なし) | — | N/A |
| (6) モニタリング・バックアップ | ログドライバー設定 (`max-size`/`max-file`) | サーバー確保後 | 手順書参照 |

---

## 6. デプロイ実行時セキュリティゲート

サーバー確保後、デプロイ実行前に以下を順序通り実施:

```
[Gate 1] .env 準備
  □ 全必須変数の本番値設定
  □ ファイルパーミッション 600 確認
  □ Stripe本番キー (sk_live_) 設定

[Gate 2] SSL 取得
  □ setup-ssl.sh 実行成功
  □ 証明書有効期限確認
  □ ssl-renew.sh cron登録

[Gate 3] ビルド・起動
  □ docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  □ 全コンテナ healthy 確認
  □ /api/health 200応答確認

[Gate 4] セキュリティ検証
  □ HTTPS強制リダイレクト確認
  □ セキュリティヘッダー全項目確認
  □ SecurityHeaders.com A+ 取得
  □ SSL Labs A+ 取得

[Gate 5] 機能スモークテスト (QAチーム連携)
  □ 認証フロー (登録・ログイン・OAuth)
  □ 投稿・画像アップロード
  □ Stripe決済フロー
  □ 通知・SSE ストリーム
```

---

## 7. MEDIUM/LOW 警告事項 (コード修正なし)

| # | 項目 | 重要度 | 推奨対応時期 |
|---|------|--------|-------------|
| W1 | CSP を nginx 側でも二重設定 | MEDIUM | リリース後 Sprint 2 |
| W2 | `.dockerignore` 追加でビルドコンテキスト最適化 | LOW | リリース後 |
| W3 | Docker ログドライバー `max-size: 10m` / `max-file: 3` 設定 | MEDIUM | サーバー確保時 |
| W4 | DB バックアップ cron (`pg_dump`) 設定 | MEDIUM | リリース後 1週間以内 |
| W5 | Frontend Next.js 16.1.6 更新 (DoS脆弱性修正) | HIGH | リリース前推奨 |
| W6 | OAuth セッションの Redis 移行 | MEDIUM | スケールアウト時 |

---

## クロスチーム依存

| 依存先 | 内容 | 優先度 |
|--------|------|--------|
| CEO / Planning | サーバー・ドメイン確保の承認 | BLOCKER |
| QA/QC (雪花) | Gate 4-5 のセキュリティ・スモークテスト実施 | Gate 3 完了後 |
| Operations (白上) | ssl-renew.sh cron登録、ログドライバー設定 | サーバー確保後 |
| Development (兎田) | Frontend npm audit fix --force 後のビルド確認 | リリース前 |

---

**結論:** コードベースのセキュリティ実装は十分な水準にある。最優先ブロッカーは「サーバー・ドメイン確保」であり、CEO承認後は上記ゲートを順序通り実行することで安全にリリース可能。
