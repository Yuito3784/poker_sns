# デプロイ手順・運用ランブック

## 1. デプロイメントフロー概要

```
[開発] → [テスト] → [ビルド] → [デプロイ] → [ヘルスチェック] → [ロールバック判定]
```

---

## 2. 本番デプロイ手順

### 2.1 事前チェック

```bash
# 1. 現在の状態確認
ssh deploy@production-server
cd /opt/poker-sns

docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=10

# 2. ディスク容量確認
df -h
docker system df

# 3. 最新コードの取得
git fetch origin main
git log --oneline HEAD..origin/main  # 変更内容確認
```

### 2.2 バックアップ（デプロイ前に必須）

```bash
# データベースバックアップ
docker compose exec -T db pg_dump -U postgres poker_sns > \
  /opt/poker-sns/backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql

# uploadsボリュームバックアップ（大量ファイルがある場合は差分のみ）
docker run --rm \
  -v poker_sns_uploads:/data:ro \
  -v /opt/poker-sns/backups:/backup \
  alpine tar czf /backup/uploads-pre-deploy-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### 2.3 デプロイ実行

```bash
# コード更新
git pull origin main

# 環境変数の差分確認（新しい環境変数がないか）
diff <(grep -oP '^[A-Z_]+=' .env) <(grep -oP '^[A-Z_]+=' .env.example) || true

# イメージ再ビルド + デプロイ（ゼロダウンタイム風）
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache backend frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend frontend

# DBマイグレーション（Prismaスキーマ変更がある場合）
docker compose exec -T backend npx prisma db push --accept-data-loss

# nginx設定更新（nginx設定変更がある場合のみ）
docker compose exec -T nginx nginx -t && docker compose restart nginx
```

### 2.4 デプロイ後ヘルスチェック

```bash
# バックエンドAPI確認
curl -s http://localhost:3001/api/health | jq .

# フロントエンド確認
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# nginx経由の確認
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/api/health

# OGPメタタグ確認（シェア機能デプロイ後）
curl -s https://your-domain.com/post/SAMPLE_POST_ID | grep 'og:'

# ログにエラーがないか確認
docker compose logs --tail=50 backend | grep -i error
docker compose logs --tail=50 frontend | grep -i error
```

---

## 3. ロールバック手順

### 3.1 コードロールバック

```bash
# 前のコミットに戻す
git log --oneline -5  # 戻す先のコミットを確認
git checkout {commit-hash}

# 再ビルド・再デプロイ
docker compose -f docker-compose.yml -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend frontend
```

### 3.2 DBロールバック（スキーマ変更を伴う場合）

```bash
# デプロイ前バックアップからリストア
docker compose exec -T db psql -U postgres -c "DROP DATABASE poker_sns;"
docker compose exec -T db psql -U postgres -c "CREATE DATABASE poker_sns;"
cat /opt/poker-sns/backups/pre-deploy-YYYYMMDD-HHMMSS.sql | \
  docker compose exec -T db psql -U postgres poker_sns
```

---

## 4. OGP/シェア機能デプロイ固有手順

### 4.1 初回デプロイ時の追加手順

```bash
# OGP画像保存ディレクトリ作成
docker compose exec -T backend mkdir -p /app/uploads/ogp

# nginx設定にOGPキャッシュ設定を追加（事前にnginx-prod.confを更新済み）
docker compose exec -T nginx nginx -t
docker compose restart nginx
```

### 4.2 nginx設定差分（OGP対応追加分）

以下をnginx-prod.confの `/uploads/` locationブロックの**前**に追加:

```nginx
# OGP images - direct file serving with 7-day cache
location /uploads/ogp/ {
    alias /app/uploads/ogp/;
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable";
    add_header X-Content-Type-Options "nosniff";
    try_files $uri =404;
}
```

### 4.3 OGP表示検証

デプロイ後、以下のデバッガーで確認:
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- LINE URL Checker（LINEアプリ内でURLを送信して確認）

---

## 5. 定期運用タスク一覧

| タスク | 頻度 | スクリプト | 担当 |
|--------|------|-----------|------|
| ヘルスチェック | 5分毎 | `healthcheck.sh` | cron自動 |
| セキュリティスキャン | 15分毎 | `security-scan.sh` | cron自動 |
| ディスク使用量チェック | 日次 9:00 | `check-disk-usage.sh` | cron自動 |
| UTMレポート生成 | 日次 6:00 | `utm-report.sh` | cron自動 |
| セキュリティ日次レポート | 日次 7:00 | `daily-security-report.sh` | cron自動 |
| uploadsバックアップ | 日次 4:00 | `backup-uploads.sh` | cron自動 |
| DBバックアップ | 日次 3:00 | `backup-db.sh` | cron自動 |
| OGP画像クリーンアップ | 週次 日曜 3:30 | `cleanup-ogp.sh` | cron自動 |
| DBメンテナンス(VACUUM) | 週次 月曜 2:00 | `db-maintenance.sh` | cron自動 |
| バックアップ復旧検証 | 月次 1日 5:00 | `verify-backup.sh` | cron自動 |
| SSL証明書更新 | 自動(certbot) | docker-compose certbot | 自動 |
| Docker image pruning | 月次 | 手動 | Ops |
| 週次レポート作成 | 週次 月曜 | 手動集計 | Ops |

### crontab まとめ

```cron
# Poker SNS Operations - Complete Crontab
# --- ヘルスチェック・セキュリティ監視 ---
*/5 * * * *   /opt/poker-sns/scripts/healthcheck.sh
*/15 * * * *  /opt/poker-sns/scripts/security-scan.sh

# --- バックアップ ---
0 3 * * *     /opt/poker-sns/scripts/backup-db.sh >> /var/log/poker-sns/backup.log 2>&1
0 4 * * *     /opt/poker-sns/scripts/backup-uploads.sh >> /var/log/poker-sns/backup.log 2>&1

# --- レポート ---
0 6 * * *     /opt/poker-sns/scripts/utm-report.sh >> /var/log/poker-sns/utm-report.log 2>&1
0 7 * * *     /opt/poker-sns/scripts/daily-security-report.sh

# --- ディスク・メンテナンス ---
0 9 * * *     /opt/poker-sns/scripts/check-disk-usage.sh >> /var/log/poker-sns/disk-check.log 2>&1
0 2 * * 1     /opt/poker-sns/scripts/db-maintenance.sh >> /var/log/poker-sns/db-maintenance.log 2>&1
30 3 * * 0    /opt/poker-sns/scripts/cleanup-ogp.sh

# --- 月次 ---
0 5 1 * *     /opt/poker-sns/scripts/verify-backup.sh >> /var/log/poker-sns/backup-verify.log 2>&1
```

> 追加分の詳細は `ops-security-monitoring.md`（セキュリティ監視）および `ops-backup-restore-incident.md`（バックアップ検証）を参照

---

## 6. 投稿管理スプレッドシート仕様（note連載用）

Planningチームから依頼のあったnote連載の投稿管理用スプレッドシートの列定義:

| 列 | 内容 | 例 |
|----|------|-----|
| A: 記事No | 連番 | 1, 2, 3... |
| B: タイトル | 記事タイトル | なぜニッチSNSが個人開発で最強なのか |
| C: 公開予定日 | YYYY/MM/DD | 2026/03/05 |
| D: ステータス | 下書き/レビュー中/公開済み | 下書き |
| E: 執筆担当 | 担当者名 | - |
| F: レビュー担当 | QA/DevSecOps | - |
| G: UTMリンク | 記事内CTA用URL | pokersns.com?utm_source=note&utm_campaign=article01 |
| H: PV数 | 公開後の閲覧数 | 1,234 |
| I: CTA CTR | クリック率 | 3.2% |
| J: 備考 | 特記事項 | - |

---

## 7. 環境構築チェックリスト（新規サーバー）

- [ ] Docker + Docker Compose インストール
- [ ] git clone + .env 設定
- [ ] SSL証明書取得 (`docker compose run --rm certbot certonly ...`)
- [ ] nginx-prod.conf → nginx-prod-active.conf にコピー + ドメイン置換
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
- [ ] DBスキーマ適用 `docker compose exec backend npx prisma db push`
- [ ] ヘルスチェック確認
- [ ] crontab設定
- [ ] logrotate設定
- [ ] UptimeRobot等の外部監視設定
- [ ] バックアップディレクトリ作成 `/opt/poker-sns/backups/`
- [ ] ログディレクトリ作成 `/var/log/poker-sns/`
