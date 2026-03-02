# Operations: 本番リリース準備状況レポート

> Operations担当: 白上
> 作成日: 2026-03-02
> 対象: poker_sns 本番環境リリース

---

## 1. 補完計画ステータス

Planned会議で提示された Operations 補完項目3点の対応状況:

| # | 補完項目 | ステータス | 対応ドキュメント/コード |
|---|---------|-----------|----------------------|
| 1 | ヘルスチェックエンドポイント整備+モニタリング | 実装済 | `backend/src/health.controller.ts`, `ops-monitoring-alerting.md` |
| 2 | SSL証明書自動更新 cron + アラート | スクリプト済/cron未登録 | `ssl-renew.sh`, 本文書 Section 3 |
| 3 | ロールバック手順+バックアップ体制 | 設計書済 | `ops-backup-restore-incident.md`, `ops-deploy-runbook.md` |

**全3項目とも成果物(スクリプト/設計書)は完成済。サーバー確保後にcron登録・実地適用のみ残存。**

---

## 2. 実装済インフラ一覧

### 2.1 コードベース上の本番対応

| コンポーネント | ファイル | 状態 |
|--------------|--------|------|
| Health check API | `backend/src/health.controller.ts` — GET /health (DB ping, SkipThrottle) | 実装済 |
| Docker healthcheck | `docker-compose.yml` — backend: wget --spider http://localhost:3001/health | 設定済 |
| DB healthcheck | `docker-compose.yml` — db: pg_isready | 設定済 |
| 本番compose overlay | `docker-compose.prod.yml` — ポート非公開、環境変数必須化 | 設定済 |
| nginx本番設定 | `nginx-prod.conf` — SSL, rate limit, gzip, security headers | 設定済 |
| SSL取得スクリプト | `setup-ssl.sh` — Let's Encrypt certbot + nginx自動切替 | 実装済 |
| SSL更新スクリプト | `ssl-renew.sh` — certbot renew + nginx reload | 実装済 |
| 環境変数テンプレート | `.env.example` — 全キーの説明+生成コマンド付 | 作成済 |
| certbotコンテナ | `docker-compose.yml` — 12h自動更新ループ | 設定済 |

### 2.2 運用ドキュメント

| ドキュメント | 内容 | ファイル |
|------------|------|--------|
| デプロイランブック | 事前チェック→バックアップ→デプロイ→検証→ロールバック | `ops-deploy-runbook.md` |
| バックアップ・リストア・インシデント対応 | DB/uploads/config バックアップ、RPO/RTO、SEV分類、ポストモーテム | `ops-backup-restore-incident.md` |
| モニタリング・アラート | ヘルスチェック、ディスク監視、ログローテーション、DB VACUUM | `ops-monitoring-alerting.md` |
| セキュリティ監視 | JSON構造化ログ、攻撃検知(6ルール)、fail2ban Phase2設計 | `ops-security-monitoring.md` |
| OGPキャッシュ戦略 | 画像キャッシュ、nginx設定、クリーンアップ | `ops-ogp-cache-strategy.md` |
| アクセス追跡 | UTMパラメータ、シェア計測、集計スクリプト | `ops-analytics-tracking.md` |
| SNS自動投稿運用 | pg-boss選定、ジョブスケジューラ、KPIレポート | `OPS_DELIVERABLE_SNS_AUTOPOST.md` |

---

## 3. SSL証明書自動更新: 完全cron設定

### 3.1 既存スクリプト確認

`ssl-renew.sh` は以下を実行:
1. `certbot renew --quiet` (更新不要なら何もしない)
2. nginx コンテナを検出して `nginx -s reload`
3. 実行ログを stdout に出力

### 3.2 cron登録コマンド (サーバー確保後に実行)

```bash
# ssl-renew.sh を日次 03:00 に登録（バックアップと同時刻帯）
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/poker-sns/ssl-renew.sh >> /var/log/poker-sns/ssl-renew.log 2>&1") | crontab -
```

### 3.3 SSL更新失敗アラート

既存の `healthcheck.sh` (5分毎) に SSL 証明書期限チェックが含まれている:
- 残り14日未満で HIGH アラート → メール通知
- certbot コンテナの12h自動更新ループとの二重保護

**追加対策**: ssl-renew.sh の exit code を監視し、失敗時に即時通知する拡張を推奨:

```bash
# ssl-renew.sh 末尾に追加（サーバー確保後に適用）
if [ $? -ne 0 ]; then
  echo "[$(date)] CRITICAL: SSL renewal failed" | \
    mail -s "[Poker SNS] SSL Renewal FAILED" ops@example.com 2>/dev/null || true
fi
```

---

## 4. 統合crontab (本番サーバー用)

サーバー確保後に一括登録する完全版:

```cron
# ================================================================
# Poker SNS Operations - Production Crontab
# Server: /opt/poker-sns
# ================================================================

# --- ヘルスチェック・セキュリティ監視 ---
*/5 * * * *   /opt/poker-sns/scripts/healthcheck.sh
*/15 * * * *  /opt/poker-sns/scripts/security-scan.sh

# --- SSL証明書更新 ---
0 3 * * *     /opt/poker-sns/ssl-renew.sh >> /var/log/poker-sns/ssl-renew.log 2>&1

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

---

## 5. リリース当日 Operations チェックリスト

**前提**: サーバー・ドメイン・DNS が CEO 承認済であること

### Phase A: サーバーセットアップ (所要: 30-60分)

```
[ ] 1. VPSへSSH接続確認
[ ] 2. Docker + Docker Compose インストール
[ ] 3. git clone https://github.com/xxx/poker_sns.git /opt/poker-sns
[ ] 4. .env ファイル作成 (.env.example をベースに本番値を設定)
[ ] 5. ログディレクトリ作成: mkdir -p /var/log/poker-sns
[ ] 6. バックアップディレクトリ作成: mkdir -p /opt/poker-sns/backups/{db,uploads,config,pre-deploy}
[ ] 7. scriptsディレクトリ作成 + スクリプト配置 + chmod +x
```

### Phase B: SSL + 初回デプロイ (所要: 15-30分)

```
[ ] 8. DNS の A レコードがサーバーIPに向いていること確認
[ ] 9. ./setup-ssl.sh yourdomain.com admin@example.com 実行
[ ] 10. https://yourdomain.com でアクセス確認 (ブラウザ)
[ ] 11. SSL証明書の有効性確認: curl -vI https://yourdomain.com 2>&1 | grep "SSL certificate"
```

### Phase C: 本番デプロイ (所要: 10-15分)

```
[ ] 12. docker compose -f docker-compose.yml -f docker-compose.prod.yml build
[ ] 13. docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
[ ] 14. docker compose exec -T backend npx prisma db push
[ ] 15. ヘルスチェック: curl -s https://yourdomain.com/api/health | jq .
[ ] 16. フロントエンド表示確認: https://yourdomain.com/ にアクセス
```

### Phase D: 運用基盤セットアップ (所要: 15-20分)

```
[ ] 17. crontab 一括登録 (Section 4 の内容)
[ ] 18. logrotate 設定 (/etc/logrotate.d/poker-sns)
[ ] 19. UptimeRobot 設定 (https://yourdomain.com/ + /api/health)
[ ] 20. nginx セキュリティヘッダ確認: curl -I https://yourdomain.com/ | grep -E "Strict|X-Content|X-Frame|Referrer"
```

### Phase E: スモークテスト (QAチームと連携)

```
[ ] 21. ユーザー登録 → メール認証 → ログイン
[ ] 22. 投稿作成 (画像付き)
[ ] 23. OAuth ログイン (Google/LINE/X)
[ ] 24. Stripe 決済テスト (テストモード → 本番キー切替後)
[ ] 25. SSE 通知動作確認
```

---

## 6. ブロッカー・CEO判断待ち事項

| # | 項目 | 影響範囲 | ステータス |
|---|------|---------|-----------|
| 1 | VPSサーバー選定・契約 | 全チーム | CEO判断待ち |
| 2 | ドメイン取得 | SSL, OGP, メール | CEO判断待ち |
| 3 | DNS設定 (A レコード) | SSL取得の前提 | サーバー・ドメイン確保後 |
| 4 | 本番用 .env 値確定 | Stripe本番キー、SMTP、OAuth | ドメイン確定後 |

**サーバーとドメインが確保されれば、上記チェックリストに従い約2時間で本番公開可能。**

---

## 7. 初期運用体制 (リリース後1週間)

| 時間帯 | 監視方法 | 対応 |
|--------|---------|------|
| 24/7 | UptimeRobot 外部監視 (5分間隔) | ダウン検知 → メール通知 |
| 24/7 | healthcheck.sh (5分間隔) | コンテナ/DB/ディスク → メール通知 |
| 24/7 | security-scan.sh (15分間隔) | 攻撃検知 → メール通知 |
| 日次 AM7:00 | daily-security-report.sh | 前日サマリー確認 |
| 日次 AM9:00 | check-disk-usage.sh | ディスク逼迫アラート |

### エスカレーション基準

| 深刻度 | 条件 | 対応SLA |
|--------|------|---------|
| SEV-1 | サービス全停止 / データ漏洩疑い | 即時 (30分以内着手) |
| SEV-2 | 主要機能障害 (認証/投稿不可) | 1時間以内 |
| SEV-3 | 一部機能劣化 (遅延/エラー率上昇) | 4時間以内 |
| SEV-4 | 軽微な不具合 | 翌営業日 |

---

## 8. 結論

Operations側の準備は **コードベース・スクリプト・運用設計書の全てが完成済**。

残りの作業は:
1. **サーバー・ドメイン確保** (CEO判断待ち — 最優先ブロッカー)
2. **本番 .env 値の確定** (ドメイン確定後に決定可能)
3. **上記チェックリストの実地実行** (サーバー確保後 約2時間)

CEO承認が得られ次第、即日リリース可能な体制です。
