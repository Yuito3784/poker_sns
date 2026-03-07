# LINEログイン 本番対応チェックリスト

## 本番の API_URL について

- **現在の本番 API_URL**（Railway）: `https://pokersns-production.up.railway.app`
- これは**バックエンドのURL**なので**正しい**です。変更不要です。

---

## やること（箇条書き）

1. **LINE Developers で本番コールバックURLを登録**
   - [LINE Developers Console](https://developers.line.biz/console/) → poker_sns → pokerlogin → **LINEログイン設定**
   - コールバックURLに以下を**追加**（編集ボタンから）:
     - `https://pokersns-production.up.railway.app/auth/line/callback`
   - 既に Vercel の URL だけ登録している場合は、上記 Railway のURLが必須です（LINE は認証後に**バックエンド**へリダイレクトするため）。

2. **Railway のバックエンドに環境変数を追加**
   - poker_sns プロジェクト → バックエンドのサービス → **Variables** タブ
   - **+ New Variable** で以下を追加（値はローカル .env と同じでOK）:
     - `LINE_CLIENT_ID` = `2009356988`
     - `LINE_CLIENT_SECRET` = `037800399fd939bcb80d8b152f7dfe67`
   - すでに `API_URL` / `FRONTEND_URL` / `CORS_ORIGINS` が入っていればそのままでOK。

3. **保存後**
   - Railway は変数保存で自動再デプロイされる場合があります。されない場合は **Redeploy** を実行。
   - 本番フロント（Vercel）から「LINEでログイン」を押し、ログイン完了まで確認する。

---

## 参照: 本番で必要な環境変数（Railway バックエンド）

| 変数名 | 本番の例 |
|--------|----------|
| API_URL | `https://pokersns-production.up.railway.app` |
| FRONTEND_URL | あなたの本番フロントURL（例: Vercel の本番URL） |
| CORS_ORIGINS | 上記フロントURLと同じ |
| LINE_CLIENT_ID | `2009356988` |
| LINE_CLIENT_SECRET | （チャネルシークレット） |

詳細は [docs/railway-env-vars.md](./railway-env-vars.md) を参照。
