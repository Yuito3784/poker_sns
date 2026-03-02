# 本番インフラスペック要件表 (Development チーム成果物)

> 作成: Development 風真 | 2026-03-02
> 目的: `docs/decision-blockers.md` への入力情報 — CEO の VPS 選定判断材料

---

## 1. コンテナ別リソース制限 (`docker-compose.prod.yml` 抽出)

| コンテナ | ベースイメージ | CPU 制限 | メモリ制限 | 公開ポート | 備考 |
|----------|---------------|----------|-----------|-----------|------|
| **db** | postgres:16-alpine | 2.0 vCPU | 1 GB | なし (内部のみ) | pgdata ボリューム永続化 |
| **backend** | node:20-alpine (multi-stage) | 1.0 vCPU | 512 MB | なし (Nginx 経由) | uploads ボリューム永続化 |
| **frontend** | node:20-alpine (multi-stage) | 1.0 vCPU | 512 MB | なし (Nginx 経由) | standalone モード |
| **nginx** | nginx:alpine | 0.5 vCPU | 256 MB | 80, 443 | SSL 終端・リバースプロキシ |
| **certbot** | certbot/certbot | 制限なし | 制限なし | なし | 常駐 (12h 間隔 renew) |

### 合計リソース要件

| 項目 | 値 | 説明 |
|------|-----|------|
| **CPU 合計 (制限値)** | 4.5 vCPU | 全コンテナの limits 合計 |
| **CPU 実使用想定** | 1.5〜2.0 vCPU | アイドル時は各コンテナ 10〜30% 程度 |
| **メモリ合計 (制限値)** | 2,304 MB (≈2.25 GB) | 全コンテナの limits 合計 |
| **メモリ実使用想定** | 1.2〜1.8 GB | DB=300〜500MB, Backend=200〜300MB, Frontend=150〜250MB, Nginx=50MB |
| **Docker Engine overhead** | 約 200〜300 MB | containerd + shim 等 |
| **OS 予約分** | 約 300〜500 MB | カーネル + systemd 等 |
| **推奨ホストメモリ** | **2 GB (最低) / 4 GB (推奨)** | swap 2GB 設定前提で 2GB でも起動可 |

---

## 2. ディスク使用量見積もり

| 項目 | 初期サイズ | 1年後想定 | 備考 |
|------|-----------|----------|------|
| Docker イメージ群 | 約 1.5 GB | 約 3 GB | node:20-alpine ベース × 2 + postgres + nginx |
| PostgreSQL データ | 約 50 MB | 約 2〜5 GB | ユーザー数・投稿数依存 |
| uploads (画像) | 0 MB | 約 5〜15 GB | アバター + 投稿画像、10MB/枚上限 |
| Docker ボリューム (certbot) | 約 10 MB | 約 10 MB | 証明書のみ |
| nginx キャッシュ (OG画像) | 0 MB | 最大 500 MB | `max_size=500m` 設定済み |
| ログ | 約 10 MB | 約 2〜5 GB | logrotate 30日保持前提 |
| OS + Docker Engine | 約 5 GB | 約 5 GB | Ubuntu 22.04 最小構成 |
| **合計** | **約 7 GB** | **約 20〜35 GB** | |
| **推奨ディスク容量** | — | **50 GB 以上** | 余裕率 50% 確保 |

---

## 3. VPS 選定用比較表 (CEO 判断材料)

### 最低要件

- CPU: 2 vCPU 以上
- メモリ: 2 GB 以上 (swap 2GB 追加必須)
- ディスク: 50 GB SSD 以上
- ネットワーク: 東京リージョン、固定 IPv4

### プラン比較

| 項目 | ConoHa VPS 2GB | ConoHa VPS 4GB | AWS Lightsail 2GB | さくら VPS 2GB |
|------|---------------|---------------|------------------|--------------|
| 月額 (税込) | ¥1,848 | ¥3,608 | ≈¥1,800 ($12) | ¥1,738 |
| CPU | 3 vCPU | 4 vCPU | 2 vCPU | 3 vCPU |
| メモリ | 2 GB | 4 GB | 2 GB | 2 GB |
| ディスク | 100 GB SSD | 100 GB SSD | 60 GB SSD | 100 GB SSD |
| 転送量 | 無制限 | 無制限 | 3 TB/月 | 無制限 |
| スナップショット | 50GB 無料 | 50GB 無料 | 有料 ($0.05/GB) | 無料 |
| **判定** | **最低要件 OK** | **推奨** | **ディスク注意** | **最低要件 OK** |

### 推奨案

| 優先度 | プラン | 理由 |
|-------|--------|------|
| **第1推奨** | ConoHa VPS 2GB (¥1,848/月) | コスパ最良。2GB + swap で当面運用可。ディスク 100GB で余裕あり。ユーザー増加時に 4GB へ即時アップグレード可 |
| 第2候補 | さくら VPS 2GB (¥1,738/月) | 最安。国内老舗で安定性高い。ただしスケールアップの柔軟性は ConoHa に劣る |
| 安全策 | ConoHa VPS 4GB (¥3,608/月) | メモリに余裕がありスワップ不要。月商 100万円目標なら投資対効果は十分 |

---

## 4. ブロッカー別・開発視点の技術要件

以下は `decision-blockers.md` に記載されるブロッカー 4 件への Development チームからの技術的入力情報。

### ブロッカー 1: VPS / ホスティング選定

- **技術制約**: Docker Compose v2 + Docker Engine 24+ が必須
- **ポート要件**: 80 (HTTP→HTTPS redirect), 443 (HTTPS), 22 (SSH)
- **ストレージ要件**: 上記ディスク見積もり参照 — 50GB 以上推奨
- **スケーラビリティ**: 現構成は単一サーバー。将来の水平スケールには構成変更が必要
- **開発チーム推奨**: ConoHa VPS 2GB で開始、負荷に応じて 4GB にアップグレード

### ブロッカー 2: ドメイン選定

- **コード影響箇所**: `nginx-prod.conf` 内の `DOMAIN_PLACEHOLDER` (3箇所)、`.env` の URL 系変数 5 件
- **SSL**: Let's Encrypt で取得 — ドメイン確定後 `setup-ssl.sh` で即時セットアップ可
- **変更コスト**: ドメイン変更は低コスト (nginx conf + .env 書換のみ)、ただし SEO とソーシャルリンクのリセットが発生
- **開発チーム所要時間**: ドメイン確定後 30 分以内に全設定反映可能

### ブロッカー 3: 外部サービスアカウント

- **必須 (Day 1)**: Stripe (決済)、SMTP (メール認証)
- **推奨 (Week 1)**: Google OAuth、LINE Login、GA4
- **後回し可**: X OAuth ログイン、SNS 自動投稿 (X/YouTube/Instagram)
- **環境変数**: `.env.example` に全 API キー項目を定義済み — アカウント取得後は値を埋めるだけ

### ブロッカー 4: SSL / セキュリティ方針

- **現状実装済み**: Let's Encrypt (certbot)、TLS 1.2+、HSTS preload、CSP、Helmet
- **nginx-prod.conf**: SSL 推奨設定済み (ssl_protocols, ssl_ciphers, HSTS ヘッダー)
- **自動更新**: `ssl-renew.sh` で週次 cron → 証明書期限前に自動 renew
- **追加判断不要**: SSL 方針は Let's Encrypt で確定済み。CEO 判断はドメイン選定のみ

---

## 5. 結論: CEO に必要な判断は実質 2 件

| # | 判断事項 | 推奨案 | 判断基準 |
|---|---------|--------|---------|
| 1 | **VPS プラン選定** | ConoHa VPS 2GB (¥1,848/月) | 上記比較表参照。予算と安全マージンのバランス |
| 2 | **ドメイン名** | CEO のブランド判断 | 技術的制約なし。`.com` or `.jp` 推奨 |

- 外部サービスアカウントはドメイン確定後に順次取得 (Day 1 で Stripe + SMTP のみ必須)
- SSL 方針は技術的に確定済み (Let's Encrypt) — CEO 判断不要
