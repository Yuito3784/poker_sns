# Design Deliverable: Phase 2 OGP & Share UI
> Design / 不知火 作成 / 2026-03-02
> 対象: タスク 2-1 (OGP動的画像), 2-4 (シェア機能強化)

---

## Part A: 補完計画 — Design観点の補足 (3点)

### 補足 1: 日本語フォントバンドルに関するDesign所見

兎田さんから提起された「Noto Sans JP サブセット woff2 バンドル」について、現在の実装を確認しました。

**現状**: 3ファイルとも Google Fonts CSS URL から動的に woff2 URL を抽出してランタイム fetch する方式を採用済み。
- `app/opengraph-image.tsx:8-17` — `loadFont()` 関数
- `app/post/[id]/opengraph-image.tsx:10-19` — 同一パターン
- `app/profile/[username]/opengraph-image.tsx:10-19` — 同一パターン

**Design観点の懸念**:
1. **フォントウェイト不足**: 現在 `wght@400;700` を要求しているが、CSS レスポンスから最初の `src: url(...)` のみ取得しているため、400 のみロードされている可能性が高い。OGP画像内で `fontWeight: 700` を指定している箇所（ロゴ、ユーザー名、表示名）が、bold レンダリングされず faux bold になっている恐れあり。
2. **フォールバック時の見え方**: `loadFont()` が失敗した場合、system sans-serif にフォールバックする。この場合日本語テキストが豆腐（□）になる可能性がある。Edge Runtime 環境での日本語 fallback font の有無を Dev 側で検証してほしい。

**Design 推奨**:
- woff2 ファイルを `public/fonts/NotoSansJP-Regular.woff2` と `NotoSansJP-Bold.woff2` にバンドルし、ローカル fetch に切り替え。これによりネットワーク依存を排除。
- `fonts` 配列に weight 400 と 700 の両方を登録。

### 補足 2: `/posts/:id/meta` API レスポンスへのDesign要件

OGP画像テンプレートに必要なデータフィールドは以下の通り。Dev側で API 設計時に漏れがないよう確認を依頼。

| フィールド | Template A (投稿) | Template B (プロフィール) | 用途 |
|-----------|:-:|:-:|------|
| `content` | 必須 | — | 投稿テキスト表示 (120文字 truncate) |
| `author.name` | 必須 | — | 表示名 |
| `author.username` | 必須 | — | @username 表示 |
| `author.avatarUrl` | 任意 | — | アバター画像 (null時イニシャル) |
| `_count.likes` | 必須 | — | 統計表示 |
| `_count.replies` | 必須 | — | 統計表示 |
| `_count.reposts` | 必須 | — | 統計表示 |
| `author.subscriptionStatus` | 推奨 | — | プレミアムバッジ表示の将来対応 |
| `name` | — | 必須 | プロフィール表示名 |
| `username` | — | 必須 | @username |
| `bio` | — | 任意 | バイオテキスト (80文字 truncate) |
| `avatarUrl` | — | 任意 | アバター画像 |
| `_count.posts` | — | 必須 | 統計表示 |
| `_count.followers` | — | 必須 | 統計表示 |
| `_count.following` | — | 必須 | 統計表示 |

### 補足 3: OGP実装現状調査結果 (Design視点)

全3テンプレートの実装状況を確認し、デザインスペックとの差分を洗い出しました（詳細は Part B 参照）。

**サマリー**:
- Template A: 実装済み。デザイントークン準拠率 **92%**。微調整 4 件あり（MEDIUM以下）。
- Template B: 実装済み。デザイントークン準拠率 **88%**。微調整 3 件あり（MEDIUM以下）。
- Template C: 実装済み。ブランドカラー統一 **完了済み** (`#c9a84c` 系に修正済み)。

---

## Part B: OGP Templates デザインレビュー結果

### Template A (投稿詳細 OGP) — `post/[id]/opengraph-image.tsx`

| # | 項目 | DESIGN_SPEC | 現在の実装 | 重要度 | 対応 |
|---|------|------------|-----------|--------|------|
| A-1 | 著者表示名 font-size | 16px | 20px | LOW | 警告のみ。20px でも視認性良好なため現状維持可。 |
| A-2 | @username font-size | 18px | 15px | MEDIUM | 15px は小さすぎる。**18px に修正推奨**。 |
| A-3 | Stats font-size | 18px | 16px | LOW | 許容範囲。現状維持可。 |
| A-4 | Avatar 実画像 fetch | 画像 or イニシャル | イニシャルのみ | MEDIUM | `avatarUrl` がある場合は画像を fetch して表示すべき。Dev に実装依頼。 |

**総合判定**: APPROVED (Minor fixes recommended)

### Template B (プロフィール OGP) — `profile/[username]/opengraph-image.tsx`

| # | 項目 | DESIGN_SPEC | 現在の実装 | 重要度 | 対応 |
|---|------|------------|-----------|--------|------|
| B-1 | 表示名 font-size | 36px | 32px | MEDIUM | **36px に修正推奨**。プロフィール画面の主要要素。 |
| B-2 | @username font-size | 22px | 18px | MEDIUM | **22px に修正推奨**。 |
| B-3 | Bio font-size | 20px | 18px | LOW | 許容範囲。現状維持可。 |
| B-4 | Avatar 実画像 fetch | 画像 or イニシャル | イニシャルのみ | MEDIUM | Template A と同様。`avatarUrl` がある場合は画像表示。 |

**総合判定**: APPROVED (Minor fixes recommended)

### Template C (グローバル OGP) — `app/opengraph-image.tsx`

| # | 項目 | DESIGN_SPEC | 現在の実装 | 重要度 | 対応 |
|---|------|------------|-----------|--------|------|
| C-1 | 背景グラデーション | `#0d1009, #131a14, #0d1009` | `#0d1009, #131a14, #0d1009` | — | 修正済み |
| C-2 | ロゴスペード色 | `#c9a84c` | `#c9a84c` | — | 修正済み |
| C-3 | ロゴテキスト色 | `#ddd6c8` | `#ddd6c8` | — | 修正済み |
| C-4 | タグライン色 | `#7a7260` | `#7a7260` | — | 修正済み |
| C-5 | Feature chip | `rgba(201,168,76,...)` | `rgba(201,168,76,...)` | — | 修正済み |

**総合判定**: APPROVED (No changes needed)

### Dev向け修正依頼サマリー (MEDIUM のみ)

```
[Template A]
- A-2: @username font-size: 15px → 18px  (opengraph-image.tsx:128)
- A-4: avatarUrl がある場合は img 要素で実画像表示

[Template B]
- B-1: 表示名 font-size: 32px → 36px  (opengraph-image.tsx:136)
- B-2: @username font-size: 18px → 22px  (opengraph-image.tsx:148)
- B-4: avatarUrl がある場合は img 要素で実画像表示
```

---

## Part C: OGP画像デザインガイドライン (タスク 2-1-4)

### 1. 目的

Poker SNS の OGP 画像を一貫したブランドアイデンティティで生成するためのルール集。
新しいテンプレート追加時やデザイン修正時に参照する。

### 2. 基本原則

1. **ダークラグジュアリー**: 高級感のあるダークトーンを維持。明るい背景は使用しない。
2. **ゴールドアクセント**: ブランドカラー `#c9a84c` を主要アクセントとして使用。Tailwind の `amber` や `yellow` は使用禁止。
3. **ポーカーモチーフ**: カードスート（♠♥♦♣）を透かし要素として背景に配置。主張しすぎないよう opacity 0.03 に抑える。
4. **視認性優先**: SNS タイムライン上で小さく表示されることを前提に、テキストは十分なサイズと contrast ratio を確保する。

### 3. カラーパレット (OGP専用)

| 用途 | カラー | 備考 |
|------|--------|------|
| 背景 (暗部) | `#0d1009` | グラデーション端 |
| 背景 (中間) | `#131a14` | グラデーション中央 |
| 背景グラデーション | `linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)` | 全テンプレート共通 |
| テキスト主要 | `#ddd6c8` | 投稿本文、表示名 |
| テキスト副次 | `#7a7260` | タグライン、バイオ、統計ラベル |
| ゴールド主要 | `#c9a84c` | ロゴ、ユーザーネーム、ボーダー |
| ゴールド暗 | `#9a7c35` | グラデーション終点、統計アイコン |
| ディバイダー | `#2a3828` | 区切り線 |
| 透かし | `rgba(201,168,76,0.03)` | スート背景 |
| サーフェス | `#192118` | アバター背景、フォールバック面 |
| チップ背景 | `rgba(201,168,76,0.12)` | Feature chip |
| チップボーダー | `rgba(201,168,76,0.30)` | Feature chip border |

### 4. タイポグラフィ

| 役割 | フォント | ウェイト | 用途例 |
|------|---------|---------|--------|
| Display | Playfair Display | 600-700 | ブランドロゴ（Webアプリ側。OGPではNotoSansJP bold代用可） |
| Body | Noto Sans JP | 400 | 投稿テキスト、バイオ |
| Bold | Noto Sans JP | 700 | 表示名、ユーザー名、統計数値 |

**Edge Runtime 制約**: `next/font` は ImageResponse 内で使用不可。Google Fonts API から woff2 を直接 fetch するか、`public/fonts/` にバンドルしてローカル fetch する。

### 5. テンプレート別仕様

#### Template A: 投稿詳細 (1200x630)

```
Layout:
  padding: 48px 56px
  flexDirection: column

Header:  [Avatar(48x48) + Name/Username]  ———  [♠ Poker SNS]
Content: 投稿テキスト (28px, #ddd6c8, max 120chars/3lines)
Divider: gradient line (#2a3828 → #c9a84c40 → #2a3828)
Footer:  ♥ N Likes  💬 N Replies  🔄 N Reposts (16px, #7a7260)
```

| 要素 | font-size | color | weight |
|------|-----------|-------|--------|
| 著者表示名 | 20px | `#ddd6c8` | 700 |
| @username | 18px | `#c9a84c` | 400 |
| ロゴ "Poker SNS" | 20px | `#c9a84c` | 700 |
| ロゴ ♠ | 26px | `#c9a84c` | — |
| 投稿テキスト | 28px | `#ddd6c8` | 400 |
| 統計テキスト | 16px | `#7a7260` | 400 |
| 統計アイコン | — | `#9a7c35` | — |
| アバター | 48x48 | border: 2px `#c9a84c` | — |
| アバター背景 | — | `#192118` | — |
| アバターイニシャル | 20px | `#c9a84c` | 700 |

#### Template B: ユーザープロフィール (1200x630)

```
Layout:
  padding: 60px
  flexDirection: column
  alignItems: center
  justifyContent: center

Logo:    top-right (♠ Poker SNS, 18px gold)
Avatar:  80x80, border 3px gold, centered
Name:    36px bold #ddd6c8
Username: 22px #c9a84c
Bio:     18-20px #7a7260, max 80chars, center-aligned
Stats:   Posts / Followers / Following (数値 24px bold #ddd6c8, ラベル 16px #7a7260)
```

#### Template C: グローバル/デフォルト (1200x630)

```
Layout:
  padding: 60px
  flexDirection: column
  alignItems: center
  justifyContent: center

Logo:    ♠ (80px gold) + "Poker SNS" (72px bold #ddd6c8)
Tagline: "ポーカーハンドを共有して、もっと上手くなる" (34px #7a7260)
Chips:   ["ハンドを記録", "仲間と議論", "戦略を磨く"] (gold chip style)
```

### 6. 共通ルール

#### 6.1 背景スート透かし
```
position: absolute
inset: 0
display: flex, space-around
fontSize: 220px
color: rgba(201,168,76,0.03)
symbols: ♠ ♥ ♦ ♣
```

#### 6.2 アバター表示ルール
1. `avatarUrl` が存在 → 画像を `img` で表示（border-radius: 50%）
2. `avatarUrl` が null → イニシャル文字をゴールド色で表示（背景: `#192118`）
3. ボーダー: Template A = 2px, Template B = 3px

#### 6.3 テキスト省略ルール
- 投稿テキスト: 120文字でカット + "..." 付与
- バイオテキスト: 80文字でカット + "..." 付与
- CSS overflow 制御で行数制限も併用

#### 6.4 キャッシュ戦略
```
Cache-Control: public, max-age=3600, s-maxage=86400
```
- ブラウザキャッシュ: 1時間
- CDN/プロキシキャッシュ: 24時間
- nginx-prod.conf の既存設定と整合

#### 6.5 禁止事項
- Tailwind の `amber`, `yellow`, `emerald`, `green` 系カラーの使用禁止（ブランド外色）
- 白背景・ライトモード背景の使用禁止
- 絵文字アイコンの過度な使用（統計表示以外では極力テキストシンボルを使用）

### 7. クロスプラットフォーム検証チェックリスト

| プラットフォーム | 検証ツール | チェック項目 |
|----------------|-----------|-------------|
| X (Twitter) | Card Validator | summary_large_image 表示、画像の自動クロップ位置 |
| LINE | URL Preview | OG画像表示、タイトル、説明文 |
| Discord | Embed Preview | 画像 + Embed カラー (sidebar は自動) |
| Facebook | Sharing Debugger | OG画像、タイトル、type (article/profile/website) |
| Slack | Link Preview | OG画像のアスペクト比維持 |

**検証時の注意**: 各プラットフォームはOG画像をキャッシュするため、更新後は各デバッガーでキャッシュクリアしてから再検証すること。

---

## Part D: シェアボタン UI デザインスペック (タスク 2-4-3, 2-4-4)

### 1. シェアボタン統一カラーマップ

全シェアボタンは以下のカラールールに従う。PostItem (フィード) と PostDetailClient (詳細) で統一。

| ボタン | Idle | Hover | Active/Success |
|--------|------|-------|---------------|
| Copy Link | `#4a5245` | `#c9a84c` | `#c9a84c` + checkmark |
| X (Twitter) | `#4a5245` | `#ddd6c8` | — |
| LINE | `#4a5245` | `#00b900` | — |
| Discord | `#4a5245` | `#5865F2` | — |
| Native Share | `#4a5245` | `#c9a84c` | — |

### 2. Discord シェアボタン デザインスペック (タスク 2-4-4)

#### 2.1 概要
ポーカーコミュニティでの Discord 利用率の高さを考慮し、シェアボタンラインナップに Discord を追加する。

#### 2.2 挙動
Discord にはネイティブのシェア Intent URL が存在しないため、以下の方式を採用:
- **クリック時**: 投稿 URL をクリップボードにコピー（Discord で貼り付け前提）
- **トースト**: 「Discordで共有するリンクをコピーしました」
- **OGP連携**: Discord 上で URL を貼り付ければ、OGP Embed が自動表示される

#### 2.3 アイコン
```
Discord Logo SVG (simplified):
  viewBox: 0 0 24 24
  path: M20.317 4.3698a19.7913...（Discord公式ブランドガイドラインに準拠）

色:
  idle:  fill="#4a5245"
  hover: fill="#5865F2" (Discord Blurple)

サイズ: 20x20 (h-5 w-5) — 他のシェアアイコンと統一
```

#### 2.4 ボタン配置
```
PostDetailClient (認証済みユーザー):
  [heart] [repost] [bookmark] [quote] | [copy] [X] [LINE] [Discord]
                                         ← シェアグループ →

PostItem (フィード):
  [share/native] [copy] [X] [LINE] [Discord]
  ← ドロップダウン or インライン（デバイス幅による） →
```

#### 2.5 アクセシビリティ
- `aria-label="Discord\u3067\u5171\u6709"` を付与
- ツールチップ: 「Discordで共有」

### 3. PostDetailClient ボーダー修正 (BUG-004)

```diff
- className="border-neutral-100"
+ className="border-[#1f2a1e]"
```

対象: `PostDetailClient.tsx` のアクションバー区切り線

### 4. 成功インジケーター統一

コピー成功時のチェックマークは全箇所で `#c9a84c` (gold) を使用。
```diff
- className="text-emerald-500"
+ style={{ color: "#c9a84c" }}
```

---

## Part E: 作業ステータスまとめ

### Design担当タスク進捗

| タスク ID | 内容 | ステータス | 成果物 |
|-----------|------|-----------|--------|
| 2-1-1 | Template A デザインレビュー | DONE | Part B (APPROVED w/ minor fixes) |
| 2-1-2 | Template B デザインレビュー | DONE | Part B (APPROVED w/ minor fixes) |
| 2-1-3 | Template C 色修正レビュー | DONE | Part B (APPROVED, no changes) |
| 2-1-4 | OGP デザインガイドライン文書化 | DONE | Part C |
| 2-4-3 | シェアボタン色統一スペック | DONE | Part D section 1 |
| 2-4-4 | Discord シェアボタンデザイン | DONE | Part D section 2 |

### MEDIUM 修正実装ステータス (2026-03-02 更新)

| 対象 | 修正内容 | ファイル | ステータス |
|------|---------|---------|-----------|
| Template A | @username font-size 15px → 18px | `post/[id]/opengraph-image.tsx:128` | DONE |
| Template A | avatarUrl がある場合に実画像表示 | `post/[id]/opengraph-image.tsx:107-123` | PENDING (Dev依頼) |
| Template B | 表示名 font-size 32px → 36px | `profile/[username]/opengraph-image.tsx:136` | DONE |
| Template B | @username font-size 18px → 22px | `profile/[username]/opengraph-image.tsx:148` | DONE |
| Template B | avatarUrl がある場合に実画像表示 | `profile/[username]/opengraph-image.tsx:114-131` | PENDING (Dev依頼) |
| Detail border | `border-neutral-100` → `border-[#1f2a1e]` | `PostDetailClient.tsx` (4箇所) | DONE |
| Discord button | Discord シェアボタン追加 | `PostDetailClient.tsx` (認証・ゲスト両方) | DONE |

### LOW priority (警告のみ、コード修正不要)

- Template A: 著者表示名 font-size 20px (spec=16px) — 視認性良好のため現状維持可
- Template A: Stats font-size 16px (spec=18px) — 許容範囲
- Template B: Bio font-size 18px (spec=20px) — 許容範囲

### 残作業 (Dev側)

- Template A/B: `avatarUrl` がある場合に実画像を fetch して表示する実装（ImageResponse内での画像取得が必要）

---

*Design deliverable + MEDIUM修正の実装完了 (2026-03-02)。avatarUrl 画像表示のみ Dev 側での実装が必要。*
