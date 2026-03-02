# SNS自動投稿 ジョブスケジューラ・障害検知・運用設計書

## Operations Team Deliverable - 2026-03-02
## 補完計画3項目の反映 + 運用成果物

---

## 1. ジョブスケジューラ選定

### 1.1 比較表

| 項目 | @nestjs/schedule (Cron) | BullMQ (Redis Queue) | pg-boss (PostgreSQL Queue) |
|------|------------------------|---------------------|---------------------------|
| 依存インフラ | なし（プロセス内） | Redis必須 | PostgreSQL（既存） |
| リトライ | 手動実装 | 組み込み（backoff対応） | 組み込み（exponential backoff） |
| Dead Letter Queue | 手動実装 | 組み込み | 組み込み |
| ジョブ永続化 | なし（プロセス再起動でロスト） | Redis永続化 | PostgreSQLテーブル |
| 水平スケーリング | 不可（ロック機構なし） | ワーカー分散可 | ワーカー分散可 |
| 監視UI | なし | Bull Board (別途導入) | pg-boss monitor |
| 導入コスト | 最小（npm install 1つ） | 中（Redis + BullMQ） | 低（PostgreSQL既存活用） |
| 運用負荷 | 低 | 中（Redisの監視追加） | 低（PostgreSQL既存運用に包含） |

### 1.2 推奨: 2段構成（Phase分割）

**Phase 1 (MVP): @nestjs/schedule + pg-boss**
- 理由:
  - Redis追加なしで即座に導入可能（PostgreSQL既存活用）
  - pg-bossはPrismaと同じPostgreSQLに同居できるためインフラ増加ゼロ
  - リトライ・DLQ・ジョブ永続化がpg-boss組み込みで全て解決
  - @nestjs/scheduleは定期実行のトリガーとして最小構成で使用
- 構成:
  ```
  @nestjs/schedule (Cron Trigger)
    └─ 毎時: 注目投稿を検出 → pg-boss にジョブ投入
    └─ 15分毎: pg-boss のfailed/dead letterを監視 → Slack通知

  pg-boss (Job Queue)
    └─ sns-post-twitter: X投稿ジョブ
    └─ sns-post-youtube: YouTube投稿ジョブ
    └─ sns-post-instagram: Instagram投稿ジョブ
  ```

**Phase 2 (スケール時): BullMQ + Redis**
- 移行トリガー: 1日あたりのジョブ数が100件を超えた場合、または処理時間がボトルネックになった場合
- BullMQへの移行はジョブインターフェースが類似しているため低コストで可能

### 1.3 pg-boss導入仕様

```bash
# 依存パッケージ
npm install pg-boss
npm install @nestjs/schedule
```

pg-bossはPostgreSQL接続URLを受け取り、自動的にジョブ管理用テーブルを作成する。

```
# pg-boss が自動作成するテーブル（参考）
pgboss.job       - ジョブキュー本体
pgboss.schedule  - 定期実行スケジュール
pgboss.archive   - 完了/失敗ジョブのアーカイブ
```

---

## 2. リトライ・Dead Letter Queue設計

### 2.1 リトライポリシー

| パラメータ | 値 | 理由 |
|-----------|------|------|
| 最大リトライ回数 | 3回 | APIレート制限の回復猶予を考慮 |
| リトライ間隔 | Exponential backoff (1min → 5min → 15min) | レートリミット超過時の回復に十分な間隔 |
| リトライ対象エラー | 429 (Rate Limit), 500-503 (Server Error), TIMEOUT | 一時的障害のみリトライ |
| リトライ除外エラー | 401 (Auth), 403 (Forbidden), 400 (Bad Request) | 永続的エラーはDLQへ直行 |

### 2.2 ジョブ状態遷移図

```
[created] → [active] → [completed]  ← 正常系
                ↓
            [failed]
                ↓
            (retry count < 3?)
            ├─ YES → [retry] → [active] → ...
            └─ NO  → [dead-letter]
                          ↓
                    [Slack通知発火]
                          ↓
                    [手動調査/再実行]
```

### 2.3 Dead Letter Queue 処理フロー

```
1. ジョブがDLQに到達
   ↓
2. Slack通知を自動送信（ジョブID, プラットフォーム, エラー内容, 元投稿ID）
   ↓
3. 管理者がSlack通知を確認
   ↓
4. 原因に応じた対応:
   ├─ トークン期限切れ → トークン再発行後、ジョブ再投入
   ├─ API変更・仕様変更 → コード修正後、ジョブ再投入
   ├─ コンテンツ不適切 → 対象投稿を除外リストに追加
   └─ プラットフォーム障害 → 復旧待ち → ジョブ再投入
```

### 2.4 pg-boss ジョブ設定例（Devチーム向け仕様）

```typescript
// Job configuration per platform
const JOB_OPTIONS = {
  twitter: {
    retryLimit: 3,
    retryDelay: 60,       // 初回リトライ: 60秒後
    retryBackoff: true,    // exponential backoff有効
    expireInMinutes: 30,   // 30分でタイムアウト
    deadLetter: 'sns-post-dead-letter',
  },
  youtube: {
    retryLimit: 3,
    retryDelay: 120,      // 動画アップロードは長いので2分
    retryBackoff: true,
    expireInMinutes: 60,   // 動画は1時間タイムアウト
    deadLetter: 'sns-post-dead-letter',
  },
  instagram: {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInMinutes: 30,
    deadLetter: 'sns-post-dead-letter',
  },
};
```

---

## 3. 障害検知 → Slack通知 → 手動再実行フロー

### 3.1 Slack通知設計

#### 通知チャネル構成

| チャネル | 用途 | 通知条件 |
|---------|------|---------|
| `#poker-sns-alerts` | 緊急アラート | DLQ到達、全プラットフォーム停止 |
| `#poker-sns-ops` | 運用通知 | 日次レポート、レート制限80%到達 |

#### 通知メッセージフォーマット

**DLQ到達通知（CRITICAL）:**
```json
{
  "channel": "#poker-sns-alerts",
  "blocks": [
    {
      "type": "header",
      "text": "[CRITICAL] SNS自動投稿 Dead Letter"
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Platform:*\nTwitter" },
        { "type": "mrkdwn", "text": "*Job ID:*\nabc-123" },
        { "type": "mrkdwn", "text": "*Error:*\n429 Rate Limit Exceeded" },
        { "type": "mrkdwn", "text": "*Retry Count:*\n3/3 (exhausted)" },
        { "type": "mrkdwn", "text": "*Post ID:*\nxyz-456" },
        { "type": "mrkdwn", "text": "*Timestamp:*\n2026-03-02 18:30 JST" }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": "投稿を確認",
          "url": "https://pokersns.com/post/xyz-456"
        }
      ]
    }
  ]
}
```

**レート制限警告通知（WARNING）:**
```
[WARNING] X API レート制限 80%到達
- 使用済み: 1,200 / 1,500 (月間上限)
- 残り: 300件
- 推奨: 投稿頻度を一時的に削減するか、プランアップグレードを検討
```

**日次レポート通知（INFO）:**
```
[Daily Report] SNS自動投稿サマリ (2026-03-02)
- Twitter: 5件投稿 / 0件失敗 / 残枠 1,200件
- YouTube: 1件投稿 / 0件失敗 / 残枠 4,800units
- Instagram: 3件投稿 / 0件失敗 / 残枠 22件
- DLQ滞留: 0件
```

### 3.2 Slack Webhook 設定

```bash
# .env に追加する環境変数
SLACK_WEBHOOK_ALERTS=https://hooks.slack.com/services/T.../B.../...
SLACK_WEBHOOK_OPS=https://hooks.slack.com/services/T.../B.../...
```

### 3.3 通知トリガー一覧

| トリガー | 重要度 | 通知先 | 頻度制限 |
|---------|--------|--------|---------|
| ジョブDLQ到達 | CRITICAL | #alerts | 即時（同一ジョブ重複なし） |
| OAuthトークン失効 | CRITICAL | #alerts | 即時 |
| レート制限80%到達 | WARNING | #ops | 1日1回まで |
| レート制限100%到達 | CRITICAL | #alerts | 即時 |
| 1時間以内に3件以上失敗 | HIGH | #alerts | 30分に1回まで |
| 日次サマリ | INFO | #ops | 毎日09:00 JST |
| 週次KPIレポート | INFO | #ops | 毎週月曜09:00 JST |

### 3.4 手動再実行フロー

```
1. Slack通知を受信
   ↓
2. エラー内容を確認（ジョブID, エラー種別）
   ↓
3. 原因調査
   ├─ Admin API: GET /api/admin/sns-auto-post/jobs/{jobId}
   │   → ジョブ詳細・エラーログを確認
   ├─ DB直接: SELECT * FROM pgboss.job WHERE id = '{jobId}'
   │   → ジョブデータの全フィールドを確認
   └─ ログ: docker compose logs --grep="jobId" backend
   ↓
4. 原因に応じた是正
   ├─ トークン更新: Admin API: POST /api/admin/sns-credentials/{platform}/refresh
   ├─ コード修正: 修正コミット → デプロイ
   └─ 一時的障害: そのまま再実行
   ↓
5. ジョブ再投入
   Admin API: POST /api/admin/sns-auto-post/jobs/{jobId}/retry
   ↓
6. 結果確認
   Admin API: GET /api/admin/sns-auto-post/jobs/{jobId}
   → status = "completed" を確認
```

---

## 4. 各SNSプラットフォーム別のレート制限管理

### 4.1 レートリミットカウンター設計

pg-bossのジョブ完了/失敗ハンドラでカウンターを更新する。カウンターはPostgreSQLの`SnsRateLimit`テーブルで管理。

```
// Devチーム向け仕様: SnsRateLimit テーブル追加
model SnsRateLimit {
  id          String   @id @default(uuid())
  platform    String   // "twitter" | "youtube" | "instagram"
  periodType  String   // "daily" | "monthly" | "hourly"
  periodKey   String   // "2026-03" (monthly), "2026-03-02" (daily), "2026-03-02T18" (hourly)
  usedCount   Int      @default(0)
  limitCount  Int      // プラットフォーム上限
  updatedAt   DateTime @updatedAt

  @@unique([platform, periodType, periodKey])
}
```

### 4.2 プラットフォーム別上限設定

| Platform | Period | Limit | Alert Threshold (80%) |
|----------|--------|-------|----------------------|
| Twitter (Free) | Monthly | 1,500 | 1,200 |
| Twitter (Free) | Daily | 50 | 40 |
| YouTube | Daily | 6 (= 9,600 units) | 5 |
| Instagram | Daily | 25 | 20 |
| Instagram | Hourly | 200 API calls | 160 |

### 4.3 自動投稿停止条件

以下のいずれかに該当した場合、該当プラットフォームへの新規ジョブ投入を停止:

1. レートリミットカウンターが上限の100%に到達
2. 直近1時間以内に連続3回の認証エラー（401/403）
3. 管理者による手動停止フラグ

停止後の自動再開条件:
- レートリミット: 次の期間（日次 → 翌日0:00 JST、月次 → 翌月1日）に自動リセット
- 認証エラー: 管理者がトークンを更新し、手動で再開
- 手動停止: 管理者が手動で再開

---

## 5. SNSアカウント開設・API登録チェックリスト

### 5.1 X (Twitter)

- [ ] Developer Portal でアカウント作成 (https://developer.twitter.com)
- [ ] プロジェクト作成 → App作成
- [ ] OAuth 2.0 設定 (PKCE対応)
- [ ] スコープ設定: `tweet.write`, `tweet.read`, `users.read`, `offline.access`
- [ ] Callback URL設定: `https://{domain}/api/auth/twitter/callback`
- [ ] API Key / Secret を .env に設定
- [ ] テスト投稿で動作確認
- [ ] Bot Label の表示確認（自動投稿アカウントであることを明示）

### 5.2 YouTube

- [ ] Google Cloud Console でプロジェクト作成/既存プロジェクト選択
- [ ] YouTube Data API v3 を有効化
- [ ] OAuth 2.0 Client ID 作成
- [ ] スコープ追加: `https://www.googleapis.com/auth/youtube.upload`
- [ ] YouTube Channel 作成（ブランドアカウント推奨）
- [ ] チャンネルアート・プロフィール画像をブランド統一デザインに設定
- [ ] テスト動画アップロードで動作確認
- [ ] チャンネル説明にpoker_snsリンクを設置

### 5.3 Instagram

- [ ] Meta for Developers でアプリ作成 (https://developers.facebook.com)
- [ ] Instagramビジネスアカウント作成（またはCreator Account）
- [ ] Facebook Page作成 → Instagramアカウントとリンク
- [ ] 権限申請: `instagram_basic`, `instagram_content_publish`, `pages_show_list`
- [ ] App Review 申請（承認まで数週間の見込み → 即時申請推奨）
- [ ] テスト投稿で動作確認
- [ ] プロフィールにpoker_snsリンクを設置

### 5.4 Slack Webhook

- [ ] Slack Workspace で Incoming Webhook App を追加
- [ ] `#poker-sns-alerts` チャネル作成 → Webhook URL取得
- [ ] `#poker-sns-ops` チャネル作成 → Webhook URL取得
- [ ] .env に `SLACK_WEBHOOK_ALERTS` / `SLACK_WEBHOOK_OPS` を設定
- [ ] テストメッセージ送信で動作確認

---

## 6. 運用cron設定追加（SNS自動投稿関連）

既存のcrontabに以下を追加:

```cron
# === SNS Auto-Post Operations ===

# 毎時: 注目投稿の検出 → ジョブキュー投入（@nestjs/schedule内で実行）
# ※ NestJSプロセス内のCronデコレータで管理するため、OS cronは不要

# 日次 09:00 JST: 自動投稿日次レポート → Slack通知
0 9 * * * /opt/poker-sns/scripts/sns-autopost-daily-report.sh >> /var/log/poker-sns/sns-autopost.log 2>&1

# 日次 00:05 JST: レートリミットカウンターの日次リセット確認
5 0 * * * /opt/poker-sns/scripts/sns-ratelimit-reset-check.sh >> /var/log/poker-sns/sns-ratelimit.log 2>&1

# 毎月1日 00:10: レートリミットカウンターの月次リセット確認
10 0 1 * * /opt/poker-sns/scripts/sns-ratelimit-monthly-reset.sh >> /var/log/poker-sns/sns-ratelimit.log 2>&1
```

---

## 7. 運用監視スクリプト

### 7.1 日次レポートスクリプト

```bash
#!/bin/bash
# /opt/poker-sns/scripts/sns-autopost-daily-report.sh
set -euo pipefail

SLACK_WEBHOOK="${SLACK_WEBHOOK_OPS}"
DB_CONTAINER="poker_sns-db-1"
YESTERDAY=$(date -d yesterday +%Y-%m-%d)

# pg-bossジョブの集計
REPORT=$(docker exec -i "$DB_CONTAINER" psql -U postgres -d poker_sns -t -A -F'|' <<SQL
SELECT
  COALESCE(data->>'platform', 'unknown') AS platform,
  state,
  COUNT(*) AS cnt
FROM pgboss.job
WHERE name LIKE 'sns-post-%'
  AND createdon::date = '${YESTERDAY}'
GROUP BY 1, 2
ORDER BY 1, 2;
SQL
)

# Slack送信
curl -s -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"[Daily Report] SNS Auto-Post Summary (${YESTERDAY})\n\`\`\`\n${REPORT}\n\`\`\`\"}"
```

### 7.2 DLQ監視スクリプト（healthcheck.shに統合追加）

既存の`healthcheck.sh`に以下のチェックを追加:

```bash
# 7. DLQ滞留ジョブ確認
DLQ_COUNT=$(docker exec -i "$DB_CONTAINER" psql -U postgres -d poker_sns -t -A -c \
  "SELECT COUNT(*) FROM pgboss.job WHERE name = 'sns-post-dead-letter' AND state = 'created';" 2>/dev/null || echo "0")

if [ "${DLQ_COUNT}" -gt 0 ]; then
  ERRORS+=("HIGH: ${DLQ_COUNT} jobs in SNS auto-post dead letter queue")
  log "HIGH: SNS DLQ has ${DLQ_COUNT} unprocessed jobs"
fi

# 8. 直近1時間のSNS投稿失敗率チェック
FAILED_HOUR=$(docker exec -i "$DB_CONTAINER" psql -U postgres -d poker_sns -t -A -c \
  "SELECT COUNT(*) FROM pgboss.job WHERE name LIKE 'sns-post-%' AND state = 'failed' AND completedon > NOW() - INTERVAL '1 hour';" 2>/dev/null || echo "0")

if [ "${FAILED_HOUR}" -ge 3 ]; then
  ERRORS+=("CRITICAL: ${FAILED_HOUR} SNS auto-post failures in last hour")
  log "CRITICAL: ${FAILED_HOUR} SNS post failures in 1h"
fi
```

---

## 8. KPIモニタリング設計

### 8.1 SNS自動投稿KPI

| KPI | データソース | 目標値 (3ヶ月後) | 測定頻度 |
|-----|------------|----------------|---------|
| 自動投稿成功率 | pg-boss completed/total | >= 99% | 日次 |
| DLQ滞留ジョブ数 | pg-boss dead-letter state | 0件 | リアルタイム (5分毎) |
| X経由の新規登録 | UTM (utm_source=twitter_auto) | 月100人 | 週次 |
| YouTube Shorts視聴回数 | YouTube Analytics API | 月10,000回 | 週次 |
| Instagram Reels再生回数 | Instagram Insights API | 月10,000回 | 週次 |
| SNS経由CTR | UTMクリック数/インプレッション | >= 2% | 週次 |
| 平均ジョブ処理時間 | pg-boss (completedon - startedon) | < 30秒(X), < 5分(YT) | 日次 |

### 8.2 UTMパラメータ拡張（自動投稿専用）

既存のUTM設計（ops-analytics-tracking.md）に自動投稿用を追加:

```
# 自動投稿からのリンク
https://pokersns.com/post/{id}?utm_source=twitter_auto&utm_medium=social&utm_campaign=autopost
https://pokersns.com/post/{id}?utm_source=youtube_auto&utm_medium=video&utm_campaign=autopost
https://pokersns.com/post/{id}?utm_source=instagram_auto&utm_medium=social&utm_campaign=autopost

# 手動シェアとの区別
utm_source に "_auto" サフィックスを付与して区別
```

---

## 9. docker-compose 変更要件（Devチーム連携）

pg-boss使用時は追加インフラ不要（既存PostgreSQLを共有）。
BullMQへの移行時に以下のRedisサービス追加が必要:

```yaml
# docker-compose.yml に追加（Phase 2移行時のみ）
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    # ポート外部公開なし（内部通信のみ）

volumes:
  redis_data:
```

**Phase 1 (pg-boss) ではこの変更は不要。**

---

## 10. 障害対応ランブック（SNS自動投稿）

### 10.1 全プラットフォーム停止時

```bash
# 1. ジョブキュー状態確認
docker exec -i poker_sns-db-1 psql -U postgres -d poker_sns -c \
  "SELECT name, state, COUNT(*) FROM pgboss.job WHERE name LIKE 'sns-post-%' GROUP BY 1, 2 ORDER BY 1, 2;"

# 2. 直近エラー確認
docker exec -i poker_sns-db-1 psql -U postgres -d poker_sns -c \
  "SELECT id, name, data->>'platform', output->>'error', completedon FROM pgboss.job WHERE name LIKE 'sns-post-%' AND state = 'failed' ORDER BY completedon DESC LIMIT 10;"

# 3. NestJSスケジューラの稼働確認
docker compose logs --tail=100 backend | grep -i "schedule\|cron\|sns-auto"

# 4. 全ジョブの一時停止（緊急時）
# NestJSの管理API経由: POST /api/admin/sns-auto-post/pause-all
```

### 10.2 特定プラットフォームの認証エラー

```bash
# 1. トークン有効性確認
docker compose exec -T backend node -e "
  const fetch = require('node-fetch');
  // X: GET /2/users/me
  // YouTube: GET /youtube/v3/channels?mine=true
  // Instagram: GET /me?fields=id,username
"

# 2. トークン再発行
# Admin API: POST /api/admin/sns-credentials/{platform}/refresh

# 3. 失敗ジョブの再投入
# Admin API: POST /api/admin/sns-auto-post/retry-failed?platform={platform}
```

### 10.3 レートリミット超過

```bash
# 1. 現在の使用量確認
docker exec -i poker_sns-db-1 psql -U postgres -d poker_sns -c \
  "SELECT * FROM \"SnsRateLimit\" WHERE platform = '{platform}' ORDER BY \"periodKey\" DESC LIMIT 5;"

# 2. 残りのキュー済みジョブ確認
docker exec -i poker_sns-db-1 psql -U postgres -d poker_sns -c \
  "SELECT COUNT(*) FROM pgboss.job WHERE name = 'sns-post-{platform}' AND state IN ('created', 'retry');"

# 3. 対応:
# - 日次リミット → 翌日0:00 JSTまで自動停止。対応不要。
# - 月次リミット → プランアップグレードを検討。一時的に投稿頻度を削減。
```

---

## 11. 他チームへの依存・連携事項

| 依存先 | 内容 | ステータス | 備考 |
|--------|------|----------|------|
| Dev | pg-bossの導入・ジョブハンドラ実装 | 待ち | 本設計書の仕様に基づき実装依頼 |
| Dev | Admin API (ジョブ管理・再実行・停止) | 待ち | Ops運用に必須 |
| Dev | Slack通知サービスの実装 | 待ち | Webhook URL設定は.envで管理 |
| DevSecOps | Slack Webhook URLの.env管理・暗号化 | 待ち | 獅白さんのトークン暗号化ストア設計と連携 |
| DevSecOps | SNS APIトークンの暗号化保管方式確定 | 待ち | pg-boss側にはトークンを含めない |
| Design | SNSアカウントのプロフィール画像・バナー | 待ち | ブランド統一デザインで作成 |
| Planning | API有料プラン予算承認（Phase 2以降） | 待ち | MVP Phase 1は全プラットフォーム無料枠 |
