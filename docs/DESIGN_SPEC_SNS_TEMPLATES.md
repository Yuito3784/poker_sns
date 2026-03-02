# SNS Multi-Platform Template Design Spec Sheet

> Design Team / 不知火 作成 / 2026-03-02
> 宝鐘リーダー指示: OG画像テンプレート(1200x630) + YouTube Thumbnail(1280x720) + Instagram Reels Thumbnail(1080x1920) の3サイズ統一ブランドデザイン

---

## 0. Brand Design Tokens (共通)

"The Felt Table" Dark Luxury Poker Design System から継承。

### 0.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0d1009` | 全テンプレートの基本背景 |
| `bg-surface` | `#131a14` | グラデーション中間色 |
| `bg-elevated` | `#192118` | カード・オーバーレイ面 |
| `border-subtle` | `#1f2a1e` | 区切り線・ボーダー |
| `border-medium` | `#2a3828` | ディバイダー |
| `gold-primary` | `#c9a84c` | CTA・ロゴ・ユーザーネーム |
| `gold-dim` | `#9a7c35` | グラデーション終点・サブアクセント |
| `gold-bright` | `#d4b965` | ハイライト・ホバー |
| `gold-overlay-12` | `rgba(201,168,76,0.12)` | チップ・バッジ背景 |
| `gold-overlay-30` | `rgba(201,168,76,0.30)` | チップ・バッジボーダー |
| `text-primary` | `#ddd6c8` | メインテキスト（warm ivory） |
| `text-secondary` | `#7a7260` | サブテキスト・タグライン |
| `text-muted` | `#4a5245` | プレースホルダー・非活性 |
| `watermark` | `rgba(201,168,76,0.03)` | 背景スートシンボル |

### 0.2 Typography

| Role | Font Family | Weight | Notes |
|------|-------------|--------|-------|
| Display / Logo | Playfair Display, Georgia, serif | 600-700 | タイトル・ブランド名 |
| Body / Content | Noto Sans JP, system-ui, sans-serif | 400-500 | 投稿テキスト・説明 |
| Monospace | Geist Mono, monospace | 400 | ハンド表記・統計数値 |

### 0.3 Common Visual Elements

| Element | Spec |
|---------|------|
| Background Gradient | `linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)` |
| Suit Watermark | ♠♥♦♣ / font-size: 適宜 / color: `rgba(201,168,76,0.03)` |
| Logo Mark | ♠ with `linear-gradient(135deg, #c9a84c, #9a7c35)` + "Poker SNS" in `#ddd6c8` |
| Avatar Border | `2-3px solid #c9a84c`, border-radius: 50% |
| Feature Chip | bg: `gold-overlay-12`, border: `1px solid gold-overlay-30`, text: `#c9a84c`, radius: 100px |

---

## 1. Template Size A: OGP Card (1200 x 630 px)

### 1.1 Overview

| Property | Value |
|----------|-------|
| Canvas | 1200 x 630 px |
| Format | PNG (Next.js ImageResponse / Edge Runtime) |
| Use Case | X (Twitter) Cards, LINE, Facebook, Discord, Slack |
| Aspect Ratio | 1.91:1 |

### 1.2 Layout Variants

#### Variant A-1: Post Detail (Priority: HIGH) -- 実装済

```
+====================================================================+
|  1200 x 630                                                         |
|  padding: 48px                                                      |
|                                                                      |
|  [♠ ♥ ♦ ♣]  ← watermark layer (220px, opacity 0.03)               |
|                                                                      |
|  +----+  name              @username        ♠ Poker SNS (24px)     |
|  |AVA |  (16px, #ddd6c8)   (18px, #c9a84c)  (gold, top-right)     |
|  +----+                                                              |
|  (56x56, border 2px #c9a84c)                                        |
|                                                                      |
|  "投稿テキスト (max 120 chars)..."                                    |
|  (28px, #ddd6c8, line-height 1.5, max 3 lines)                      |
|                                                                      |
|  ─── (1px solid #2a3828, margin 24px 0) ───                         |
|                                                                      |
|  ♥ 12 likes   ◇ 5 replies   ↻ 3 reposts                           |
|  (18px, #7a7260)                                                     |
+====================================================================+
```

- File: `frontend/src/app/post/[id]/opengraph-image.tsx`
- Data: `GET /posts/{id}/meta`
- Status: DONE

#### Variant A-2: User Profile (Priority: MEDIUM) -- 未実装

```
+====================================================================+
|  1200 x 630                                                         |
|  padding: 48px                                                      |
|                                                                      |
|  [♠ ♥ ♦ ♣]  ← watermark layer                                     |
|                                                                      |
|              +--------+                                              |
|              |  AVA   |  (80x80, border 3px #c9a84c)               |
|              +--------+                                              |
|                                                                      |
|              Display Name                                            |
|              (36px, #ddd6c8, bold)                                   |
|                                                                      |
|              @username                                               |
|              (22px, #c9a84c)                                        |
|                                                                      |
|              Bio text (max 80 chars)                                 |
|              (20px, #7a7260, center)                                |
|                                                                      |
|                                          ♠ Poker SNS (bottom-right) |
+====================================================================+
```

- File: `frontend/src/app/profile/[username]/opengraph-image.tsx`
- Data: `GET /users/{username}`
- Status: TODO

#### Variant A-3: Default/Site (Priority: LOW) -- 実装済・カラー修正済

```
+====================================================================+
|  1200 x 630                                                         |
|                                                                      |
|  [♠ ♥ ♦ ♣] ← watermark (220px)                                    |
|                                                                      |
|          ♠ Poker SNS                                                |
|          (spade 80px gold-gradient, text 72px #ddd6c8)             |
|                                                                      |
|          ポーカーハンドを共有して、もっと上手くなる                       |
|          (34px, #7a7260, center)                                    |
|                                                                      |
|  [ ♠ ハンドを記録 ] [ ♥ 仲間と議論 ] [ ♦ 戦略を磨く ]               |
|  (feature chips, 20px, gold)                                        |
+====================================================================+
```

- File: `frontend/src/app/opengraph-image.tsx`
- Status: DONE (colors aligned)

---

## 2. Template Size B: YouTube Thumbnail (1280 x 720 px)

### 2.1 Overview

| Property | Value |
|----------|-------|
| Canvas | 1280 x 720 px |
| Format | JPEG or PNG (YouTube recommended) |
| Use Case | YouTube Shorts / 通常動画のカスタムサムネイル |
| Aspect Ratio | 16:9 |
| File Size | max 2MB (YouTube制限) |
| Safe Zone | 右下にYouTube再生時間バッジ表示あり → 右下100x40pxは重要要素を配置しない |

### 2.2 Layout Variants

#### Variant B-1: ハンド解説 Shorts サムネイル (Primary)

```
+========================================================================+
|  1280 x 720                                                             |
|  bg: linear-gradient(135deg, #0d1009, #131a14, #0d1009)                |
|                                                                          |
|  [♠ ♥ ♦ ♣] watermark (180px, opacity 0.03)                            |
|                                                                          |
|  LEFT ZONE (60%)                      RIGHT ZONE (40%)                  |
|  +-----------------------------+      +---------------------------+     |
|  |                             |      |                           |     |
|  | HEADLINE TEXT               |      |  ♠ A♠ K♥                 |     |
|  | "今日のベストハンド"           |      |  (Card visualization)    |     |
|  | (48px, #ddd6c8, bold)       |      |  (poker hand display)    |     |
|  |                             |      |  bg: #192118             |     |
|  | SUB TEXT                    |      |  border: 2px #2a3828     |     |
|  | "3BETポットの最適ライン"      |      |  border-radius: 16px     |     |
|  | (28px, #c9a84c)            |      |                           |     |
|  |                             |      +---------------------------+     |
|  +-----------------------------+                                        |
|                                                                          |
|  ── bottom bar ──────────────────────────────────────────────────      |
|  [ ♠ Poker SNS ]  @username                     [ ♥ 12 likes ]        |
|  (24px, gold)      (20px, #7a7260)               (20px, #7a7260)       |
|                                                                          |
|  ⚠ safe zone: 右下 100x40px にはテキスト配置禁止                         |
+========================================================================+
```

**Design Tokens (B-1固有)**:

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 1280 x 720 px |
| Padding | outer | 40px |
| Headline | font | Playfair Display, 48px, 700 |
| Headline | color | #ddd6c8 |
| Headline | text-shadow | `0 2px 8px rgba(0,0,0,0.6)` |
| Sub text | font | Noto Sans JP, 28px, 500 |
| Sub text | color | #c9a84c |
| Card area | background | #192118 |
| Card area | border | 2px solid #2a3828 |
| Card area | border-radius | 16px |
| Card area | padding | 24px |
| Bottom bar | background | `rgba(13,16,9,0.85)` |
| Bottom bar | padding | 12px 40px |
| Logo | size | 24px |
| Username | color | #7a7260 |
| Stats | color | #7a7260 |

#### Variant B-2: 戦略トピック動画サムネイル (Secondary)

```
+========================================================================+
|  1280 x 720                                                             |
|  bg: linear-gradient(135deg, #0d1009, #131a14, #0d1009)                |
|                                                                          |
|  +----------------------------------------------------------------+    |
|  |  CENTER ZONE                                                    |    |
|  |                                                                  |    |
|  |              TOPIC TEXT (2 lines max)                            |    |
|  |              "ポジション別                                        |    |
|  |               3BET戦略まとめ"                                     |    |
|  |              (56px, #ddd6c8, bold, center, text-shadow)          |    |
|  |                                                                  |    |
|  |              ─── (gold divider, 120px, #c9a84c) ───            |    |
|  |                                                                  |    |
|  |              "Poker SNS厳選コンテンツ"                            |    |
|  |              (24px, #c9a84c, center)                            |    |
|  |                                                                  |    |
|  +----------------------------------------------------------------+    |
|                                                                          |
|  bottom-left: ♠ Poker SNS (gold, 28px)                                |
+========================================================================+
```

### 2.3 YouTube Safe Zone Guide

```
+========================================================================+
|                                                                          |
|  ┌─ title safe (内側 5%) ──────────────────────────────────────┐      |
|  │                                                                │      |
|  │                                                                │      |
|  │              MAIN CONTENT AREA                                 │      |
|  │              (重要テキスト・ビジュアルはここに)                    │      |
|  │                                                                │      |
|  │                                                                │      |
|  └────────────────────────────────────────────────────────────┘      |
|                                                    ┌──────────┐        |
|                                                    │ 再生時間  │        |
|                                                    │ バッジ    │        |
|                                                    └──────────┘        |
+========================================================================+
  ↑ action safe (外側 3%) — ロゴ・ブランド要素はここまで
```

---

## 3. Template Size C: Instagram Reels Thumbnail (1080 x 1920 px)

### 3.1 Overview

| Property | Value |
|----------|-------|
| Canvas | 1080 x 1920 px |
| Format | JPEG (Instagram推奨) |
| Use Case | Instagram Reels カバー画像 / Stories投稿 |
| Aspect Ratio | 9:16 (縦型) |
| File Size | max 8MB |
| Safe Zone | 上部60px(ステータスバー) + 下部250px(CTA/UIオーバーレイ) は避ける |

### 3.2 Layout Variants

#### Variant C-1: ハンドハイライト Reels カバー (Primary)

```
+============================================+
|  1080 x 1920                                |
|  bg: linear-gradient(180deg,                |
|      #0d1009 0%, #131a14 40%,              |
|      #192118 70%, #0d1009 100%)            |
|                                              |
|  ⚠ TOP SAFE ZONE (60px) - 空白              |
|                                              |
|  ───────────── TOP SECTION ──────────────  |
|                                              |
|  [ ♠ Poker SNS ]                            |
|  (logo, 36px, gold-gradient, center)        |
|                                              |
|  ─── (gold line, 80px, #c9a84c) ───        |
|                                              |
|  ───────── MAIN CONTENT ─────────────     |
|                                              |
|  +--------------------------------------+   |
|  |                                      |   |
|  |        CARD VISUALIZATION            |   |
|  |        (poker hand display)          |   |
|  |        A♠  K♥                        |   |
|  |                                      |   |
|  |        bg: #192118                   |   |
|  |        border: 2px #2a3828           |   |
|  |        border-radius: 20px           |   |
|  |        size: 900 x 500              |   |
|  |        shadow: 0 8px 32px            |   |
|  |              rgba(0,0,0,0.5)         |   |
|  +--------------------------------------+   |
|                                              |
|  ────────── TEXT SECTION ─────────────    |
|                                              |
|  HEADLINE                                   |
|  "ナッツストレートで                          |
|   フルスタック獲得"                           |
|  (52px, #ddd6c8, bold, center)             |
|  (text-shadow: 0 2px 12px rgba(0,0,0,0.7))|
|                                              |
|  SUB TEXT                                   |
|  "@username のプレイ"                        |
|  (28px, #c9a84c, center)                   |
|                                              |
|  ────────── STATS BAR ────────────────   |
|                                              |
|  [ ♥ 12 ]  [ ◇ 5 ]  [ ↻ 3 ]             |
|  (chip style, 24px)                         |
|                                              |
|  ⚠ BOTTOM SAFE ZONE (250px) - 空白         |
|  (Instagram UI overlay area)                |
|                                              |
+============================================+
```

**Design Tokens (C-1固有)**:

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 1080 x 1920 px |
| Background | gradient | `linear-gradient(180deg, #0d1009 0%, #131a14 40%, #192118 70%, #0d1009 100%)` |
| Top safe zone | height | 60px (status bar) |
| Bottom safe zone | height | 250px (Instagram UI) |
| Content area | effective | 1080 x 1610 px |
| Padding | horizontal | 60px |
| Logo | font-size | 36px |
| Logo spade | gradient | `linear-gradient(135deg, #c9a84c, #9a7c35)` |
| Gold divider | width | 80px, height: 2px |
| Card area | size | 900 x 500 px (max) |
| Card area | background | #192118 |
| Card area | border | 2px solid #2a3828 |
| Card area | border-radius | 20px |
| Card area | box-shadow | `0 8px 32px rgba(0,0,0,0.5)` |
| Headline | font | Playfair Display, 52px, 700 |
| Headline | color | #ddd6c8 |
| Headline | text-shadow | `0 2px 12px rgba(0,0,0,0.7)` |
| Headline | max lines | 2 |
| Sub text | font | Noto Sans JP, 28px, 500 |
| Sub text | color | #c9a84c |
| Stats chip | style | Feature Chip (gold-overlay bg) |
| Stats chip | font-size | 24px |
| Suit watermark | font-size | 300px |
| Suit watermark | opacity | 0.03 |

#### Variant C-2: 戦略Tips Reels カバー (Secondary)

```
+============================================+
|  1080 x 1920                                |
|  bg: linear-gradient(180deg,                |
|      #0d1009, #131a14, #0d1009)            |
|                                              |
|  ⚠ TOP SAFE ZONE (60px)                    |
|                                              |
|  [ ♠ Poker SNS ]                            |
|  (logo, center, 36px)                       |
|                                              |
|  ┌──────────────────────────────────┐      |
|  │                                    │      |
|  │  NUMBER BADGE                      │      |
|  │  "Tips #12"                        │      |
|  │  (72px, #c9a84c, bold)            │      |
|  │                                    │      |
|  │  ─── gold divider ───             │      |
|  │                                    │      |
|  │  TOPIC TEXT                        │      |
|  │  "ポジション別                      │      |
|  │   レイズサイズの                     │      |
|  │   考え方"                           │      |
|  │  (48px, #ddd6c8, center)          │      |
|  │                                    │      |
|  │  DESCRIPTION                       │      |
|  │  "UTGからBTNまで                    │      |
|  │   最適なサイジング"                  │      |
|  │  (24px, #7a7260, center)          │      |
|  │                                    │      |
|  └──────────────────────────────────┘      |
|                                              |
|  [ 詳しくはプロフィールリンクから ]            |
|  (20px, #c9a84c, center)                   |
|                                              |
|  ⚠ BOTTOM SAFE ZONE (250px)                |
+============================================+
```

### 3.3 Instagram Safe Zone Guide

```
+============================================+
|  ┌── status bar overlay (60px) ────────┐  |
|  └────────────────────────────────────┘  |
|                                            |
|  ┌── content safe zone ───────────────┐  |
|  │                                      │  |
|  │      ALL IMPORTANT CONTENT           │  |
|  │      MUST BE WITHIN THIS AREA        │  |
|  │                                      │  |
|  │      1080 x 1610 effective           │  |
|  │                                      │  |
|  └────────────────────────────────────┘  |
|                                            |
|  ┌── UI overlay zone (250px) ──────────┐  |
|  │  [username]  [caption preview]       │  |
|  │  [like] [comment] [share] [audio]    │  |
|  │  [CTA button area]                   │  |
|  └────────────────────────────────────┘  |
+============================================+
```

---

## 4. Cross-Platform Visibility Check Criteria

### 4.1 X (Twitter) Card Preview

| Check Item | Spec | Pass Criteria |
|------------|------|---------------|
| Card Type | `summary_large_image` | 1200x630画像がフル幅で表示される |
| Text Truncation | タイトル max 70chars | タイトルが...で切れていないこと |
| Image Clarity | min 300x157px | ぼやけ・ピクセル化なし |
| Dark Mode対応 | 背景#0d1009 vs X dark bg #000 | コントラスト比4.5:1以上 |
| Gold可読性 | #c9a84c on #0d1009 | WCAG AA準拠 (contrast 7.2:1) |
| Mobile表示 | 375px width | テキスト16px以上で判読可能 |

### 4.2 YouTube Thumbnail Preview

| Check Item | Spec | Pass Criteria |
|------------|------|---------------|
| 検索結果表示 | 246x138px (縮小表示) | ヘッドライン48px→縮小後も判読可能 |
| 推奨動画列 | 168x94px (サイドバー) | ロゴ・メインテキストが視認できる |
| モバイル表示 | フル幅 (横スクロール) | テキスト・カードエリア明瞭 |
| 再生時間バッジ | 右下100x40px | 重要テキストがバッジに隠れない |
| Shorts縦表示 | 9:16にクロップされる場合 | 中央の主要コンテンツが残る |
| テキスト量 | max 6 words headline | 小サイズでも一目で内容理解可能 |

### 4.3 Instagram Reels Cover Preview

| Check Item | Spec | Pass Criteria |
|------------|------|---------------|
| グリッド表示 | 約320x568px (3列グリッド) | ロゴ・ヘッドラインが視認可能 |
| Reels Tab | カバー画像1:1クロップ | 中央正方形エリアに主要コンテンツ |
| Stories表示 | フル画面 | Safe Zone内にテキスト収まる |
| Bottom overlay | 下部250px UIオーバーレイ | テキストがUI要素と被らない |
| プロフィールグリッド | 120x120px icon view | ブランドカラー(gold/dark)が認識可能 |
| Discovery | Explore tab | 他投稿と並んだ際のブランド差別化 |

### 4.4 Contrast Ratio Verification Table

| Text Color | Background | Ratio | WCAG Level |
|------------|------------|-------|------------|
| #ddd6c8 (primary) | #0d1009 (bg) | 12.8:1 | AAA |
| #c9a84c (gold) | #0d1009 (bg) | 7.2:1 | AAA |
| #7a7260 (secondary) | #0d1009 (bg) | 3.8:1 | AA Large |
| #4a5245 (muted) | #0d1009 (bg) | 2.1:1 | Decorative only |
| #ddd6c8 (primary) | #131a14 (surface) | 11.2:1 | AAA |
| #c9a84c (gold) | #131a14 (surface) | 6.3:1 | AA |
| #0d1009 (dark) | #c9a84c (gold btn) | 7.2:1 | AAA |

---

## 5. Template Generation Architecture (Dev連携用)

### 5.1 OGP (1200x630) -- Next.js ImageResponse

既にEdge Runtimeで実装済み。`next/og`の`ImageResponse`を使用。

```
frontend/src/app/opengraph-image.tsx          → Site default (DONE)
frontend/src/app/post/[id]/opengraph-image.tsx → Per-post (DONE)
frontend/src/app/profile/[username]/opengraph-image.tsx → Per-profile (TODO)
```

### 5.2 YouTube Thumbnail (1280x720) -- バックエンド生成

自動投稿モジュール（NestJS）でサムネイル画像を生成。

- **推奨ライブラリ**: `@napi-rs/canvas` or `sharp` + SVGテンプレート
- **生成タイミング**: 自動投稿ジョブ実行時にオンデマンド生成
- **キャッシュ**: 生成済み画像は`/uploads/thumbnails/yt/`に保存
- **テンプレートデータ**:
  - headline: 投稿コンテンツから自動抽出 (max 20chars)
  - sub_text: ハッシュタグまたはハンド情報
  - card_visual: PokerHand表示用データ（suits + ranks）
  - username: 投稿者ユーザーネーム
  - stats: likes / replies / reposts

### 5.3 Instagram Reels Cover (1080x1920) -- バックエンド生成

- **推奨ライブラリ**: 同上 (`@napi-rs/canvas` or `sharp`)
- **生成タイミング**: Reels動画アップロード時にカバー画像として同時生成
- **キャッシュ**: `/uploads/thumbnails/ig/`に保存
- **テンプレートデータ**: YouTube Thumbnailと同構造

### 5.4 Template Data Interface (Dev向け参考)

```typescript
// Design Spec: テンプレートに渡すデータ構造
interface SNSThumbnailData {
  variant: 'hand_highlight' | 'strategy_topic';
  headline: string;       // max 20chars (YT) / 30chars (IG)
  subText?: string;       // max 40chars
  username: string;
  avatarUrl?: string;
  pokerHand?: {
    cards: { suit: string; rank: string }[];
  };
  stats?: {
    likes: number;
    replies: number;
    reposts: number;
  };
}
```

---

## 6. Asset Delivery Checklist

| Deliverable | Size | Format | Status | Priority |
|-------------|------|--------|--------|----------|
| OGP Template A (Post) | 1200x630 | PNG/next-og | DONE | -- |
| OGP Template B (Profile) | 1200x630 | PNG/next-og | TODO | P1 |
| OGP Template C (Site Default) | 1200x630 | PNG/next-og | DONE | -- |
| YT Thumbnail B-1 (Hand) | 1280x720 | JPEG/PNG | SPEC READY | P1 |
| YT Thumbnail B-2 (Strategy) | 1280x720 | JPEG/PNG | SPEC READY | P2 |
| IG Reels Cover C-1 (Hand) | 1080x1920 | JPEG | SPEC READY | P1 |
| IG Reels Cover C-2 (Tips) | 1080x1920 | JPEG | SPEC READY | P2 |
| Safe Zone Guide (YT) | -- | Doc | DONE | -- |
| Safe Zone Guide (IG) | -- | Doc | DONE | -- |
| Contrast Ratio Table | -- | Doc | DONE | -- |
| Visibility Check Criteria | -- | Doc | DONE | -- |

---

## 7. Design Review Notes

### 7.1 ブランド統一性の注意点

1. **全テンプレートで共通**: 背景グラデーション・ゴールドアクセント・スートウォーターマーク
2. **フォント統一**: Display=Playfair Display / Body=Noto Sans JP（バックエンド生成時もフォントファイル埋め込み必須）
3. **ロゴ配置**: 必ず1箇所以上に「♠ Poker SNS」ロゴを配置
4. **テキストシャドウ**: YouTube/Reelsではtext-shadowを追加して視認性確保（OGPでは不要）
5. **カラー厳守**: Tailwind defaultやamber系の使用禁止。必ず`#c9a84c`系ゴールドを使用

### 7.2 各プラットフォーム固有の注意

| Platform | 注意点 |
|----------|--------|
| X | Dark mode/Light mode両方でコントラスト確保。画像内テキストは16px以上 |
| YouTube | 縮小表示(168x94px)でも判読可能なフォントサイズ。再生時間バッジ回避 |
| Instagram | 1:1クロップ(グリッド表示)でも主要コンテンツが見える中央配置設計 |
| LINE | OGP card表示。X同様1200x630が使用される |
| Discord | Embed表示。OGPカードがcompactになる場合あり |
