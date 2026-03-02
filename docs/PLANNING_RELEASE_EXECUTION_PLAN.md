# Planning: リリース実行計画 v1

**作成日:** 2026-03-02
**作成者:** Planning 常闇
**目的:** poker_sns 本番リリースに必要な全アクションを1枚に統合

---

## 現状サマリー

| 領域 | 準備状況 | 残作業 |
|------|---------|--------|
| バックエンド (NestJS) | 完了 | なし |
| フロントエンド (Next.js) | 完了 | なし |
| Docker本番構成 | 完了 | なし |
| Nginx + SSL | 完了 | サーバー上でのcron登録のみ |
| CI/CD (GitHub Actions) | 完了 | GitHub Secrets設定のみ |
| セキュリティ修正 | 完了 | なし |
| 運用ドキュメント | 完了 | なし |
| **CEO判断待ち** | **ブロッカー** | **下記3点** |

---

## CEO判断が必要な3項目

### 1. VPS/サーバー選定

| 選択肢 | 月額目安 | 特徴 |
|--------|---------|------|
| **ConoHa VPS 2GB** | 1,848円 | 国内、日本語サポート、十分なスペック |
| **Vultr 2GB** | $12 (~1,800円) | グローバル、東京DC、高速SSD |
| **さくらVPS 2GB** | 1,738円 | 国内老舗、安定性高い |
| **Vercel + Railway** | 無料枠~ | フロントVercel + バックRailway、Docker不要だがアーキ変更必要 |

**推奨:** ConoHa VPS 2GB or Vultr 2GB (Docker構成がそのまま使えるため)

> **判断ポイント:** VPSならDocker構成をそのまま使える。Vercelの場合はデプロイ方式の再設計が必要。

### 2. ドメイン取得

| 必要な情報 | 例 |
|-----------|---|
| ドメイン名 | pokersns.com, poker-sns.jp 等 |
| レジストラ | お名前.com, Cloudflare Registrar 等 |

**DNSレコード設定:** VPS確保後にAレコードをVPSのIPに向ける

### 3. Stripe本番キー

| 必要なキー | 取得場所 |
|-----------|---------|
| `STRIPE_SECRET_KEY` (sk_live_) | Stripe Dashboard > Developers > API keys |
| `STRIPE_WEBHOOK_SECRET` (whsec_) | Stripe Dashboard > Webhooks > エンドポイント追加 |
| `STRIPE_PRICE_ID` (price_) | Stripe Dashboard > Products > 価格ID |

**Webhook URL:** `https://{ドメイン}/api/stripe/webhook`

---

## リリース実行フロー (CEO判断後)

```
CEO判断完了
    │
    ▼
Phase 1: サーバー構築 (30-60分) ← Ops担当
    │  ・VPS初期設定 (setup-server.sh)
    │  ・UFW, Docker, ディレクトリ作成
    │  ・DNS Aレコード設定
    ▼
Phase 2: SSL取得 (15-30分) ← DevSecOps担当
    │  ・setup-ssl.sh 実行
    │  ・証明書取得確認
    │  ・自動更新cron登録
    ▼
Phase 3: 環境変数 + デプロイ (10-15分) ← Dev + Ops担当
    │  ・.env 作成 (全シークレット設定)
    │  ・docker compose -f docker-compose.prod.yml up -d
    │  ・Prisma migrate deploy 自動実行
    ▼
Phase 4: 検証 (15-20分) ← QA担当
    │  ・ヘルスチェック疎通
    │  ・認証フロー (登録/ログイン)
    │  ・投稿CRUD
    │  ・Stripe決済テスト
    │  ・セキュリティヘッダー確認
    ▼
Phase 5: GitHub Secrets + CI/CD有効化 (5分) ← DevSecOps担当
    │  ・DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY
    │  ・NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL
    ▼
 本番稼働開始
```

**合計所要時間: 約2時間** (CEO判断完了後)

---

## GitHub Secrets 設定一覧

| Secret名 | 値 | 設定タイミング |
|----------|---|-------------|
| `DEPLOY_HOST` | VPSのIPアドレス | Phase 1完了後 |
| `DEPLOY_USER` | SSH接続ユーザー名 | Phase 1完了後 |
| `DEPLOY_SSH_KEY` | SSH秘密鍵 | Phase 1完了後 |
| `NEXT_PUBLIC_API_URL` | `https://{ドメイン}/api` | Phase 2完了後 |
| `NEXT_PUBLIC_SITE_URL` | `https://{ドメイン}` | Phase 2完了後 |
| `DISCORD_WEBHOOK_URL` | Discord通知用 (任意) | いつでも |

---

## 本番 .env 必須変数チェックリスト

```
[ ] DATABASE_URL=postgresql://poker:${DB_PASSWORD}@db:5432/poker_sns
[ ] DB_PASSWORD=(openssl rand -base64 24 で生成)
[ ] JWT_SECRET=(64バイトランダムhex)
[ ] TOKEN_ENCRYPTION_KEY=(32バイトランダムhex)
[ ] FRONTEND_URL=https://{ドメイン}
[ ] CORS_ORIGINS=https://{ドメイン}
[ ] SMTP_HOST / SMTP_USER / SMTP_PASS (メール送信用)
[ ] STRIPE_SECRET_KEY=sk_live_xxx
[ ] STRIPE_WEBHOOK_SECRET=whsec_xxx
[ ] STRIPE_PRICE_ID=price_xxx
[ ] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (OAuth)
[ ] LINE_CLIENT_ID / LINE_CLIENT_SECRET (OAuth)
[ ] X_CLIENT_ID / X_CLIENT_SECRET (OAuth)
```

---

## リスク評価

| リスク | 影響度 | 対策 |
|--------|-------|------|
| npm依存パッケージのCVE | MEDIUM | 初回リリース後に対応可。外部公開前にnpm audit実施推奨 |
| テストカバレッジ不足 | LOW | スモークテストで主要パスをカバー。段階的にテスト追加 |
| OAuth設定ミス | MEDIUM | 各プロバイダのコールバックURLを本番ドメインに更新必須 |
| Stripe Webhook未設定 | HIGH | デプロイ後即座にWebhookエンドポイント登録が必要 |

---

## 既存成果物リファレンス

| ドキュメント | 担当 | 用途 |
|------------|------|------|
| `ops-deploy-runbook.md` | Ops 白上 | デプロイ・ロールバック手順 |
| `ops-backup-restore-incident.md` | Ops 白上 | バックアップ・障害対応 |
| `ops-monitoring-alerting.md` | Ops 白上 | 監視・アラート設定 |
| `devsecops-release-readiness-deliverable.md` | DevSecOps 角巻 | セキュリティ検証 |
| `ops-production-release-readiness.md` | Ops 白上 | インフラ準備状況 |

---

## 結論

**コードベース・インフラ構成は本番リリース可能な状態。**
CEO判断が完了すれば、約2時間で本番稼働を開始できる。

**次のアクション:** CEO に VPS / ドメイン / Stripe 本番キー の3点を確認し、判断をもらう。
