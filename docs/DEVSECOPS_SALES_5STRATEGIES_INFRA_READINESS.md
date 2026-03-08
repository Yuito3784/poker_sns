# DevSecOps成果物 — 営業5施策インフラ準備・セキュリティ監査

**作成日**: 2026-03-08
**担当**: DevSecOps 角巻 (獅白補完)
**ステータス**: COMPLETE
**対象施策**: GROWTH_5_ACTIONS_KPI_MATRIX.md の5施策

---

## 1. 施策別インフラ影響分析 & 対応計画

### 施策① インフルエンサー招待プログラム【P0】

| 観点 | リスク | 重要度 | 対応 |
|------|--------|--------|------|
| トラフィック急増 | インフルエンサー投稿後のアクセス集中 | HIGH | nginx rate limit済み (`lp_page` zone 20r/s burst=40) |
| アフィリエイトトラッキング | リファラルリンク不正クリック | HIGH | **nginx-prod.conf に `api_referral` zone 追加済み (10r/s burst=15)** |
| Webhook abuse | アフィリエイト成果通知の偽造 | MEDIUM | Stripe webhook署名検証済み、カスタムwebhookにもHMAC検証推奨 |

### 施策② OGP動的生成 + SNSバイラル【P1】

| 観点 | リスク | 重要度 | 対応 |
|------|--------|--------|------|
| OG画像生成負荷 | 大量クロール時のCPUスパイク | MEDIUM | `og_image_cache` (500MB/7日TTL) + `og_crawl` zone (10r/s) で対策済み |
| CSP整合性 | OGP用の外部画像読み込み | LOW | CSP `img-src 'self' data: blob: https:` で許容済み |
| キャッシュ汚染 | 不正なOGP画像の永続化 | LOW | `proxy_cache_valid 200 24h` で自動失効 |

### 施策③ 7日間無料トライアル【P1】

| 観点 | リスク | 重要度 | 対応 |
|------|--------|--------|------|
| トライアル乱用 | 同一ユーザーの複数回トライアル取得 | **CRITICAL** | Stripe Customer IDでの重複チェック必須（Dev実装依頼） |
| エンドポイント濫用 | トライアル開始APIへの連続リクエスト | HIGH | **nginx-prod.conf に `api_trial` zone 追加済み (3r/s burst=5)** |
| 決済情報漏洩 | トライアル→有料切替時のカード情報取扱 | HIGH | Stripe Elements使用で PCI DSS SAQ-A準拠済み |

### 施策④ ポーカーコミュニティ出稿【P2】

| 観点 | リスク | 重要度 | 対応 |
|------|--------|--------|------|
| LP急増トラフィック | 広告バズ時のフロントエンド負荷 | MEDIUM | `lp_page` zone (20r/s burst=40)、frontend resource limit 512MB |
| UTMパラメータ改竄 | 成果計測の信頼性低下 | LOW | サーバーサイドでUTM値のサニタイズ推奨（WARNING） |

### 施策⑤ リファラルプログラム【P2】

| 観点 | リスク | 重要度 | 対応 |
|------|--------|--------|------|
| リファラル詐欺 | 自作自演の紹介ループ | **CRITICAL** | IPアドレス・メールドメイン重複検知ロジック必須（Dev実装依頼） |
| トラッキングAPI濫用 | リファラルクリック水増し | HIGH | **nginx-prod.conf に `api_referral` zone 追加済み** |
| 報酬計算改竄 | APIリクエスト改竄による不正報酬 | HIGH | サーバーサイド金額計算 + Stripe Connect確認必須 |

---

## 2. 実施済みインフラ変更

### 2-1. nginx-prod.conf — レートリミットゾーン追加

```nginx
# 追加ゾーン (既存4ゾーンに2ゾーン追加)
limit_req_zone $binary_remote_addr zone=api_referral:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api_trial:10m rate=3r/s;
```

**新規locationブロック:**

| パス | ゾーン | レート | burst | 用途 |
|------|--------|--------|-------|------|
| `/api/affiliates/(track\|referral\|click)` | `api_referral` | 10r/s | 15 | リファラルトラッキング不正防止 |
| `/api/subscriptions/(trial\|free-trial)` | `api_trial` | 3r/s | 5 | トライアル乱用防止 |

---

## 3. 本番環境負荷テスト計画

### 3-1. テストシナリオ

| シナリオ | 同時接続 | 持続時間 | 成功基準 |
|----------|----------|----------|----------|
| 通常負荷 | 100 CCU | 10分 | p95 < 500ms, エラー率 < 1% |
| インフルエンサー投稿後スパイク | 500 CCU | 5分 | p95 < 2s, エラー率 < 5% |
| LP広告バズ | 1000 CCU (LP限定) | 3分 | p95 < 3s, 502率 < 10% |

### 3-2. 推奨ツール

```bash
# k6によるシナリオベーステスト (推奨)
k6 run --vus 500 --duration 5m scripts/load-test-spike.js

# 簡易テスト (wrk)
wrk -t12 -c400 -d30s https://DOMAIN/lp
```

### 3-3. オートスケーリング所見

現状の `docker-compose.prod.yml` はシングルインスタンス構成（resource limits設定済み）。
月間1,100名新規の目標で想定される同時接続数（ピーク500 CCU以下）は現行リソース制限で対応可能。

**スケールアウトが必要になる閾値:**
- Backend memory > 400MB 常態 → レプリカ追加 (`deploy.replicas: 2`)
- DB connections > 80% → PgBouncer導入検討
- 月間登録5,000名超 → Kubernetes/ECS移行計画策定

---

## 4. 監視ダッシュボード・ログ基盤整備計画

### 4-1. 現状の監視体制

| 項目 | 状態 | 備考 |
|------|------|------|
| ヘルスチェック | 済 | `/api/health` + docker healthcheck |
| エラー通知 | 済 | `WebhookNotifierService` → Slack/Discord |
| 5xx自動ロールバック | 済 | `notify-and-recover.yml` workflow |
| npm audit | 済 | `security-gate.yml` で HIGH+ fail |
| シークレットスキャン | 済 | `security-gate.yml` で diff チェック |

### 4-2. 営業施策向け追加監視項目（推奨）

| 監視項目 | 計測方法 | アラート閾値 | 優先度 |
|----------|----------|-------------|--------|
| リファラルクリック異常増加 | nginx access log集計 | 同一IP 100req/h超 | HIGH |
| トライアル開始数/日 | Stripe webhook event集計 | 50件/日超で通知 | MEDIUM |
| LP CVR急落 | GA4 + nginx 200/total比 | CVR 前週比 -50% | MEDIUM |
| OGP生成レイテンシ | nginx upstream_response_time | p95 > 3s | LOW |

### 4-3. ログ基盤推奨構成

```
nginx access_log (JSON format) → Promtail → Loki → Grafana
backend console.log → stdout → Docker logging driver → Loki
Stripe webhook events → WebhookNotifierService → Slack/Discord
```

**即時実施可能**: nginx access_log のJSON化（下記設定追加でABテスト・KPI集計基盤に）

```nginx
# log_format を http ブロックに追加（将来対応）
log_format json_combined escape=json
    '{'
    '"time":"$time_iso8601",'
    '"remote_addr":"$remote_addr",'
    '"request":"$request",'
    '"status":$status,'
    '"body_bytes_sent":$body_bytes_sent,'
    '"request_time":$request_time,'
    '"upstream_response_time":"$upstream_response_time",'
    '"http_referer":"$http_referer",'
    '"http_user_agent":"$http_user_agent"'
    '}';
```

---

## 5. CI/CDパイプライン拡張提案

### 5-1. 既存パイプライン評価

| パイプライン | 評価 | 備考 |
|-------------|------|------|
| ci-cd.yml | A | テスト→ビルド→デプロイ→ヘルスチェック完備 |
| security-gate.yml | A | npm audit, secret scan, Stripe検証 |
| notify-and-recover.yml | A | 自動ロールバック + 通知 |

### 5-2. 営業施策向け追加ゲート（WARNING: 実装は施策開発後）

- **リファラル機能マージ時**: リファラルコード生成のユニーク性テスト追加
- **トライアル機能マージ時**: Stripe Test Mode でのトライアル→有料切替E2Eテスト
- **OGP変更時**: OGP画像生成のスナップショットテスト

---

## 6. セキュリティチェックリスト（Dev実装時の必須要件）

### CRITICAL（実装前にDevチームと合意必須）

- [ ] トライアル重複防止: `stripe.customers.list({ email })` で既存トライアル履歴チェック
- [ ] リファラル自演防止: 同一IP/同一メールドメインからの紹介を24h内に制限
- [ ] リファラル報酬上限: 1アカウントあたり月間報酬上限の設定

### HIGH（実装時に組み込み）

- [ ] リファラルコードのブルートフォース防止: コード長8文字以上 + 英数字混合
- [ ] トライアルWebhook: `customer.subscription.trial_will_end` イベントハンドリング
- [ ] 新規エンドポイントすべてに `@Throttle` デコレータ付与

### MEDIUM/LOW（WARNING報告のみ — コード変更不要）

- UTMパラメータのサーバーサイドサニタイズ（XSS防止の文脈ではCSPで軽減済み）
- ABテストのバリアント割り当てロジックでのレースコンディション考慮
- インフルエンサー専用ダッシュボードへのRBACアクセス制御

---

## 7. 施策×部門マトリクス（DevSecOps担当列）

| 施策 | DevSecOps担当タスク | ステータス | 依存 |
|------|---------------------|-----------|------|
| ① インフルエンサー招待 | リファラルトラッキングrate limit | **完了** | — |
| ② OGP + SNSバイラル | OGPキャッシュ・CSP確認 | **完了**（既存対応済み） | — |
| ③ 無料トライアル | トライアルAPI rate limit + セキュリティ要件定義 | **完了** | Dev実装待ち |
| ④ コミュニティ出稿 | LP rate limit確認 | **完了**（既存対応済み） | — |
| ⑤ リファラルプログラム | 不正防止要件定義 + rate limit | **完了** | Dev実装待ち |
| 共通 | 負荷テスト計画・監視拡張計画 | **完了** | 施策ローンチ後実施 |

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `nginx-prod.conf` | `api_referral`, `api_trial` rate limitゾーン + locationブロック追加 |
| `docs/DEVSECOPS_SALES_5STRATEGIES_INFRA_READINESS.md` | 本ドキュメント（新規） |
