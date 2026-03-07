# Design Review: ブランチリネーム対応表（UI関連分類付き）

作成: Design 百鬼 | 日付: 2026-03-05

## 対応表

| 旧ブランチ名 | 推奨新ブランチ名 | 変更内容サマリー | UI関連 | デザインレビュー優先度 |
|---|---|---|---|---|
| `climpire/40e3703c` | `fix/dark-theme-unification` | 全画面ダークテーマ統一、コントラスト比改善、明色系Tailwindクラス修正（フロントエンド全ページ） | **Yes** | **HIGH** — テーマ・カラー変更が全ページに影響 |
| `climpire/77f33030` | `chore/docs-release-workflow` | CLAUDE.md更新、リリース手順・Vercel変数ドキュメント、git-workflow Skill追加 + 上記ダークテーマ修正含む | **Partial** | MEDIUM — ドキュメント中心だがダークテーマ修正も含む |
| `climpire/ae22cfbb` | `fix/dark-theme-additional-pages` | forgot-password, privacy, terms, verify-email等の追加ページのダークテーマ適用 | **Yes** | **HIGH** — 未対応ページへのテーマ拡張 |
| `climpire/cca7a17c` | `fix/dark-theme-full-coverage` | 全画面ダークテーマ統一（40e3703cと同等範囲） | **Yes** | **HIGH** — 40e3703cと重複の可能性あり、差分確認が必要 |

## UI関連ブランチの詳細分析

### 変更対象コンポーネント一覧（UI関連ブランチ共通）

| ファイル | 変更種別 |
|---|---|
| `globals.css` | テーマ変数・ベーススタイル |
| `page.tsx` (トップ) | 背景・テキスト色のダークテーマ化 |
| `search/page.tsx` | 検索ページ全体のダークテーマ化 |
| `settings/page.tsx` | 設定ページのダークテーマ化 |
| `profile/[username]/ProfileClient.tsx` | プロフィールページの大幅なスタイル修正 |
| `post/[id]/PostDetailClient.tsx` | 投稿詳細のダークテーマ化 |
| `notifications/page.tsx` | 通知ページのダークテーマ化 |
| `lp/LandingClient.tsx` | ランディングページのダークテーマ化 |
| `components/PostItem.tsx` | 投稿カードコンポーネント |
| `components/PostSkeleton.tsx` | スケルトンローダー |
| `components/AuthForm.tsx` | 認証フォーム |
| `components/CardSelector.tsx` | カードセレクター |
| `components/AffiliateCard.tsx` | アフィリエイトカード |
| `components/PokerHandDisplay.tsx` | ポーカーハンド表示 |
| `error.tsx`, `not-found.tsx` | エラーページ |
| `reset-password/page.tsx`, `verify-email/page.tsx` | 認証系ページ |
| `forgot-password/page.tsx` (ae22cfbbのみ) | パスワードリセットページ |
| `privacy/page.tsx`, `terms/page.tsx` (ae22cfbbのみ) | 法的ページ |

### デザインレビュー時の確認ポイント

1. **カラートークン準拠**: "The Felt Table" テーマカラー（背景 `#0d1009`、Surface `#131a14`、Gold `#c9a84c` 等）が正しく適用されているか
2. **コントラスト比**: WCAG AA基準（4.5:1以上）を満たしているか — 特にテキスト `#ddd6c8` on `#0d1009`
3. **一貫性**: 全ページでボタン・入力フォーム・カードのスタイルが統一されているか
4. **CTAボタン**: `background: #c9a84c, color: #0d1009` が全インタラクティブ要素に適用されているか

## 注意事項

- `climpire/40e3703c` と `climpire/cca7a17c` は変更範囲がほぼ同一。マージ時にコンフリクトが発生する可能性が高いため、どちらか一方を採用しもう一方は破棄を推奨
- `climpire/ae22cfbb` は追加ページ（forgot-password, privacy, terms, verify-email）のカバレッジが広いため、最も包括的
- リネーム後、UI関連ブランチはデザインチームによるビジュアルレビューを経てからマージすることを推奨
