# 環境別設定サマリ（dev / stg / prod）

「どれを変えるとどこが変わるか」を1枚で把握するためのマトリクスです。  
設定の層（.env / Railway / Vercel / Docker）が多くても、**どの環境でどの URL と env を使うか**をここに固定します。

---

## 運用ルール（必ず守る）

| ルール | 内容 |
|--------|------|
| **開発** | 常に **dev の Preview URL だけ**を使う。fix/* や feature/* の Vercel プレビューは API 連携に使わない。 |
| **CORS** | **dev 用 Railway** の `CORS_ORIGINS` には **dev 用 Vercel プレビュー URL のみ**を許可。本番用バックエンドには本番ドメインのみ。 |
| **本番** | 本番ドメイン・本番 API のみ。dev 用 URL を本番の CORS に含めない。 |

---

## 環境 × どこで何を設定するか

| 項目 | dev（開発・検証） | stg（あれば） | prod（本番） |
|------|-------------------|----------------|--------------|
| **フロント URL** | Vercel の **dev ブランチ用** プレビュー URL<br>例: `https://poker-sns-git-dev-xxx.vercel.app` | （stg 用プレビュー URL） | 本番ドメイン<br>例: `https://poker-sns.vercel.app` |
| **バックエンド URL** | Railway の **dev 用** サービス URL<br>例: `https://pokersns-dev.up.railway.app` | （stg 用 Railway URL） | Railway 本番 URL |
| **CORS_ORIGINS（Railway）** | 上記 **dev 用 Vercel プレビュー URL のみ**（`https://` 付きで1つ） | stg 用フロント URL のみ | **本番ドメインのみ** |
| **NEXT_PUBLIC_API_URL（Vercel）** | dev 用バックエンド URL | stg 用バックエンド URL | 本番バックエンド URL |
| **NEXT_PUBLIC_SITE_URL（Vercel）** | dev 用フロント URL（またはプレビュー URL） | stg 用フロント URL | 本番ドメイン |
| **DATABASE_URL** | Railway の dev 用 PostgreSQL | stg 用 DB | 本番 DB |

※ `NEXT_PUBLIC_*` は **Vercel 側のみ**。Railway のバックエンドには設定しない。

---

## 設定が書いてあるファイル・ドキュメント

| 設定の種類 | 参照先 |
|------------|--------|
| Railway（バックエンド） | [docs/railway-env-vars.md](./railway-env-vars.md) |
| Vercel（フロント） | [docs/vercel-env-vars.md](./vercel-env-vars.md) |
| ローカル（Docker） | リポジトリ直下の `.env.example` / `docker-compose.yml` |

---

## 変更時のチェックリスト

- **dev で CORS エラーになった** → Railway の **dev 用** の `CORS_ORIGINS` に、**Vercel の dev プレビュー URL を `https://` 付きで** 1 件だけ入れているか確認。
- **本番で CORS エラー** → 本番バックエンドの `CORS_ORIGINS` に本番ドメインだけが入っているか確認。dev 用 URL は含めない。
- **フロントが別 API を叩いている** → その Vercel 環境の `NEXT_PUBLIC_API_URL` が、使いたい環境（dev/prod）のバックエンド URL になっているか確認。
