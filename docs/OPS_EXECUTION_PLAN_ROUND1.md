# Operations 実行計画 (Round 1 補完計画反映)

> 担当: Operations (白上)
> 作成日: 2026-03-02
> ステータス: CEOブロッカー解消待ち → 解消次第即時実行

---

## 1. 現状整理: 全部門からの報告統合

### 1.1 共通ブロッカー

| ID | ブロッカー | 影響範囲 | 解消条件 |
|----|-----------|---------|---------|
| B-1 | CI/CDブランチ (78ec569) の main マージ未完了 | Dev / QA / DevSecOps / Ops 全部門 | CEO マージ承認 |
| B-2 | VPS / クラウド未契約 | 本番デプロイ不可、全収益チャネル停止 | CEO 費用承認 + 契約実行 |
| B-3 | ドメイン未決定 | SSL / OGP / SEO / nginx 設定不可 | CEO ドメイン決定 + 取得 |

### 1.2 各部門の補完項目サマリ

| 部門 | 補完項目 | Ops 対応要否 |
|------|---------|-------------|
| Development (兎田) | CI/CDマージ→Phase 5コードマージ→AI API技術選定PoC→Stripe年間プラン | B-1 解消後にデプロイパイプライン通過確認 (Ops) |
| QA/QC (雪花) | E2Eテスト実行環境ブロック→テスト計画書ドラフト先行作成中→セキュリティ回帰テスト | ステージング環境のプロビジョニング (Ops) |
| DevSecOps (獅白) | CI/CDパイプライン全ステージ通過確認→APIキーシークレット管理→コンテナ構成 | GitHub Secrets 設定・デプロイ環境構成 (Ops) |
| Planning (桃鈴) | 売上ギャップ分析→優先施策整理→実行計画統合 | KPI 計測基盤の監視自動化 (Ops) |

---

## 2. Operations 補完アクション計画

### Phase A: ブロッカー解消前 (即時実行可能)

| # | アクション | 詳細 | 成果物 | 推定工数 |
|---|-----------|------|--------|---------|
| A-1 | 全 ops スクリプトのローカル動作確認 | docker-compose.yml 上で healthcheck.sh / backup-db.sh / security-scan.sh 等を実行検証 | 動作確認レポート | 2h |
| A-2 | CI/CD パイプライン本番デプロイ設計レビュー | `.github/workflows/ci-cd.yml` の deploy ジョブが GitHub Secrets を正しく参照しているか確認 | レビューコメント | 1h |
| A-3 | GitHub Secrets 必要一覧の作成 | DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY, DISCORD_WEBHOOK_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL | チェックリスト (本ドキュメント Section 4) | 0.5h |
| A-4 | Phase 5 新機能の運用影響分析 | AI ハンド分析 API のコンテナ設定 (環境変数 ANTHROPIC_API_KEY)、Stats ダッシュボードのキャッシュ戦略、年間プラン Stripe webhook 拡張 | 運用影響分析表 (Section 5) |  1h |
| A-5 | デプロイ順序計画の策定 | 9本の未マージブランチのマージ順序とデプロイ戦略 | マージ・デプロイ計画 (Section 3) | 1h |

### Phase B: B-1 解消後 (CI/CDマージ完了後)

| # | アクション | 詳細 | 完了基準 |
|---|-----------|------|---------|
| B-1 | CI/CD パイプライン全ステージ通過確認 | lint → test → docker-build → deploy (staging) | GitHub Actions 全 green |
| B-2 | Phase 5 ブランチの順次マージ後パイプライン監視 | 各マージごとにパイプライン通過を確認、失敗時は即時切り戻し | 全ブランチ main マージ完了 |
| B-3 | QA チームへステージング環境提供 | docker-compose.staging.yml でのステージング起動支援 | QA が E2E テスト実行可能 |

### Phase C: B-2, B-3 解消後 (VPS + ドメイン確定後)

| # | アクション | 詳細 | 完了基準 |
|---|-----------|------|---------|
| C-1 | VPS 初期セットアップ | Docker, UFW, SSH 鍵認証, logrotate, cron | `ops-infra-requirements-checklist.md` Section 11 完了 |
| C-2 | `.env` 本番値配置 | DB_PASSWORD, JWT_SECRET, Stripe keys, TOKEN_ENCRYPTION_KEY 生成・設定 | パーミッション 600 設定済み |
| C-3 | SSL 証明書取得 | `setup-ssl.sh <domain> <email>` | HTTPS アクセス可能 |
| C-4 | 本番デプロイ実行 | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` | ヘルスチェック 200 OK |
| C-5 | DB スキーマ適用 | `npx prisma db push --accept-data-loss` | 全テーブル作成確認 |
| C-6 | crontab 一括設定 | `ops-deploy-runbook.md` Section 5 の crontab テンプレート適用 | `crontab -l` で全ジョブ確認 |
| C-7 | 外部監視設定 | UptimeRobot 無料枠 + Discord webhook | テスト通知受信確認 |
| C-8 | スモークテスト実行 | 登録 → ログイン → 投稿 → LP 表示の一連フロー | `ops-deploy-smoke-test-runbook.md` 全項目 PASS |

---

## 3. ブランチマージ・デプロイ順序計画

CEO がマージ承認後、以下の順序で実行:

```
Step 1: CI/CD 修正 (78ec569 / da165cb)
  → パイプライン自体の修正。最優先
  → 確認: GitHub Actions 全ジョブ green

Step 2: セキュリティ修正 (2026-03-02 適用分)
  → bcrypt rounds, JWT, OAuth, Helmet, nginx headers
  → 確認: セキュリティヘッダー検証

Step 3: Phase 5 機能群 (56d3648)
  → AI ハンド分析 + Stats + 年間プラン
  → 確認: backend-test + frontend-build 通過

Step 4: 本番デプロイ (Phase C 実行)
  → VPS + ドメイン確定後に docker-build → deploy
```

各 Step 間で GitHub Actions のパイプライン通過を確認してから次へ進む。失敗時はその Step で停止し、Dev チームと連携して修正。

---

## 4. GitHub Secrets 設定チェックリスト

B-2 (VPS契約) 後に CEO / DevSecOps と連携して設定:

| Secret 名 | 値の取得元 | 設定タイミング |
|-----------|-----------|--------------|
| `DEPLOY_HOST` | VPS の IP アドレス or ホスト名 | VPS 契約後 |
| `DEPLOY_USER` | VPS SSH ユーザー名 (deploy 推奨) | VPS 初期セットアップ後 |
| `DEPLOY_SSH_KEY` | SSH 秘密鍵 (deploy ユーザー用) | VPS 初期セットアップ後 |
| `DISCORD_WEBHOOK_URL` | Discord サーバーの Webhook URL | 通知チャネル作成後 |
| `NEXT_PUBLIC_API_URL` | `https://<domain>/api` | ドメイン確定後 |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` | ドメイン確定後 |

---

## 5. Phase 5 新機能の運用影響分析

### 5.1 AI ハンド分析 API

| 項目 | 影響 | Ops 対応 |
|------|------|---------|
| 環境変数追加 | `ANTHROPIC_API_KEY` | `.env` に追加、GitHub Secrets にも登録 |
| 外部 API 依存 | Claude API (Anthropic) | ヘルスチェックに API 到達性確認を追加検討 |
| コスト発生 | Haiku 4.5: ~$0.001/リクエスト | 月間使用量上限で制御済み (Dev 実装)。月額 $50 以内を想定 |
| エラーハンドリング | API タイムアウト / レート制限 | アプリ側で処理済み。ログ監視で異常検知 |

### 5.2 Stats ダッシュボード

| 項目 | 影響 | Ops 対応 |
|------|------|---------|
| DB 負荷 | 集計クエリが重い可能性 | slow query ログ監視。必要に応じてインデックス追加 |
| キャッシュ | 現時点でキャッシュ無し | DAU 300+ でレスポンス劣化する場合、Redis 導入を検討 |

### 5.3 Stripe 年間プラン

| 項目 | 影響 | Ops 対応 |
|------|------|---------|
| 環境変数追加 | `STRIPE_YEARLY_PRICE_ID` | `.env` に追加 |
| Webhook 拡張 | 既存 webhook で処理。新イベントなし | 変更不要 |
| 課金監視 | 年間プランの解約・返金イベント | Stripe Dashboard で手動確認 (MVP) |

---

## 6. KPI 計測基盤 (Phase C 完了後に設定)

| KPI | 計測方法 | 自動化レベル |
|-----|---------|------------|
| サイト稼働率 | UptimeRobot | 全自動 (外部) |
| レスポンスタイム | healthcheck.sh のレスポンス時間記録 | 全自動 (cron) |
| DB バックアップ成否 | backup-db.sh の exit code + ファイルサイズ確認 | 全自動 (cron) |
| ディスク使用率 | check-disk-usage.sh | 全自動 (cron) |
| DAU / MAU | GA4 (フロントエンド実装依存) | 手動確認 (MVP) |
| 月間売上 | Stripe Dashboard | 手動確認 (MVP) |
| アフィリエイト CTR | DB クエリ (AffiliateClick テーブル) | 手動確認 (MVP) |

---

## 7. リスク対応表

| リスク | 確率 | 影響 | 対応策 |
|--------|------|------|--------|
| VPS 契約遅延 | 中 | 全デプロイ停止継続 | CEO に ConoHa VPS 2GB (¥1,848/月) を推奨提示済み |
| CI/CD マージ後に docker-build 失敗 | 低 | デプロイ遅延 | GHCR lowercase 修正済み (da165cb)。失敗時は Dev と即時対応 |
| 本番 .env 設定ミス | 中 | サービス起動失敗 | `.env.example` との diff チェック手順をランブックに記載済み |
| SSL 証明書取得失敗 | 低 | HTTPS 不可 | DNS 反映確認後に取得。Let's Encrypt のレート制限に注意 |
| DB 初期 push 失敗 | 低 | サービス起動失敗 | ローカルで同一手順を事前検証 (Phase A-1) |

---

## 8. まとめ

Operations としての補完計画:

1. **即時実行 (Phase A)**: ブロッカー解消前にできる5項目を本日中に完了
2. **CI/CD マージ後 (Phase B)**: パイプライン全ステージ通過確認 + ステージング環境提供
3. **VPS + ドメイン確定後 (Phase C)**: 2-3 時間で本番環境構築、スモークテスト完了

**CEO への推奨アクション (即日実行可能)**:
- CI/CD ブランチ (78ec569) のマージ承認
- ConoHa VPS 2GB プラン契約 (¥1,848/月)
- ドメイン取得 (pokersns.jp 推奨, ¥1,500/年)

上記 3 点が確定次第、Operations は **当日中に本番公開** まで完了可能。
