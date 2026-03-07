# ローカルで Google ログインを検証する手順

## 1. 前提

- バックエンド: `http://localhost:3001`（docker-compose で起動）
- フロント: `http://localhost:3002` または `http://localhost:3000`（`.env` の `FRONTEND_URL` を合わせる）
- ルートの `.env` に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `API_URL` / `FRONTEND_URL` が入っていること

## 2. Google Cloud Console の設定

- **重要:** Google がリダイレクトする先は**バックエンドのURL**だけ。フロントのURL（例: 3000）は不要。
- [Google Cloud Console](https://console.cloud.google.com/) → **API とサービス** → **認証情報** → **OAuth 2.0 クライアント ID**（「ウェブアプリケーション」タイプ）を作成または編集。
- **承認済みのリダイレクト URI** に以下を登録:
  - ローカル: `http://localhost:3001/auth/google/callback`
  - 本番: `https://あなたのAPIドメイン/auth/google/callback`（例: `https://pokersns-production.up.railway.app/auth/google/callback`）
- 「OAuth クライアント ID が見つかりません」「Error 401: invalid_client」が出る場合:
  - 上記リダイレクト URI が**1文字も違わず**登録されているか確認（末尾スラッシュの有無、http/https、ポート番号）。
  - 使用している Client ID が、このクライアントのものか確認（.env の `GOOGLE_CLIENT_ID`）。
  - バックエンドを再起動し、`.env` が読み込まれているか確認（Docker の場合は `docker compose up -d --build backend`）。

## 3. 起動

```bash
# バックエンド（例: docker-compose）
docker compose up -d db backend

# フロント（.env.local の NEXT_PUBLIC_API_URL=http://localhost:3001 を確認）
cd frontend && npm run dev
```

## 4. 動作確認

1. ブラウザでフロント（例: `http://localhost:3002`）を開く
2. 「Google」ボタンをクリック → Google の認証画面に飛ぶ
3. 許可するとアプリに戻り、ログイン状態になる

**失敗したとき:** ブラウザに「認証エラー」「OAuth client was not found」「401 invalid_client」と出る場合は、上記「2. Google Cloud Console の設定」を再確認する。
