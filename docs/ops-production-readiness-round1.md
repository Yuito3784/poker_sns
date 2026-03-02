# Operations 本番リリース準備 成果物 (Round 1)

> 担当: Operations (白上)
> 作成日: 2026-03-02
> ステータス: CEO回答待ち項目あり

---

## 1. 補完計画の反映: CEOへの確認依頼 2 点

### 1.1 PostgreSQL 自動バックアップ方針

**現状**: `ops-backup-restore-incident.md` にて日次 pg_dump スクリプト (`backup-db.sh`) を設計済み。
ローカルディスク保存 (`/opt/poker-sns/backups/db/`, 30日保持) で即運用可能。

**CEOに確認が必要な項目**:

| # | 確認事項 | 選択肢 | 推奨 | 理由 |
|---|---------|--------|------|------|
| 1 | オフサイトバックアップの要否 | (A) ローカルのみ (B) S3互換 (C) 別VPS rsync | (A) MVP初期 | コスト最小。売上発生後に(B)へ移行 |
| 2 | バックアップ保持期間 | 7日 / 14日 / 30日 | 30日 | RPO 24h を確保しつつ復旧ポイントに余裕を持たせる |
| 3 | バックアップ暗号化の要否 | 平文 / GPG暗号化 | 平文(MVP) | ローカル保存のみなら暗号化は Phase 2 |

**CEO未回答時の代替案**: ローカル30日保持で稼働開始。売上 ¥100,000/月 到達時にオフサイト導入を再検討。

**依存関係**: サーバー確保と同時に決定が必要 (バックアップディレクトリ作成がサーバー初期セットアップに含まれるため)。

### 1.2 プロセス監視とアラート通知

**現状**: `ops-monitoring-alerting.md` にて統合ヘルスチェックスクリプト (`healthcheck.sh`, 5分間隔) を設計済み。

**CEOに確認が必要な項目**:

| # | 確認事項 | 選択肢 | 推奨 | 理由 |
|---|---------|--------|------|------|
| 1 | アラート通知先 | (A) メール (B) Slack (C) Discord (D) LINE Notify | (C) Discord | 無料、Webhook簡易、CEO個人運用に最適 |
| 2 | 外部死活監視サービス | (A) なし (B) UptimeRobot無料枠 (C) Better Stack | (B) UptimeRobot | 無料50モニター、外部からの死活監視必須 |
| 3 | アラート受信者 | CEO のみ / Ops担当 / 全員 | CEO のみ(MVP) | 個人開発のため運用者=CEO |

**CEO未回答時の代替案**: メール通知 + UptimeRobot 無料枠で稼働開始。

**依存関係**: サーバー確保後に Webhook URL / メールアドレスの設定が必要。

---

## 2. Operations 既存成果物マップ

以下の運用ドキュメントは作成済み。本番デプロイ時にそのまま適用可能:

| ドキュメント | 内容 | ステータス | ドメイン依存 |
|-------------|------|-----------|-------------|
| `ops-deploy-runbook.md` | デプロイ手順・ロールバック・crontab一覧 | 完成 | ドメイン名のみ要置換 |
| `ops-backup-restore-incident.md` | バックアップ/リストア/インシデント対応 | 完成 | なし |
| `ops-monitoring-alerting.md` | ヘルスチェック・ディスク監視・ログローテ | 完成 | なし |
| `ops-security-monitoring.md` | セキュリティスキャン・レート制限監視 | 完成 | なし |
| `ops-ogp-cache-strategy.md` | OGP画像キャッシュ運用 | 完成 | なし |
| `ops-analytics-tracking.md` | UTM分析・アクセス解析 | 完成 | なし |
| `ops-sns-autopost-job-scheduler.md` | SNS自動投稿ジョブ管理 | 完成 | なし |
| `setup-ssl.sh` | SSL初期セットアップスクリプト | 完成 | ドメイン引数で動的 |
| `ssl-renew.sh` | SSL証明書自動更新スクリプト | 完成 | なし |

---

## 3. 本番リリース前提条件: Operations チェックリスト

### Phase 0: CEO回答待ち (ブロッカー)

- [ ] **サーバー情報**: VPS/クラウドのIP、SSH認証情報、OS種別
- [ ] **ドメイン名**: 本番URL確定 (SSL証明書取得・nginx設定・OGPメタに影響)
- [ ] **DNS管理権限**: ドメインのAレコード設定方法
- [ ] **バックアップ方針承認**: 上記 1.1 の選択肢を決定
- [ ] **アラート通知先承認**: 上記 1.2 の選択肢を決定

### Phase 1: サーバー確保後 (即時実行可能)

- [ ] Docker + Docker Compose インストール
- [ ] リポジトリ clone + `.env` 本番値設定
- [ ] バックアップディレクトリ作成 (`/opt/poker-sns/backups/{db,uploads,pre-deploy,config}`)
- [ ] ログディレクトリ作成 (`/var/log/poker-sns/`)
- [ ] SSL証明書取得 (`setup-ssl.sh <domain> <email>`)
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
- [ ] DBスキーマ適用 (`docker compose exec backend npx prisma db push`)
- [ ] ヘルスチェック確認 (`curl https://<domain>/api/health`)

### Phase 2: 運用開始 (cron + 監視設定)

- [ ] crontab 設定 (`ops-deploy-runbook.md` Section 5 の crontab まとめ参照)
- [ ] logrotate 設定 (`ops-monitoring-alerting.md` Section 3 参照)
- [ ] UptimeRobot 外部監視設定 (ヘルスチェックURL登録)
- [ ] アラート通知チャネル設定 (Webhook URL を `healthcheck.sh` に反映)
- [ ] 初回バックアップ手動実行 + 検証

### Phase 3: 安定運用後

- [ ] オフサイトバックアップ導入 (売上発生後)
- [ ] Slack/Discord アラート統合
- [ ] パフォーマンスベースライン取得

---

## 4. docker-compose 本番環境で不足している運用設定

既存の `docker-compose.yml` + `docker-compose.prod.yml` のレビュー結果:

### 4.1 現状で十分な点

| 項目 | 状態 |
|------|------|
| PostgreSQL ヘルスチェック | `pg_isready` 5s間隔、5回リトライ |
| Backend ヘルスチェック | `/health` 15s間隔、3回リトライ、30s起動猶予 |
| 再起動ポリシー | 全サービス `unless-stopped` |
| ポート露出制限 (本番) | backend/frontend のポートを `[]` で無効化 |
| シークレット強制 | 本番で必須環境変数が未設定ならエラー停止 |
| SSL自動更新 | certbot コンテナが12時間間隔で renew |

### 4.2 追加推奨 (MEDIUM — 警告のみ、コード変更不要)

| 項目 | 現状 | 推奨 | 優先度 |
|------|------|------|--------|
| nginx ヘルスチェック | なし | `curl -f http://localhost/` テスト追加 | MEDIUM |
| frontend ヘルスチェック | なし | Next.js の `/api/health` or TCP check | MEDIUM |
| メモリ制限 (`mem_limit`) | なし | backend: 512MB, frontend: 256MB, db: 1GB | LOW |
| CPU制限 (`cpus`) | なし | コンテナ暴走防止 | LOW |
| ログドライバ設定 | Docker デフォルト (json-file) | `max-size: 10m, max-file: 3` でローテ | MEDIUM |

> 上記は MVP 段階では対応不要。サービス成長に伴い段階的に導入する。

---

## 5. 運用コスト試算

| 項目 | Phase 1 (MVP) | Phase 2 (成長期) |
|------|---------------|-----------------|
| VPS (2vCPU, 4GB RAM) | ¥1,000-2,000/月 | ¥3,000-5,000/月 |
| ドメイン (.com) | ¥1,500/年 | ¥1,500/年 |
| SSL証明書 | ¥0 (Let's Encrypt) | ¥0 |
| 外部監視 (UptimeRobot) | ¥0 (無料枠) | ¥0 |
| オフサイトバックアップ | ¥0 (ローカルのみ) | ¥50-500/月 |
| メール送信 (SMTP) | ¥0-500/月 | ¥500-2,000/月 |
| **月額合計** | **¥1,500-2,500** | **¥4,000-8,000** |

売上目標 ¥1,000,000/月 に対して運用コストは 1% 未満。

---

## 6. サーバー確保前に並行着手する即時アクション

| アクション | 担当 | 期限 | ステータス |
|-----------|------|------|-----------|
| 全 ops スクリプトの動作確認 (ローカル docker-compose) | Ops | 本日中 | 着手可能 |
| crontab 設定ファイルのテンプレート化 | Ops | 本日中 | 完了済み (ops-deploy-runbook.md) |
| リリース前提条件チェックリスト作成 | Ops | 本日中 | 本ドキュメント Section 3 |
| `docker compose logs` 出力フォーマットの検証 | Ops | 今週中 | 着手可能 |

---

## 7. 他チームとの依存関係

| 依存先 | 内容 | ブロッカー? |
|--------|------|-----------|
| Development | ヘルスチェックエンドポイント (`GET /health`) | 実装済み |
| DevSecOps | 本番 `.env` セキュリティ要件 | CEO回答待ち |
| Design | OGP画像・favicon の最終アセット | ドメイン確定待ち |
| QA/QC | スモークテストチェックリスト | 作成済み |
| Planning | CEOへの情報提供依頼書 | 作成済み |

---

## 8. まとめ

Operations の本番リリース準備は **スクリプト・ドキュメント・手順書レベルで完了**。
残るブロッカーは以下の 2 点のみ:

1. **サーバー・ドメイン情報** (CEO から提供待ち)
2. **バックアップ方針・アラート通知先の最終承認** (CEO 判断待ち)

上記が確定次第、Phase 1 チェックリストに沿って 2-3 時間で本番環境を構築可能。
