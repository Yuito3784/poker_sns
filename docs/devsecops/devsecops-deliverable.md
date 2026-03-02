# DevSecOps 成果物 — 本番リリース準備

**作成**: DevSecOps チーム (角巻)
**日付**: 2026-03-02
**対象**: poker_sns 本番デプロイ

---

## 成果物サマリ

| # | 成果物 | ステータス | ブロッカー |
|---|--------|-----------|-----------|
| 1 | 本番用 .env セキュリティ要件定義 | 完了 | なし |
| 2 | SSL/TLS 自動更新インフラ監査 | 完了（レビュー済み） | ドメイン確定待ち |
| 3 | docker-compose.prod.yml セキュリティ監査 | 完了 | なし |
| 4 | nginx-prod.conf セキュリティ監査 | 完了 | ドメイン確定待ち |
| 5 | Dockerfile セキュリティ監査 | 完了 | なし |
| 6 | 本番デプロイ手順書（セキュリティ観点） | 完了 | なし |

---

## 1. 本番用 .env セキュリティ要件定義

→ 詳細: [`docs/devsecops/env-security-requirements.md`](./env-security-requirements.md)

- CRITICAL/HIGH/MEDIUM/PUBLIC の4段階でシークレットを分類
- 各シークレットの生成コマンドと最小要件を定義
- docker-compose.prod.yml の必須チェック (`?` suffix) 全5変数確認済み
- .env ファイル管理ルール（パーミッション、ローテーション方針）を策定

## 2. SSL/TLS 自動更新インフラ監査

### 既存スクリプト評価

| ファイル | 評価 | 備考 |
|---------|------|------|
| `setup-ssl.sh` | 良好 | 引数バリデーション、sed置換、段階的セットアップ |
| `ssl-renew.sh` | 良好 | prod用compose指定、nginx自動リロード、ログ出力 |

### 確認済み項目
- `setup-ssl.sh`: ドメインとメールを引数で受け取り、nginx-prod.conf の `DOMAIN_PLACEHOLDER` を置換
- `ssl-renew.sh`: `docker compose -f docker-compose.yml -f docker-compose.prod.yml` で本番構成を正しく参照
- certbot コンテナ: 12時間ごとの自動更新ループ（docker-compose.yml L89）
- nginx-prod.conf: TLS 1.2/1.3 のみ、安全な暗号スイート、セッションチケット無効化

### ドメイン確定後の手順
```bash
# 1. SSL 初期セットアップ
./setup-ssl.sh <ドメイン> <メールアドレス>

# 2. cron に自動更新を登録
echo "0 3 * * * /path/to/poker_sns/ssl-renew.sh >> /var/log/ssl-renew.log 2>&1" | crontab -
```

### WARNING レベル指摘（コード変更不要）
- `setup-ssl.sh` L42: `docker compose down nginx` は nginx のみ停止だが、他サービスが起動中の場合に依存関係で影響する可能性あり → 本番初回セットアップ時のみ使用するため問題なし

## 3. docker-compose.prod.yml セキュリティ監査

### 合格項目
- DB_PASSWORD, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TOKEN_ENCRYPTION_KEY: 全て `${VAR:?message}` 形式で必須化 → 未設定時にコンテナ起動失敗（安全方向）
- バックエンド/フロントエンド: `ports: []` でホスト側ポート非公開
- nginx: SSL 証明書と ACME チャレンジ用ボリュームを `:ro` でマウント

### WARNING レベル指摘（コード変更不要）
| 項目 | 内容 | 推奨対応 |
|------|------|---------|
| DB ネットワーク分離 | 現在は全サービスが同一 default ネットワーク | 本番稼働後に `internal: true` のDB専用ネットワーク追加を検討 |
| restart ポリシー | 基盤 docker-compose.yml で `unless-stopped` | 問題なし。prod override で変更不要 |

## 4. nginx-prod.conf セキュリティ監査

### 合格項目
- `server_tokens off`: nginx バージョン非公開
- HSTS: `max-age=63072000; includeSubDomains; preload` (2年)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- SSL: TLS 1.2/1.3 のみ、セッションチケット無効、安全な暗号スイート
- Rate Limiting: 認証 API 5r/s、一般 API 30r/s、OG クローラー 10r/s
- ヘルスチェック: Rate Limit 除外（監視ツール対応）
- HTTP → HTTPS 301 リダイレクト
- Let's Encrypt ACME チャレンジパス確保

### WARNING レベル指摘（コード変更不要）
| 項目 | 内容 | 推奨対応 |
|------|------|---------|
| CSP ヘッダー | nginx 側に Content-Security-Policy 未設定 | NestJS Helmet で CSP 設定済み（MEMORY記載）。nginx 側での二重設定は不要だが、静的アセットに対しては nginx で追加を検討 |
| OCSP Stapling | 未設定 | SSL パフォーマンス向上のため `ssl_stapling on; ssl_stapling_verify on;` 追加を推奨（LOW優先度） |

## 5. Dockerfile セキュリティ監査

### Backend Dockerfile
| チェック項目 | 結果 |
|-------------|------|
| マルチステージビルド | OK (builder → runner) |
| 非 root ユーザー実行 | OK (`USER nestjs`, uid=1001) |
| NODE_ENV=production | OK |
| dev依存関係除外 | OK (`npm ci --omit=dev`) |
| Alpine ベース | OK (攻撃面最小化) |

### Frontend Dockerfile
| チェック項目 | 結果 |
|-------------|------|
| マルチステージビルド | OK (builder → runner) |
| 非 root ユーザー実行 | OK (`USER nextjs`, uid=1001) |
| NODE_ENV=production | OK |
| standalone ビルド | OK (最小出力) |
| Alpine ベース | OK |

### WARNING レベル指摘（コード変更不要）
| 項目 | 内容 | 推奨対応 |
|------|------|---------|
| イメージタグ固定 | `node:20-alpine` はローリングタグ | 本番安定後に `node:20.x.x-alpine` のように固定を検討 |

## 6. 本番デプロイ手順書（セキュリティ観点）

### Pre-deploy チェックリスト

```
[ ] .env ファイルを .env.example から生成し全 CRITICAL 変数を設定
[ ] .env パーミッション確認: chmod 600 .env
[ ] JWT_SECRET を暗号論的ランダム値で生成（64バイト hex）
[ ] TOKEN_ENCRYPTION_KEY を暗号論的ランダム値で生成（32バイト hex）
[ ] DB_PASSWORD を強力なパスワードで設定（20文字以上、英数記号混合）
[ ] STRIPE_SECRET_KEY が sk_live_ プレフィックスであることを確認
[ ] CORS_ORIGINS が本番ドメインのみに制限されていることを確認
[ ] OAuth コールバック URI が本番ドメインで各プロバイダーに登録済み
```

### デプロイ手順

```bash
# 1. サーバーにリポジトリをクローン
git clone <repo-url> /opt/poker_sns
cd /opt/poker_sns

# 2. .env を作成（テンプレートからコピー）
cp .env.example .env
# → シークレット値を設定
chmod 600 .env

# 3. Docker イメージビルド + 起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. DB マイグレーション
docker compose exec backend npx prisma db push

# 5. ヘルスチェック確認
curl -f http://localhost:3001/health

# 6. SSL セットアップ
./setup-ssl.sh <ドメイン> <メールアドレス>

# 7. SSL 自動更新 cron 登録
echo "0 3 * * * /opt/poker_sns/ssl-renew.sh >> /var/log/ssl-renew.log 2>&1" | crontab -

# 8. HTTPS 動作確認
curl -f https://<ドメイン>/api/health
```

### Post-deploy セキュリティ検証

```bash
# セキュリティヘッダー確認
curl -sI https://<ドメイン> | grep -iE "(strict-transport|x-content-type|x-frame|referrer-policy)"

# SSL 評価 (外部)
# https://www.ssllabs.com/ssltest/ でドメインをテスト → A+ を目標

# ポートスキャン確認
# 80 (HTTP→HTTPS redirect), 443 (HTTPS) のみ公開されていることを確認
```

---

## ブロッカー整理

| ブロッカー | 影響範囲 | 代替案 |
|-----------|---------|--------|
| 本番ドメイン未確定 | SSL セットアップ、nginx 設定反映、OAuth コールバック登録、OGP meta | VPS の IP で仮運用可能だが SSL 不可 |
| サーバー未確保 | 全デプロイ作業 | CEO 回答待ち。VPS 自前調達も選択肢 |
| Stripe 本番キー未取得 | 決済機能 | テストモードで動作確認は完了可能 |

## 並行着手済みタスク（ブロッカー非依存）

- [x] .env セキュリティ要件定義
- [x] docker-compose.prod.yml セキュリティ監査
- [x] nginx-prod.conf セキュリティ監査
- [x] Dockerfile セキュリティ監査
- [x] SSL スクリプトレビュー
- [x] 本番デプロイ手順書（セキュリティ観点）作成
