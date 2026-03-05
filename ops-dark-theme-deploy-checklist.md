# Operations: ダークテーマ統一 - デプロイ・検証チェックリスト

## 1. Tailwind CSS purge リスク評価

**結論: 低リスク**

- 本プロジェクトは **Tailwind CSS v4** を使用（`@tailwindcss/postcss` プラグイン方式）
- v4 ではソースファイルを自動スキャンするため、従来の `safelist` 設定は不要
- 修正箇所のクラス (`bg-[#0d1009]`, `text-[#ddd6c8]` 等) は **arbitrary value** 記法であり、ソースに記述があれば purge 対象にならない
- globals.css に `@theme inline` でカスタムプロパティ定義済み → CSS変数ベースの色指定も安全

**注意点**: `bg-[#0d1009]` のような arbitrary value はソースコード内に存在する限り保持される。動的に文字列結合でクラス名を生成している箇所がないか確認済み（該当なし）。

---

## 2. デプロイフロー

```
fix/dark-theme-unify ブランチ
  ↓ CEO確認・承認
dev ブランチへマージ
  ↓ 自動/手動デプロイ
docker compose build --no-cache frontend  ← キャッシュクリア推奨
docker compose up -d frontend
```

### キャッシュクリア手順

Docker ビルド時に `.next` キャッシュが前回のレイヤーから引き継がれる可能性があるため:

```bash
# 推奨: フロントエンドのみキャッシュなしリビルド
docker compose build --no-cache frontend

# 代替: ビルドキャッシュ全クリア後にリビルド
docker builder prune -f && docker compose build frontend

# コンテナ再起動
docker compose up -d frontend
```

---

## 3. デプロイ後 目視検証チェックリスト

| # | ページ | URL パス | 確認項目 | 合否 |
|---|--------|----------|----------|------|
| 1 | トレンド/おすすめ | `/explore` | 背景 `#0d1009`、テキスト読みやすさ | |
| 2 | ハッシュタグ | `/hashtag/[tag]` | 背景 `#0d1009`、テキスト読みやすさ | |
| 3 | ホーム (フィード) | `/` | 背景・カード色の統一 | |
| 4 | 検索 | `/search?q=xxx` | 背景・入力フォーム色 | |
| 5 | ブックマーク | `/bookmarks` | 背景色 | |
| 6 | 通知 | `/notifications` | 背景色 | |
| 7 | 設定 | `/settings` | 背景色・フォーム要素の色 | |
| 8 | プロフィール | `/profile/[id]` | 背景色 | |
| 9 | 投稿詳細 | `/post/[id]` | 背景色 | |
| 10 | パートナー | `/partners` | 背景色 | |
| 11 | LP | `/lp` | 背景色 | |
| 12 | パスワードリセット | `/forgot-password` | 背景色・フォーム色 | |
| 13 | メール認証 | `/verify-email` | 背景色 | |
| 14 | 利用規約 | `/terms` | 背景色・テキスト色 | |
| 15 | プライバシー | `/privacy` | 背景色・テキスト色 | |

### 各ページ共通確認項目
- [ ] 背景色が白 (`#fff`, `#eef3ea`, `bg-white` 等) でないこと
- [ ] テキストがダーク背景上で十分なコントラスト比 (WCAG AA 4.5:1 以上)
- [ ] モーダル/ダイアログの背景色が統一されていること
- [ ] ローディングスピナー/スケルトンの色がダークテーマに合っていること
- [ ] フォーム入力欄の背景・ボーダーがダークテーマに統一されていること

---

## 4. ビルド成功確認

デプロイ後、以下でビルドエラーがないことを確認:

```bash
# コンテナログ確認
docker compose logs frontend --tail=50

# ヘルスチェック（200 OK を確認）
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/explore
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

---

## 5. ロールバック手順

万が一デプロイ後に問題が発生した場合:

```bash
# dev ブランチで修正コミットを revert
git revert <merge-commit-hash>
git push origin dev

# 再デプロイ
docker compose build --no-cache frontend
docker compose up -d frontend
```
