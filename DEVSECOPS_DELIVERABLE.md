# DevSecOps Deliverable — Round 1 Production Release Readiness

**担当**: 角巻 (Senior, DevSecOps)
**日付**: 2026-03-02

---

## 1. 修正済み (CRITICAL FIX — このラウンドで対応)

### 1-1. `frontend/next.config.ts` — `output: "standalone"` 追加
- **重大度**: CRITICAL (ビルドブレイク)
- **問題**: Dockerfile が `.next/standalone` をコピーするが、next.config.ts に `output: "standalone"` がなく、Docker ビルドが100% 失敗する
- **修正**: `output: "standalone"` を追加済み

### 1-2. `deploy.sh` — 本番デプロイスクリプト作成
- **問題**: `nginx-prod.conf` の `DOMAIN_PLACEHOLDER` をデプロイ時に置換する仕組みがなかった
- **修正**: ワンコマンドデプロイスクリプトを作成。以下を自動実行:
  - 必須環境変数の存在チェック (プレースホルダー値の検出含む)
  - `DOMAIN_PLACEHOLDER` の自動置換
  - Docker Compose ビルド & 起動
  - SSL 証明書取得手順のガイド出力

---

## 2. 監査結果サマリ

### Docker構成 (docker-compose.yml + docker-compose.prod.yml)
| 項目 | 状態 | 備考 |
|------|------|------|
| DB healthcheck | OK | `pg_isready` 5s interval |
| Backend healthcheck | OK | `/health` endpoint, PORT=3001 一致 |
| 本番ポート非露出 | OK | backend/frontend `ports: []` |
| nginx SSL/ACME | OK | certbot volumes + 80→443 redirect |
| Resource limits | OK | DB 1G/2CPU, BE 512M/1CPU, FE 512M/1CPU, nginx 256M/0.5CPU |
| 必須env変数 required構文 | OK | DB_PASSWORD, JWT_SECRET, STRIPE_*, TOKEN_ENCRYPTION_KEY |
| uploads volume | OK | ベースファイルで定義済み、prod override で継承 |

### Dockerfile
| 項目 | 状態 | 備考 |
|------|------|------|
| Backend multi-stage build | OK | builder → runner, non-root user (nestjs:1001) |
| Frontend multi-stage build | OK | builder → runner, non-root user (nextjs:1001), standalone output |
| Prisma migration | OK | entrypoint.sh で `prisma migrate deploy` 実行 |
| .dockerignore | OK | node_modules, dist/.next, .env 除外 |
| Build args (NEXT_PUBLIC_*) | OK | ビルド時埋め込み |

### nginx-prod.conf
| 項目 | 状態 | 備考 |
|------|------|------|
| HTTPS redirect | OK | 80→443 301 |
| SSL設定 | OK | TLS 1.2/1.3, modern cipher suite |
| セキュリティヘッダ | OK | HSTS (preload), X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| Rate limiting | OK | auth 5r/s, API 30r/s, OG crawl 10r/s, LP 20r/s |
| SSE proxy | OK | buffering off, cache off |
| OG image cache | OK | 24h cache, 500MB max |
| Let's Encrypt ACME | OK | /.well-known/acme-challenge/ |

### セキュリティ (既存修正確認)
| 項目 | 状態 |
|------|------|
| bcrypt rounds 12 | OK (適用済み) |
| JWT query param除去 | OK (適用済み) |
| OAuth session方式 | OK (適用済み) |
| Helmet CSP/HSTS | OK (適用済み) |
| Stripe webhook署名検証 | OK (適用済み) |
| DB port外部非公開 | OK (適用済み) |
| server_tokens off | OK (nginx-prod.conf) |

---

## 3. CEO判断が必要なブロッカー

### BLOCKER-1: 本番インフラ未確定 (最大ブロッカー)
- **必要なもの**:
  - VPS/クラウドサーバー (推奨: 2vCPU / 4GB RAM / 40GB SSD 以上)
  - ドメイン名の取得・DNS設定
  - SSL証明書 (Let's Encrypt で自動取得可能、ドメイン確定後)
- **CEO判断項目**: サーバープロバイダ選定 (ConoHa VPS / AWS Lightsail / さくらVPS 等)、ドメイン名決定
- **対応予定時間**: インフラ情報確定後、deploy.sh で30分以内にデプロイ可能

### BLOCKER-2: 外部サービスの本番キー未設定
- **必須 (リリース必須)**:
  - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` — 本番Stripeキー
  - `JWT_SECRET` — 本番用ランダム値 (64バイトhex)
  - `DB_PASSWORD` — 強力なパスワード
  - `TOKEN_ENCRYPTION_KEY` — 32バイトランダムhex
- **推奨 (後からでも可)**:
  - SMTP (メール認証: Resend推奨)
  - OAuth (Google/LINE/X)
  - Google Analytics

---

## 4. MEDIUM/LOW 警告 (コード修正不要)

| 重大度 | 項目 | 詳細 |
|--------|------|------|
| MEDIUM | STRIPE_PRICE_ID 未required | prod overrideで `?required` マークなし。サブスク機能には必須だが、後から設定可 |
| MEDIUM | GA_MEASUREMENT_ID 未定義 | docker-compose にビルドarg未定義。アナリティクスは後から追加可 |
| LOW | certbot auto-renew | sleep 12h ループ方式。本番ではcron推奨だが初期は問題なし |
| LOW | uploads永続化 | Docker named volume。バックアップ戦略は運用開始後に検討 |

---

## 5. デプロイ手順 (インフラ確定後)

```bash
# 1. サーバーにリポジトリをクローン
git clone <repo> && cd poker_sns

# 2. 環境変数を設定
cp .env.example .env
# .env を本番値で埋める

# 3. デプロイ実行
DOMAIN=yourdomain.com ./deploy.sh

# 4. SSL証明書取得
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d yourdomain.com \
  --email admin@yourdomain.com --agree-tos

# 5. nginx再読み込み
docker compose exec nginx nginx -s reload

# 6. 動作確認
curl -I https://yourdomain.com/api/health
```

---

## 6. 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `frontend/next.config.ts` | `output: "standalone"` 追加 (CRITICAL FIX) |
| `deploy.sh` (新規) | 本番デプロイスクリプト |
