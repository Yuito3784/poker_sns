# Railway 環境変数ガイド（バックエンド用）

Railway の「Suggested Variables」で表示される変数のうち、**バックエンドサービスに設定するもの**を整理しました。

---

## 重要: バックエンドには NEXT_PUBLIC_* を入れない

`NEXT_PUBLIC_*` は **フロントエンド（Vercel）用** です。Railway のバックエンドサービスには追加しないでください。

- ❌ Railway に設定しない: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- ✅ これらは Vercel の Environment Variables に設定する（`docs/vercel-env-vars.md` 参照）

---

## DATABASE_URL について

**Suggested には出てきませんが、必須です。**

1. 同じプロジェクトで **PostgreSQL** を追加（+ New → Database → PostgreSQL）
2. PostgreSQL の **Variables** タブに表示される **`DATABASE_URL`** をコピー
3. バックエンドの **Variables** に **「Add Variable」で手動追加** するか、  
   PostgreSQL を「Reference」して `DATABASE_URL` を参照する

---

## DBマイグレーション（初回のみ）

Railway のランタイムでは Prisma の OpenSSL 互換性の都合で `prisma migrate deploy` が失敗することがあります。  
**初回のみ**、ローカルで以下を実行してテーブルを作成してください。

1. Railway の PostgreSQL の **Variables** で **`DATABASE_PUBLIC_URL`** または **Connect** から接続文字列をコピー（外部接続用の URL）
2. ローカルで:
   ```bash
   cd backend
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```
3. 成功したら Railway のバックエンドは再デプロイ不要で、アプリから DB にアクセスできます。

---

## まず設定するもの（最小構成）

| Name | Value の例・メモ |
|------|------------------|
| `DATABASE_URL` | PostgreSQL の Variables からコピー（上記） |
| `JWT_SECRET` | ランダムな長い文字列（例: ターミナルで `openssl rand -base64 64` の結果を貼る） |
| `API_URL` | **デプロイ後に決まる** バックエンドの公開 URL（例: `https://poker-sns-backend-xxxx.up.railway.app`）。最初は仮で同じ形の URL を書いても可。 |
| `FRONTEND_URL` | Vercel の URL（例: `https://poker-sns.vercel.app`） |
| `CORS_ORIGINS` | Vercel の URL と同じ（例: `https://poker-sns.vercel.app`）。複数ならカンマ区切り。 |

※ `PORT` は Railway が自動で入れるので、**追加しない** でOK。

---

## Suggested のうち「今はスキップしてよい」もの

メール・OAuth・決済などは、動かしたい機能に合わせて後から追加します。

| Name | いつ設定するか |
|------|----------------|
| `DB_PASSWORD` | 自前で PostgreSQL を立てる場合のみ。Railway の PostgreSQL を使う場合は不要（DATABASE_URL に含まれる） |
| `SMTP_*` | パスワードリセットメール等を使うとき |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google ログインを有効にするとき |
| `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` | LINE ログインを有効にするとき |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X ログインを有効にするとき |
| `STRIPE_*` | 決済を有効にするとき |
| `ANTHROPIC_API_KEY` | AI 機能を使うとき |
| `ERROR_WEBHOOK_URL` / `SERVICE_NAME` | エラー通知などを使うとき |
| `TOKEN_ENCRYPTION_KEY` | OAuth 等で必要なら（32バイトのランダム文字列） |
| `X_AUTOPOST_*` | X 自動投稿機能を使うとき |

---

## コピー用: 最小構成の Key 一覧

```
DATABASE_URL
JWT_SECRET
API_URL
FRONTEND_URL
CORS_ORIGINS
```

1. 先に **PostgreSQL を追加** して `DATABASE_URL` を取得
2. 上記 5 つをバックエンドの Variables に追加
3. デプロイ後に **API_URL** を実際の Railway の URL に更新し、必要なら再デプロイ

---

## まとめ

- **Railway のバックエンド** には、上記「まず設定するもの」＋ 使う機能に応じた SMTP / OAuth / Stripe 等を追加する。
- **NEXT_PUBLIC_* は Railway には入れず、Vercel 側だけに設定する。**

Vercel 用の変数一覧は `docs/vercel-env-vars.md` を参照してください。
