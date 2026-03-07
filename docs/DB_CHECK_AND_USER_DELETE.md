# DB の確認とユーザー削除の方法

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
