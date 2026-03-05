# Railway 環境変数ガイド（バックエンド用）

Railway の「Suggested Variables」で表示される変数のうち、**バックエンドサービスに設定するもの**を整理しました。

**環境ごとの URL・CORS の運用ルール**は [docs/ENV_CONFIG_SUMMARY.md](./ENV_CONFIG_SUMMARY.md) にまとめています。  
開発は **dev の Preview URL のみ**使用し、**CORS_ORIGINS は dev 用には dev 用フロント URL のみ**、本番用には本番ドメインのみを許可する運用に固定してください。

---

## Prisma / OpenSSL でクラッシュする場合: Dockerfile でビルドする

Railpack のランタイムだと Prisma が OpenSSL 1.1 を参照して落ちることがあります。  
**Dockerfile ビルド** に切り替えると、Debian ベースで OpenSSL 3 が使われ、安定して動きます。

1. Railway のバックエンドサービス → **Settings** → **Build**
2. **Builder** で **「Dockerfile」** を選択（Railpack のままにしない）
3. **Dockerfile path** が `Dockerfile` または `./Dockerfile` になっていることを確認（Root Directory が `backend` なら `Dockerfile` で OK）
4. **Build Command / Start Command** は空で OK（Dockerfile の `CMD` が使われます）
5. 保存して **Redeploy**

※ マイグレーションはコンテナ内では実行しません。初回のみローカルで `prisma migrate deploy` を実行してください（下記「DBマイグレーション」参照）。

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

### 既存 DB 向けマイグレーション（type already exists など）

既存の DB に古い `init` が入っている場合、**追加専用**のマイグレーションだけを適用する手順です。  
今後のメンテでも「既存 DB を壊さずにスキーマを足す」ときはこの流れを踏襲してください。

1. **失敗したマイグレーションをロールバック扱いにする**  
   → `migrate resolve --rolled-back <マイグレーション名>`
2. **重複する init を「適用済み」として記録する**  
   → `migrate resolve --applied <マイグレーション名>`
3. **追加のみのマイグレーションを適用する**  
   → `migrate deploy`

```bash
cd backend
# 1. 失敗を解消
DATABASE_URL="postgresql://..." npx prisma migrate resolve --rolled-back 20260218000000_init
# 2. 重複する init は実行せず「適用済み」にする（次の deploy で 20260304... だけが走る）
DATABASE_URL="postgresql://..." npx prisma migrate resolve --applied 20260218000000_init
# 3. 追加のみのマイグレーションを適用
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

※ 追加専用マイグレーションの例: `20260304000000_add_missing_after_old_init`（`migrations/` 内）。

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

## dev ブランチで CORS エラーになる場合（Vercel プレビュー ↔ Railway dev）

**症状:** Vercel の dev プレビュー（例: `https://poker-sns-git-dev-yuito3784s-projects.vercel.app`）から新規登録などすると、  
`Access to fetch at 'https://pokersns-dev.up.railway.app/...' has been blocked by CORS policy` となる。

**原因:** dev 用の Railway バックエンドの `CORS_ORIGINS` に、**Vercel の dev プレビュー URL が含まれていない**。

**対処:** Railway の **dev 用バックエンド** の **Variables** で、`CORS_ORIGINS` にプレビュー URL を追加する（複数ならカンマ区切り）。

| 環境 | CORS_ORIGINS に含める URL 例 |
|------|------------------------------|
| 本番 | `https://あなたの本番ドメイン.vercel.app` |
| dev プレビュー | `https://poker-sns-git-dev-yuito3784s-projects.vercel.app` |

例（dev 用バックエンドで両方許可する場合）:
```
CORS_ORIGINS=https://poker-sns-git-dev-yuito3784s-projects.vercel.app,https://本番のURL
```

※ Vercel のプレビュー URL は「Vercel ダッシュボード → プロジェクト → Deployments → 該当デプロイの URL」で確認できます。ブランチごとに `poker-sns-git-<branch>-<team>.vercel.app` のような形式です。

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
