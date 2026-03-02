# DevSecOps Merge Verification Report

**Date**: 2026-03-02
**Author**: DevSecOps (角巻)
**Scope**: メインマージ状況確認 + インフラ/セキュリティ検証

---

## 1. CI/CD Fix Commit (78ec569) マージ状況

### 結論: mainブランチには未マージ

| 項目 | 状態 |
|------|------|
| main HEAD | `879440e` (Add Operations Round 1 deliverable) |
| CI/CD Fix (78ec569) | ブランチ `climpire/8ee6da76` にのみ存在 |
| main上のCI/CD yml | `IMAGE_PREFIX: ${{ github.repository }}` (lowercase変換なし) |

### 詳細

`git branch -a --contains 78ec569` の結果、このコミットは `climpire/8ee6da76` にのみ存在し、mainブランチ履歴には含まれていない。

mainブランチの全コミット履歴:
```
879440e Add Operations Round 1 deliverable and CEO decision sheet
0d0cd1c Fix staging image registry and prod nginx config path
5e9d74a Initial commit: Poker SNS full-stack application
```

### CRITICAL: GHCR Lowercase Issue

現在のmain上の `.github/workflows/ci-cd.yml` では:
```yaml
env:
  IMAGE_PREFIX: ${{ github.repository }}
```

`github.repository` はリポジトリ名のケースを保持するため、GHCRがlowercaseを要求する場合にdocker-buildジョブが失敗する可能性がある。staging用 `docker-compose.staging.yml` では `ghcr.io/yuito3784/poker_sns/backend:latest` とlowercaseがハードコードされており、CIで生成されるタグとの不整合が発生しうる。

**対応推奨**: 78ec569のマージ、または以下の修正をmainに適用:
```yaml
env:
  IMAGE_PREFIX: ${{ github.repository | lower }}
```

---

## 2. Docker Compose 構成検証

### 2.1 Base (`docker-compose.yml`)

| チェック項目 | 状態 | 備考 |
|-------------|------|------|
| PostgreSQL 16-alpine + healthcheck | OK | `pg_isready` 5s interval |
| Backend healthcheck | OK | `wget /health` 15s interval, 30s start_period |
| Backend ポート公開 | WARNING | `3001:3001` が直接公開 (prodオーバーライドで無効化) |
| Frontend ポート公開 | WARNING | `3000:3000` が直接公開 (prodオーバーライドで無効化) |
| nginx certbot連携 | OK | ACME challenge対応済み |
| DB外部ポート | OK | 5432非公開 (セキュリティ修正済み) |

### 2.2 Staging (`docker-compose.staging.yml`)

| チェック項目 | 状態 | 備考 |
|-------------|------|------|
| GHCRイメージ参照 | OK | `ghcr.io/yuito3784/poker_sns/{backend,frontend}:latest` |
| ポート分離 (8080/8443) | OK | 本番と併存可 |
| 必須env変数チェック | OK | `DB_PASSWORD`, `JWT_SECRET` に `:?` バリデーション |
| Backend直接ポート | OK | `ports: []` で無効化 |
| ボリューム名分離 | OK | `staging_` プレフィックス |
| TOKEN_ENCRYPTION_KEY | OK | 環境変数として定義済み |

### 2.3 Production (`docker-compose.prod.yml`)

| チェック項目 | 状態 | 備考 |
|-------------|------|------|
| Backend/Frontend直接ポート | OK | `ports: []` で無効化、Nginx経由のみ |
| リソース制限 | OK | DB:1G/2CPU, Backend:512M/1CPU, Frontend:512M/1CPU, Nginx:256M/0.5CPU |
| 必須env変数 | OK | 全5項目に `:?` バリデーション |
| nginx-prod.conf マウント | OK | `./nginx-prod.conf:/etc/nginx/conf.d/default.conf:ro` |
| SSL証明書マウント | OK | certbot-conf, certbot-www |

---

## 3. セキュリティヘッダー検証

### 3.1 Helmet (backend/src/main.ts)

| ヘッダー | 設定値 | 状態 |
|---------|--------|------|
| CSP default-src | `'self'` | OK |
| CSP script-src | `'self'` | OK |
| CSP style-src | `'self'`, `'unsafe-inline'` | OK (CSS-in-JS対応) |
| CSP img-src | `'self'`, `data:`, `https:` | OK |
| CSP object-src | `'none'` | OK |
| CSP frame-src | `'none'` | OK |
| HSTS | max-age=63072000, includeSubDomains, preload | OK |
| X-Frame-Options | DENY | OK |
| X-Content-Type-Options | nosniff | OK |
| XSS-Filter | enabled | OK |
| Cross-Origin-Resource-Policy | cross-origin | OK (画像配信対応) |

### 3.2 nginx-prod.conf

| ヘッダー | 設定値 | 状態 |
|---------|--------|------|
| server_tokens | off | OK |
| HSTS | max-age=63072000; includeSubDomains; preload (always) | OK |
| X-Content-Type-Options | nosniff (always) | OK |
| X-Frame-Options | DENY (always) | OK |
| Referrer-Policy | strict-origin-when-cross-origin (always) | OK |
| SSL Protocols | TLSv1.2, TLSv1.3 | OK |
| SSL Ciphers | ECDHE-ECDSA/RSA-AES128/256-GCM-SHA256/384 | OK |
| SSL Session | cache=10m, timeout=1d, tickets=off | OK |

### 3.3 Rate Limiting (nginx-prod.conf)

| ゾーン | レート | バースト | 対象 |
|--------|--------|---------|------|
| api_general | 30r/s | 20 | 一般APIエンドポイント |
| api_auth | 5r/s | 10 | 認証エンドポイント |
| og_crawl | 10r/s | 30 | OGメタ取得 |
| lp_page | 20r/s | 40 | ランディングページ |

### 3.4 nginx.conf (dev環境) vs nginx-prod.conf 差分

| 項目 | dev (nginx.conf) | prod (nginx-prod.conf) |
|------|------------------|----------------------|
| HTTPS/SSL | なし | あり (TLS 1.2/1.3) |
| セキュリティヘッダー | なし | 4種 (HSTS, X-Content-Type, X-Frame, Referrer) |
| server_tokens | 未設定 | off |
| Auth rate limit | なし | api_auth 5r/s |
| OG cache | なし | proxy_cache 24h |
| HTTP/2 | なし | あり |

---

## 4. Dockerfile 検証

### Backend Dockerfile

| チェック項目 | 状態 | 備考 |
|-------------|------|------|
| マルチステージビルド | OK | builder → runner |
| 非root実行 | OK | `nestjs:1001` ユーザー |
| devDependencies除外 | OK | `npm ci --omit=dev` |
| Prisma Client | OK | `.prisma` + `@prisma` + `prisma/` コピー |
| entrypoint | OK | `prisma migrate deploy` → `node dist/src/main.js` |

### Frontend Dockerfile

| チェック項目 | 状態 | 備考 |
|-------------|------|------|
| マルチステージビルド | OK | builder → runner |
| 非root実行 | OK | `nextjs:1001` ユーザー |
| Standalone出力 | OK | `.next/standalone` + `.next/static` + `public` |
| Build-time環境変数 | OK | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` |

---

## 5. CI/CD パイプライン検証

### ワークフロー構成 (`.github/workflows/ci-cd.yml`)

| ジョブ | トリガー | 依存 | 状態 |
|--------|---------|------|------|
| backend-test | push/PR to main | なし | OK |
| frontend-build | push/PR to main | なし | OK |
| docker-build | main push only | backend-test, frontend-build | WARN (lowercase issue) |
| deploy | main push only | docker-build | OK |

### デプロイフロー

```
main push → backend-test + frontend-build (並列)
  → docker-build (GHCR push)
    → deploy (SSH → docker compose pull + up)
      → health check (5回リトライ, 10s間隔)
        → Discord通知 (成功/失敗)
```

**ロールバック手順** (現行):
```bash
# サーバーSSH接続後
cd /opt/poker_sns
# 前バージョンのイメージを指定してロールバック
BACKEND_IMAGE=ghcr.io/yuito3784/poker_sns/backend:<previous-sha> \
FRONTEND_IMAGE=ghcr.io/yuito3784/poker_sns/frontend:<previous-sha> \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

---

## 6. 発見事項サマリー

### CRITICAL (即時対応)

1. **CI/CD GHCR Lowercase Fix 未マージ**: 78ec569がmainに未到達。docker-buildジョブがケース不整合で失敗するリスクあり。

### MEDIUM (警告のみ)

2. **dev環境nginx.confにセキュリティヘッダーなし**: 開発環境のため許容だが、ステージング利用時は注意。
3. **entrypoint.shで`prisma migrate deploy`使用**: mainではmigrationファイルが必要。`prisma db push`との使い分けを確認要。

### LOW (情報)

4. **dev環境で backend:3001/frontend:3000 ポート直接公開**: prodではnginx経由に制限済み。
5. **OG画像キャッシュロケーション** (`/var/cache/nginx/og_images`): 永続ボリュームではないため、コンテナ再起動でクリアされる (意図通り)。

---

## 7. 推奨アクション

| 優先度 | アクション | 担当 |
|--------|-----------|------|
| P0 | 78ec569 (GHCR lowercase fix) をmainにマージ | Dev/DevSecOps |
| P1 | マージ後にGitHub Actions実行を確認、docker-buildジョブの成功を検証 | DevSecOps |
| P1 | ステージング環境でのコンテナ起動テスト | DevSecOps |
| P2 | entrypoint.sh の `prisma migrate deploy` と開発時 `prisma db push` の運用手順書作成 | Dev/DevSecOps |
