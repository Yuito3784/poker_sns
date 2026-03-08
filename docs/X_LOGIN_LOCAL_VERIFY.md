# ローカルで X（Twitter）ログインを検証する手順

## 1. 前提

- バックエンド: `http://localhost:3001`（docker-compose で起動）
- フロント: `http://localhost:3002` または `http://localhost:3000`（`.env` の `FRONTEND_URL` を合わせる）
- ルートの `.env` に **実際の** `X_CLIENT_ID` / `X_CLIENT_SECRET` が入っていること（`xxx` のままでは動きません）

## 2. Twitter Developer Portal の設定

- **重要:** X がリダイレクトする先は**バックエンドのURL**です。フロントのURLは不要。
- [Twitter Developer Portal](https://developer.twitter.com/)（旧 Twitter for Developers）にログイン → **Projects & Apps** → 対象のアプリ（または新規作成）を開く。
- **User authentication settings** で **Set up** または **Edit** をクリック。
- **App permissions**: 少なくとも **Read**（ログインのみなら Read で可）。
- **Type of App**: **Web App, Automated App or Bot** を選択。
- **Callback URI / Redirect URL** に以下を**1件ずつ**登録:
  - ローカル: `http://localhost:3001/auth/x/callback`
  - 本番: `https://あなたのAPIドメイン/auth/x/callback`（例: `https://pokersns-production.up.railway.app/auth/x/callback`）
- **Website URL** は任意（例: `http://localhost:3000`）。
- 保存後、**Client ID** と **Client Secret** をコピーし、ルートの `.env` に設定:
  - `X_CLIENT_ID=`（表示されている Client ID）
  - `X_CLIENT_SECRET=`（表示されている Client Secret）

「問題が発生しました」「アプリにアクセスを許可できません」が出る場合:

- コールバック URI が **完全一致** しているか確認（`http://localhost:3001/auth/x/callback`、末尾スラッシュなし）。
- `.env` の `X_CLIENT_ID` / `X_CLIENT_SECRET` が **xxx ではなく**、Developer Portal の値か確認。
- 変更後はバックエンドを再起動: `docker compose up -d --build backend`。

## 3. 起動

```bash
docker compose up -d db backend
cd frontend && npm run dev
```

## 4. 動作確認

1. ブラウザでフロント（例: `http://localhost:3002`）を開く
2. 「X」ボタンをクリック → X の認証画面に飛ぶ
3. 許可するとアプリに戻る（初回はメール入力画面が出る場合あり）
4. ログイン完了後、タイムライン等が表示されればOK

**X 側のエラー時:** 上記「2. Twitter Developer Portal の設定」のコールバック URI と Client ID / Secret を再確認する。
