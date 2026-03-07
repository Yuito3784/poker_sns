# Vercel 環境変数一覧

Vercel ダッシュボードの **Settings → Environment Variables** で以下を追加するときのメモです。  
Key をコピペして、Value を実際の値に置き換えてください。

---

## 一覧（コピー用）

| Key | 説明 | Value の例 |
|-----|------|------------|
| `NEXT_PUBLIC_API_URL` | バックエンドAPIのURL | `https://your-api.railway.app` |
| `NEXT_PUBLIC_SITE_URL` | フロントの本番URL（OGP・sitemap用） | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 測定ID（任意） | `G-XXXXXXXXXX` |

---

## Key だけコピー用（Vercel に1つずつ追加するとき）

```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_GA_MEASUREMENT_ID
```

---

## 値のプレースホルダ付き（参考用・そのまま貼らないこと）

```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

※ Value は Vercel の「Add Environment Variable」の **Value** 欄に、上記の Key に対応する実際の値だけを入れてください。  
※ `NEXT_PUBLIC_GA_MEASUREMENT_ID` は使わない場合は追加しなくてOKです。
