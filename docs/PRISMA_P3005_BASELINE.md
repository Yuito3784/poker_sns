# P3005 エラー対策 — 既存 DB のベースライン

デプロイ時に `prisma migrate deploy` が次のエラーで失敗する場合の対処です。

```
Error: P3005
The database schema is not empty. Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline
```

---

## なぜ起こるか

- **Railway の DB** には、すでにテーブルが存在している（過去に `db push` や手動で作った、別ブランチでマイグレーションを流した、など）。
- 一方で **`_prisma_migrations`** テーブルが空、またはリポジトリのマイグレーション履歴と一致していない。
- その状態で `migrate deploy` を実行すると、「DB は空ではないのに、適用済みマイグレーションが記録されていない」と判断され、P3005 が発生します。

**ベースライン** = 「既存のマイグレーションはすべて“適用済み”として記録する」作業です。  
これを行えば、以降の `migrate deploy` では**新しいマイグレーションだけ**が適用され、P3005 は出なくなります。

---

## 前提

- **開発環境用 DB** と **本番環境用 DB** は別々なので、**それぞれの `DATABASE_URL` に対して 1 回ずつ**ベースラインが必要です。
- 実行するマシンに **対象 DB への接続**（`DATABASE_URL`）が必要です。Railway の「Connect」や Variables の `DATABASE_PUBLIC_URL` を使います。
- **実施前に DB のバックアップ**を推奨します（[docs/railway-env-vars.md](./railway-env-vars.md) の「DBバックアップ」参照）。

---

## 手順（1 環境あたり 1 回）

### 1. 対象環境の DATABASE_URL を用意

- Railway ダッシュボード → 対象プロジェクト → **PostgreSQL** → **Variables** または **Connect**
- 接続文字列（`postgresql://...`）をコピーし、環境変数 `DATABASE_URL` に設定できるようにする（後述のコマンドで使用）。

### 2. backend で「適用済み」を記録する

**リポジトリにある 10 個のマイグレーション**を、すべて「適用済み」として `_prisma_migrations` に登録します。  
**SQL は実行されません。** 履歴テーブルにレコードを入れるだけです。

`backend` ディレクトリで、次のコマンドを **1 行ずつ**実行してください（`DATABASE_URL` は実際の値に置き換え）。

```bash
cd backend

# 以下、DATABASE_URL を開発用 or 本番用に設定した状態で実行
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/railway?schema=public"

npx prisma migrate resolve --applied 20260124140302_init
npx prisma migrate resolve --applied 20260125070843_add_poker_hand
npx prisma migrate resolve --applied 20260125072258_add_structured_actions
npx prisma migrate resolve --applied 20260216000000_add_ad_model
npx prisma migrate resolve --applied 20260216000001_seed_sample_ad
npx prisma migrate resolve --applied 20260218000000_init
npx prisma migrate resolve --applied 20260304000000_add_missing_after_old_init
npx prisma migrate resolve --applied 20260307100000_add_ai_analysis
npx prisma migrate resolve --applied 20260314000000_add_subscription_plan
npx prisma migrate resolve --applied 20260315000000_add_post_is_premium_only
```

- **開発環境用 DB** に対して上記を 1 回実行。
- **本番環境用 DB** に対して、同じ 10 行を別の `DATABASE_URL` で 1 回実行。

### 3. 動作確認

同じ `DATABASE_URL` のまま:

```bash
npx prisma migrate deploy
```

- 「Already up to date.」など、エラーなく終了すれば OK です。
- この状態で Railway のバックエンドを再デプロイすると、起動時の `prisma migrate deploy` も P3005 なく通ります。

---

## 今後の運用（エラーを起こさないようにする）

1. **スキーマを変えるとき**
   - ローカルで **`npx prisma migrate dev --name 変更内容の説明`** を使い、**必ずマイグレーション用の SQL ファイル**を `prisma/migrations/` に追加する。
   - `prisma db push` は本番や共有 DB には使わない（履歴が残らず、P3005 の原因になり得る）。

2. **デプロイ時**
   - 起動コマンドの `prisma migrate deploy` はそのままでよい。
   - ベースライン済みの DB では、**未適用のマイグレーションだけ**が実行され、既存テーブルは触れません。

3. **新しいマイグレーションを追加したあと**
   - 通常は push → デプロイで、`migrate deploy` が新しい 1 本だけを適用します。
   - 何か理由で「この DB にはこのマイグレーションは既に手で入れた」という場合は、  
     [docs/railway-env-vars.md](./railway-env-vars.md) の「既存 DB 向けマイグレーション」にある `migrate resolve --applied` / `--rolled-back` を利用してください。

---

## マイグレーション一覧の確認

`prisma/migrations` に新しいフォルダを追加した場合は、そのフォルダ名を `migrate resolve --applied <名前>` に含めます。  
一覧は次で確認できます。

```bash
ls -1 prisma/migrations
```

`migration_lock.toml` と `*.sql` 以外の **ディレクトリ名** がマイグレーション名です。
