# Video Template UI Spec: Poker Hand Review Shorts/Reels
# 動画テンプレートUI仕様書

> Design Team / 不知火 作成 / 2026-03-02
> Task: 動画 #15 — 3-4-4 ポーカーハンド解説動画テンプレート確立
> Theme: "The Felt Table" Dark Luxury (背景#0d1009 / ゴールド#c9a84c / テキスト#ddd6c8)

---

## 0. Video Format Overview

| Property | Value |
|----------|-------|
| Canvas | 1080 x 1920 px (9:16 vertical) |
| Duration | 60 seconds total |
| FPS | 30fps |
| Platform | YouTube Shorts / Instagram Reels |
| Encoding | H.264, AAC audio |

### 0.1 Time Structure

| Section | Duration | Timestamp | Purpose |
|---------|----------|-----------|---------|
| Intro (タイトルカード) | 5s | 0:00 - 0:05 | "今日のハンドレビュー" hook |
| Street Play (ローワーサード) | 40s | 0:05 - 0:45 | Preflop → Flop → Turn → River |
| Outro (エンドカードCTA) | 15s | 0:45 - 1:00 | Best play + poker_sns 誘導 |

---

## 1. INTRO — Title Card (0:00 - 0:05)

### 1.1 Layout

```
+============================================+
|  1080 x 1920                                |
|  bg: radial-gradient(ellipse at center,     |
|      #192118 0%, #0d1009 70%)              |
|                                              |
|  ⚠ TOP SAFE ZONE (60px)                    |
|                                              |
|  [♠ ♥ ♦ ♣] watermark (300px, opacity 0.04) |
|  animated: slow float-up 3s ease            |
|                                              |
|  ─────────── CENTER (y: 720px) ──────────  |
|                                              |
|  ┌──────────────────────────────────────┐  |
|  │                                        │  |
|  │  SERIES TAG                            │  |
|  │  "HAND REVIEW"                         │  |
|  │  (18px, #c9a84c, letter-spacing: 6px) │  |
|  │  (Noto Sans JP, 500, uppercase)       │  |
|  │                                        │  |
|  │  ─── gold line (100px, 2px) ───       │  |
|  │                                        │  |
|  │  MAIN TITLE                            │  |
|  │  "今日の                                │  |
|  │   ハンドレビュー"                       │  |
|  │  (64px, #ddd6c8, bold, center)        │  |
|  │  (Playfair Display / Noto Sans JP)    │  |
|  │  (text-shadow: 0 4px 20px             │  |
|  │   rgba(0,0,0,0.8))                    │  |
|  │                                        │  |
|  │  ─── gold line (100px, 2px) ───       │  |
|  │                                        │  |
|  │  EPISODE TAG                           │  |
|  │  "#024 — AKs vs 3BET"                 │  |
|  │  (24px, #c9a84c, center)             │  |
|  │  (Geist Mono, 400)                    │  |
|  │                                        │  |
|  └──────────────────────────────────────┘  |
|                                              |
|  ♠ Poker SNS                                |
|  (bottom-center, y: 1580px)                |
|  (28px, gold-gradient, opacity 0.6)        |
|                                              |
|  ⚠ BOTTOM SAFE ZONE (250px)                |
+============================================+
```

### 1.2 Design Tokens

| Element | Property | Value |
|---------|----------|-------|
| Background | gradient | `radial-gradient(ellipse at center, #192118 0%, #0d1009 70%)` |
| Suit watermark | font-size | 300px |
| Suit watermark | color | `rgba(201,168,76,0.04)` |
| Suit watermark | animation | float-up 3s ease-in-out (translate Y -20px) |
| Series tag | font | Noto Sans JP, 18px, 500 |
| Series tag | color | #c9a84c |
| Series tag | letter-spacing | 6px |
| Gold divider | width x height | 100px x 2px |
| Gold divider | color | #c9a84c |
| Main title | font | Playfair Display, 64px, 700 |
| Main title | color | #ddd6c8 |
| Main title | text-shadow | `0 4px 20px rgba(0,0,0,0.8)` |
| Main title | line-height | 1.3 |
| Episode tag | font | Geist Mono, 24px, 400 |
| Episode tag | color | #c9a84c |
| Logo | font-size | 28px |
| Logo | color | `linear-gradient(135deg, #c9a84c, #9a7c35)` |
| Logo | opacity | 0.6 |

### 1.3 Animation Timeline

| Time | Element | Animation |
|------|---------|-----------|
| 0.0s | Background | Fade in (0→1, 0.3s ease) |
| 0.0s | Suit watermarks | Start float-up loop |
| 0.3s | Series tag | Slide down + fade in (0.4s ease-out) |
| 0.5s | Gold divider (top) | Scale X 0→1 from center (0.3s ease) |
| 0.7s | Main title | Fade in + slight scale 0.95→1 (0.5s ease) |
| 1.2s | Gold divider (bottom) | Scale X 0→1 from center (0.3s ease) |
| 1.5s | Episode tag | Fade in (0.4s ease) |
| 2.0s | Logo | Fade in (0.3s ease) |
| 4.5s | All elements | Begin cross-fade to Street section |

---

## 2. STREET PLAY — Lower Third Overlays (0:05 - 0:45)

### 2.1 Overview

4 street sections (Preflop/Flop/Turn/River), each ~10 seconds.
Lower third overlays display on top of the main video content (hand replay/screen recording/talking head).

### 2.2 Lower Third Layout

```
+============================================+
|  1080 x 1920                                |
|                                              |
|  ⚠ TOP SAFE ZONE (60px)                    |
|                                              |
|  ┌── STREET INDICATOR (top-left) ────────┐ |
|  │  y: 100px, x: 60px                     │ |
|  │                                          │ |
|  │  CURRENT STREET                          │ |
|  │  "PREFLOP"                               │ |
|  │  (20px, #c9a84c, Geist Mono, 500)      │ |
|  │  letter-spacing: 4px                     │ |
|  │                                          │ |
|  │  bg: rgba(13,16,9,0.75)                 │ |
|  │  border: 1px solid rgba(201,168,76,0.3) │ |
|  │  border-radius: 8px                      │ |
|  │  padding: 8px 20px                       │ |
|  └──────────────────────────────────────────┘ |
|                                              |
|  ┌── POSITION INDICATOR (top-right) ─────┐ |
|  │  y: 100px, x-right: 60px               │ |
|  │                                          │ |
|  │  "BTN vs BB"                             │ |
|  │  (18px, #7a7260, Noto Sans JP, 400)    │ |
|  │  same pill style as street indicator    │ |
|  └──────────────────────────────────────────┘ |
|                                              |
|                                              |
|  ═══════ MAIN VIDEO CONTENT AREA ═══════   |
|  (hand replay / screen recording)           |
|                                              |
|                                              |
|  ┌── LOWER THIRD (bottom overlay) ───────┐ |
|  │  y: 1360px, full width                  │ |
|  │  height: 280px                           │ |
|  │  bg: linear-gradient(180deg,            │ |
|  │      transparent 0%,                    │ |
|  │      rgba(13,16,9,0.85) 30%,           │ |
|  │      rgba(13,16,9,0.95) 100%)          │ |
|  │                                          │ |
|  │  ── ACTION LINE ──                      │ |
|  │  "Hero raises to 3BB from BTN"         │ |
|  │  (28px, #ddd6c8, Noto Sans JP, 500)   │ |
|  │  padding-x: 60px                        │ |
|  │                                          │ |
|  │  ── ANALYSIS LINE ──                    │ |
|  │  "AKs は IP で 3BET する                │ |
|  │   プレミアムハンド"                      │ |
|  │  (22px, #c9a84c, Noto Sans JP, 400)   │ |
|  │  padding-x: 60px                        │ |
|  │  margin-top: 12px                        │ |
|  │                                          │ |
|  │  ── POT SIZE ──                         │ |
|  │  "Pot: 7.5BB"                            │ |
|  │  (18px, #7a7260, Geist Mono, 400)      │ |
|  │  padding-x: 60px                        │ |
|  │  margin-top: 8px                         │ |
|  │                                          │ |
|  └──────────────────────────────────────────┘ |
|                                              |
|  ⚠ BOTTOM SAFE ZONE (250px)                |
+============================================+
```

### 2.3 Design Tokens (Lower Third)

| Element | Property | Value |
|---------|----------|-------|
| Street pill | bg | `rgba(13,16,9,0.75)` |
| Street pill | border | `1px solid rgba(201,168,76,0.3)` |
| Street pill | border-radius | 8px |
| Street pill | padding | 8px 20px |
| Street pill | font | Geist Mono, 20px, 500 |
| Street pill | color | #c9a84c |
| Street pill | letter-spacing | 4px |
| Position pill | same as street pill | color: #7a7260 |
| Lower third | height | 280px |
| Lower third | bg | `linear-gradient(180deg, transparent 0%, rgba(13,16,9,0.85) 30%, rgba(13,16,9,0.95) 100%)` |
| Action line | font | Noto Sans JP, 28px, 500 |
| Action line | color | #ddd6c8 |
| Action line | text-shadow | `0 2px 8px rgba(0,0,0,0.6)` |
| Analysis line | font | Noto Sans JP, 22px, 400 |
| Analysis line | color | #c9a84c |
| Pot size | font | Geist Mono, 18px, 400 |
| Pot size | color | #7a7260 |
| Horizontal padding | all text | 60px |

### 2.4 Board Cards Overlay (Flop/Turn/River)

```
  ┌── BOARD CARDS (center-top, y: 200px) ──┐
  │                                          │
  │  ┌────┐ ┌────┐ ┌────┐  ┌────┐  ┌────┐ │
  │  │ A  │ │ K  │ │ 7  │  │ 2  │  │ J  │ │
  │  │ ♠  │ │ ♥  │ │ ♦  │  │ ♣  │  │ ♠  │ │
  │  └────┘ └────┘ └────┘  └────┘  └────┘ │
  │  (each: 100x140px)                      │
  │  bg: #192118                             │
  │  border: 2px solid #2a3828              │
  │  border-radius: 12px                     │
  │  gap: 12px                               │
  │                                          │
  │  New card animation:                     │
  │  slide-in from top + slight bounce      │
  │  0.3s ease-out                           │
  │                                          │
  │  Suit colors:                            │
  │  ♠♣ = #ddd6c8 (ivory)                  │
  │  ♥♦ = #c9a84c (gold, for contrast)     │
  └──────────────────────────────────────────┘
```

### 2.5 Board Card Tokens

| Element | Property | Value |
|---------|----------|-------|
| Card | size | 100 x 140 px |
| Card | bg | #192118 |
| Card | border | 2px solid #2a3828 |
| Card | border-radius | 12px |
| Card | box-shadow | `0 4px 16px rgba(0,0,0,0.4)` |
| Rank text | font | Playfair Display, 36px, 700 |
| Suit text | font-size | 28px |
| Spade/Club color | | #ddd6c8 |
| Heart/Diamond color | | #c9a84c |
| Card gap | | 12px |
| New card animation | | slide-down 0.3s ease-out + scale 1.05→1 |
| Active card | border | 2px solid #c9a84c |
| Active card | box-shadow | `0 0 12px rgba(201,168,76,0.3)` |

### 2.6 Street Transition Animation

| Time | Animation |
|------|-----------|
| Street change | Street pill: text cross-fade (0.3s) |
| Street change | Lower third: slide-out-left → slide-in-right (0.4s) |
| Flop deal | 3 cards: stagger slide-down (0.1s delay each) |
| Turn deal | 1 card: slide-down from top (0.3s) |
| River deal | 1 card: slide-down from top (0.3s) |

### 2.7 Street Content Template

| Street | Duration | Content Example |
|--------|----------|-----------------|
| Preflop (0:05-0:15) | 10s | Hero hand display, position, action (raise/call/fold decision) |
| Flop (0:15-0:25) | 10s | 3 community cards deal, continuation bet / check analysis |
| Turn (0:25-0:35) | 10s | Turn card, pot size update, barrel / give up decision |
| River (0:35-0:45) | 10s | River card, value bet / bluff / check-down analysis |

---

## 3. OUTRO — End Card CTA (0:45 - 1:00)

### 3.1 Layout

```
+============================================+
|  1080 x 1920                                |
|  bg: linear-gradient(180deg,                |
|      #0d1009 0%, #131a14 50%,              |
|      #0d1009 100%)                         |
|                                              |
|  ⚠ TOP SAFE ZONE (60px)                    |
|                                              |
|  [♠ ♥ ♦ ♣] watermark (subtle)              |
|                                              |
|  ───────── RESULT SECTION (y: 400px) ────  |
|                                              |
|  RESULT LABEL                               |
|  "BEST PLAY"                                |
|  (20px, #c9a84c, Geist Mono, 500)         |
|  letter-spacing: 6px                        |
|                                              |
|  ─── gold line (80px) ───                  |
|                                              |
|  VERDICT TEXT                               |
|  "リバーでのバリューベットが                  |
|   期待値最大のプレイ"                        |
|  (40px, #ddd6c8, bold, center)             |
|  (Noto Sans JP, 700)                       |
|  max 2 lines                                |
|                                              |
|  ─── gold line (80px) ───                  |
|                                              |
|  DETAIL TEXT                                |
|  "ポットの75%ベットで                        |
|   ワーストハンドからも                       |
|   コールを引き出せる"                        |
|  (22px, #7a7260, center)                   |
|  max 3 lines                                |
|                                              |
|  ─────────── CTA SECTION (y: 1100px) ────  |
|                                              |
|  ┌──────────────────────────────────────┐  |
|  │                                        │  |
|  │  ♠ Poker SNS                          │  |
|  │  (spade 48px gold-gradient)           │  |
|  │  ("Poker SNS" 40px, #ddd6c8)         │  |
|  │                                        │  |
|  │  "ハンドレビューを投稿して              │  |
|  │   みんなで戦略を磨こう"                 │  |
|  │  (22px, #7a7260, center)             │  |
|  │                                        │  |
|  │  ┌─────────────────────────────────┐ │  |
|  │  │                                   │ │  |
|  │  │  "今すぐ参加する"                  │ │  |
|  │  │  (22px, #0d1009, bold)           │ │  |
|  │  │  bg: #c9a84c                      │ │  |
|  │  │  border-radius: 100px            │ │  |
|  │  │  padding: 16px 48px              │ │  |
|  │  │  box-shadow:                      │ │  |
|  │  │    0 4px 20px rgba(201,168,76,   │ │  |
|  │  │    0.3)                           │ │  |
|  │  │                                   │ │  |
|  │  └─────────────────────────────────┘ │  |
|  │                                        │  |
|  │  URL HINT                              │  |
|  │  "pokersns.jp"                         │  |
|  │  (16px, #4a5245, Geist Mono)          │  |
|  │                                        │  |
|  └──────────────────────────────────────┘  |
|                                              |
|  SUBSCRIBE PROMPT                           |
|  "チャンネル登録で毎日ハンドレビュー配信"    |
|  (18px, #7a7260, center, y: 1560px)       |
|                                              |
|  ⚠ BOTTOM SAFE ZONE (250px)                |
+============================================+
```

### 3.2 Design Tokens (Outro)

| Element | Property | Value |
|---------|----------|-------|
| Result label | font | Geist Mono, 20px, 500 |
| Result label | color | #c9a84c |
| Result label | letter-spacing | 6px |
| Verdict text | font | Noto Sans JP, 40px, 700 |
| Verdict text | color | #ddd6c8 |
| Verdict text | text-shadow | `0 4px 20px rgba(0,0,0,0.8)` |
| Verdict text | max lines | 2 |
| Detail text | font | Noto Sans JP, 22px, 400 |
| Detail text | color | #7a7260 |
| Detail text | max lines | 3 |
| Logo spade | size | 48px |
| Logo spade | color | `linear-gradient(135deg, #c9a84c, #9a7c35)` |
| Logo text | font | Playfair Display, 40px, 700 |
| Logo text | color | #ddd6c8 |
| CTA description | font | Noto Sans JP, 22px, 400 |
| CTA description | color | #7a7260 |
| CTA button | bg | #c9a84c |
| CTA button | text color | #0d1009 |
| CTA button | font | Noto Sans JP, 22px, 700 |
| CTA button | border-radius | 100px |
| CTA button | padding | 16px 48px |
| CTA button | box-shadow | `0 4px 20px rgba(201,168,76,0.3)` |
| URL hint | font | Geist Mono, 16px, 400 |
| URL hint | color | #4a5245 |
| Subscribe prompt | font | Noto Sans JP, 18px, 400 |
| Subscribe prompt | color | #7a7260 |

### 3.3 Outro Animation Timeline

| Time | Element | Animation |
|------|---------|-----------|
| 0:45.0 | Cross-fade from street section | 0.5s ease |
| 0:45.5 | Result label | Fade in + slide down (0.3s) |
| 0:45.8 | Gold divider (top) | Scale X center (0.3s) |
| 0:46.0 | Verdict text | Fade in (0.5s) |
| 0:46.5 | Gold divider (bottom) | Scale X center (0.3s) |
| 0:46.8 | Detail text | Fade in (0.4s) |
| 0:47.5 | Logo + CTA block | Slide up + fade in (0.5s) |
| 0:48.0 | CTA button | Scale 0.9→1 + glow pulse start |
| 0:48.5 | URL hint | Fade in (0.3s) |
| 0:49.0 | Subscribe prompt | Fade in (0.3s) |
| 0:49.0-1:00 | CTA button | Gentle glow pulse loop (2s period, box-shadow 0.3→0.5 opacity) |
| 0:58.0 | All elements | Begin fade out (2s) for platform end screen |

---

## 4. Persistent Elements (全セクション共通)

### 4.1 Progress Bar

```
  ┌── PROGRESS BAR (y: 1640px, bottom area) ─┐
  │                                            │
  │  ═══════════════════════════════════════   │
  │  height: 3px                               │
  │  bg-track: rgba(42,56,40,0.5)             │
  │  bg-fill: linear-gradient(90deg,          │
  │    #9a7c35, #c9a84c)                      │
  │  width: animates 0%→100% over 60s         │
  │  border-radius: 2px                        │
  │                                            │
  └────────────────────────────────────────────┘
```

### 4.2 Street Progress Dots (visible during sections 2 only)

```
  ┌── DOTS (y: 160px, center) ────────┐
  │                                      │
  │  (●)  (○)  (○)  (○)                │
  │  PRE  FLP  TRN  RVR               │
  │                                      │
  │  Active: #c9a84c, 10px             │
  │  Inactive: #2a3828, 8px            │
  │  Completed: #9a7c35, 8px           │
  │  gap: 24px                          │
  │  labels: 12px, #4a5245             │
  │  (labels only on active dot)       │
  │                                      │
  └──────────────────────────────────────┘
```

---

## 5. Audio & BGM Spec

| Layer | Spec | Source |
|-------|------|--------|
| BGM | Lo-fi / chill jazz, 60-80 BPM | Royalty-free (Artlist / Epidemic Sound) |
| BGM volume | -18dB (background) | Ducked during voice-over |
| SFX: Card deal | Soft "thud" / card flip | 0.2s, -12dB |
| SFX: Street transition | Subtle "whoosh" | 0.3s, -14dB |
| SFX: CTA appear | Soft chime / bell | 0.5s, -10dB |
| Voice-over (if used) | -6dB, clear pronunciation | AI voice or recorded |
| Voice-over style | Calm, analytical poker coach tone | -- |

---

## 6. Text Safe Zone Summary (Full Frame)

```
+============================================+
|  ← 60px →                    ← 60px →     |
|  ┌── TOP SAFE (60px) ────────────────┐    |
|  └────────────────────────────────────┘    |
|  ↕ padding: 40px                           |
|  ┌────────────────────────────────────┐    |
|  │                                      │    |
|  │   CONTENT SAFE ZONE                  │    |
|  │   960 x 1530 px effective           │    |
|  │                                      │    |
|  │   All text and critical visuals     │    |
|  │   must remain within this area      │    |
|  │                                      │    |
|  └────────────────────────────────────┘    |
|  ↕ padding: 40px                           |
|  ┌── BOTTOM SAFE (250px) ────────────┐    |
|  │   Instagram UI / YouTube UI         │    |
|  │   overlay area — NO critical text   │    |
|  └────────────────────────────────────┘    |
+============================================+

Horizontal padding: 60px each side → 960px usable width
Top safe: 60px (status bar)
Bottom safe: 250px (platform UI)
Content safe: 960 x 1530 px
```

---

## 7. Template Variants (Episode Types)

### 7.1 Standard Hand Review (Primary — 80% of content)

- Intro: "今日のハンドレビュー" + episode number + hand (e.g., "AKs vs 3BET")
- Streets: Full 4-street progression
- Outro: Single best play verdict + CTA

### 7.2 Quick Spot Check (Secondary — 15% of content)

- Intro: "SPOT CHECK" + situation description
- Streets: Only 1-2 streets (focus on key decision point)
- Outro: "What would you do?" audience engagement + CTA

### 7.3 Bad Beat / Cooler (Occasional — 5% of content)

- Intro: "BAD BEAT" or "COOLER" + dramatic pause
- Streets: Full progression with emphasis on result
- Outro: "Did Hero play it right?" + engagement hook + CTA

---

## 8. Deliverable File Naming Convention

```
poker_sns_hand_review_{episode_number}_{platform}.{ext}

Examples:
poker_sns_hand_review_024_youtube.mp4
poker_sns_hand_review_024_instagram.mp4
poker_sns_hand_review_024_thumbnail_yt.jpg
poker_sns_hand_review_024_cover_ig.jpg
```

---

## 9. QA Integration — Pre-Publish Checklist Reference

Design elements to verify before each video publish:

| Check | Criteria |
|-------|----------|
| Resolution | 1080x1920 (9:16) |
| Gold color accuracy | #c9a84c (not amber/yellow) |
| Text in safe zone | All text within 960x1530 content area |
| CTA visible | End card CTA button fully visible (not in bottom 250px) |
| Font consistency | Playfair Display / Noto Sans JP / Geist Mono only |
| Logo present | "Poker SNS" appears in intro and outro |
| UTM link in description | `?utm_source=youtube&utm_medium=video&utm_campaign=hand_review` |
| Thumbnail matches | YouTube thumbnail uses B-1 template from SNS Templates spec |
| Reels cover matches | Instagram cover uses C-1 template from SNS Templates spec |
| Audio levels | BGM -18dB, SFX -10~-14dB, Voice -6dB |

---

## 10. Cross-Reference

| Related Doc | Path |
|-------------|------|
| SNS Template Spec (thumbnails) | `docs/DESIGN_SPEC_SNS_TEMPLATES.md` |
| Brand Asset Inventory | `docs/design-deliverable-brand-assets.md` |
| Marketing Implementation | `docs/MARKETING_IMPLEMENTATION_SPEC.md` |
| Thumbnail SVG Template | `docs/note-thumbnails/thumbnail-template.svg` |
