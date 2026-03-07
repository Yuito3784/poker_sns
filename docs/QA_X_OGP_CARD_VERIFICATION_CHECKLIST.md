# QA/QC: X (Twitter) OGPカードプレビュー検証チェックリスト

**Version:** 1.0
**Author:** QA/QC (尾丸)
**Date:** 2026-03-07
**Status:** Dev OGP修正完了後、即実行可能
**関連:** `docs/X_INITIAL_CONTENT_PLAN.md`, `docs/QA_OGP_SHARE_TEST_PLAN.md`

---

## 1. 目的

X初期投稿（10投稿）公開前に、OGPカードがX上で正しく表示されることを検証する。
投稿にリンクを含む場合、カード展開の不備がエンゲージメント低下に直結するため、事前確認は必須。

---

## 2. 検証対象ページ（3ページ）

| # | ページ | URL例 | OGP方式 | 優先度 |
|---|--------|--------|---------|--------|
| 1 | トップページ `/` | `https://{SITE_URL}/` | 静的 metadata + opengraph-image.tsx | HIGH |
| 2 | 投稿詳細 `/post/[id]` | `https://{SITE_URL}/post/1` | 動的 generateMetadata + opengraph-image.tsx | HIGH |
| 3 | LP `/lp` | `https://{SITE_URL}/lp` | 静的 metadata（og:image未明示） | HIGH |

---

## 3. 検証ツール

| ツール | 用途 | URL |
|--------|------|-----|
| X Card Validator | Xカードプレビュー確認 | https://cards-dev.twitter.com/validator |
| Open Graph Debugger (各種) | メタタグ値の確認 | https://www.opengraph.xyz/ |
| curl / DevTools | HTMLソースでのメタタグ確認 | - |

---

## 4. 検証チェックリスト

### 4.1 トップページ `/`

#### A. メタタグ値の確認（DevTools / curl）

- [ ] `og:title` = "Poker SNS - ポーカーハンドを共有しよう"
- [ ] `og:description` が設定されている（空でない）
- [ ] `og:type` = "website"
- [ ] `og:url` がサイトURLと一致
- [ ] `og:site_name` = "Poker SNS"
- [ ] `og:image` が有効なURLを返す（opengraph-image.tsx 経由）
- [ ] `twitter:card` = "summary_large_image"
- [ ] `twitter:title` が設定されている
- [ ] `twitter:description` が設定されている

#### B. X Card Validator 検証

- [ ] Card Validator にURLを入力しプレビュー表示される
- [ ] カードタイプが "Summary Large Image" で表示される
- [ ] タイトルが正しく表示（文字化けなし）
- [ ] 説明文が正しく表示（140字以内に収まっている）
- [ ] OGP画像（1200x630）が正しく表示される
- [ ] 画像がトリミングされず全体が見える
- [ ] **スクリーンショットを保存** → `evidence/ogp_top_card.png`

---

### 4.2 投稿詳細ページ `/post/[id]`

#### A. メタタグ値の確認

- [ ] `og:title` = "{author.name}(@{username})の投稿 - Poker SNS" 形式
- [ ] `og:description` = 投稿内容の先頭140文字 + "..."
- [ ] `og:type` = "article"
- [ ] `og:url` = `{SITE_URL}/post/{id}` と一致
- [ ] `og:image` が有効なURL（投稿画像 or 動的OG画像）
- [ ] `og:image:width` = 1200, `og:image:height` = 630
- [ ] `twitter:card` = "summary_large_image"
- [ ] `twitter:image` が有効なURL

#### B. X Card Validator 検証

- [ ] Card Validator にURLを入力しプレビュー表示される
- [ ] カードタイプが "Summary Large Image" で表示される
- [ ] 著者名・ユーザー名が正しく表示
- [ ] 投稿内容の抜粋が正しく表示
- [ ] 動的OG画像が正しく描画される（テーマカラー、レイアウト）
- [ ] 日本語テキストが文字化けしない
- [ ] **スクリーンショットを保存** → `evidence/ogp_post_card.png`

#### C. エッジケース

- [ ] 画像付き投稿: 投稿画像がog:imageに使用される
- [ ] 画像なし投稿: 動的OG画像（opengraph-image.tsx）が使用される
- [ ] 長文投稿: descriptionが適切にトランケートされる
- [ ] 特殊文字を含む投稿: エスケープ処理が正しい

---

### 4.3 LP `/lp`

#### A. メタタグ値の確認

- [ ] `og:title` = "Poker SNS - 日本初のポーカー特化SNS"
- [ ] `og:description` が設定されている
- [ ] `og:type` = "website"
- [ ] `og:url` = `{SITE_URL}/lp`
- [ ] `twitter:card` = "summary_large_image"
- [ ] `og:image` が有効なURL（デフォルトOG画像へのフォールバック確認）

#### B. X Card Validator 検証

- [ ] Card Validator にURLを入力しプレビュー表示される
- [ ] カードタイプが "Summary Large Image" で表示される
- [ ] タイトル・説明文が正しく表示
- [ ] OGP画像が表示される（フォールバック画像の品質確認）
- [ ] **スクリーンショットを保存** → `evidence/ogp_lp_card.png`

---

## 5. UTMパラメータ計測テスト

X初期投稿にはUTMパラメータ付きリンクが使用される想定。OGPカード展開への影響を確認。

| # | テスト項目 | 確認内容 |
|---|-----------|---------|
| 1 | UTMパラメータ付きURL | `?utm_source=twitter&utm_medium=social&utm_campaign=launch` 付きURLでもカード展開されるか |
| 2 | OGPタグへの影響 | UTM付きでも og:url は正規URL（UTMなし）を返すか |
| 3 | リダイレクト | UTM付きURLが正しいページに遷移するか |

**検証URL例:**
```
https://{SITE_URL}/?utm_source=twitter&utm_medium=social&utm_campaign=launch_2026q1
https://{SITE_URL}/lp?utm_source=twitter&utm_medium=social&utm_campaign=launch_2026q1
https://{SITE_URL}/post/1?utm_source=twitter&utm_medium=social&utm_campaign=post_share
```

- [ ] 上記3URLをCard Validatorで検証し、カード展開を確認
- [ ] UTMパラメータがGA4に正しく記録されることを確認（別途GA4検証）

---

## 6. 既知の課題・注意事項

| # | 項目 | 詳細 | 対応 |
|---|------|------|------|
| 1 | LP og:image 未明示 | `/lp` は metadata に og:image を明示指定していない。ルートの opengraph-image.tsx がフォールバックする可能性あり | Dev確認待ち。フォールバック動作を検証で確認 |
| 2 | Xキャッシュ | Xはog:imageを強力にキャッシュする。修正後は Card Validator で再クロール必須 | 検証時に注意 |
| 3 | opengraph-image.tsx Edge Runtime | Edge Runtimeで生成される動的画像はデプロイ先のCDN設定に依存 | 本番環境での検証が望ましい |

---

## 7. エビデンス管理

| 項目 | 保存先 | 形式 |
|------|--------|------|
| X Card Validator スクリーンショット | `evidence/ogp_*.png` | PNG |
| メタタグ一覧（curl出力） | `evidence/ogp_meta_dump.txt` | テキスト |
| 検証結果サマリー | 本チェックリストに直接記録 | マークダウン |

---

## 8. 合否判定基準

### PASS条件（全ページ共通）
- X Card Validator でカードプレビューが正しく表示される
- タイトル・説明文に文字化けがない
- OGP画像（1200x630）が適切に表示される
- UTMパラメータ付きURLでもカード展開される

### FAIL条件
- カードが展開されない（白紙表示）
- 画像が表示されない、または著しく崩れる
- タイトル/説明文が空、または意図しない内容
- UTMパラメータによりカード展開が阻害される

### 判定
- 3ページ全てPASS → **検証合格** → X投稿開始可
- 1ページでもFAIL → **検証不合格** → Dev修正依頼 → 再検証

---

## 9. 実行タイムライン

| ステップ | 担当 | 前提条件 | 所要時間 |
|---------|------|---------|---------|
| 1. 本チェックリスト作成 | QA (尾丸) | - | 完了 |
| 2. Dev OGPメタタグ修正完了 | Dev (兎田) | コード修正 | Dev待ち |
| 3. ステージング/本番デプロイ | Ops | Dev修正マージ後 | - |
| 4. チェックリスト実行 | QA (尾丸) | デプロイ完了後 | 1時間 |
| 5. 結果報告・再検証（必要時） | QA (尾丸) | - | 30分 |
