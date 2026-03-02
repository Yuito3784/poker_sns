# 本番環境セキュリティベースライン定義書

## 1. サーバーアクセス制御

### SSH
- 鍵認証のみ (パスワード認証無効化)
- `PermitRootLogin no` (直接rootログイン禁止)
- port 22 のみ UFW allow (カスタムポート変更推奨)
- fail2ban 導入推奨 (SSH brute-force 防止)

### ファイアウォール (UFW)
```
Default: deny incoming, allow outgoing
Allow: 22/tcp (SSH), 80/tcp (HTTP), 443/tcp (HTTPS)
Deny: all other
```

### Docker ネットワーク
- PostgreSQL (5432): Docker 内部ネットワークのみ (外部非公開)
- Backend (3001): Docker 内部のみ (nginx 経由)
- Frontend (3000): Docker 内部のみ (nginx 経由)

## 2. 機密値管理

### .env ファイル
- パーミッション: `chmod 600 .env`
- `.gitignore` に含まれていること
- 本番値は GitHub Secrets に保存
- 生成方法ドキュメント化済み (`.env.example` 参照)

### 必須シークレット生成コマンド
```bash
# JWT_SECRET (64バイト)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# TOKEN_ENCRYPTION_KEY (32バイト)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# DB_PASSWORD
openssl rand -base64 32
```

## 3. アプリケーションセキュリティ (実装済み)

| 項目 | 状態 | 詳細 |
|------|------|------|
| bcrypt rounds | 12 | auth.service.ts (3箇所) |
| JWT query param | 削除済み | jwt.strategy.ts |
| OAuth session | サーバーサイド方式 | in-memory Map, 5分TTL |
| Helmet | 有効 | CSP, HSTS, frameguard, noSniff |
| Rate limiting | 有効 | auth: 5r/s, api: 30r/s, og_crawl: 10r/s |
| CORS | 設定済み | CORS_ORIGINS 環境変数で制御 |
| Stripe webhook | 署名検証 | 失敗時 400 返却 |
| Email throttle | 有効 | verify-email に @Throttle |

## 4. CI/CD パイプラインセキュリティ

### 脆弱性スキャン (推奨追加ステップ)
```yaml
# .github/workflows/ci-cd.yml に追加推奨
- name: npm audit (backend)
  run: npm audit --audit-level=high
  working-directory: backend

- name: npm audit (frontend)
  run: npm audit --audit-level=high
  working-directory: frontend
```

### Docker イメージ
- ベースイメージ: `node:20-alpine` (最小攻撃面)
- 非root ユーザーで実行 (nestjs:1001, nextjs:1001)
- multi-stage build (ビルドツール不含)
- `npm ci --omit=dev` (本番依存のみ)

## 5. nginx セキュリティ (実装済み)

- `server_tokens off` — バージョン非表示
- TLS 1.2+ のみ
- HSTS: max-age 2年, includeSubDomains, preload
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- client_max_body_size: 10MB

## 6. データベースセキュリティ

- PostgreSQL 16-alpine (最新 LTS)
- 外部ポート非公開 (Docker internal only)
- `POSTGRES_PASSWORD` 必須 (本番では空文字不可)
- 日次バックアップ + 暗号化推奨 (gpg)
- 接続は Docker 内部ネットワーク経由のみ

## 7. 監視 / インシデント対応

- UptimeRobot: 外部からの可用性監視 (5分間隔)
- 内部ヘルスチェック: `scripts/health-check.sh` (5分間隔)
- Discord webhook: 状態変化時に即座通知
- Sentry (推奨): エラートラッキング導入
  - Backend: `@sentry/nestjs` パッケージ
  - Frontend: `@sentry/nextjs` パッケージ
  - 無料プラン: 5K errors/月

## 8. 未対応 / 今後の対応項目

| 項目 | 優先度 | 備考 |
|------|--------|------|
| fail2ban | HIGH | SSH brute-force 防止 |
| Docker secrets | MEDIUM | .env → Docker secrets 移行 |
| バックアップ暗号化 | MEDIUM | gpg で暗号化後 S3 アップロード |
| Trivy (Docker scan) | MEDIUM | CI/CD に追加 |
| WAF | LOW | CloudFlare 無料プランで代替可 |
