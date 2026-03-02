# DevSecOps 成果物 - Round 1

**担当:** 角巻 (DevSecOps)
**日付:** 2026-03-02
**ステータス:** 完了

---

## 1. 実装済み成果物

### 1.1 CI/CD エラー通知 + 自動リカバリワークフロー

**ファイル:** `.github/workflows/notify-and-recover.yml`

| 機能 | 詳細 |
|------|------|
| Slack Webhook通知 | ビルド/デプロイ/ヘルスチェック失敗時に構造化メッセージ送信 |
| Discord通知 | 既存Discord通知と並行して送信 |
| 自動ロールバック | デプロイ/ヘルスチェック失敗時に前バージョンへ自動復帰 |
| リカバリ後ヘルスチェック | ロールバック後3回リトライで復旧確認 |
| リカバリ結果通知 | 成功/失敗をSlack+Discordへ通知 |

**必要なGitHub Secrets:**
- `SLACK_WEBHOOK_URL` (任意 - Slack通知を有効にする場合)
- `DISCORD_WEBHOOK_URL` (既存)
- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (既存)

### 1.2 CI/CD パイプライン強化

**ファイル:** `.github/workflows/ci-cd.yml` (既存ファイルの拡張)

追加内容:
- **ビルド失敗通知ジョブ** (`notify-build-failure`): backend-test または frontend-build が失敗した場合にSlack+Discord通知
- **デプロイ成功/失敗のSlack通知**: 既存のDiscord通知と並行
- **自動リカバリトリガー**: デプロイ失敗時に `notify-and-recover.yml` を自動起動

### 1.3 コンテナレベル ヘルスチェックスクリプト

**ファイル:** `scripts/container-healthcheck.sh`
**crontab:** `*/5 * * * * /opt/poker_sns/scripts/container-healthcheck.sh`

既存の `health-check.sh` (HTTP エンドポイント監視) を補完:

| チェック項目 | 閾値 | 自動対応 |
|-------------|------|---------|
| Dockerコンテナ稼働状態 | running以外 | 自動再起動試行 |
| コンテナヘルスチェック | unhealthy | 通知 |
| Nginx エラーログ | 5分間50件以上 | 通知 |
| Nginx 5xx レスポンス | 5分間10件以上 | 通知 |
| ディスク使用量 | 85%以上 | 通知 (90%超で自動プルーン) |
| メモリ使用量 | 90%以上 | 通知 |

### 1.4 Nginx ヘルスチェック (Docker Compose)

**ファイル:** `docker-compose.prod.yml` (既存ファイルの拡張)

追加内容:
- nginxサービスに `healthcheck` ディレクティブ追加
- 30秒間隔、5秒タイムアウト、3回リトライ

---

## 2. 10件サブタスク優先度マトリクス (DevSecOps観点)

| # | サブタスク | 担当 | 収益影響度 | 実装コスト | DevSecOps優先度 | Phase |
|---|-----------|------|-----------|-----------|----------------|-------|
| 1 | ExceptionFilter通知・リトライ連携 | Development | 高 | 半日 | **最優先** - サービス安定性直結 | Phase1 |
| 2 | CI通知ワークフロー | DevSecOps | 高 | 半日 | **最優先** - デプロイ失敗の即時検知 | Phase1 |
| 3 | 運用ランブック整備 | Operations | 高 | 半日 | **最優先** - インシデント対応時間短縮 | Phase1 |
| 4 | 5分間隔ヘルスチェックcron | DevSecOps | 高 | 半日 | **高** - ダウンタイム最小化 | Phase1 |
| 5 | エスカレーションルール策定 | Operations | 中 | 1日 | **中** - 運用成熟度向上 | Phase2 |
| 6 | E2Eテストシナリオ | QA/QC | 中 | 1日 | **中** - リグレッション防止 | Phase2 |
| 7 | エラーバナーUI | Design | 中 | 半日 | **中** - UX改善 | Phase2 |
| 8 | 負荷テスト項目策定 | QA/QC | 低 | 半日 | **低** - 現時点でトラフィック少 | Phase2 |
| 9 | ダッシュボードモック | Design | 低 | 1日 | **低** - 内部ツール | Phase2 |
| 10 | ExceptionFilterカバレッジ確認 | QA/QC | 低 | 半日 | **低** - 既存フィルター動作中 | Phase2 |

### DevSecOps観点の推奨事項

**Phase1 (今週中 - 収益直結)**
- サービスダウン = 収益ゼロ。通知・監視・リカバリの3点セットを最優先
- CI通知 + ヘルスチェック は本成果物で実装済み

**Phase2 (来週以降)**
- E2Eテストはデプロイ信頼性向上に貢献するが、現時点では手動確認で十分
- ダッシュボードは既存のDiscord/Slack通知で代替可能

**セキュリティ注意事項:**
- Slack/Discord Webhook URLは必ずGitHub Secretsに格納 (ハードコード禁止)
- ヘルスチェックスクリプトのログに機密情報を含めない
- 自動ロールバックは本番環境のみ有効にすること

---

## 3. 既存インフラとの干渉確認

| 既存設定 | 干渉有無 | 対応 |
|---------|---------|------|
| Helmet (CSP, HSTS) | なし | ヘルスチェックはバックエンド内部通信のため影響なし |
| nginx rate limiting | なし | `/api/health` は rate limit 除外済み |
| Docker resource limits | なし | ヘルスチェックスクリプトはホスト側cron実行 |
| 既存 health-check.sh | なし | 補完関係 (HTTP監視 vs コンテナ監視) |
| Certbot SSL更新 | なし | nginx healthcheck は port 80 (HTTP) でチェック |

---

## 4. デプロイ手順

### GitHub Secrets の追加 (任意)
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
```

### サーバー側 cron 追加
```bash
# /opt/poker_sns/scripts/container-healthcheck.sh を配置後
chmod +x /opt/poker_sns/scripts/container-healthcheck.sh
crontab -e
# 追加行:
*/5 * * * * DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/xxx" /opt/poker_sns/scripts/container-healthcheck.sh
```

### 確認項目
- [ ] `notify-and-recover.yml` がGitHub Actionsで認識されること
- [ ] テスト用に `workflow_dispatch` で手動実行して通知確認
- [ ] `container-healthcheck.sh` をサーバーで手動実行して正常動作確認
- [ ] nginx healthcheck が `docker compose ps` で healthy 表示されること

---

## 5. ファイル変更サマリ

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `.github/workflows/ci-cd.yml` | 変更 | ビルド失敗通知ジョブ追加、Slack通知追加、自動リカバリトリガー追加 |
| `.github/workflows/notify-and-recover.yml` | 新規 | エラー通知 + 自動ロールバックワークフロー |
| `scripts/container-healthcheck.sh` | 新規 | コンテナ+nginx+ディスク+メモリ監視 (5分間隔cron) |
| `docker-compose.prod.yml` | 変更 | nginx healthcheck追加 |
| `docs/devsecops-deliverable-round1.md` | 新規 | 本成果物ドキュメント |
