# Operations Deliverable: SNS Auto-Post 運用設計

## Operations Team (白上) / 2026-03-02

---

## Executive Summary

SNS自動投稿（X / YouTube / Instagram）の運用基盤設計書。以下の3つの補完計画項目を具体化した上で、統合運用設計として提出する。

1. **ジョブスケジューラ選定・障害時リトライ/DLQ設計** → pg-boss (PostgreSQL既存活用) + @nestjs/schedule
2. **SNSアカウント運用・API登録フロー** → 3プラットフォーム + Slack通知の開設チェックリスト
3. **KPIモニタリング・レポーティング** → UTM拡張 + 日次/週次自動レポート

---

## 1. ジョブスケジューラ: 選定結果

### 推奨構成: pg-boss + @nestjs/schedule

| 選定理由 | 詳細 |
|---------|------|
| インフラ増加ゼロ | PostgreSQL既存活用、Redis不要 |
| リトライ/DLQ組み込み | pg-bossネイティブ機能、手動実装不要 |
| ジョブ永続化 | PostgreSQLテーブルに保存、プロセス再起動でもジョブロストなし |
| 運用負荷最小 | 既存のDB監視・バックアップに包含される |
| スケール移行パス | Phase 2でBullMQ+Redisへの移行が低コストで可能 |

### Phase分割

| Phase | スケジューラ | 移行トリガー |
|-------|------------|-------------|
| Phase 1 (MVP) | pg-boss + @nestjs/schedule | 即時開始 |
| Phase 2 (Growth) | BullMQ + Redis | ジョブ数 > 100件/日 or 処理ボトルネック発生時 |

詳細: [ops-sns-autopost-job-scheduler.md](./ops-sns-autopost-job-scheduler.md) Section 1

---

## 2. リトライ・Dead Letter Queue 設計サマリ

### リトライポリシー

- 最大3回、Exponential backoff (1min → 5min → 15min)
- リトライ対象: 429, 500-503, TIMEOUT
- リトライ除外: 401, 403, 400 → DLQ直行

### DLQ処理フロー

```
ジョブ失敗 (3回リトライ後)
  → Dead Letter Queue 到達
  → Slack #poker-sns-alerts に即時通知
  → 管理者が原因調査 (Admin API / DB直接確認)
  → 是正措置 (トークン更新 / コード修正 / 復旧待ち)
  → Admin API経由でジョブ再投入
  → 結果確認
```

詳細: [ops-sns-autopost-job-scheduler.md](./ops-sns-autopost-job-scheduler.md) Section 2-3

---

## 3. 障害検知・Slack通知体系

### 通知チャネル

| チャネル | 用途 |
|---------|------|
| `#poker-sns-alerts` | CRITICAL/HIGH: DLQ到達、認証エラー、全面停止 |
| `#poker-sns-ops` | INFO/WARNING: 日次レポート、レート制限警告 |

### 通知トリガー一覧

| トリガー | 重要度 | 頻度制限 |
|---------|--------|---------|
| ジョブDLQ到達 | CRITICAL | 即時 |
| OAuthトークン失効 | CRITICAL | 即時 |
| レート制限100%到達 | CRITICAL | 即時 |
| 1時間内に3件以上失敗 | HIGH | 30分に1回 |
| レート制限80%到達 | WARNING | 1日1回 |
| 日次サマリ | INFO | 毎日09:00 JST |
| 週次KPIレポート | INFO | 毎週月曜09:00 |

### healthcheck.sh 拡張項目

既存のヘルスチェックスクリプトに以下を追加:
- DLQ滞留ジョブ数の監視
- 直近1時間のSNS投稿失敗率チェック

詳細: [ops-sns-autopost-job-scheduler.md](./ops-sns-autopost-job-scheduler.md) Section 3, 7

---

## 4. レート制限管理

### プラットフォーム別上限

| Platform | Period | Limit | Alert (80%) | 自動停止 (100%) |
|----------|--------|-------|-------------|----------------|
| X (Free) | Monthly | 1,500 | 1,200 | 1,500 |
| X (Free) | Daily | 50 | 40 | 50 |
| YouTube | Daily | 6 uploads | 5 | 6 |
| Instagram | Daily | 25 posts | 20 | 25 |
| Instagram | Hourly | 200 API calls | 160 | 200 |

### カウンター管理

PostgreSQLの`SnsRateLimit`テーブルでカウント管理。
ジョブ完了時にインクリメント、日次/月次リセットはcronで確認。

詳細: [ops-sns-autopost-job-scheduler.md](./ops-sns-autopost-job-scheduler.md) Section 4

---

## 5. SNSアカウント・API登録チェックリスト

### 即時着手が必要な項目

| 優先度 | タスク | 理由 |
|--------|-------|------|
| P0 | Instagram Meta App Review申請 | 承認まで数週間。先行して申請すべき |
| P0 | Slack Webhook設定 | 全チームの通知基盤。即日対応可能 |
| P1 | X Developer Account + App作成 | Phase 1 MVP開始の前提条件 |
| P1 | YouTube Channel作成 + API有効化 | Phase 2開始の前提条件 |

### 各プラットフォームの開設手順

詳細チェックリスト: [ops-sns-autopost-job-scheduler.md](./ops-sns-autopost-job-scheduler.md) Section 5

---

## 6. 運用cron追加

既存crontabへの追加分:

```cron
# SNS Auto-Post Operations
0 9 * * * /opt/poker-sns/scripts/sns-autopost-daily-report.sh >> /var/log/poker-sns/sns-autopost.log 2>&1
5 0 * * * /opt/poker-sns/scripts/sns-ratelimit-reset-check.sh >> /var/log/poker-sns/sns-ratelimit.log 2>&1
10 0 1 * * /opt/poker-sns/scripts/sns-ratelimit-monthly-reset.sh >> /var/log/poker-sns/sns-ratelimit.log 2>&1
```

NestJSプロセス内のCron（@nestjs/schedule）:
- 毎時: 注目投稿検出 → pg-bossにジョブ投入
- 15分毎: DLQ/failed監視 → Slack通知

---

## 7. KPIモニタリング

### 自動投稿専用KPI

| KPI | 目標 (3ヶ月後) | 測定方法 |
|-----|--------------|---------|
| 自動投稿成功率 | >= 99% | pg-boss completed/total |
| DLQ滞留 | 0件 | リアルタイム監視 |
| X経由新規登録 | 月100人 | UTM (twitter_auto) |
| YouTube視聴回数 | 月10,000回 | YouTube Analytics |
| Instagram再生回数 | 月10,000回 | Instagram Insights |
| SNS経由CTR | >= 2% | UTMクリック/インプレッション |

### UTM拡張

自動投稿用に `_auto` サフィックスを付与して手動シェアと区別:

```
utm_source=twitter_auto  (自動投稿)
utm_source=twitter       (手動シェア / 既存)
```

---

## 8. 障害対応ランブック

### 8.1 全プラットフォーム停止

1. `pgboss.job`テーブルでジョブ状態確認
2. NestJSスケジューラの稼働確認（backend logs）
3. 必要に応じて全ジョブ一時停止（Admin API）
4. 原因特定後、修正・再起動

### 8.2 認証エラー

1. トークン有効性を外部APIで確認
2. トークン再発行（Admin API）
3. 失敗ジョブの一括再投入

### 8.3 レートリミット超過

1. SnsRateLimitテーブルで使用量確認
2. 日次リミット → 翌日自動リセットまで待機
3. 月次リミット → プランアップグレード検討

詳細: [ops-sns-autopost-job-scheduler.md](./ops-sns-autopost-job-scheduler.md) Section 10

---

## 9. 他チームへの依存事項

| 依頼先 | 内容 | 優先度 |
|--------|------|--------|
| Dev | pg-boss導入 + ジョブハンドラ実装 | P0 |
| Dev | Admin API (ジョブ管理/再実行/停止) | P0 |
| Dev | Slack通知サービス (Webhook連携) | P0 |
| DevSecOps | SNS APIトークン暗号化保管方式の確定 | P0 |
| DevSecOps | Slack Webhook URLの.env管理 | P1 |
| Design | SNSアカウント用プロフィール画像/バナー | P1 |
| Planning | API有料プラン予算承認 (Phase 2以降) | P2 |

---

## 10. 成果物一覧

| ファイル | 内容 |
|---------|------|
| `docs/ops-sns-autopost-job-scheduler.md` | ジョブスケジューラ選定・リトライ/DLQ設計・障害対応の詳細仕様書 |
| `docs/OPS_DELIVERABLE_SNS_AUTOPOST.md` | 本ファイル（統合運用設計サマリ） |
| `docs/ops-monitoring-alerting.md` | 既存監視設計（healthcheck.sh拡張項目を含む） |
| `docs/ops-analytics-tracking.md` | 既存効果測定設計（UTM拡張を含む） |
| `docs/ops-deploy-runbook.md` | 既存デプロイランブック |
