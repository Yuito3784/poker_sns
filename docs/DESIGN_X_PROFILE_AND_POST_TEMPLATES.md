# X (Twitter) Profile Assets & Post Template Design Spec
# X プロフィール画像・ヘッダー・投稿テンプレートデザイン仕様書

> Design Team / 百鬼 作成 / 2026-03-07
> 宝鐘リーダー指示: Xプロフィール画像(400x400) + ヘッダーバナー(1500x500) + 投稿テンプレート4パターン
> Theme: "The Felt Table" Dark Luxury
> Account: @poker93626

---

## 0. Brand Design Tokens (共通)

既存の "The Felt Table" Dark Luxury Design System を継承。
詳細は `docs/DESIGN_SPEC_SNS_TEMPLATES.md` Section 0 を参照。

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0d1009` | 背景 |
| `bg-surface` | `#131a14` | カード面 |
| `bg-elevated` | `#192118` | オーバーレイ面 |
| `border-subtle` | `#1f2a1e` | ボーダー |
| `border-medium` | `#2a3828` | ディバイダー |
| `gold-primary` | `#c9a84c` | CTA・ロゴ・アクセント |
| `gold-dim` | `#9a7c35` | グラデーション終点 |
| `gold-bright` | `#d4b965` | ハイライト |
| `text-primary` | `#ddd6c8` | メインテキスト |
| `text-secondary` | `#7a7260` | サブテキスト |

---

## 1. X Profile Image (400 x 400 px)

### 1.1 Layout

YouTube/Instagram アイコンとブランド統一。スペード + "P" マーク。

```
+====================================+
|  400 x 400 px                       |
|  bg: linear-gradient(135deg,        |
|      #131a14 0%, #0d1009 100%)     |
|                                      |
|  ┌──────────────────────────────┐  |
|  │  CIRCLE CROP (X auto-crops)  │  |
|  │  diameter: 400px             │  |
|  │                                │  |
|  │        ♠                      │  |
|  │  (spade, 160px)              │  |
|  │  fill: linear-gradient(      │  |
|  │    135deg, #d4b965, #9a7c35) │  |
|  │  filter: drop-shadow(        │  |
|  │    0 4px 12px rgba(0,0,0,0.5)│  |
|  │  )                            │  |
|  │                                │  |
|  │  "P"                          │  |
|  │  (inside spade, 60px,        │  |
|  │   #0d1009, Playfair Display, │  |
|  │   700, centered)             │  |
|  │                                │  |
|  │  ── subtle ring ──           │  |
|  │  (circle 360px, 2px,        │  |
|  │   rgba(201,168,76,0.2))     │  |
|  │                                │  |
|  └──────────────────────────────┘  |
+====================================+
```

### 1.2 Design Tokens

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 400 x 400 px |
| Background | gradient | `linear-gradient(135deg, #131a14 0%, #0d1009 100%)` |
| Spade | size | 160px |
| Spade | fill | `linear-gradient(135deg, #d4b965, #9a7c35)` |
| Spade | drop-shadow | `0 4px 12px rgba(0,0,0,0.5)` |
| Inner "P" | font | Playfair Display, 60px, 700 |
| Inner "P" | color | #0d1009 |
| Subtle ring | diameter | 360px |
| Subtle ring | stroke | 2px, `rgba(201,168,76,0.2)` |

### 1.3 File Spec

| Property | Value |
|----------|-------|
| Format | PNG |
| Max file size | 2MB |
| Color space | sRGB |
| Min display size | 48px (tweet avatar) |
| Verify at | 48px, 32px — spade+P recognizable |

### 1.4 Cross-Platform Consistency

YouTube icon (800x800) を 400x400 にリサイズしたものと同一デザイン。
全プラットフォームで統一ブランドマークを維持。

---

## 2. X Header Banner (1500 x 500 px)

### 2.1 Safe Zone

```
+======================================================================+
|  1500 x 500 (Full banner)                                              |
|                                                                        |
|  ┌────────────────────────────────────────────────────────────────┐  |
|  │  1500 x 500 Desktop visible                                    │  |
|  │                                                                  │  |
|  │  ┌────────────────────────────────────────────────────────┐    │  |
|  │  │  1024 x 360 (Mobile safe zone — critical content)      │    │  |
|  │  │  centered horizontally, centered vertically             │    │  |
|  │  │                                                          │    │  |
|  │  └────────────────────────────────────────────────────────┘    │  |
|  │                                                                  │  |
|  │  ⚠ 左下 120x120px: プロフィール画像が重なる（デスクトップ）       │  |
|  │  ⚠ 下部 80px: プロフィール画像オーバーラップ可能性               │  |
|  └────────────────────────────────────────────────────────────────┘  |
+======================================================================+
```

### 2.2 Layout Design — Option A (推奨: 左テキスト + 右アクセント)

```
+======================================================================+
|  1500 x 500                                                            |
|  bg: linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)  |
|                                                                        |
|  [♠ ♥ ♦ ♣] watermark (300px, opacity 0.03)                          |
|  scattered across full 1500px canvas                                  |
|                                                                        |
|  ── decorative border (1px #2a3828, 30px inset) ──                   |
|  ── gold accent corners (60px lines, #c9a84c) ──                     |
|                                                                        |
|  ┌─── MOBILE SAFE ZONE (1024 x 360) ──────────────────────────┐    |
|  │                                                                │    |
|  │  LEFT SECTION (55%)           RIGHT SECTION (45%)             │    |
|  │                                                                │    |
|  │  ♠ (spade icon, 48px)        ┌─────────────────────────┐   │    |
|  │  gold-gradient                │                           │   │    |
|  │                               │  DECORATIVE CARDS        │   │    |
|  │  "Poker SNS"                 │  A♠  K♠  Q♠  J♠  10♠   │   │    |
|  │  (40px, #ddd6c8,            │  (Royal Flush visual)    │   │    |
|  │   Playfair Display, 700)    │  fanned at ~5° each      │   │    |
|  │                               │  gold-gradient outline  │   │    |
|  │  ─── gold line (50px) ──    │  drop-shadow             │   │    |
|  │                               │  opacity: 0.8           │   │    |
|  │  "ポーカーハンドを共有して、   │                           │   │    |
|  │   もっと上手くなる"           └─────────────────────────┘   │    |
|  │  (18px, #7a7260,                                            │    |
|  │   Noto Sans JP, 400)                                       │    |
|  │                                                                │    |
|  │  [ ♠ ハンド記録 ] [ ♥ 戦略議論 ]                              │    |
|  │  (chip style, 14px, gold)                                     │    |
|  │                                                                │    |
|  └────────────────────────────────────────────────────────────┘    |
|                                                                        |
+======================================================================+
```

### 2.3 Layout Design — Option B (センター配置・ミニマル)

```
+======================================================================+
|  1500 x 500                                                            |
|  bg: linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)  |
|                                                                        |
|  [♠ ♥ ♦ ♣] watermark (300px, opacity 0.03)                          |
|                                                                        |
|  ── decorative border (1px #2a3828, 30px inset) ──                   |
|  ── gold accent corners (60px lines, #c9a84c) ──                     |
|                                                                        |
|                        ♠ (spade, 56px, gold-gradient)                 |
|                                                                        |
|                        "Poker SNS"                                    |
|                        (44px, #ddd6c8, Playfair Display, 700)        |
|                                                                        |
|                        ── gold line (60px) ──                         |
|                                                                        |
|                        "Hand Reviews. Strategy. Community."           |
|                        (20px, #c9a84c, Geist Mono, 400)             |
|                                                                        |
+======================================================================+
```

### 2.4 Design Tokens

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 1500 x 500 px |
| Mobile safe zone | size | 1024 x 360 px (centered) |
| Background | gradient | `linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)` |
| Suit watermark | font-size | 300px |
| Suit watermark | color | `rgba(201,168,76,0.03)` |
| Decorative border | color | #2a3828, 1px |
| Decorative border | offset | 30px inset from edge |
| Gold corners | color | #c9a84c |
| Gold corners | length | 60px |
| Spade icon | size | 48px (Option A) / 56px (Option B) |
| Spade icon | color | `linear-gradient(135deg, #c9a84c, #9a7c35)` |
| Brand name | font | Playfair Display, 40-44px, 700 |
| Brand name | color | #ddd6c8 |
| Tagline | font | Noto Sans JP, 18px, 400 |
| Tagline | color | #7a7260 |
| Feature chips | bg | `rgba(201,168,76,0.12)` |
| Feature chips | border | `1px solid rgba(201,168,76,0.30)` |
| Feature chips | text | #c9a84c, 14px |
| Card visual (A) | card count | 5 (Royal Flush) |
| Card visual (A) | rotation | -10° to +10° (fanned) |
| Card visual (A) | outline | 1px #c9a84c |
| Gold divider | width | 50-60px, height: 2px, color: #c9a84c |

### 2.5 File Spec

| Property | Value |
|----------|-------|
| Format | JPEG or PNG |
| Max file size | 5MB |
| Color space | sRGB |
| Export quality | 95% (JPEG) |

### 2.6 Overlap Considerations

- **左下**: デスクトップでプロフィール画像（約120px circle）が重なるため、左下120x120px領域には重要テキストを配置しない
- **下部**: モバイルではバナー下部がプロフィール情報で覆われる可能性 → 下部80pxは装飾のみ

---

## 3. X Bio テキスト仕様

```
♠ Poker SNS — ポーカー専用SNS
ハンドレビュー・戦略議論・コミュニティ
プレイを記録して、もっと上手くなる
pokersns.jp
```

| Property | Value |
|----------|-------|
| Max chars | 160 (X制限) |
| Location link | pokersns.jp |
| Category | テクノロジー / ゲーム |

---

## 4. X Post Image Templates (4パターン)

投稿時に添付する画像テンプレート。X推奨サイズ 1200x675px (16:9)。

### 4.1 Template 1: Poker Tips Card (ポーカーTips)

使用場面: 戦略Tips、ポジション解説、ベッティングセオリー等

```
+====================================================================+
|  1200 x 675                                                          |
|  bg: linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)|
|                                                                      |
|  [♠ ♥ ♦ ♣] watermark (200px, opacity 0.03)                        |
|                                                                      |
|  ── decorative border (1px #2a3828, 32px inset) ──                 |
|  ── gold accent corners (48px lines, #c9a84c) ──                   |
|                                                                      |
|  TOP-LEFT: ♠ Poker SNS (20px, gold)                                |
|  TOP-RIGHT: [ Tips #XX ] chip (16px, gold chip style)               |
|                                                                      |
|  ── CENTER CONTENT ──                                               |
|                                                                      |
|  CATEGORY LABEL                                                      |
|  "STRATEGY"                                                          |
|  (14px, #c9a84c, Geist Mono, letter-spacing 4px, uppercase)        |
|                                                                      |
|  ── gold divider (60px) ──                                          |
|                                                                      |
|  MAIN TITLE (max 2 lines)                                           |
|  "BTNからの3BETレンジ                                                |
|   最適構築ガイド"                                                     |
|  (36px, #ddd6c8, Playfair Display, 700, center)                    |
|                                                                      |
|  DESCRIPTION (max 2 lines)                                          |
|  "ポジション別のバランスの取れた                                       |
|   3BETレンジをGTO観点で解説"                                         |
|  (18px, #7a7260, Noto Sans JP, center)                             |
|                                                                      |
|  BOTTOM-CENTER:                                                      |
|  [ ♠ 詳しくはpokersns.jpで ] (CTA chip, 14px, gold)               |
|                                                                      |
+====================================================================+
```

**Design Tokens (Template 1)**:

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 1200 x 675 px |
| Category label | font | Geist Mono, 14px, 400 |
| Category label | letter-spacing | 4px |
| Category label | color | #c9a84c |
| Main title | font | Playfair Display, 36px, 700 |
| Main title | color | #ddd6c8 |
| Main title | max lines | 2 |
| Description | font | Noto Sans JP, 18px, 400 |
| Description | color | #7a7260 |
| CTA chip | style | gold chip (bg gold-overlay-12, border gold-overlay-30) |
| Decorative border | inset | 32px |
| Gold corners | length | 48px |

---

### 4.2 Template 2: Hand Review Card (ハンドレビュー)

使用場面: 特定のハンドの解説、ハンド分析投稿

```
+====================================================================+
|  1200 x 675                                                          |
|  bg: linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)|
|                                                                      |
|  TOP BAR (full width, 48px height)                                  |
|  bg: rgba(25,33,24,0.8)  border-bottom: 1px #2a3828               |
|  ♠ Poker SNS (left, 18px, gold)                                    |
|  "HAND REVIEW" (right, 14px, #c9a84c, Geist Mono)                 |
|                                                                      |
|  ── MAIN CONTENT (split layout) ──                                 |
|                                                                      |
|  LEFT (55%)                        RIGHT (45%)                      |
|                                                                      |
|  SITUATION LABEL                   ┌──────────────────────┐       |
|  "Preflop / BTN vs BB"            │                        │       |
|  (14px, #c9a84c, Geist Mono)     │  CARD DISPLAY          │       |
|                                    │                        │       |
|  HERO HAND                        │   [A♠]  [K♥]          │       |
|  "A♠ K♥"                         │                        │       |
|  (48px, #ddd6c8, Geist Mono)     │  bg: #192118           │       |
|                                    │  border: 2px #2a3828   │       |
|  ACTION SEQUENCE                  │  border-radius: 12px   │       |
|  "3BET → Call → Cbet"            │  padding: 24px         │       |
|  (16px, #7a7260)                  │                        │       |
|                                    │  BOARD (if applicable) │       |
|  RESULT                           │  [Q♦] [J♣] [10♠]     │       |
|  "Pot: 45BB → Won"               │  [9♥] [2♣]            │       |
|  (20px, #c9a84c, bold)           │                        │       |
|                                    └──────────────────────┘       |
|                                                                      |
|  BOTTOM:                                                            |
|  ♥ XX  ◇ XX  ↻ XX                  pokersns.jp (right)           |
|  (14px, #7a7260)                    (14px, #c9a84c)                |
+====================================================================+
```

**Design Tokens (Template 2)**:

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 1200 x 675 px |
| Top bar | height | 48px |
| Top bar | bg | `rgba(25,33,24,0.8)` |
| Top bar | border-bottom | 1px solid #2a3828 |
| Situation label | font | Geist Mono, 14px, 400 |
| Hero hand | font | Geist Mono, 48px, 700 |
| Hero hand | color | #ddd6c8 |
| Card display area | bg | #192118 |
| Card display area | border | 2px solid #2a3828 |
| Card display area | border-radius | 12px |
| Card icons | size | 64px each |
| Card icons (spade/club) | color | #ddd6c8 |
| Card icons (heart/diamond) | color | #c94c4c (red accent) |
| Action text | font | Noto Sans JP, 16px, 400 |
| Result text | font | Noto Sans JP, 20px, 700 |
| Result text | color | #c9a84c |

---

### 4.3 Template 3: Stats / Achievement Card (戦績・実績カード)

使用場面: 週間成績、マイルストーン報告、コミュニティ統計

```
+====================================================================+
|  1200 x 675                                                          |
|  bg: linear-gradient(180deg, #0d1009 0%, #131a14 100%)             |
|                                                                      |
|  [♠ ♥ ♦ ♣] watermark (200px, opacity 0.03)                        |
|                                                                      |
|  TOP: ♠ Poker SNS (center, 20px, gold)                             |
|                                                                      |
|  HEADER                                                              |
|  "Weekly Stats"                                                      |
|  (16px, #c9a84c, Geist Mono, letter-spacing 3px, uppercase)        |
|                                                                      |
|  ── gold divider (80px) ──                                          |
|                                                                      |
|  DATE RANGE                                                          |
|  "2026.03.01 - 03.07"                                               |
|  (14px, #7a7260, Geist Mono)                                       |
|                                                                      |
|  ── STAT GRID (3 columns, centered) ──                              |
|                                                                      |
|  ┌──────────┐  ┌──────────┐  ┌──────────┐                       |
|  │           │  │           │  │           │                       |
|  │   "128"   │  │   "42"    │  │   "15"    │                       |
|  │ (48px,    │  │ (48px,    │  │ (48px,    │                       |
|  │  #c9a84c) │  │  #c9a84c) │  │  #c9a84c) │                       |
|  │           │  │           │  │           │                       |
|  │  "ハンド   │  │  "レビュー │  │  "新規     │                       |
|  │   投稿"    │  │   議論"    │  │   メンバー" │                       |
|  │ (14px,    │  │ (14px,    │  │ (14px,    │                       |
|  │  #7a7260) │  │  #7a7260) │  │  #7a7260) │                       |
|  │           │  │           │  │           │                       |
|  │ bg:#192118│  │ bg:#192118│  │ bg:#192118│                       |
|  │ border:   │  │ border:   │  │ border:   │                       |
|  │ 1px       │  │ 1px       │  │ 1px       │                       |
|  │ #2a3828   │  │ #2a3828   │  │ #2a3828   │                       |
|  │ radius:12 │  │ radius:12 │  │ radius:12 │                       |
|  └──────────┘  └──────────┘  └──────────┘                       |
|                                                                      |
|  BOTTOM:                                                            |
|  "あなたもハンドを共有しよう → pokersns.jp"                           |
|  (16px, #c9a84c, center)                                           |
|                                                                      |
+====================================================================+
```

**Design Tokens (Template 3)**:

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 1200 x 675 px |
| Background | gradient | `linear-gradient(180deg, #0d1009, #131a14)` |
| Header label | font | Geist Mono, 16px, 400 |
| Header label | letter-spacing | 3px |
| Date range | font | Geist Mono, 14px, 400 |
| Stat number | font | Playfair Display, 48px, 700 |
| Stat number | color | #c9a84c |
| Stat label | font | Noto Sans JP, 14px, 400 |
| Stat label | color | #7a7260 |
| Stat card | bg | #192118 |
| Stat card | border | 1px solid #2a3828 |
| Stat card | border-radius | 12px |
| Stat card | padding | 24px |
| Stat card | size | ~320 x 180 px |
| Grid gap | spacing | 24px |
| CTA text | font | Noto Sans JP, 16px, 500 |
| CTA text | color | #c9a84c |

---

### 4.4 Template 4: Quote / Insight Card (名言・インサイト)

使用場面: ポーカー名言、プロの言葉、コミュニティの知見共有

```
+====================================================================+
|  1200 x 675                                                          |
|  bg: linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)|
|                                                                      |
|  [♠ ♥ ♦ ♣] watermark (200px, opacity 0.03)                        |
|                                                                      |
|  ── decorative border (1px #2a3828, 32px inset) ──                 |
|  ── gold accent corners (48px lines, #c9a84c) ──                   |
|                                                                      |
|                                                                      |
|  TOP-LEFT: ♠ Poker SNS (18px, gold)                                |
|                                                                      |
|  CENTER:                                                             |
|                                                                      |
|     "  (opening quote mark, 80px, #c9a84c, opacity 0.3)            |
|                                                                      |
|     "ポーカーは意思決定のゲーム。                                      |
|      正しい判断を繰り返すことが                                        |
|      長期的な勝利に繋がる"                                            |
|     (28px, #ddd6c8, Noto Sans JP, 500,                             |
|      center, line-height 1.8, max 3 lines)                          |
|                                                                      |
|     ── gold divider (40px) ──                                       |
|                                                                      |
|     ATTRIBUTION                                                      |
|     "- @username"                                                    |
|     (18px, #c9a84c, Geist Mono)                                    |
|                                                                      |
|                                                                      |
|  BOTTOM-RIGHT:                                                       |
|  [ pokersns.jp ] (14px, #7a7260)                                   |
|                                                                      |
+====================================================================+
```

**Design Tokens (Template 4)**:

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 1200 x 675 px |
| Quote mark | font-size | 80px |
| Quote mark | color | `rgba(201,168,76,0.3)` |
| Quote mark | font | Georgia, serif |
| Quote text | font | Noto Sans JP, 28px, 500 |
| Quote text | color | #ddd6c8 |
| Quote text | line-height | 1.8 |
| Quote text | max lines | 3 |
| Quote text | max chars | 60 |
| Attribution | font | Geist Mono, 18px, 400 |
| Attribution | color | #c9a84c |
| Gold divider | width | 40px, height: 2px |

---

## 5. Template Usage Guide (運用チーム向け)

### 5.1 テンプレート × 投稿カテゴリ対応表

| カテゴリ | テンプレート | 投稿頻度目安 |
|---------|-------------|-------------|
| ポーカーTips / 戦略 | Template 1 (Tips Card) | 1日1-2回 |
| ハンドレビュー / 分析 | Template 2 (Hand Review) | 1日1回 |
| 週間統計 / マイルストーン | Template 3 (Stats Card) | 週1回 |
| 名言 / インサイト | Template 4 (Quote Card) | 1日1回 |
| テキストのみ投稿 | 画像なし | 1日1-2回 |
| リンク付き投稿 | OGPカードに依存 | 適宜 |

### 5.2 カテゴリラベル一覧 (Template 1 用)

| Label | 英語表記 | 用途 |
|-------|---------|------|
| STRATEGY | 戦略 | ベッティング、ポジション、レンジ |
| PREFLOP | プリフロップ | オープンレンジ、3BET |
| POSTFLOP | ポストフロップ | Cbet、チェックレイズ |
| GTO | GTO分析 | ソルバー結果、均衡戦略 |
| MENTAL | メンタル | ティルト対策、マインドセット |
| LIVE | ライブ | ライブポーカー固有Tips |

### 5.3 画像内テキスト制限

| Template | Main Text | Sub Text |
|----------|-----------|----------|
| Tips Card | 最大30文字 x 2行 | 最大40文字 x 2行 |
| Hand Review | ハンド表記のみ | アクション最大30文字 |
| Stats Card | 数値3桁まで | ラベル最大6文字 |
| Quote Card | 最大20文字 x 3行 | @username のみ |

---

## 6. X Card (OGP) 表示確認

pokersns.jp のリンクをツイートした際のカード表示。
既存の `frontend/src/app/opengraph-image.tsx` で生成済み。

### 6.1 必須メタタグ (Dev連携)

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@poker93626" />
<meta name="twitter:title" content="Poker SNS - ポーカーハンドを共有して、もっと上手くなる" />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://pokersns.jp/opengraph-image" />
```

**注意**: `twitter:site` を `@poker93626` に設定することで、カード表示時にアカウントが紐付けられる。

---

## 7. Asset Delivery Checklist

| Asset | Size | Format | Priority | Status |
|-------|------|--------|----------|--------|
| X Profile Image | 400x400 | PNG | P0 | SPEC READY |
| X Header Banner (Option A) | 1500x500 | JPEG/PNG | P0 | SPEC READY |
| X Header Banner (Option B) | 1500x500 | JPEG/PNG | P0 | SPEC READY |
| X Bio Text | text | -- | P0 | DONE |
| Post Template 1: Tips Card | 1200x675 | PNG | P0 | SPEC READY |
| Post Template 2: Hand Review | 1200x675 | PNG | P0 | SPEC READY |
| Post Template 3: Stats Card | 1200x675 | PNG | P1 | SPEC READY |
| Post Template 4: Quote Card | 1200x675 | PNG | P1 | SPEC READY |
| twitter:site メタタグ更新 | -- | code | P0 | DEV依頼 |

---

## 8. Cross-Reference

| Related Doc | Path |
|-------------|------|
| YouTube/IG Channel Assets | `docs/DESIGN_CHANNEL_PROFILE_ASSETS_SPEC.md` |
| SNS Multi-Platform Templates | `docs/DESIGN_SPEC_SNS_TEMPLATES.md` |
| Brand Asset Inventory | `docs/design-deliverable-brand-assets.md` |
| Marketing Strategy | `docs/MARKETING_STRATEGY_UNIFIED.md` |
| Cross-Platform Consistency | Section 3 of Channel Assets Spec |

---

## 9. CEO向け選定依頼

以下2点についてCEO判断をお願いします:

1. **ヘッダーバナー**: Option A (左テキスト + 右にロイヤルフラッシュビジュアル) vs Option B (センター配置ミニマル)
   - **推奨: Option A** — ポーカー感が視覚的に伝わり、アカウントの目的が一目で分かる

2. **投稿テンプレート優先度**: 運用開始時に全4パターン制作 or まずTips Card + Hand Reviewの2パターンで開始
   - **推奨: まず2パターン** — 運用しながらフィードバックを得て残り2パターンを調整
