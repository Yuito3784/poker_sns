# poker_sns リリース手順

**現状から本番リリースまでの流れ**（バックエンド → フロントエンドの順で進めます）

---

## 全体の流れ（どれを先にやるか）

| 順番 | やること | 理由 |
|------|----------|------|
| **1** | **Railway でバックエンド + DB** | API の URL が決まらないと Vercel の `NEXT_PUBLIC_API_URL` を確定できない |
| **2** | **Vercel でフロントエンド** | Railway の URL を環境変数に入れてデプロイ（または既にデプロイ済みなら環境変数だけ更新） |
| **3** | **接続・動作確認** | 認証・投稿・CORS の確認 |

※ すでに Vercel にフロントだけデプロイ済みの場合は、**1 → 2 の「Vercel の環境変数更新」→ 3** で OK です。

---

## Step 1: Railway でバックエンドをデプロイ

### 1-1. Railway の準備

1. [Railway](https://railway.app/) にログイン（GitHub 連携推奨）
2. **New Project** → **Deploy from GitHub repo**
3. リポジトリ `Yuito3784/poker_sns` を選択
4. デプロイ設定で **Root Directory を `backend` に変更**（重要）

### 1-2. PostgreSQL を追加

1. 同じ Project 内で **+ New** → **Database** → **PostgreSQL** を追加
2. 追加した PostgreSQL をクリック → **Variables** タブで **`DATABASE_URL`** をコピー

### 1-3. バックエンドの環境変数を設定

Railway の **Backend サービス** → **Variables** で以下を設定する。

**必須（最小構成）**

| Key | Value | メモ |
|-----|--------|------|
| `DATABASE_URL` | （PostgreSQL の Variables からコピー） | 例: `postgresql://postgres:xxx@xxx.railway.app:5432/railway` |
| `JWT_SECRET` | ランダムな長い文字列 | 例: `openssl rand -base64 64` で生成 |
| `PORT` | （通常は設定不要） | Railway が自動で `PORT` を注入 |
| `API_URL` | バックエンドの公開 URL | デプロイ後に表示される URL（例: `https://xxx.railway.app`） |
| `FRONTEND_URL` | フロントの URL | まだなら仮で `https://poker-sns.vercel.app` など |
| `CORS_ORIGINS` | フロントの URL（カンマ区切り可） | 例: `https://poker-sns.vercel.app` |

**任意（後からでも可）**

| Key | Value |
|-----|--------|
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | メール送信（パスワードリセット等） |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google ログイン |
| `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` | LINE ログイン |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | 決済 |

### 1-4. ビルド・起動コマンド（Railway の設定）

- **Build Command**: `npm run build` または `npx prisma generate && nest build`
- **Start Command**: `npm run start:prod` または `node dist/main`
- **Root Directory**: `backend` のままであることを確認

### 1-5. デプロイと URL 確認

1. デプロイが走り、成功したら **Settings** → **Networking** で **Generate Domain** を実行
2. 表示された URL（例: `https://poker-sns-backend-production-xxxx.up.railway.app`）をメモ
3. ブラウザで `https://<そのURL>/health` にアクセスして `OK` などが返れば OK
4. **`API_URL` と `CORS_ORIGINS` を、この本番 URL と Vercel の URL に合わせて再設定**し、必要なら再デプロイ

---

## Step 2: Vercel でフロントエンドをデプロイ

### 2-1. プロジェクト設定（初回のみ）

1. [Vercel](https://vercel.com/) → **Add New** → **Project** → GitHub の `poker_sns` を選択
2. **Root Directory** を **`frontend`** に変更
3. **Framework Preset**: Next.js（自動検出で OK）
4. **Build Command**: `npm run build`（デフォルトで OK）
5. **Deploy** を実行

### 2-2. 環境変数（Vercel）

**Settings** → **Environment Variables** で次を追加（本番用）。

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | Step 1 で決めた **Railway のバックエンド URL**（末尾スラッシュなし）例: `https://poker-sns-backend-xxx.up.railway.app` |
| `NEXT_PUBLIC_SITE_URL` | Vercel の本番 URL（例: `https://poker-sns.vercel.app`）またはカスタムドメイン |

※ 詳細は `docs/vercel-env-vars.md` を参照。

### 2-3. 再デプロイ

環境変数を追加・変更したら **Deployments** から **Redeploy** する（環境変数は再デプロイで反映されます）。

---

## Step 3: リリース後の確認

### 3-1. 疎通確認

1. **フロント**: Vercel の URL を開く（例: `https://poker-sns.vercel.app`）
2. **LP**: `/lp` が表示されること
3. **認証**: メール登録 or ログインができること（SMTP 未設定ならメール認証はスキップ or 後回し）
4. **フィード**: ログイン後に投稿一覧・投稿作成ができること

### 3-2. CORS

- ログインや API 呼び出しで CORS エラーが出る場合、Railway の **`CORS_ORIGINS`** に  
  **Vercel の URL を正確に** 含めているか確認（`https`・末尾スラッシュなし・複数ならカンマ区切り）

### 3-3. Stripe（決済を使う場合）

- Stripe ダッシュボードの **Webhooks** で、**Endpoint URL** を  
  `https://<RailwayのバックエンドURL>/subscriptions/webhook` に設定
- Railway の **STRIPE_WEBHOOK_SECRET** に、そのエンドポイントの「Signing secret」を設定

---

## チェックリスト（コピー用）

```
[ ] Railway: プロジェクト作成・backend を Root に設定
[ ] Railway: PostgreSQL 追加・DATABASE_URL をコピー
[ ] Railway: 必須環境変数設定（DATABASE_URL, JWT_SECRET, API_URL, FRONTEND_URL, CORS_ORIGINS）
[ ] Railway: デプロイ成功・公開 URL をメモ
[ ] Railway: /health が返ることを確認
[ ] Vercel: プロジェクト作成・Root Directory = frontend
[ ] Vercel: NEXT_PUBLIC_API_URL に Railway の URL を設定
[ ] Vercel: NEXT_PUBLIC_SITE_URL に Vercel の URL を設定
[ ] Vercel: 再デプロイ
[ ] ブラウザ: LP・ログイン・投稿が動作することを確認
[ ] （任意）Stripe Webhook URL を本番バックエンド URL に更新
```

---

## まとめ

- **先に Railway でバックエンド + DB** を用意し、**公開 URL を確定させる**。
- その URL を **Vercel の `NEXT_PUBLIC_API_URL`** に入れ、フロントをデプロイ（または既存 Vercel の環境変数だけ更新）。
- 最後に **CORS** と **動作確認** でリリース完了です。

環境変数の一覧は `docs/vercel-env-vars.md`（Vercel 用）と、リポジトリ直下の `docker-compose.yml` の `backend.environment`（Railway 用の参考）を参照してください。
