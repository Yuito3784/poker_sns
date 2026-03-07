# 開発でよく使うコマンド（Docker・Prisma）

プロジェクトルート（`docker-compose.yml` があるディレクトリ）での作業を前提にしています。

---

## 1. Docker の起動・停止・リビルド

### 起動

```bash
# DB とバックエンドを起動（バックグラウンド）
docker compose up -d db backend

# フロントも含めて全部起動する場合
docker compose up -d
```

### 停止

```bash
# 全サービス停止
docker compose down

# 停止だけしてコンテナは残す
docker compose stop
```

### バックエンドのリビルド（コード変更を反映したいとき）

`.env` の変更やバックエンドのソース変更を反映するには、イメージをビルドし直して起動し直します。

```bash
# バックエンドだけリビルドして起動
docker compose up -d --build backend
```

- `--build` でイメージを再ビルド、`-d` でバックグラウンド起動
- 他のサービス（db など）はそのまま

### 全サービスをリビルドして起動

```bash
docker compose up -d --build
```

### ログを見る

```bash
# バックエンドのログをリアルタイム表示
docker compose logs -f backend

# 直近だけ
docker compose logs --tail=50 backend
```

---

## 2. Prisma Studio（DB を GUI で見る）

テーブル一覧・レコードの閲覧・編集・削除がブラウザでできます。

### 起動方法

**前提:** `docker compose up -d db` で DB が起動していること。

```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/poker_sns" npx prisma studio
```

- ブラウザで **http://localhost:5555** が開きます
- 左のテーブル名（例: **User**）をクリックして一覧表示
- 行の編集・削除も可能

**パスワードを変えている場合:** ルートの `.env` の `DB_PASSWORD` に合わせて URL を変えます。

```bash
# 例: DB_PASSWORD=mysecret の場合
DATABASE_URL="postgresql://postgres:mysecret@localhost:5432/poker_sns" npx prisma studio
```

**backend の .env を使う場合:** `backend/.env` に `DATABASE_URL` があれば、次のように省略できます。

```bash
cd backend
npx prisma studio
```

---

## 3. DB スキーマの反映

Prisma の `schema.prisma` を DB に反映する方法です。

### 開発中（差分をそのまま反映したいとき）

```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/poker_sns" npx prisma db push
```

- スキーマと DB の差分を解消し、不足テーブル・カラムを追加します
- マイグレーション履歴は作らず、今のスキーマに合わせるだけのときに使います
- Prisma Studio で「テーブルがない」と言われたときにも有効です

### 本番向け（マイグレーションを残したいとき）

```bash
cd backend
npx prisma migrate dev --name 変更の説明
```

- マイグレーションファイルが作成され、履歴が残ります
- 本番デプロイ時は `prisma migrate deploy` を使います

---

## 4. よく使うコマンド一覧

| やりたいこと | コマンド |
|-------------|----------|
| DB + バックエンド起動 | `docker compose up -d db backend` |
| バックエンドだけリビルド | `docker compose up -d --build backend` |
| 全停止 | `docker compose down` |
| バックエンドのログを見る | `docker compose logs -f backend` |
| Prisma Studio を開く | `cd backend` → `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/poker_sns" npx prisma studio` |
| スキーマを DB に反映（開発用） | `cd backend` → `DATABASE_URL="..." npx prisma db push` |
| DB の中身を SQL で確認 | `docker compose exec db psql -U postgres -d poker_sns -c "SELECT id, username, email FROM \"User\";"` |

---

## 5. 関連ドキュメント

- **DB の確認・ユーザー削除:** [docs/DB_CHECK_AND_USER_DELETE.md](./DB_CHECK_AND_USER_DELETE.md)
- **環境変数:** ルートの [.env.example](../.env.example) をコピーして `.env` を用意
