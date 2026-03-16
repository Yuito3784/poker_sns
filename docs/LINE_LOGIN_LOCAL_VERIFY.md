# ローカルで LINE ログインを検証する手順

## 1. 前提

- バックエンド: `http://localhost:3001`（docker-compose で起動）
- フロント: `http://localhost:3002` または `http://localhost:3000`（`.env` の `FRONTEND_URL` を合わせる）
- ルートの `.env` に `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` / `API_URL` / `FRONTEND_URL` が入っていること

## 2. LINE Developers のコールバックURL

- **重要:** LINE がリダイレクトする先は**バックエンドのURL**だけ。フロントのURL（例: 3000）は不要。
- ローカルで必要なのは **1件** だけ:
  - `http://localhost:3001/auth/line/callback`
- `http://localhost:3000/auth/line/callback` は**不要**（3000 はフロントなので、認証コードを処理するバックエンドに届かない）。登録していても害はないが、実際に使うのは 3001。
- 本番・ステージング用の URL（Vercel / Railway など）は環境ごとにそのまま登録してよい。

## 3. 起動

```bash
# バックエンド（例: docker-compose）
docker compose up -d db backend
# または backend だけローカルで: cd backend && npm run start:dev

# フロント（.env.local の NEXT_PUBLIC_API_URL=http://localhost:3001 を確認）
cd frontend && npm run dev
# 表示されたポート（例: 3002）で開く
```

## 4. 動作確認

1. ブラウザで `http://localhost:3002`（または使っているポート）を開く
2. 「LINE」ボタンをクリック → LINE の認証画面に飛ぶ
3. 許可するとアプリに戻り、ログイン状態になる

**失敗したとき:** バックエンドの**ターミナル（ログ）**を確認する。

- `LINE callback error: ...` → LINE 側のエラー（キャンセルや設定不備）
- `LINE callback: code is missing` → LINE が code を返していない（コールバックURL不一致の可能性）
- `LINE login failed` とスタックトレース → 次のような原因が考えられます:
  - `stateが無効または期限切れ` → 認証開始からコールバックまで時間が空いた、またはバックエンドが再起動した
  - `LINE認証に失敗しました` → トークン交換失敗（LINE の Channel ID/Secret またはコールバックURLの不一致）
  - `LINEプロフィールの取得に失敗しました` → トークンは取れたがプロフィール取得で失敗

## 5. フロントのポートが 3000 の場合

ルートの `.env` で次にしておく:

- `FRONTEND_URL=http://localhost:3000`
- `CORS_ORIGINS=http://localhost:3000,http://localhost:3002` のままで可

変更したらバックエンドを再起動する。
