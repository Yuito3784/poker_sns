# ステージング環境デプロイ手順書 + ロールバック手順

**作成日:** 2026-03-02
**作成者:** DevSecOps 角巻
**背景:** コミット 0d0cd1c でステージング用イメージレジストリ設定と本番 nginx 設定パスが修正された直後であり、Phase5 差分が加わった状態でビルド→デプロイが通るかを事前検証するための手順書。

---

## 1. ステージング環境の構成概要

```
docker-compose.yml (ベース) + docker-compose.staging.yml (オーバーライド)
```

| コンポーネント | ステージング設定 | 本番との差異 |
|---------------|-----------------|-------------|
| **ポート** | 8080 (HTTP) / 8443 (HTTPS) | 本番: 80/443 |
| **バックエンドイメージ** | `ghcr.io/yuito3784/poker_sns/backend:latest` | 本番: ローカルビルド |
| **フロントエンドイメージ** | `ghcr.io/yuito3784/poker_sns/frontend:latest` | 本番: ローカルビルド |
| **NODE_ENV** | `staging` | 本番: `production` |
| **ボリューム** | `staging_pgdata`, `staging_uploads` | 本番と分離 |
| **nginx** | ベースの `nginx.conf` を使用 | 本番: `nginx-prod.conf` |

---

## 2. ドライラン手順 (Phase5 マージ後)

### 2.1 前提条件

- Docker / Docker Compose がインストール済み
- Phase5 の差分が main にマージ済み
- `.env` ファイルが設定済み (下記の最小セット)

```bash
# ステージング最小 .env
DB_PASSWORD=staging_password_change_me
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
STRIPE_SECRET_KEY=sk_test_xxx      # テストモード
STRIPE_WEBHOOK_SECRET=whsec_xxx    # テストモード
TOKEN_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_SITE_URL=http://localhost:8080
```

### 2.2 ステップ1: コード取得・環境確認

```bash
# 作業ディレクトリへ移動
cd /opt/poker-sns   # またはプロジェクトルート

# Phase5 マージ済みの最新コードを取得
git fetch origin main
git checkout main
git pull origin main

# 環境変数差分の確認 (新しい変数がないか)
diff <(grep -oP '^[A-Z_]+=' .env 2>/dev/null | sort) \
     <(grep -oP '^[A-Z_]+=' .env.example | sort) || true

# Docker の状態確認
docker compose version
docker system df
```

### 2.3 ステップ2: イメージビルド (ローカルビルドでの検証)

Phase5 の差分を含む状態でビルドが通るかを確認する。ステージング compose はプリビルドイメージ (`ghcr.io`) を想定しているが、ドライランではローカルビルドで検証する。

```bash
# バックエンド単体ビルド
docker build -t poker-sns-backend:staging-dryrun ./backend
echo "Backend build: exit code $?"

# フロントエンド単体ビルド
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080/api \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:8080 \
  -t poker-sns-frontend:staging-dryrun ./frontend
echo "Frontend build: exit code $?"
```

> **判定基準:** 両方 exit code 0 であること。ビルドエラーが出た場合は Phase5 差分の修正が必要。

### 2.4 ステップ3: ステージング起動

```bash
# ローカルビルドイメージを指定して起動
BACKEND_IMAGE=poker-sns-backend:staging-dryrun \
FRONTEND_IMAGE=poker-sns-frontend:staging-dryrun \
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# コンテナ起動状態を確認 (全サービスが Up であること)
docker compose -f docker-compose.yml -f docker-compose.staging.yml ps

# 起動ログ確認 (エラーがないこと)
docker compose -f docker-compose.yml -f docker-compose.staging.yml logs --tail=30
```

### 2.5 ステップ4: 疎通確認

```bash
# ---- ヘルスチェック ----
# バックエンド直接 (コンテナ内部)
docker compose -f docker-compose.yml -f docker-compose.staging.yml \
  exec backend wget -qO- http://localhost:3001/health

# nginx 経由 (ポート 8080)
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/api/health
# 期待: HTTP 200

# フロントエンド表示
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/
# 期待: HTTP 200

# LP ページ
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/lp
# 期待: HTTP 200

# ---- DB 接続確認 ----
docker compose -f docker-compose.yml -f docker-compose.staging.yml \
  exec db pg_isready -U postgres
# 期待: accepting connections

# ---- Prisma マイグレーション状態 ----
docker compose -f docker-compose.yml -f docker-compose.staging.yml \
  exec backend npx prisma migrate status
```

### 2.6 ステップ5: 機能スモークテスト

```bash
BASE_URL="http://localhost:8080"

# 1. ユーザー登録
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"stg_test","email":"stg@test.local","password":"Test1234!"}' \
  | head -c 200
echo ""

# 2. ログイン → トークン取得
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"stg@test.local","password":"Test1234!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token acquired: $([ -n "$TOKEN" ] && echo 'YES' || echo 'NO')"

# 3. 認証付きエンドポイント
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/users/me"
# 期待: HTTP 200

# 4. 投稿作成
curl -s -X POST "$BASE_URL/api/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Staging dry-run test post"}' \
  -o /dev/null -w "HTTP %{http_code}\n"
# 期待: HTTP 201
```

### 2.7 ステップ6: ドライラン結果記録

以下のテーブルに結果を記入し、エビデンスとして保存する。

| # | 検証項目 | 期待値 | 結果 | 備考 |
|---|---------|--------|------|------|
| 1 | Backend Docker ビルド | exit 0 | | |
| 2 | Frontend Docker ビルド | exit 0 | | |
| 3 | 全コンテナ起動 (db, backend, frontend, nginx) | Up | | |
| 4 | Backend healthcheck | HTTP 200 | | |
| 5 | Frontend 表示 | HTTP 200 | | |
| 6 | LP ページ表示 | HTTP 200 | | |
| 7 | DB 接続 | accepting connections | | |
| 8 | ユーザー登録 | 成功 | | |
| 9 | ログイン・トークン取得 | 成功 | | |
| 10 | 認証付き API | HTTP 200 | | |
| 11 | 投稿作成 | HTTP 201 | | |

---

## 3. ロールバック手順

### 3.1 即時ロールバック (コンテナレベル)

デプロイ後に障害が発生した場合、前バージョンのイメージに即座に戻す。

```bash
# ---- 前提: デプロイ前のイメージタグを記録しておく ----
# デプロイ前に実行:
docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | grep poker-sns > /tmp/pre-deploy-images.txt

# ---- ロールバック実行 ----
# 1. 障害コンテナを停止
docker compose -f docker-compose.yml -f docker-compose.staging.yml stop backend frontend

# 2. 前バージョンのイメージで再起動
BACKEND_IMAGE=<前バージョンのイメージ:タグ> \
FRONTEND_IMAGE=<前バージョンのイメージ:タグ> \
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d backend frontend

# 3. ヘルスチェック
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/api/health
```

### 3.2 コードロールバック (git revert)

```bash
# 1. 直前のコミットを確認
git log --oneline -5

# 2. 安全な revert (履歴を保持)
git revert HEAD --no-edit

# 3. 再ビルド・再デプロイ
docker build -t poker-sns-backend:rollback ./backend
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080/api \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:8080 \
  -t poker-sns-frontend:rollback ./frontend

BACKEND_IMAGE=poker-sns-backend:rollback \
FRONTEND_IMAGE=poker-sns-frontend:rollback \
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d backend frontend
```

### 3.3 DB ロールバック (スキーマ変更を伴う場合)

```bash
# 1. デプロイ前のバックアップからリストア
docker compose -f docker-compose.yml -f docker-compose.staging.yml \
  exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS poker_sns;"
docker compose -f docker-compose.yml -f docker-compose.staging.yml \
  exec -T db psql -U postgres -c "CREATE DATABASE poker_sns;"

cat /path/to/pre-deploy-backup.sql | \
  docker compose -f docker-compose.yml -f docker-compose.staging.yml \
  exec -T db psql -U postgres poker_sns

# 2. DB スキーマを前バージョンに合わせて再適用
docker compose -f docker-compose.yml -f docker-compose.staging.yml \
  exec backend npx prisma db push --accept-data-loss
```

### 3.4 完全クリーンアップ (ステージング環境リセット)

```bash
# 全コンテナ・ボリューム停止・削除
docker compose -f docker-compose.yml -f docker-compose.staging.yml down -v

# ステージング専用ボリュームの確認
docker volume ls | grep staging_

# 再構築
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
```

---

## 4. ロールバック判定基準

| レベル | 条件 | 対応 |
|--------|------|------|
| **P0 (即時ロールバック)** | ヘルスチェック失敗、全ユーザー影響 | 3.1 即時ロールバック実行 |
| **P1 (15分以内判断)** | 認証フロー障害、決済不可 | 原因調査 → 修正不可なら 3.2 コードロールバック |
| **P2 (1時間以内判断)** | 一部機能障害、表示崩れ | ホットフィックス試行 → 不可なら 3.2 |
| **P3 (次回リリースで対応)** | 軽微な不具合、パフォーマンス低下 | Issue 起票、ロールバック不要 |

---

## 5. デプロイ前バックアップ手順

ステージング・本番共通で、デプロイ前に必ず実行する。

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.staging.yml"

# DB バックアップ
docker compose $COMPOSE_FILES exec -T db \
  pg_dump -U postgres poker_sns > "./backups/pre-deploy-${TIMESTAMP}.sql"
echo "DB backup: pre-deploy-${TIMESTAMP}.sql"

# uploads ボリュームバックアップ
docker run --rm \
  -v "$(docker volume ls -q | grep staging_uploads)":/data:ro \
  -v "$(pwd)/backups":/backup \
  alpine tar czf "/backup/uploads-pre-deploy-${TIMESTAMP}.tar.gz" -C /data .
echo "Uploads backup: uploads-pre-deploy-${TIMESTAMP}.tar.gz"
```

---

## 6. GHCR イメージプッシュ手順 (CI/CD 連携)

ステージング compose は GHCR プリビルドイメージを前提としている。手動プッシュ手順:

```bash
# 1. GHCR ログイン
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 2. ビルド & タグ付け
docker build -t ghcr.io/yuito3784/poker_sns/backend:latest ./backend
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://staging.yourdomain.com/api \
  --build-arg NEXT_PUBLIC_SITE_URL=https://staging.yourdomain.com \
  -t ghcr.io/yuito3784/poker_sns/frontend:latest ./frontend

# 3. プッシュ
docker push ghcr.io/yuito3784/poker_sns/backend:latest
docker push ghcr.io/yuito3784/poker_sns/frontend:latest

# 4. ステージングでプルして起動
docker compose -f docker-compose.yml -f docker-compose.staging.yml pull
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

---

## 7. トラブルシューティング

| 症状 | 原因候補 | 対処 |
|------|---------|------|
| backend が起動しない | DB 接続失敗 | `DB_PASSWORD` の一致確認、db コンテナの healthcheck 確認 |
| frontend が 500 エラー | `NEXT_PUBLIC_API_URL` 未設定 | ビルド時の ARG 指定確認 |
| nginx 502 Bad Gateway | upstream (backend/frontend) 未起動 | `docker compose ps` で各コンテナ状態確認 |
| Prisma migrate deploy 失敗 | マイグレーション履歴不整合 | `npx prisma db push --accept-data-loss` にフォールバック |
| GHCR イメージ pull 失敗 | 認証・権限不足 | `docker login ghcr.io` 再実行、パッケージ visibility 確認 |
| ポート 8080 競合 | 他サービスが使用中 | `lsof -i :8080` で確認、ポート変更 |

---

## クロスチーム依存

| 依存先 | 内容 | タイミング |
|--------|------|-----------|
| Dev (兎田) | Phase5 差分の main マージ完了 | ドライラン実行のトリガー |
| QA (雪花) | E2E テストシナリオをステージング環境で実行 | ドライラン完了後 |
| Ops (白上) | ドライラン結果を ops-dashboard.md に記録 | ドライラン完了後 |
