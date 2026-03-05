# QA/QC ダークテーマ統一 監査レポート

**作成日**: 2026-03-05
**担当**: QA/QC 尾丸
**対象**: `frontend/src/app/` 配下の全ページ・コンポーネント
**デザインシステム**: "The Felt Table" Dark Luxury (`#0d1009` 背景)

---

## 1. 全ページ検証マトリクス

### 凡例
- OK = ダークテーマ準拠
- NG = 白背景/ライトテーマ検出
- WARN = 部分的に非準拠要素あり

| ページ | パス | 背景色 | フォーム要素 | モーダル | ローディング状態 | 判定 |
|---|---|---|---|---|---|---|
| ホーム | `/` (page.tsx) | `bg-[#0d1009]` OK | N/A | N/A | N/A | **OK** |
| トレンド | `/explore` (page.tsx) | `bg-[#eef3ea]` **NG** | N/A | N/A | `text-neutral-500` WARN | **NG** |
| ハッシュタグ | `/hashtag/[tag]` (HashtagClient.tsx) | `bg-[#eef3ea]` **NG** | N/A | N/A | `text-neutral-500` WARN | **NG** |
| おすすめ | `/partners` (page.tsx) | `bg-[#faf9f7]` **NG** | N/A | N/A | `text-neutral-500` WARN | **NG** |
| 検索 | `/search` (page.tsx) | `#0d1009` OK | N/A | N/A | OK | **OK** |
| ブックマーク | `/bookmarks` (page.tsx) | `#0d1009` OK | N/A | N/A | OK | **OK** |
| 通知 | `/notifications` (page.tsx) | `#0d1009` OK | N/A | N/A | OK | **OK** |
| 設定 | `/settings` (page.tsx) | body継承 OK | OK | N/A | OK | **OK** |
| プロフィール | `/profile/[username]` | `#0d1009` OK | N/A | メニュー OK | OK | **OK** |
| 投稿詳細 | `/post/[id]` | `#0d1009` OK | テキストエリア OK | 削除確認 OK | OK | **OK** |
| パスワードリセット | `/forgot-password` | `bg-[#0d1009]` OK | フォーム OK | N/A | OK | **OK** |
| パスワード再設定 | `/reset-password` | `bg-[#0d1009]` OK | フォーム OK | N/A | OK | **OK** |
| メール認証 | `/verify-email` | `bg-[#0d1009]` OK | N/A | N/A | OK | **OK** |
| 利用規約 | `/terms` | `bg-[#0d1009]` OK | N/A | N/A | N/A | **OK** |
| プライバシー | `/privacy` | `bg-[#0d1009]` OK | N/A | N/A | N/A | **OK** |
| LP | `/lp` | `bg-[#0d1009]` OK | フォーム OK | N/A | OK | **OK** |

### コンポーネント単位の検証

| コンポーネント | 問題箇所 | 判定 |
|---|---|---|
| `ErrorBoundary.tsx` | `bg-red-50`, `border-red-200` (ライト系エラー表示) | **WARN** |
| `NotificationDropdown.tsx` | `bg-blue-50` (未読), `hover:bg-neutral-50`, `divide-neutral-200`, `text-neutral-600` | **NG** |
| `SearchResults.tsx` | `border-neutral-200`, `hover:bg-neutral-50`, `text-neutral-600` | **NG** |

---

## 2. WCAG AA コントラスト比分析

### 検証基準
- **通常テキスト**: 4.5:1 以上
- **大テキスト (18px+ bold / 24px+)**: 3:1 以上

### ダークテーマ色 on `#0d1009` 背景 (相対輝度 ≈ 0.010)

| テキスト色 | Hex | 相対輝度 | コントラスト比 | AA通常 | AA大テキスト |
|---|---|---|---|---|---|
| Text primary (warm ivory) | `#ddd6c8` | 0.670 | **12.0:1** | PASS | PASS |
| Gold primary | `#c9a84c` | 0.375 | **7.1:1** | PASS | PASS |
| Gold dim | `#9a7c35` | 0.198 | **4.1:1** | **FAIL** | PASS |
| `--muted` | `#9a8e7a` | 0.260 | **5.2:1** | PASS | PASS |
| Sidebar muted | `#6b7a66` | 0.155 | **3.4:1** | **FAIL** | PASS |
| Text secondary | `#7a7260` | 0.165 | **3.6:1** | **FAIL** | PASS |
| Text muted | `#4a5245` | 0.068 | **2.0:1** | **FAIL** | **FAIL** |
| `text-[#8ba388]` | `#8ba388` | 0.310 | **6.0:1** | PASS | PASS |
| `text-[#e8f0e6]` | `#e8f0e6` | 0.850 | **14.3:1** | PASS | PASS |

### Tailwind neutral 系 on `#0d1009`

| クラス | Hex | コントラスト比 | AA通常 |
|---|---|---|---|
| `text-neutral-300` | `#d4d4d4` | **11.5:1** | PASS |
| `text-neutral-400` | `#a3a3a3` | **6.8:1** | PASS |
| `text-neutral-500` | `#737373` | **3.8:1** | **FAIL** |
| `text-neutral-600` | `#525252` | **2.3:1** | **FAIL** |
| `text-neutral-900` | `#171717` | **1.1:1** | **FAIL** (ダーク背景では見えない) |

---

## 3. ブラウザデフォルト白背景リセット監査

### globals.css の設定 — OK
```css
:root { --background: #0d1009; }
body { background: var(--background); }
```
`body` レベルで `#0d1009` が正しく設定されており、ブラウザデフォルト白背景はリセット済み。

### 問題箇所
各ページで個別に背景色をハードコードしている箇所があり、グローバル設定を上書きしてライトテーマに戻してしまっている:

| ファイル | 行 | ハードコード値 | 問題 |
|---|---|---|---|
| `explore/page.tsx` | L237 | `bg-[#eef3ea]` | body設定を上書き → 白系背景 |
| `hashtag/[tag]/HashtagClient.tsx` | L214 | `bg-[#eef3ea]` | body設定を上書き → 白系背景 |
| `partners/page.tsx` | L54 | `bg-[#faf9f7]` | body設定を上書き → ほぼ白背景 |

---

## 4. 指摘事項サマリー

### CRITICAL (即時修正必要)

| # | ファイル | 問題 | 修正方法 |
|---|---|---|---|
| C-1 | `explore/page.tsx:237` | `bg-[#eef3ea]` ライト背景 | → `bg-[#0d1009]` |
| C-2 | `explore/page.tsx:237` | `text-neutral-900` ダーク背景で見えない | → `text-[#ddd6c8]` |
| C-3 | `hashtag/[tag]/HashtagClient.tsx:214` | `bg-[#eef3ea]` ライト背景 | → `bg-[#0d1009]` |
| C-4 | `hashtag/[tag]/HashtagClient.tsx:214` | `text-neutral-900` ダーク背景で見えない | → `text-[#ddd6c8]` |
| C-5 | `partners/page.tsx:54` | `bg-[#faf9f7]` ライト背景 | → `bg-[#0d1009]` |
| C-6 | `partners/page.tsx:54` | `text-neutral-900` ダーク背景で見えない | → `text-[#ddd6c8]` |

### HIGH (修正推奨)

| # | ファイル | 問題 | 修正方法 |
|---|---|---|---|
| H-1 | `NotificationDropdown.tsx:42` | `bg-blue-50` 未読表示がライト色 | → `bg-[#1a2f1c]` or `bg-white/5` |
| H-2 | `NotificationDropdown.tsx:42` | `hover:bg-neutral-50` ライト系hover | → `hover:bg-white/5` |
| H-3 | `NotificationDropdown.tsx:35` | `divide-neutral-200` ライト系ボーダー | → `divide-[#1f2a1e]` |
| H-4 | `NotificationDropdown.tsx:37,63,65` | `text-neutral-500/600` 低コントラスト | → `text-[#7a7260]` or `text-[#9a8e7a]` |
| H-5 | `SearchResults.tsx:24,45` | `border-neutral-200`, `hover:bg-neutral-50` | → `border-[#1f2a1e]`, `hover:bg-white/5` |
| H-6 | `SearchResults.tsx:14,27,35,47,57` | `text-neutral-600` 低コントラスト | → `text-[#9a8e7a]` |
| H-7 | `ErrorBoundary.tsx:28` | `bg-red-50`, `border-red-200` ライト系 | → `bg-red-900/20`, `border-red-800/30` |

### MEDIUM (警告のみ — コード修正不要)

| # | ファイル | 問題 |
|---|---|---|
| M-1 | `explore/page.tsx:264,269,297` | `text-neutral-500/400` — ページ背景修正後は許容範囲だが、ダーク背景上では neutral-500 が AA基準をわずかに下回る (3.8:1 < 4.5:1)。「読み込み中...」等の補助テキストのため実用上は問題低い |
| M-2 | `hashtag/[tag]/HashtagClient.tsx:243,247,286` | 同上 |
| M-3 | `partners/page.tsx:90,94` | 同上 |
| M-4 | デザインシステム全般 | `#7a7260` (Text secondary) はAA通常テキスト基準を下回る (3.6:1)。装飾的テキストやラベルには許容だが、情報伝達テキストには `#9a8e7a` (5.2:1) 以上を推奨 |

---

## 5. デプロイ後検証チェックリスト

修正実装後、以下の全ページを目視確認すること:

- [ ] `/` — ホームフィード
- [ ] `/explore` — トレンドページ (24h / 7d タブ切替)
- [ ] `/hashtag/[任意タグ]` — ハッシュタグページ
- [ ] `/partners` — おすすめサービス (全カテゴリタブ)
- [ ] `/search` — 検索ページ (検索結果表示時)
- [ ] `/bookmarks` — ブックマーク
- [ ] `/notifications` — 通知ページ + ドロップダウン
- [ ] `/settings` — 設定ページ
- [ ] `/profile/[username]` — プロフィール
- [ ] `/post/[id]` — 投稿詳細
- [ ] `/forgot-password` — パスワードリセット
- [ ] `/reset-password` — パスワード再設定
- [ ] `/verify-email` — メール認証
- [ ] `/terms` — 利用規約
- [ ] `/privacy` — プライバシーポリシー
- [ ] `/lp` — ランディングページ

### 各ページの確認項目
1. **背景色**: `#0d1009` であること (白/ライト色でないこと)
2. **テキスト**: 主要テキストが視認可能であること
3. **フォーム要素**: 入力フィールドの背景・ボーダーがダークテーマに合っていること
4. **モーダル/ドロップダウン**: 表示時に白背景でないこと
5. **ローディング状態**: スピナー/テキストが視認可能であること
6. **ホバー状態**: hover時に白系背景にならないこと

---

*以上、QA/QC監査レポート完了*
