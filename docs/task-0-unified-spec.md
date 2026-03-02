# タスク 0-1〜0-4 統合サブタスク仕様書

> 作成: Planning (常闇) | 日付: 2026-03-02
> ステータス: Dev/Ops/QAへの委任準備完了

---

## 目次
1. [タスク 0-3: 既存テスト修正 (最優先)](#task-0-3)
2. [タスク 0-2: CI/CD パイプライン構築](#task-0-2)
3. [タスク 0-1: 本番環境構築](#task-0-1)
4. [タスク 0-4: 監視・アラート設定](#task-0-4)
5. [依存関係マップ](#dependencies)
6. [セキュリティベースライン](#security-baseline)

---

<a id="task-0-3"></a>
## 1. タスク 0-3: 既存テスト修正 【QA — 最優先】

### 背景
`auth.service.ts` のセキュリティ修正（bcrypt 10→12, refreshToken追加, buildAuthResponse変更）に対し、テストが追従していない。

### 0-3-1: bcrypt rounds 修正

**ファイル**: `backend/src/auth/auth.service.spec.ts:57`

**現状** (FAIL):
```typescript
expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
```

**修正後**:
```typescript
expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
```

### 0-3-2: レスポンス形状修正

**問題**: `buildAuthResponse()` が以下を返すようになったが、テストが旧形状のまま:

| フィールド | 旧テスト | 実装 (現在) |
|---|---|---|
| `refreshToken` | なし | `string` (generateRefreshToken) |
| `user.emailVerified` | なし | `boolean` (default: false) |
| `user.avatarUrl` | なし | `string\|null` (default: null) |
| `user.subscriptionStatus` | なし | `string` (default: 'free') |

**必要な修正一覧**:

#### a) モック追加 (mockPrisma)
```typescript
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),  // ← 追加
  },
  emailVerificationToken: {
    deleteMany: jest.fn(),  // ← 追加
    create: jest.fn(),       // ← 追加
  },
};
```

#### b) register テストの修正箇所

1. `mockPrisma.refreshToken.create` のモック値設定
2. `sendVerificationEmail` 内の `emailVerificationToken` 操作のモック
3. `nodemailer.createTransport` のモック（メール送信を抑制）
4. 期待値の修正:

```typescript
expect(result).toEqual({
  accessToken: 'mock-jwt-token',
  refreshToken: expect.any(String), // generateRefreshToken の結果
  user: {
    id: 'user-1',
    email: registerDto.email,
    name: registerDto.name,
    username: registerDto.username,
    emailVerified: false,
    avatarUrl: null,
    subscriptionStatus: 'free',
  },
});
```

#### c) login テストの修正箇所

1. `mockPrisma.refreshToken.create` のモック値設定
2. 期待値の修正:

```typescript
expect(result).toEqual({
  accessToken: 'mock-jwt-token',
  refreshToken: expect.any(String),
  user: {
    id: 'user-1',
    email: loginDto.email,
    name: 'Test User',
    username: 'testuser',
    emailVerified: false,
    avatarUrl: null,
    subscriptionStatus: 'free',
  },
});
```

#### d) 追加モック: nodemailer

```typescript
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}));
```

#### e) 追加モック: crypto.randomBytes

`generateRefreshToken` と `sendVerificationEmail` で使用される `randomBytes` のモック:

```typescript
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-random-token'),
  }),
}));
```

### 0-3-3: 全テストケース green 確認

**テスト数内訳**:
- `auth.service.spec.ts`: 5テスト (register×2, login×3)
- `posts.service.spec.ts`: 15テスト (create×2, delete×3, toggleLike×3, toggleRepost×3, toggleBookmark×3, pinPost×2, unpinPost×1) ← 変更不要 ※ただし下記注意

**posts.service.spec.ts 注意点**:
PostsService のコンストラクタ依存関係に変更がなければ修正不要。ただし NotificationsService のモックが現状の実装と一致していることを確認すること。

**実行コマンド**: `cd backend && npm run test`

**完了基準**: 全20テスト PASS

---

<a id="task-0-2"></a>
## 2. タスク 0-2: CI/CD パイプライン構築

### 0-2-1: GitHub Actions ワークフロー

**ファイル**: `.github/workflows/ci.yml` (新規作成)

**トリガー**: `push` on `main`, `pull_request` on `main`

**ジョブ設計**:

```
┌─────────────────────────────────────────────────┐
│  Job 1: test-backend                            │
│  ├─ checkout                                    │
│  ├─ setup node 20                               │
│  ├─ npm ci (backend/)                           │
│  ├─ npx prisma generate                         │
│  ├─ npm run lint                                │
│  ├─ npm run test                                │
│  └─ npm run test:e2e (services: postgres)       │
├─────────────────────────────────────────────────┤
│  Job 2: build-frontend (parallel)               │
│  ├─ checkout                                    │
│  ├─ setup node 20                               │
│  ├─ npm ci (frontend/)                          │
│  └─ npm run build                               │
├─────────────────────────────────────────────────┤
│  Job 3: docker-build (needs: test, build)       │
│  ├─ checkout                                    │
│  ├─ login to GHCR                               │
│  ├─ docker build backend → ghcr.io/…/backend    │
│  └─ docker build frontend → ghcr.io/…/frontend  │
├─────────────────────────────────────────────────┤
│  Job 4: deploy (needs: docker-build, main only) │
│  ├─ SSH into VPS                                │
│  ├─ docker compose pull                         │
│  └─ docker compose up -d                        │
└─────────────────────────────────────────────────┘
```

**必要な GitHub Secrets**:
| Secret名 | 用途 |
|---|---|
| `GHCR_TOKEN` | GitHub Container Registry push (GITHUB_TOKEN でも可) |
| `VPS_HOST` | デプロイ先 IP/ホスト |
| `VPS_SSH_KEY` | SSH秘密鍵 |
| `VPS_USER` | SSH ユーザー名 |

**レジストリ**: GHCR (ghcr.io) を推奨
- 理由: GitHub Actions との統合が最もシンプル、無料枠 500MB

### 0-2-2: Backend テスト (CI内)

**ユニットテスト**: `npm run test` — Jest (0-3 完了後に green)
**E2Eテスト**: `npm run test:e2e` — PostgreSQL service container 使用

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_DB: pokersns_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports: ['5432:5432']
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### 0-2-3: Frontend ビルド確認

```yaml
env:
  NEXT_PUBLIC_API_URL: https://placeholder.example.com/api
  NEXT_PUBLIC_SITE_URL: https://placeholder.example.com
```
`npm run build` の exit code 0 を確認。

### 0-2-4: Docker イメージ自動化

- タグ戦略: `ghcr.io/{owner}/poker-sns-backend:sha-{SHORT_SHA}` + `:latest`
- マルチプラットフォーム: `linux/amd64` のみ (VPS想定)
- キャッシュ: `actions/cache` で Docker layer cache

### 0-2-5: ステージング環境

**ファイル**: `docker-compose.staging.yml` (新規作成)

- `docker-compose.yml` のオーバーライド
- `NODE_ENV=staging`
- 別ポート or 別ドメイン (staging.pokersns.jp)
- 本番DBへの接続は**禁止** — 別のPostgreSQLインスタンス

---

<a id="task-0-1"></a>
## 3. タスク 0-1: 本番環境構築

### 0-1-1: VPS/クラウド選定

**推奨: ConoHa VPS**

| 項目 | ConoHa VPS | AWS Lightsail |
|---|---|---|
| 月額 | ¥1,848 (2GB) / ¥3,608 (4GB) | $24 (4GB) ≈ ¥3,600 |
| メモリ | 2-4GB | 4GB |
| CPU | 3コア (4GBプラン) | 2コア |
| ストレージ | 100GB SSD | 80GB SSD |
| 転送量 | 無制限 | 4TB |
| 日本DC | 東京 | 東京 |
| Docker対応 | VPSイメージで対応 | 要手動インストール |
| 支払い | 日本円・クレカ・銀行 | USD・クレカ |

**推奨構成**: ConoHa VPS 4GBプラン (¥3,608/月)
- PostgreSQL + NestJS + Next.js + nginx を1台で動かすには最低4GB推奨
- 2GBプランでも動作するが、ビルド時にOOMリスクあり

**初期セットアップ手順**:
1. Ubuntu 22.04 LTS イメージ選択
2. SSH鍵認証のみ有効化 (パスワード認証無効)
3. Docker + Docker Compose インストール
4. ファイアウォール: 22(SSH), 80(HTTP), 443(HTTPS) のみ開放
5. swap 2GB 設定 (OOM対策)

### 0-1-2: 本番デプロイ手順

**前提**: docker-compose.prod.yml は既に存在 ✓

**デプロイコマンド**:
```bash
# 1. リポジトリクローン
git clone https://github.com/{owner}/poker_sns.git
cd poker_sns

# 2. 本番 .env 配置
cp .env.example .env
vim .env  # 本番値を設定

# 3. 初回起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. DBマイグレーション
docker compose exec backend npx prisma db push
```

### 0-1-3: SSL証明書

**既存スクリプト**: `setup-ssl.sh` ✓ — Let's Encrypt webroot方式

```bash
./setup-ssl.sh pokersns.jp admin@pokersns.jp
```

**自動更新**: `ssl-renew.sh` をcronに登録
```
0 3 * * * /home/deploy/poker_sns/ssl-renew.sh >> /var/log/ssl-renew.log 2>&1
```

### 0-1-4: ドメイン・DNS

**候補ドメイン**: pokersns.jp or thefelt.jp

**DNS設定**:
```
A    @    → VPS IP
A    www  → VPS IP
A    staging → VPS IP (ステージング用)
```

**ドメイン取得先**: お名前.com, ムームードメイン, Cloudflare Registrar

### 0-1-5: .env 本番用設定

**既存**: `.env.example` ✓ — 全項目網羅済み

**本番固有の注意点**:
- `JWT_SECRET`: 最低64バイトランダム hex
- `DB_PASSWORD`: 最低32文字ランダム
- `TOKEN_ENCRYPTION_KEY`: 32バイトランダム hex
- `CORS_ORIGINS`: `https://pokersns.jp` (カンマ区切りで複数可)
- `FRONTEND_URL`: `https://pokersns.jp`
- `API_URL`: `https://pokersns.jp/api`
- `NEXT_PUBLIC_API_URL`: `https://pokersns.jp/api` (ビルド時注入)
- `NEXT_PUBLIC_SITE_URL`: `https://pokersns.jp` (ビルド時注入)

**機密値管理**:
- `.env` ファイルパーミッション: `chmod 600 .env`
- gitignore 済み ✓
- 将来的に docker secrets への移行を推奨

### 0-1-6: PostgreSQL バックアップ

**バックアップスクリプト**: `scripts/backup-db.sh` (新規作成)

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/home/deploy/backups/postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="pokersns_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# pg_dump via docker
docker compose -f /home/deploy/poker_sns/docker-compose.yml \
  -f /home/deploy/poker_sns/docker-compose.prod.yml \
  exec -T postgres pg_dump -U postgres pokersns | gzip > "${BACKUP_DIR}/${FILENAME}"

# 古いバックアップの削除
find "$BACKUP_DIR" -name "pokersns_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed: ${FILENAME} ($(du -sh "${BACKUP_DIR}/${FILENAME}" | cut -f1))"
```

**cron**:
```
0 4 * * * /home/deploy/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

**S3/GCSへの転送** (Phase 2):
- `aws s3 cp` or `gsutil cp` でオフサイトバックアップ
- 初期はローカルバックアップのみで十分

### 0-1-7: uploads ディレクトリ永続化

**現状**: docker-compose.yml で `uploads` named volume 使用 ✓

```yaml
volumes:
  - uploads:/app/uploads
```

**追加対応**:
- バックアップスクリプトに uploads ディレクトリの rsync を追加
- Phase 2 で S3 + CloudFront への移行を検討

### 0-1-8: ログ出力設定

**現状**: NestJS デフォルトの console ログ

**Phase 1 (最小構成)**:
- Docker のログドライバーで `json-file` + ログローテーション:

```yaml
# docker-compose.prod.yml に追加
services:
  backend:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
  frontend:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

**Phase 2 (構造化ログ)**:
- NestJS に `nestjs-pino` or `winston` 導入
- JSON形式の構造化ログ出力
- Grafana Loki or CloudWatch Logs への転送

---

<a id="task-0-4"></a>
## 4. タスク 0-4: 監視・アラート設定

### 0-4-1: Sentry 導入

**Backend** (`backend/src/main.ts`):
```typescript
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% サンプリング
});
```

**Frontend** (`frontend/src/app/layout.tsx`):
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**必要パッケージ**:
- `@sentry/nestjs` (backend)
- `@sentry/nextjs` (frontend)

**無料プラン**: 5,000イベント/月 — 初期には十分

### 0-4-2: UptimeRobot 設定

| モニター名 | URL | 間隔 | アラート |
|---|---|---|---|
| API Health | `https://pokersns.jp/api/health` | 5分 | Discord + Email |
| Frontend | `https://pokersns.jp` | 5分 | Discord + Email |
| SSL Expiry | `https://pokersns.jp` | 1日 | 30日前警告 |

### 0-4-3: Discord Webhook 連携

**チャンネル構成**:
| チャンネル | 用途 |
|---|---|
| `#alerts` | UptimeRobot ダウン通知、Sentry CRITICAL |
| `#deployments` | CI/CD デプロイ結果通知 |
| `#monitoring` | 日次ヘルスレポート |

**GitHub Actions → Discord**:
```yaml
- name: Discord Notification
  uses: sarisia/actions-status-discord@v1
  if: always()
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
```

### 0-4-4: PostgreSQL 監視

**Phase 1 (スクリプトベース)**:

```bash
#!/bin/bash
# scripts/check-db-health.sh
CONNECTIONS=$(docker compose exec -T postgres psql -U postgres -t -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")

if [ "$CONNECTIONS" -gt 80 ]; then
  curl -X POST "$DISCORD_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"⚠️ PostgreSQL: Active connections = ${CONNECTIONS}\"}"
fi
```

**cron**: `*/5 * * * *` (5分間隔)

**Phase 2**: pg_stat_statements + Grafana ダッシュボード

---

<a id="dependencies"></a>
## 5. 依存関係マップ

```
                    ┌──────────────┐
                    │  0-3 テスト修正 │ ← 最優先 (ブロッカー)
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    ┌─────────────┐ ┌──────────┐ ┌──────────────┐
    │ 0-2 CI/CD   │ │ 0-1 本番  │ │ 0-4 監視     │
    │ パイプライン │ │ 環境構築  │ │ アラート設定  │
    └──────┬──────┘ └─────┬────┘ └──────┬───────┘
           │              │             │
           └──────────────┼─────────────┘
                          ▼
                 ┌────────────────┐
                 │ 完了基準検証    │
                 │ https://ドメイン│
                 │ /api/health=200│
                 └────────────────┘
```

**実行順序**:
1. **0-3** (テスト修正) → CI/CDの前提条件
2. **0-1** と **0-2** は並行可能 (0-2のデプロイジョブは0-1完了待ち)
3. **0-4** は 0-1完了後に設定

---

<a id="security-baseline"></a>
## 6. セキュリティベースライン (DevSecOps)

### VPS ハードニング
- [ ] SSH: 鍵認証のみ、root直接ログイン禁止、ポート変更推奨
- [ ] ファイアウォール (ufw): 22, 80, 443 のみ開放
- [ ] fail2ban インストール (SSH brute force 対策)
- [ ] 自動セキュリティアップデート (`unattended-upgrades`)

### Docker セキュリティ
- [ ] 非root ユーザーで実行 (既に対応済み ✓ — UID 1001)
- [ ] .env パーミッション 600
- [ ] PostgreSQL ポート外部非公開 (既に対応済み ✓)

### CI/CD セキュリティ
- [ ] `npm audit` ステップ追加 (WARNING のみ、CRITICAL で fail)
- [ ] Docker イメージスキャン: `trivy image` ステップ追加
- [ ] Secrets は GitHub Secrets に格納、ログにマスク

### アプリケーション (既に適用済み ✓)
- [x] bcrypt rounds: 12
- [x] Helmet (CSP, HSTS, frameguard)
- [x] nginx セキュリティヘッダー
- [x] Rate limiting (一般/認証/OG)
- [x] Stripe webhook 署名検証

---

## オーナー・担当割り当て

| サブタスク | オーナー | 関連部門 |
|---|---|---|
| 0-3-1〜0-3-3 テスト修正 | Dev (兎田) | QA (雪花) |
| 0-2-1〜0-2-5 CI/CD | Ops (白上/星街) | Dev (兎田) |
| 0-1-1 VPS選定・契約 | Ops (星街) | CEO承認 |
| 0-1-2〜0-1-3 デプロイ・SSL | Ops (白上) | Dev (兎田) |
| 0-1-4 ドメイン | CEO | — |
| 0-1-5 .env本番設定 | Ops (星街) | DevSecOps |
| 0-1-6〜0-1-7 バックアップ・uploads | Ops (白上) | — |
| 0-1-8 ログ設定 | Dev (兎田) | Ops |
| 0-4-1 Sentry | Dev (兎田) | QA |
| 0-4-2〜0-4-3 UptimeRobot・Discord | Ops (白上) | — |
| 0-4-4 DB監視 | Ops (白上) | Dev |
| セキュリティベースライン | DevSecOps | Ops |
