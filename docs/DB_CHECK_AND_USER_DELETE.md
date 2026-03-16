# DB の確認とユーザー削除の方法

> **Docker のリビルド・Prisma Studio の起動など開発でよく使うコマンド**は [docs/DEV_DOCKER_AND_PRISMA.md](./DEV_DOCKER_AND_PRISMA.md) にまとめています。

## 0. 「User postgres was denied access on the database poker_sns.public」が出る場合

このメッセージは **PostgreSQL の接続・権限** が原因です。次を順に確認してください。

### 接続先を確認する

- **ローカルの Docker DB を使っている場合**
  - ホストマシンから Prisma / バックエンドを実行するときは、**ホスト名は `localhost`** にしてください（コンテナ内では `db`）。
  - 例: `postgresql://postgres:postgres@localhost:5432/poker_sns`
  - プロジェクトの `.env` で `DB_PASSWORD` を変えている場合は、URL のパスワードも同じにしてください（既定は `postgres`）。
  - DB が起動しているか確認: `docker compose ps` で `db` が up になっていること。必要なら `docker compose up -d db`。

- **Railway や Supabase などクラウドの DB を使っている場合**
  - **プロバイダが発行した `DATABASE_URL` をそのまま**使ってください。ユーザー名・パスワード・ホストは書き換えず、提供された URL を `.env` の `DATABASE_URL` に設定してください。
  - クラウド側の「postgres」ユーザーは権限が制限されていることがあり、その場合は「postgres が拒否された」ように見えます。必ずプロバイダの接続情報（ユーザー名・パスワード含む）を使ってください。

### よくある原因

| 状況 | 対処 |
|------|------|
| ホストから Docker DB に繋いでいる | `DATABASE_URL` のホストを `localhost` に（`db` ではなく） |
| パスワードを変えている | URL のパスワードを `.env` の `DB_PASSWORD` と一致させる |
| クラウド DB を使っている | プロバイダの `DATABASE_URL` をそのまま使う（ユーザー名を `postgres` に書き換えない） |
| DB コンテナが止まっている | `docker compose up -d db` で起動し、`docker compose ps` で確認 |

バックエンドや Prisma Studio を動かすときは、**どの `.env` の `DATABASE_URL` が読まれているか**（`backend/.env` やプロジェクトルートの `.env`）も確認してください。

### P3009「failed migrations がある」＋ 実際の DB は空の場合

マイグレーションが途中で失敗し、`_prisma_migrations` にだけ失敗レコードが残っているときは、その行を削除してから `migrate deploy` をやり直す。

```bash
# プロジェクトルートで（Docker の DB を使っている場合）
docker compose exec db psql -U yuito -d poker_sns -c "DELETE FROM \"_prisma_migrations\" WHERE migration_name = '20260218000000_init';"

cd backend
npx prisma migrate deploy
```

失敗したマイグレーション名はエラーメッセージの `The \`20260218000000_init\` migration ... failed` で確認できる。別のマイグレーションで失敗している場合は、上記の `20260218000000_init` をその名前に置き換える。

---

## 1. DB の内容を確認する

### 方法A: ターミナルで psql（Docker）

プロジェクトルートで:

```bash
docker compose exec db psql -U postgres -d poker_sns -c "SELECT id, name, username, email, \"lineId\", \"googleId\" FROM \"User\";"
```

- 全カラムを見たい場合:
  ```bash
  docker compose exec db psql -U postgres -d poker_sns -c "\d \"User\""
  docker compose exec db psql -U postgres -d poker_sns -c "SELECT * FROM \"User\";"
  ```
- 対話モードで続けて SQL を打つ場合:
  ```bash
  docker compose exec -it db psql -U postgres -d poker_sns
  ```
  入ったあと例:
  ```sql
  SELECT id, name, username, email, "lineId" FROM "User";
  \q
  ```

### 方法B: Prisma Studio（GUI）

テーブルをブラウザで見たり編集したりできます。

**事前にスキーマをDBに反映（`AiAnalysis` や `Tip` などのテーブルが存在しないエラーが出る場合）:**

```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/poker_sns" npx prisma db push
```

- `db push` はスキーマとDBの差分を解消し、不足テーブルを一括作成します。  
- 既存のマイグレーションだけでは足りないテーブル（Tip, AiAnalysis など）がある場合に有効です。

**Prisma Studio を起動:**

```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/poker_sns" npx prisma studio
```

- ブラウザで http://localhost:5555 が開きます
- 左の **User** をクリックすると一覧表示
- 行の編集・削除も可能（「Delete」で削除）

※ `DB_PASSWORD` を変更している場合は、URL の `postgres` をそのパスワードに置き換えてください。

---

## 2. ユーザーを削除する

### 方法A: アプリの設定から削除（推奨）

1. そのユーザーでログインする
2. **設定**（/settings）を開く
3. 下の方の **「アカウント削除」** で手順に従って削除

→ 関連データ（投稿・フォロー・通知など）もまとめて削除されます。

### 方法B: SQL で直接削除

**特定の 1 ユーザーを削除する（username が分かっている場合）:**

```bash
docker compose exec db psql -U postgres -d poker_sns -c "DELETE FROM \"User\" WHERE username = '___';"
```

**LINE で作ったユーザーだけ削除する（例: プレースホルダーメールのユーザー）:**

```bash
docker compose exec db psql -U postgres -d poker_sns -c "DELETE FROM \"User\" WHERE \"lineId\" IS NOT NULL;"
```

**1 件だけ削除する（id で指定）:**

```bash
# まず id を確認
docker compose exec db psql -U postgres -d poker_sns -c "SELECT id, username FROM \"User\";"

# 例: id が abc-123 のユーザーを削除
docker compose exec db psql -U postgres -d poker_sns -c "DELETE FROM \"User\" WHERE id = 'abc-123';"
```

※ Prisma のスキーマでは関連テーブルに `onDelete: Cascade` が付いているため、User を削除すると多くの関連レコードは自動で消えます。付いていないリレーションがある場合は、先にそのテーブルの行を削除する必要があることがあります。

---

## 3. 挙動確認の流れ（LINE ユーザーを作り直す場合）

1. 上記のいずれかで **既存の LINE ユーザーを削除**
2. ブラウザで **ログアウト**（またはローカルストレージの token / refreshToken を削除）
3. 再度 **「LINEでログイン」** して新規作成
4. **DB を確認**: `username` が `line` + 英数字8文字（例: `line7k2m9x1`）になっているか確認
5. 必要なら **プロフィール編集**でユーザー名を変更できるか確認
