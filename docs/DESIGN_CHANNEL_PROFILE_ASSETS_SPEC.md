# YouTube / Instagram Channel & Profile Asset Design Spec
# チャンネル・プロフィール画像デザイン仕様書

> Design Team / 不知火 作成 / 2026-03-02
> Task: 動画 #15 — 3-4-7 YouTube チャンネル開設・最適化 / 3-4-8 Instagram アカウント開設
> Theme: "The Felt Table" Dark Luxury

---

## 1. YouTube Channel Assets

### 1.1 YouTube Banner (2560 x 1440 px)

#### Safe Zone Breakdown

```
+======================================================================+
|  2560 x 1440 (Full banner — TV display)                               |
|                                                                        |
|  ┌────────────────────────────────────────────────────────────────┐  |
|  │  2560 x 423 (Desktop max visible — center crop)                │  |
|  │  y-offset: ~508px from top                                      │  |
|  │                                                                  │  |
|  │  ┌────────────────────────────────────────────────────────┐    │  |
|  │  │  1546 x 423 (Mobile safe zone — ALL critical content)  │    │  |
|  │  │  centered horizontally                                   │    │  |
|  │  │                                                          │    │  |
|  │  │                                                          │    │  |
|  │  └────────────────────────────────────────────────────────┘    │  |
|  │                                                                  │  |
|  └────────────────────────────────────────────────────────────────┘  |
|                                                                        |
+======================================================================+
```

#### Layout Design (Mobile Safe Zone: 1546 x 423 px)

```
+==================================================================+
|  bg: linear-gradient(135deg, #0d1009 0%, #131a14 50%,            |
|      #0d1009 100%)                                                |
|                                                                    |
|  [♠ ♥ ♦ ♣] watermark (400px, opacity 0.03)                      |
|  scattered across full 2560px canvas                              |
|                                                                    |
|  ┌─── MOBILE SAFE ZONE (1546 x 423) ────────────────────────┐  |
|  │                                                              │  |
|  │  LEFT SECTION (50%)        RIGHT SECTION (50%)              │  |
|  │                                                              │  |
|  │  ♠ (spade icon, 64px)     TAGLINE                          │  |
|  │  gold-gradient             "ポーカーハンドを共有して、       │  |
|  │                             もっと上手くなる"               │  |
|  │  "Poker SNS"               (24px, #7a7260, Noto Sans JP)  │  |
|  │  (48px, #ddd6c8,                                            │  |
|  │   Playfair Display, 700)   FEATURES (chip style)           │  |
|  │                             [ ♠ ハンド記録 ]               │  |
|  │  ─── gold line (60px) ──  [ ♥ 戦略議論 ]                 │  |
|  │                             [ ♦ レベルアップ ]              │  |
|  │  "Hand Reviews             (18px, gold chip style)         │  |
|  │   Every Day"                                                │  |
|  │  (20px, #c9a84c,                                            │  |
|  │   Geist Mono, 400)                                          │  |
|  │                                                              │  |
|  └──────────────────────────────────────────────────────────────┘  |
|                                                                    |
|  ── decorative border (1px #2a3828, inner 40px offset) ──        |
|  ── gold accent corners (80px lines, #c9a84c) ──                 |
+==================================================================+
```

#### Design Tokens

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 2560 x 1440 px |
| Mobile safe zone | size | 1546 x 423 px (centered) |
| Desktop visible | size | 2560 x 423 px (centered vertically) |
| Background | gradient | `linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)` |
| Suit watermark | font-size | 400px |
| Suit watermark | color | `rgba(201,168,76,0.03)` |
| Decorative border | color | #2a3828, 1px |
| Decorative border | offset | 40px inset from edge |
| Gold corners | color | #c9a84c |
| Gold corners | length | 80px |
| Spade icon | size | 64px |
| Spade icon | color | `linear-gradient(135deg, #c9a84c, #9a7c35)` |
| Brand name | font | Playfair Display, 48px, 700 |
| Brand name | color | #ddd6c8 |
| Sub brand | font | Geist Mono, 20px, 400 |
| Sub brand | color | #c9a84c |
| Tagline | font | Noto Sans JP, 24px, 400 |
| Tagline | color | #7a7260 |
| Feature chips | bg | `rgba(201,168,76,0.12)` |
| Feature chips | border | `1px solid rgba(201,168,76,0.30)` |
| Feature chips | text | #c9a84c, 18px |
| Feature chips | border-radius | 100px |
| Feature chips | padding | 6px 16px |
| Gold divider | width | 60px, height: 2px, color: #c9a84c |

#### File Spec

| Property | Value |
|----------|-------|
| Format | JPEG (YouTube recommended) |
| Max file size | 6MB |
| Color space | sRGB |
| Export quality | 95% |

---

### 1.2 YouTube Channel Icon (800 x 800 px)

```
+====================================+
|  800 x 800 px                       |
|  bg: linear-gradient(135deg,        |
|      #131a14 0%, #0d1009 100%)     |
|                                      |
|  ┌──────────────────────────────┐  |
|  │  CIRCLE CROP (YouTube auto)   │  |
|  │  diameter: 800px              │  |
|  │                                │  |
|  │        ♠                      │  |
|  │  (spade, 320px)              │  |
|  │  fill: linear-gradient(      │  |
|  │    135deg, #d4b965, #9a7c35) │  |
|  │  filter: drop-shadow(        │  |
|  │    0 8px 24px rgba(0,0,0,0.5)│  |
|  │  )                            │  |
|  │                                │  |
|  │  "P"                          │  |
|  │  (inside spade, 120px,       │  |
|  │   #0d1009, Playfair Display, │  |
|  │   700, centered)             │  |
|  │                                │  |
|  │  ── subtle ring ──           │  |
|  │  (circle 720px, 2px,        │  |
|  │   rgba(201,168,76,0.2))     │  |
|  │                                │  |
|  └──────────────────────────────┘  |
+====================================+
```

#### Design Tokens

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 800 x 800 px |
| Background | gradient | `linear-gradient(135deg, #131a14 0%, #0d1009 100%)` |
| Spade | size | 320px |
| Spade | fill | `linear-gradient(135deg, #d4b965, #9a7c35)` |
| Spade | drop-shadow | `0 8px 24px rgba(0,0,0,0.5)` |
| Inner "P" | font | Playfair Display, 120px, 700 |
| Inner "P" | color | #0d1009 |
| Subtle ring | diameter | 720px |
| Subtle ring | stroke | 2px, `rgba(201,168,76,0.2)` |

#### File Spec

| Property | Value |
|----------|-------|
| Format | PNG (transparency not needed but acceptable) |
| Min display size | 98x98 px (YouTube comments) |
| Verify at | 98px, 48px, 36px — spade+P must remain recognizable |

---

### 1.3 YouTube Channel Text Assets

#### Channel Name Options

| Option | Name | Rationale |
|--------|------|-----------|
| A (推奨) | **Poker SNS** | Brand name direct. SEO-friendly, consistent with app |
| B | **Poker SNS - ハンドレビュー** | Descriptive, clarifies content type |
| C | **PokerSNS Hands** | English-friendly, international appeal |

#### Channel Description (説明文)

```
ポーカーハンドを共有して、もっと上手くなる。

Poker SNS は、ポーカープレイヤーのためのハンドレビュー＆戦略共有プラットフォームです。

このチャンネルでは:
- 毎日のハンドレビュー（Shorts）
- ポジション別戦略ガイド
- GTO vs エクスプロイト分析
- トーナメント＆キャッシュゲーム Tips

ハンドを記録して仲間と議論 → pokersns.jp

#ポーカー #テキサスホールデム #ハンドレビュー #GTO #ポーカー戦略
```

#### Video Description Template

```
{動画タイトル}

▼ 今回のハンド
{ハンドの概要: ポジション、スタック、主要アクション}

▼ キーポイント
1. {ポイント1}
2. {ポイント2}
3. {ポイント3}

▼ あなたのプレイを共有しよう
Poker SNS でハンドレビューを投稿:
https://pokersns.jp/?utm_source=youtube&utm_medium=video&utm_campaign=hand_review

▼ アフィリエイトリンク
{パートナーリンク（動的に差し替え）}

━━━━━━━━━━━━━
#ポーカー #テキサスホールデム #ハンドレビュー #Shorts
#pokersns #GTO #ポーカー戦略 #キャッシュゲーム
```

---

## 2. Instagram Profile Assets

### 2.1 Instagram Profile Image (320 x 320 px)

YouTube アイコンと同一デザインを 320x320 にリサイズ。

```
+========================+
|  320 x 320 px           |
|  (Instagram crops to    |
|   circle automatically) |
|                          |
|  Same design as          |
|  YouTube icon (1.2)     |
|  scaled to 320px        |
|                          |
|  Spade: 128px           |
|  Inner "P": 48px        |
|  Subtle ring: 288px     |
+========================+
```

#### Design Tokens (scaled from YouTube icon)

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 320 x 320 px |
| Background | gradient | same as YouTube icon |
| Spade | size | 128px (320/800 * 320) |
| Inner "P" | font-size | 48px |
| Subtle ring | diameter | 288px |

#### File Spec

| Property | Value |
|----------|-------|
| Format | JPEG or PNG |
| Min display size | 110px (profile), 40px (comments) |
| Verify at | 110px, 40px — spade must remain recognizable |

---

### 2.2 Instagram Bio

```
♠ Poker SNS
ポーカーハンドを共有して、もっと上手くなる

毎日ハンドレビュー配信中 ♠♥♦♣
戦略を磨くポーカーコミュニティ

▼ ハンドを投稿する
pokersns.jp
```

**Note**: Instagram bio max 150 characters. Above is within limit for Japanese text.

---

### 2.3 Instagram Highlights Covers (5 categories)

Circle icons (1080 x 1080, displayed at 82px circle crop).

```
+================+  +================+  +================+
|   ♠            |  |   ♥            |  |   ♦            |
|  "HANDS"       |  |  "TIPS"        |  |  "GTO"         |
|  bg: #131a14   |  |  bg: #131a14   |  |  bg: #131a14   |
|  icon: #c9a84c |  |  icon: #c9a84c |  |  icon: #c9a84c |
+================+  +================+  +================+

+================+  +================+
|   ♣            |  |   ★            |
|  "NEWS"        |  |  "ABOUT"       |
|  bg: #131a14   |  |  bg: #131a14   |
|  icon: #c9a84c |  |  icon: #c9a84c |
+================+  +================+
```

#### Design Tokens (Highlights)

| Element | Property | Value |
|---------|----------|-------|
| Canvas | size | 1080 x 1080 px |
| Display size | diameter | 82px (circle crop) |
| Background | solid | #131a14 |
| Suit icon | size | 480px (center) |
| Suit icon | color | `linear-gradient(135deg, #c9a84c, #9a7c35)` |
| Label text | font | Noto Sans JP, 96px, 700 |
| Label text | color | #ddd6c8 |
| Label text | position | bottom-center, y: 780px |

---

## 3. Cross-Platform Brand Consistency Matrix

| Element | YouTube | Instagram | App (Web) |
|---------|---------|-----------|-----------|
| Primary gold | #c9a84c | #c9a84c | #c9a84c |
| Background | #0d1009 | #0d1009 | #0d1009 |
| Surface | #131a14 | #131a14 | #131a14 |
| Text primary | #ddd6c8 | #ddd6c8 | #ddd6c8 |
| Icon design | Spade + "P" | Spade + "P" | Spade (favicon) |
| Display font | Playfair Display | Playfair Display | Playfair Display |
| Body font | Noto Sans JP | Noto Sans JP | Noto Sans JP |
| Mono font | Geist Mono | Geist Mono | Geist Mono |
| Logo format | "♠ Poker SNS" | "♠ Poker SNS" | "♠ Poker SNS" |
| CTA button | gold bg, dark text | gold bg, dark text | gold bg, dark text |

---

## 4. Asset Delivery Checklist

| Asset | Size | Format | Platform | Priority | Status |
|-------|------|--------|----------|----------|--------|
| YouTube Banner | 2560x1440 | JPEG | YouTube | P0 | SPEC READY |
| YouTube Icon | 800x800 | PNG | YouTube | P0 | SPEC READY |
| Instagram Profile | 320x320 | PNG | Instagram | P0 | SPEC READY |
| IG Highlights: HANDS | 1080x1080 | PNG | Instagram | P1 | SPEC READY |
| IG Highlights: TIPS | 1080x1080 | PNG | Instagram | P1 | SPEC READY |
| IG Highlights: GTO | 1080x1080 | PNG | Instagram | P1 | SPEC READY |
| IG Highlights: NEWS | 1080x1080 | PNG | Instagram | P1 | SPEC READY |
| IG Highlights: ABOUT | 1080x1080 | PNG | Instagram | P1 | SPEC READY |
| Channel Description | text | -- | YouTube | P0 | DONE |
| Video Description Template | text | -- | YouTube | P0 | DONE |
| Instagram Bio | text | -- | Instagram | P0 | DONE |
| Channel Name Recommendation | text | -- | YouTube | P0 | DONE |

---

## 5. Production Notes

### 5.1 Font Embedding
- YouTube banner/icon: Embed Playfair Display and Noto Sans JP in design tool
- Instagram assets: Same fonts, verify rendering at small sizes

### 5.2 Export Settings
- YouTube Banner: JPEG, 95% quality, sRGB, max 6MB
- YouTube Icon: PNG, sRGB, 800x800
- Instagram Profile: PNG, sRGB, 320x320
- Highlights: PNG, sRGB, 1080x1080

### 5.3 Small Size Verification
All icon/profile assets must pass visibility check at:
- 98px (YouTube comment avatar)
- 48px (YouTube mobile)
- 36px (YouTube mini)
- 110px (Instagram profile)
- 40px (Instagram comment)
- 82px (Instagram highlights)

At all sizes, the gold spade + "P" mark must remain recognizable as the Poker SNS brand.

---

## 6. Cross-Reference

| Related Doc | Path |
|-------------|------|
| Video Template UI Spec | `docs/DESIGN_VIDEO_TEMPLATE_UI_SPEC.md` |
| SNS Template Spec | `docs/DESIGN_SPEC_SNS_TEMPLATES.md` |
| Brand Asset Inventory | `docs/design-deliverable-brand-assets.md` |
