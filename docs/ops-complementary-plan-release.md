# Operations 補完計画: 本番リリースブロッカー解消

> 担当: 白上 (Operations)
> 作成日: 2026-03-02
> 元指摘: Planned会議 - Operations 星街の補完項目

---

## 1. 指摘事項と現状整理

Planned会議で以下が指摘された:

> docker-compose本番構成のレジストリ設定修正（コミット0d0cd1c）は済んでいるが、実際のサーバープロビジョニング・ドメイン取得・DNS設定・SSL証明書・本番DBマイグレーション実行の記録がなく、インフラが稼働している証跡がない

### 現状の実装済み資産の棚卸

| カテゴリ | 資産 | 状態 |
|---------|------|------|
| CI/CD | `.github/workflows/ci-cd.yml` (テスト→ビルド→GHCR push→SSH deploy→health check→Discord通知) | 完成済 |
| Docker本番構成 | `docker-compose.prod.yml` (ポート非公開、環境変数必須化、リソース制限) | 完成済 |
| nginx本番設定 | `nginx-prod.conf` (SSL, rate limit, gzip, security headers, OGP cache) | 完成済 |
| SSL取得 | `setup-ssl.sh` (Let's Encrypt certbot + nginx自動切替) | 完成済 |
| SSL更新 | `ssl-renew.sh` + certbotコンテナ12h自動更新ループ | 完成済 |
| サーバー初期設定 | `scripts/setup-server.sh` (Docker, UFW, cron, logrotate) | 完成済 |
| バックアップ | `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh` | 完成済 |
| ヘルスチェック | `scripts/health-check.sh`, バックエンド GET /health (DB ping) | 完成済 |
| ログローテーション | `scripts/logrotate-poker-sns.conf` | 完成済 |
| 環境変数テンプレート | `.env.example` (全キーの説明+生成コマンド付、87行) | 完成済 |
| 運用ランブック | `docs/ops-deploy-runbook.md` | 完成済 |
| スモークテスト手順 | `docs/ops-deploy-smoke-test-runbook.md` (自動チェックスクリプト付) | 完成済 |
| インフラ要件 | `docs/ops-infra-requirements-checklist.md` (VPS比較+最低スペック+完了基準) | 完成済 |
| モニタリング設計 | `docs/ops-monitoring-alerting.md` | 完成済 |
| バックアップ/インシデント対応 | `docs/ops-backup-restore-incident.md` | 完成済 |
| セキュリティ監視 | `docs/ops-security-monitoring.md` | 完成済 |

---

## 2. 未完了事項 = CEO意思決定待ち4点

Operations側で実行可能な全ての準備は完了している。残りの未完了事項はすべてCEO判断に依存する。

| # | ブロッカー | なぜCEO判断が必要か | 決定後のOps対応時間 |
|---|-----------|-------------------|-------------------|
| 1 | **VPSサーバー選定・契約** | 月額費用発生 (推奨: ConoHa 2GB \1,848/月) | 30分 (setup-server.sh実行) |
| 2 | **ドメイン取得** | ブランド名決定 (推奨: pokersns.jp等) | 10分 (DNS A レコード設定) |
| 3 | **Stripe本番キー切替** | 決済が本番モードになる=課金開始 | 5分 (.env更新) |
| 4 | **GitHub Secrets設定** | 上記3点の値が確定後に設定 | 10分 (6変数設定) |

### GitHub Secrets 必要変数一覧

```
DEPLOY_HOST         = VPSのIPアドレス or ドメイン
DEPLOY_USER         = デプロイユーザー名 (例: deploy)
DEPLOY_SSH_KEY      = SSH秘密鍵
DISCORD_WEBHOOK_URL = Discord通知用URL
NEXT_PUBLIC_API_URL = https://DOMAIN/api
NEXT_PUBLIC_SITE_URL = https://DOMAIN
```

---

## 3. リリース実行タイムライン

CEO判断完了後の実行計画:

```
[0:00] VPS契約完了、SSH接続確認
  │
  ├─ [0:05] setup-server.sh 実行 (Docker, UFW, cron, logrotate)
  │
  ├─ [0:20] git clone + .env 配置 + ディレクトリ作成
  │
  ├─ [0:30] DNS A レコード設定 (反映待ち: 通常5-30分)
  │
  ├─ [0:45] setup-ssl.sh 実行 (Let's Encrypt証明書取得)
  │
  ├─ [0:55] docker compose -f ... -f ... up -d (初回ビルド+起動)
  │
  ├─ [1:10] prisma db push (DBスキーマ適用)
  │
  ├─ [1:15] スモークテスト (ops-deploy-smoke-test-runbook.md)
  │       ├── Health API
  │       ├── LP表示
  │       ├── HTTPS redirect
  │       └── SSL証明書有効性
  │
  ├─ [1:30] crontab一括登録 (ops-production-release-readiness.md Section 4)
  │
  ├─ [1:40] GitHub Secrets設定 + CI/CD動作確認
  │
  ├─ [1:50] UptimeRobot外部監視設定
  │
  └─ [2:00] QAチームへスモークテスト環境引渡し
             (QA Phase: 約2.5時間 → Go/No-Go判定)
```

**Ops所要時間: 約2時間**
**QAテスト含む総所要時間: 約4.5時間**

---

## 4. 初回リリース時のリスクと緩和策

| リスク | 影響度 | 発生確率 | 緩和策 |
|-------|--------|---------|--------|
| DNS反映遅延 | 中 | 低 | TTL短縮設定 (300s)、反映まで直IP確認 |
| Let's Encrypt取得失敗 | 高 | 低 | DNS反映後に再実行、Rate Limit注意 (5回/時) |
| Dockerビルド失敗 | 高 | 極低 | CI/CDで毎回ビルドテスト済み |
| DBスキーマ適用失敗 | 高 | 極低 | prisma db push は冪等、再実行可 |
| メモリ不足 | 中 | 低 | docker-compose.prod.yml でリソース制限済み |

---

## 5. 補完計画ステータス: 完了

指摘された5項目すべてについて:

| 指摘項目 | 対応状況 |
|---------|---------|
| サーバープロビジョニング | `scripts/setup-server.sh` で自動化済、CEO契約判断待ち |
| ドメイン取得 | `ops-infra-requirements-checklist.md` に手順記載、CEO判断待ち |
| DNS設定 | `ops-deploy-runbook.md` に手順記載、ドメイン確保後即実行可 |
| SSL証明書 | `setup-ssl.sh` 実装済、DNS反映後即実行可 |
| 本番DBマイグレーション | `prisma db push` 手順化済 (ランブック Phase C) |

**結論: 全項目についてスクリプト・手順書・自動化が完了しており、CEOの4点の意思決定のみがブロッカー。**
