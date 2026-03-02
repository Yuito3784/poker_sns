# リリース状況レポート

**作成日:** 2026-03-02
**作成者:** 企画部 常闇
**結論:** 未リリース。コード・CI/CD・運用手順は全て準備完了。CEOの4つの意思決定待ちでブロック中。

---

## 現状サマリ

| 領域 | ステータス | 備考 |
|------|-----------|------|
| コード (9モジュール, 65エンドポイント) | READY | 認証・投稿・決済・広告・アフィリエイト全実装済 |
| セキュリティ修正 | READY | Helmet CSP/HSTS, bcrypt強化, JWT修正, Webhook署名検証 全適用済 |
| Docker本番構成 | READY | docker-compose.prod.yml, nginx-prod.conf 設定済 |
| CI/CDパイプライン | READY | GitHub Actions → GHCR → SSH deploy → ヘルスチェック → Discord通知 |
| SSL/TLS自動化 | READY | setup-ssl.sh, ssl-renew.sh スクリプト完備 |
| 運用手順書 | READY | デプロイ・バックアップ・監視・ロールバック全ドキュメント完備 |
| **本番インフラ** | **BLOCKED** | **VPS未契約・ドメイン未取得** |
| **本番稼働** | **未デプロイ** | **インフラ決定待ち** |

---

## CEO意思決定が必要な4ブロッカー

### 1. VPSサーバー選定・契約
| 選択肢 | 月額 | スペック |
|--------|------|---------|
| **ConoHa VPS (推奨)** | ¥1,848〜3,608 | 2vCPU / 2-4GB RAM / 100GB SSD |
| AWS Lightsail | $20〜40 | 同等スペック |
| さくらVPS | ¥1,738〜 | 同等スペック |

**最低要件:** 2 vCPU, 2GB RAM, 40GB SSD

### 2. ドメイン取得
- 候補: `pokersns.jp`, `poker-sns.com` など
- 費用: ¥1,000〜3,000/年
- **影響範囲:** SSL証明書, OAuthコールバックURL, メール送信, OGP全てに影響

### 3. Stripe本番キー切替
- 現在テストモード (`sk_test_xxx`)
- 本番モード (`sk_live_xxx`, `whsec_xxx`, `price_xxx`) への切替が必要
- Stripeダッシュボードからの操作

### 4. GitHub Secrets設定
上記3つの決定後に設定する6項目:
- `DEPLOY_HOST` (VPSのIP)
- `DEPLOY_USER` / `DEPLOY_SSH_KEY`
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL`
- `DISCORD_WEBHOOK_URL` (任意)

---

## デプロイ所要時間見積

CEOが上記4ブロッカーを決定後、**約2〜3時間**で本番稼働可能。

| フェーズ | 作業 | 所要時間 |
|---------|------|---------|
| A | VPS初期設定・SSH鍵・ファイアウォール | 30分 |
| B | ドメインDNS設定・SSL証明書取得 | 30分 |
| C | Docker pull & 起動・環境変数設定 | 20分 |
| D | DBマイグレーション・ヘルスチェック | 15分 |
| E | スモークテスト・最終確認 | 30分 |

---

## 次のアクション

**CEOへ:** 以下を決定してください。決定次第、Ops・DevSecOps・QAが即座にデプロイ作業を開始します。

1. VPSサービスの選択（ConoHa推奨）
2. ドメイン名の決定
3. Stripe本番モード切替の承認
