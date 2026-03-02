# Vercel Deploy Execution Tracker

**作成**: 常闇 (Planning) | **日時**: 2026-03-02

## 現状サマリー

| 項目 | ステータス | 備考 |
|------|-----------|------|
| フロントエンドビルド準備 | READY | Next.js 16.1.4, vercel.json設定済 |
| 環境変数定義 | READY | 3変数のみ (NEXT_PUBLIC_API_URL, SITE_URL, GA_ID) |
| バックエンドAPI公開URL | BLOCKER | NestJS+PostgreSQLのホスティング先未定 |
| Vercelプロジェクト作成 | NOT STARTED | Vercel CLIまたはダッシュボードで実行必要 |
| CEO向けURL報告 | BLOCKED | デプロイ完了待ち |

## Phase 1: フロントエンド単体デプロイ (即時実行可能)

### 前提条件
- `NEXT_PUBLIC_API_URL` が空でもビルドは通る (fallback: `http://localhost:4000`)
- API未接続状態ではLP・ログイン・登録画面のUIは表示される (API呼び出し部分はエラー)
- `NEXT_PUBLIC_SITE_URL` はVercelデプロイ後に自動URLが発行される

### 実行手順

```bash
# 1. Vercel CLIインストール (未インストールの場合)
npm i -g vercel

# 2. frontendディレクトリに移動
cd frontend

# 3. Vercelにデプロイ (初回はプロジェクト作成)
vercel --yes

# 4. 環境変数設定 (Vercelダッシュボードでも可)
vercel env add NEXT_PUBLIC_API_URL production
# → バックエンドURL未定の場合は空文字で一旦設定

vercel env add NEXT_PUBLIC_SITE_URL production
# → Vercelが発行したURLを設定

# 5. 本番デプロイ
vercel --prod
```

### turbopack.rootの注意点
- `next.config.ts` に `turbopack: { root: __dirname }` が設定されている
- Vercelビルドでエラーになる場合は以下を削除:

```typescript
// next.config.ts から turbopack設定を削除
const nextConfig: NextConfig = {};
```

## Phase 2: バックエンドAPI接続 (Phase 1完了後)

### 候補ホスティング先

| サービス | 無料枠 | PostgreSQL | 即時デプロイ |
|----------|--------|-----------|-------------|
| Railway | $5/月クレジット | 内蔵 | Yes |
| Render | 750h/月 | 内蔵 | Yes |
| Fly.io | 3 shared VMs | Supabase連携 | Yes |

### 必要な環境変数 (バックエンド側)
- `DATABASE_URL` - PostgreSQL接続文字列
- `JWT_SECRET` - JWT署名キー
- `JWT_REFRESH_SECRET` - リフレッシュトークン署名キー
- `STRIPE_SECRET_KEY` - Stripe決済 (Phase 2以降)
- `STRIPE_WEBHOOK_SECRET` - Stripeウェブフック検証

## Blocker一覧

### BLOCKER-1: バックエンドホスティング先未定 (CRITICAL)
- **影響**: ログイン・投稿・全API機能が動作しない
- **判断者**: CEO
- **選択肢**: Railway / Render / Fly.io
- **推奨**: Railway (PostgreSQL内蔵、NestJSテンプレート有、即時デプロイ可)

### BLOCKER-2: ファイルストレージ (HIGH)
- **影響**: アバター・投稿画像のアップロードが永続化されない
- **現状**: ローカルファイルシステム (`/uploads/`)
- **対策候補**: Cloudflare R2 / AWS S3 / Vercel Blob

### BLOCKER-3: カスタムドメイン (LOW)
- **影響**: CEO確認には不要、本番運用時に必要
- **対策**: Vercelダッシュボードでドメイン設定

## CEO判断要求事項

1. **Phase 1 (フロント単体デプロイ) だけで先にURLを報告してよいか？**
   - Yes → APIなしでUI表示のみ確認可能、即時デプロイ可
   - No → バックエンドホスティング先を先に決定する必要あり

2. **バックエンドホスティング先の選定**
   - Railway (推奨) / Render / Fly.io / 他

3. **Vercelアカウント情報**
   - デプロイ実行にはVercelアカウントへのアクセスが必要
