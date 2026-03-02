# CEO意思決定ブロッカー一覧

> 作成: Planning (常闇) / 2026-03-02
> ステータス: **CEO判断待ち**
> 目的: 本番リリースに必要なCEO意思決定を一覧化

---

## 概要

本番リリースに向けて、以下 **4件** のブロッカーがCEOの判断を待っています。
全て解消されれば、約2時間で本番公開可能な状態です。

| # | ブロッカー | 緊急度 | 影響範囲 | 推奨案 |
|---|-----------|-------|---------|--------|
| 1 | VPS/クラウド選定・契約 | **最優先** | 全チーム・全工程 | ConoHa VPS 2GB |
| 2 | ドメイン取得 | **最優先** | SSL, OGP, SEO, メール, OAuth | pokersns.jp |
| 3 | SSL証明書方針 | 高 | セキュリティ, HTTPS | Let's Encrypt (無料) |
| 4 | 外部サービスアカウント開設 | 中 | 決済, メール, OAuth, 分析 | 下記詳細参照 |

---

## ブロッカー1: VPS/クラウド選定・契約

### 選択肢

| 選択肢 | 月額 | CPU | RAM | ディスク | 転送量 | 特徴 |
|--------|------|-----|-----|---------|--------|------|
| **ConoHa VPS 2GB (推奨)** | ~1,848 | 3 vCPU | 2GB | 100GB SSD | 無制限 | 国内DC, スナップショット無料 |
| ConoHa VPS 4GB | ~3,608 | 4 vCPU | 4GB | 100GB SSD | 無制限 | 余裕あり, スケールアップ不要 |
| AWS Lightsail 2GB | ~1,800 ($12) | 2 vCPU | 2GB | 60GB SSD | 3TB/月 | AWS連携, S3直接利用可 |
| さくらVPS 2GB | ~1,738 | 3 vCPU | 2GB | 100GB SSD | 無制限 | 老舗, 安定性 |

### 推奨: ConoHa VPS 2GB

- **理由**: ディスク100GB (画像uploads永続化に余裕), 転送量無制限, 国内サポート, コスパ最良
- **将来**: ユーザー増加時に4GBプランへスケールアップ可 (~3,608/月)
- **最低スペック要件**: CPU 2vCPU以上, RAM 2GB以上, ディスク 40GB以上
  - 内訳: PostgreSQL (最大1GB RAM), NestJS Backend (最大512MB), Next.js Frontend (最大512MB), nginx (最大256MB)

### テスト影響

- **ブロックされるテスト**: E2Eテスト(本番環境), SSL証明書テスト, デプロイスモークテスト
- **代替テスト可否**: ローカルDocker環境でのユニットテスト・統合テストは実行可能

### CEO判断事項

- [ ] どのVPSプランを契約するか
- [ ] 契約名義 (個人 or 法人)

---

## ブロッカー2: ドメイン取得

### 選択肢

| 選択肢 | 年額 | 特徴 |
|--------|------|------|
| **pokersns.jp (推奨)** | ~1,500 | .jp信頼性, ブランド力, SEO有利 |
| pokersns.com | ~1,500 | グローバル展開可, 取得可否要確認 |
| poker-sns.jp | ~1,500 | ハイフン付き, SEO微減 |
| その他 (.net, .io等) | 変動 | 候補があればCEO指定 |

### 推奨: pokersns.jp

- **理由**: 日本市場ターゲットなら.jpが信頼性・SEOともに最適
- **取得先**: お名前.com, ムームードメイン, Google Domains等

### ドメイン依存UI項目 (ドメイン確定後に反映)

| 項目 | 対象ファイル/設定 |
|------|-----------------|
| OGP画像URL | `frontend/src/app/layout.tsx` 他 |
| favicon/PWAマニフェスト | `frontend/public/manifest.json` |
| メールテンプレート内リンク | `backend/src/auth/auth.service.ts` |
| OAuth コールバックURL | Google/LINE/X各コンソール |
| Stripe Webhook URL | Stripeダッシュボード |
| SNSハンドル整合性 | X, Instagram等のプロフィール |
| `.env` 内URL設定 | `API_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, `SMTP_FROM` |

### テスト影響

- **ブロックされるテスト**: OGPカード表示テスト, OAuth E2Eテスト, メール送信テスト(本番)
- **代替テスト可否**: localhost/テストドメインで代替可能

### CEO判断事項

- [ ] どのドメインを取得するか
- [ ] 取得先サービスの選定

---

## ブロッカー3: SSL証明書方針

### 選択肢

| 選択肢 | コスト | 有効期限 | 自動更新 | 特徴 |
|--------|-------|---------|---------|------|
| **Let's Encrypt (推奨)** | 無料 | 90日 | 自動 (certbot) | スクリプト実装済み (`setup-ssl.sh`, `ssl-renew.sh`) |
| AWS ACM (Lightsail選択時) | 無料 | 自動 | 自動 | AWS Lightsailと組み合わせのみ |
| 有料SSL (GlobalSign等) | ~10,000/年 | 1年 | 手動 | EV証明書等の付加価値 |

### 推奨: Let's Encrypt

- **理由**: 無料, 自動更新スクリプト実装済み, 業界標準
- **既存実装**: `setup-ssl.sh` (初回取得), `ssl-renew.sh` (自動更新), certbot Dockerコンテナ (12h更新ループ)
- **セキュリティ**: TLS 1.2+, HSTS (includeSubDomains + preload) 設定済み

### テスト影響

- **ブロックされるテスト**: HTTPS通信テスト, セキュリティヘッダー本番検証
- **代替テスト可否**: 自己署名証明書でローカルテスト可能

### CEO判断事項

- [ ] Let's Encryptで問題ないか確認

---

## ブロッカー4: 外部サービスアカウント開設

ドメイン確定後に設定可能な項目。CEOが各サービスのアカウントを開設・APIキーを発行する必要があります。

### 必要なサービス一覧

| # | サービス | 用途 | 優先度 | 月額 | CEO作業 |
|---|---------|------|-------|------|---------|
| 4-1 | **Stripe** (本番モード) | 決済 (プレミアム課金) | **必須** | 3.6%+40円/決済 | 本番APIキー発行, Webhook URL登録 |
| 4-2 | **SMTP** (Resend推奨) | メール送信 (認証, 通知) | **必須** | 無料 (3,000通/月) | アカウント作成, ドメイン認証 |
| 4-3 | **Google OAuth** | Googleログイン | 高 | 無料 | GCPプロジェクト作成, OAuth設定 |
| 4-4 | **LINE Login** | LINEログイン | 高 | 無料 | LINE Developersチャネル作成 |
| 4-5 | **X OAuth** | Xログイン | 中 | 無料 | Developer Portal設定 |
| 4-6 | **Google Analytics** | アクセス解析 | 中 | 無料 | GA4プロパティ作成, 測定ID取得 |
| 4-7 | **UptimeRobot** | 死活監視 | 中 | 無料 | アカウント作成, URL登録 |

### テスト影響

- **ブロックされるテスト**: Stripe決済E2E, OAuth認証E2E, メール送信E2E
- **代替テスト可否**: Stripeテストモード, モックOAuthでの代替テスト可能

### CEO判断事項

- [ ] Stripe本番モードの有効化
- [ ] SMTPサービスの選定 (Resendで良いか)
- [ ] OAuth各サービスのアカウント開設

---

## 判断の推奨順序

```
Step 1: VPS契約 + ドメイン取得  (同時進行可, 最優先)
         ↓
Step 2: DNS Aレコード設定       (VPS IPアドレス → ドメイン紐付け)
         ↓
Step 3: SSL証明書取得           (Let's Encrypt, 自動スクリプト実行)
         ↓
Step 4: 外部サービス設定        (ドメイン確定後に順次設定)
         ↓
Step 5: 本番デプロイ            (約2時間で完了)
```

### 月額コスト見込み

| 項目 | 月額 |
|------|------|
| VPS (ConoHa 2GB) | ~1,848 |
| ドメイン (.jp) | ~125 (年1,500) |
| SSL (Let's Encrypt) | 0 |
| Stripe | 従量課金のみ |
| SMTP (Resend) | 0 (3,000通/月まで) |
| **合計固定費** | **~1,973/月** |

---

## Design UI影響マップ (Design チーム補足)

> 補足: Design (不知火) / 2026-03-02
> 各ブロッカーのCEO判断がUIデザインに与える影響を可視化

### ドメイン確定がブロックするUI要素

```
CEO: ドメイン判断
 │
 ├─ OGP画像 (8箇所)
 │   ├─ layout.tsx          metadataBase URL
 │   ├─ lp/page.tsx         LP専用OGP
 │   ├─ post/[id]/          投稿個別OGPカード
 │   ├─ profile/[username]/ プロフィールOGPカード
 │   ├─ hashtag/[tag]/      ハッシュタグOGP
 │   ├─ robots.ts           Sitemap Host
 │   ├─ sitemap.ts          全URL生成
 │   └─ opengraph-image.tsx x2 (post + profile)
 │
 ├─ SNSシェア表示
 │   ├─ X (Twitter)  summary_large_image 1200x630
 │   ├─ LINE         OGPカード展開
 │   └─ Discord      embed表示
 │
 ├─ メール内リンクUI
 │   ├─ メール認証リンク
 │   ├─ パスワードリセットリンク
 │   └─ 通知メール内URL
 │
 └─ OAuth画面
     ├─ Google同意画面 (リダイレクトURI表示)
     ├─ LINE同意画面
     └─ X認証画面
```

### VPS選定がブロックするUI要素

| 影響項目 | 説明 |
|---------|------|
| 画像読み込み速度 | VPSスペックが低いとアバター/投稿画像の応答遅延 → UXに直接影響 |
| OGP画像生成速度 | `next/og` Edge RuntimeはCPU依存、2vCPUで許容範囲内 |
| リアルタイム通知応答 | 将来のWebSocket導入時にRAMが律速 |

### 外部サービスがブロックするUI要素

| サービス | UI影響 |
|---------|--------|
| Stripe | プレミアムバッジ(♠ Gold)表示、広告非表示、文字数上限変更 |
| OAuth各種 | ログイン画面のソーシャルボタン表示/非表示 |
| GA4 | アクセス解析ダッシュボード表示 |

---

## 回答方法

このファイルの各ブロッカーの「CEO判断事項」チェックボックスに対して、
GitHubのIssue上でコメント、またはこのファイルを直接編集して回答してください。

判断いただき次第、各チームが即座に実行に移ります。
