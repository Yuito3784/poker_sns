# CEO Deploy Verification Checklist

## Phase 1 確認項目 (フロントエンド単体)

### 画面表示確認
- [ ] LP (`/lp`) — ヒーローセクション・CTA表示
- [ ] ログイン画面 (`/login`) — フォーム表示
- [ ] 登録画面 (`/register`) — フォーム表示
- [ ] フィード画面 (`/`) — レイアウト表示(データなしの状態)

### テーマ確認 (The Felt Table)
- [ ] 背景色: `#0d1009` (near-black)
- [ ] ゴールドCTAボタン: `#c9a84c`
- [ ] テキスト: warm ivory `#ddd6c8`
- [ ] モバイルレスポンシブ表示

### セキュリティヘッダー確認
- [ ] CSP header 存在
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY or SAMEORIGIN

## Phase 2 確認項目 (API接続後)

### 認証フロー
- [ ] メール登録 → 認証メール受信 → 認証完了
- [ ] ログイン → JWT取得 → フィード表示
- [ ] Google OAuth ログイン
- [ ] LINE ログイン

### 主要機能
- [ ] 投稿作成・表示
- [ ] プロフィール表示・編集
- [ ] パートナーページ (`/partners`)

### 決済フロー
- [ ] プレミアム申込 → Stripe Checkout遷移
- [ ] Webhook受信 → サブスク状態更新
- [ ] プレミアムバッジ表示

## Blockers (現時点)
1. **バックエンドAPIの公開ホスティング先未決定** — Railway/Render/Fly.ioのいずれかを選定必要
2. **ファイルストレージ** — Vercelは永続ストレージ未対応、S3等の外部ストレージ必要
3. **本番ドメイン** — カスタムドメイン取得・設定の判断待ち
