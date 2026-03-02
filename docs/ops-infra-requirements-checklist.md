# 本番インフラ要件チェックリスト

## 1. VPS選定比較表

| 項目 | ConoHa VPS (2GB) | AWS Lightsail (2GB) | 推奨 |
|------|------------------|---------------------|------|
| 月額 | ~1,848 (税込) | $12 (~1,800) | 同等 |
| CPU | 3 vCPU | 2 vCPU | ConoHa |
| メモリ | 2GB | 2GB | 同等 |
| ディスク | 100GB SSD | 60GB SSD | ConoHa |
| 転送量 | 無制限 | 3TB/月 | ConoHa |
| Docker対応 | Ubuntu 22.04 対応 | Ubuntu 22.04 対応 | 同等 |
| リージョン | 東京 | 東京 (ap-northeast-1) | 同等 |
| スナップショット | 50GB無料 | 手動のみ ($0.05/GB) | ConoHa |
| S3互換ストレージ | ConoHa Object Storage | S3 直接利用可 | Lightsail |

### 推奨: ConoHa VPS 2GB プラン
- 理由: ディスク100GB (uploads永続化に余裕)、転送量無制限、国内サポート
- 将来: ユーザー増加時に4GBプランへスケールアップ (~3,608/月)

### 最低スペック要件
- CPU: 2 vCPU以上 (NestJS + Next.js + PostgreSQL + nginx 同時稼働)
- メモリ: 2GB以上 (Docker overhead 含む)
- ディスク: 40GB以上 (DB + uploads + Docker images)

## 2. 必須ソフトウェア
- Docker Engine 24+
- Docker Compose v2
- UFW (ファイアウォール)
- logrotate
- cron

## 3. ネットワーク / ファイアウォール
- [x] SSH (22/tcp) — 鍵認証のみ (パスワード認証無効化)
- [x] HTTP (80/tcp) — ACME challenge + HTTPS redirect
- [x] HTTPS (443/tcp) — 全アプリケーション通信
- [x] 他ポートすべて deny
- [x] PostgreSQL 5432 は Docker 内部のみ (外部非公開)

## 4. SSL/TLS
- Let's Encrypt (certbot) で自動取得
- `setup-ssl.sh` で初回セットアップ
- `ssl-renew.sh` で自動更新 (週次 cron)
- TLS 1.2+ のみ、HSTS preload 対応済み

## 5. バックアップ戦略
- 日次 pg_dump (03:00 JST) → gzip圧縮 → ローカル保存
- S3/GCS オプション: `S3_BUCKET` 環境変数で有効化
- 保持期間: 14日間 (ローカル)
- リストア手順: `scripts/restore-postgres.sh`
- リストア検証: 月次で staging 環境にリストアテスト実施

## 6. uploads 永続化
- Docker named volume `uploads` で永続化 (既に docker-compose.yml に定義済み)
- `/app/uploads/avatars/`, `/app/uploads/posts/` のパーミッション: nestjs:nodejs (1001:1001)
- 将来: S3互換ストレージへ移行可 (presigned URL 方式)

## 7. ログ設定
- Docker コンテナログ: `json-file` ドライバ (デフォルト)
- アプリログ: stdout/stderr → Docker → `/var/log/poker_sns/`
- logrotate: 日次ローテーション、30日保持、gzip圧縮
- SSL更新ログ: 週次ローテーション、12週保持

## 8. 監視
- UptimeRobot (無料): `/api/health` を5分間隔で外部監視
- `scripts/health-check.sh`: 内部5分間隔監視 (API + LP)
- Discord webhook: 状態変化時のみ通知 (フラッピング防止)
- ヘルスチェック応答: `{"status":"ok","timestamp":"..."}` (DB接続確認含む)

## 9. デプロイフロー
```
main push → GitHub Actions:
  1. backend test (npm run test)
  2. frontend build (npm run build)
  3. Docker build & push to GHCR
  4. SSH deploy: pull → up -d → health check
  5. Discord 通知 (成功/失敗)
```

## 10. 環境変数管理
- `.env` ファイル: パーミッション 600
- 必須変数 (本番): DB_PASSWORD, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TOKEN_ENCRYPTION_KEY
- GitHub Secrets: DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY, DISCORD_WEBHOOK_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL

## 11. セットアップ手順サマリ
1. VPS 契約 → Ubuntu 22.04 セットアップ
2. SSH 鍵認証設定 → パスワード認証無効化
3. `scripts/setup-server.sh` 実行 (Docker, UFW, cron, logrotate)
4. `.env` 配置 (`/opt/poker_sns/.env`)
5. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
6. `./setup-ssl.sh yourdomain.com admin@example.com`
7. DNS A レコード設定 → 反映確認
8. UptimeRobot + Discord webhook 設定
9. GitHub Secrets 設定 → CI/CD 動作確認

## 12. 完了基準チェック
- [ ] `https://ドメイン/lp` で LP 表示
- [ ] `https://ドメイン/api/health` が `{"status":"ok"}` (HTTP 200) 返却
- [ ] SSL 証明書が有効 (A+ rating on SSL Labs)
- [ ] バックアップ cron が登録済み (`crontab -l` で確認)
- [ ] Discord webhook でテスト通知が届く
- [ ] GitHub Actions が main push で自動実行
