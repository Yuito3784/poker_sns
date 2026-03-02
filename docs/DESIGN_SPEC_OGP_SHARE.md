# Design Spec: OGP Card Image & Share Button UI

## 1. OGP Card Image Template Design Spec

### 1.1 Overview
SNS上でシェアされた際に「The Felt Table」のダークラグジュアリーブランドが伝わるOG画像テンプレート。

### 1.2 Canvas
- **Size**: 1200 x 630 px (OGP standard)
- **Format**: PNG (via Next.js `ImageResponse` / Edge Runtime)
- **Variants**: 3 types (Post Detail, User Profile, Default/Site)

---

### 1.3 Template A: Post Detail OG Image (Priority: HIGH)

投稿個別ページ `/post/[id]` のダイナミックOG画像。

```
+------------------------------------------------------------------+
|  bg: linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009)   |
|                                                                    |
|  [♠ ♥ ♦ ♣]  (background watermark, opacity 0.03, 220px)          |
|                                                                    |
|  +----+  @username                        ♠ Poker SNS             |
|  |AVA |  name                             (gold #c9a84c, 24px)    |
|  +----+                                                            |
|  (48x48, rounded-full, border: 2px #c9a84c)                       |
|                                                                    |
|  "投稿テキスト (max 120 chars)..."                                  |
|  (color: #ddd6c8, font-size: 28px, line-height: 1.5)              |
|  (max 3 lines with ellipsis)                                       |
|                                                                    |
|  ---  (border: 1px solid #2a3828, margin: 24px 0)  ---            |
|                                                                    |
|  ♥ 12 likes   💬 5 replies   🔄 3 reposts                         |
|  (color: #7a7260, font-size: 18px)                                |
|                                                                    |
+------------------------------------------------------------------+
```

**Design Tokens**:
| Element | Property | Value |
|---------|----------|-------|
| Background | gradient | `linear-gradient(135deg, #0d1009, #131a14, #0d1009)` |
| Card suit watermark | color | `rgba(201, 168, 76, 0.03)` |
| Card suit watermark | font-size | `220px` |
| Logo "Poker SNS" | color | `#c9a84c` (gold) |
| Logo spade icon | gradient | `linear-gradient(135deg, #c9a84c, #9a7c35)` |
| Logo | font-size | `24px` |
| Logo | font-family | `Playfair Display, Georgia, serif` |
| Avatar | size | `48x48` |
| Avatar | border | `2px solid #c9a84c` |
| Avatar | border-radius | `50%` |
| Username | color | `#c9a84c` |
| Username | font-size | `18px` |
| Display name | color | `#ddd6c8` |
| Display name | font-size | `16px` |
| Post content | color | `#ddd6c8` |
| Post content | font-size | `28px` |
| Post content | line-height | `1.5` |
| Post content | max lines | `3` (with ellipsis) |
| Divider | color | `#2a3828` |
| Divider | height | `1px` |
| Stats text | color | `#7a7260` |
| Stats text | font-size | `18px` |
| Padding | all sides | `48px` |
| Top section | layout | `flex, space-between` |

**Implementation Notes**:
- File: `frontend/src/app/post/[id]/opengraph-image.tsx`
- Runtime: Edge (`export const runtime = "edge"`)
- Data source: `GET /posts/{id}/meta` (existing endpoint)
- Avatar fallback: First letter of username in gold circle
- Post content truncation: 120 chars max, "..." suffix
- Stats icons: Use text symbols (no SVG in ImageResponse)

---

### 1.4 Template B: User Profile OG Image (Priority: MEDIUM)

```
+------------------------------------------------------------------+
|  bg: linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009)   |
|                                                                    |
|  [♠ ♥ ♦ ♣]  (background watermark)                               |
|                                                                    |
|                    +------+                                        |
|                    | AVA  |                                        |
|                    +------+                                        |
|                    (80x80, border: 3px #c9a84c)                    |
|                                                                    |
|                    Display Name                                    |
|                    (color: #ddd6c8, 36px, bold)                    |
|                                                                    |
|                    @username                                       |
|                    (color: #c9a84c, 22px)                          |
|                                                                    |
|                    Bio text (max 80 chars)                         |
|                    (color: #7a7260, 20px)                          |
|                                                                    |
|                              ♠ Poker SNS                          |
|                              (bottom-right, gold)                  |
+------------------------------------------------------------------+
```

**Implementation Notes**:
- File: `frontend/src/app/profile/[username]/opengraph-image.tsx`
- Data source: `GET /users/{username}` (public profile data)

---

### 1.5 Template C: Default/Site OG Image (Priority: LOW)

既存の `frontend/src/app/opengraph-image.tsx` をブランドカラーに統一。

**Current Issues**:
- 現在のグラデーションは緑系 (`#0f1e12`, `#1a2f1c`)
- ゴールドアクセントが `#fbbf24` (Tailwind amber) で公式ゴールド `#c9a84c` と不一致
- Feature chips の背景が amber 系

**Proposed Changes**:
| Element | Current | Proposed |
|---------|---------|----------|
| Background gradient | `#0f1e12, #1a2f1c, #0d1a0f` | `#0d1009, #131a14, #0d1009` |
| Logo spade gradient | `#fbbf24, #d97706` | `#c9a84c, #9a7c35` |
| Logo text color | `#e8f0e6` | `#ddd6c8` |
| Tagline color | `#8ba388` | `#7a7260` |
| Feature chip bg | `rgba(245,158,11,0.12)` | `rgba(201,168,76,0.12)` |
| Feature chip border | `rgba(245,158,11,0.3)` | `rgba(201,168,76,0.3)` |
| Feature chip text | `#fbbf24` | `#c9a84c` |

---

## 2. Share Button UI Style Guide

### 2.1 Current State Analysis

Share buttons are already implemented in both:
- `PostDetailClient.tsx` (post detail view) — lines 349-448
- `PostItem.tsx` (feed view) — lines 337-401

**Existing buttons**: Copy Link, X (Twitter), LINE

### 2.2 Recommended Enhancements

#### 2.2.1 Color Alignment with "The Felt Table" Theme

Current share buttons use Tailwind defaults (`text-neutral-500`) which don't match the dark theme when viewed in the dark-themed post detail page. However, the PostItem feed view already uses inline styles with theme-appropriate colors (`#4a5245` idle, `#c9a84c` active).

**Recommendation**: Align PostDetailClient share button colors with PostItem's inline style approach for consistency.

| State | PostItem (current) | PostDetailClient (current) | Proposed (unified) |
|-------|-------------------|--------------------------|-------------------|
| Idle | `#4a5245` | `text-neutral-500` | `#4a5245` (text-muted) |
| Hover - Copy/Share | `#c9a84c` | `hover:text-blue-500` | `#c9a84c` (gold) |
| Hover - X | `hover:text-neutral-900` | `hover:text-neutral-900` | `#ddd6c8` (text-primary) |
| Hover - LINE | `hover:text-[#00b900]` | `hover:text-[#00b900]` | `#00b900` (LINE brand, keep) |
| Active/Success | `#c9a84c` | `text-emerald-500` | `#c9a84c` (gold) |

#### 2.2.2 Button Style Spec

```
Share Button (all variants):
  - Layout: flex, items-center, gap-1.5
  - Padding: px-3 py-2
  - Border-radius: rounded-full (9999px)
  - Font-size: text-xs (12px)
  - Transition: colors 150ms ease
  - Icon size: 20x20 (h-5 w-5)
  - Icon hover: scale(1.1) transform 150ms ease

Specific hover states:
  - Copy Link:  idle #4a5245 → hover #c9a84c
  - X:          idle #4a5245 → hover #ddd6c8
  - LINE:       idle #4a5245 → hover #00b900
  - Success:    #c9a84c with checkmark icon
```

#### 2.2.3 Action Button Bar Layout (PostDetailClient)

```
+------------------------------------------------------------------+
|  border-top: 1px solid #1f2a1e                                    |
|  padding: 12px 0                                                  |
|  display: flex, justify-around                                    |
|                                                                    |
|  [heart] [repost] [bookmark] [quote] [share] [X] [LINE]          |
|   いいね   リポスト   保存     引用    共有    X    LINE           |
|                                                                    |
|  Authenticated: all 7 buttons                                     |
|  Guest: share + X + LINE only (3 buttons)                         |
+------------------------------------------------------------------+
```

#### 2.2.4 Border Color Fix

Current PostDetailClient uses `border-neutral-100` (light theme border) which is incorrect for the dark theme.

**Proposed fix**:
- `border-neutral-100` → `border-[#1f2a1e]` (var: --border)
- Stats section text: use `#7a7260` instead of Tailwind neutrals

---

## 3. Implementation Priority & Dependencies

### Phase 1 (Immediate - Design team deliverable)
1. Update global OG image colors to match brand (Template C fixes)
2. Align PostDetailClient share button colors with theme

### Phase 2 (Requires Dev team)
3. Create per-post dynamic OG image generator (Template A)
4. Create per-profile OG image generator (Template B)
5. Update post metadata to use dynamic OG image URL

### Phase 3 (Requires DevSecOps + Ops)
6. Rate limiting on OG image endpoints
7. OG image caching strategy (CDN headers, revalidation)
8. Cross-platform OGP card testing (X, Facebook, LINE debuggers)

---

## 4. Code Change Specifications

### 4.1 Global OG Image Brand Fix (Template C)

**File**: `frontend/src/app/opengraph-image.tsx`

Changes:
- Background gradient: `#0f1e12, #1a2f1c, #0d1a0f` → `#0d1009, #131a14, #0d1009`
- Gold spade: `#fbbf24, #d97706` → `#c9a84c, #9a7c35`
- Logo text: `#e8f0e6` → `#ddd6c8`
- Tagline: `#8ba388` → `#7a7260`
- Feature chips: amber → gold (`#c9a84c` family)

### 4.2 Per-Post Dynamic OG Image (Template A)

**New file**: `frontend/src/app/post/[id]/opengraph-image.tsx`

Required JSX structure per Template A layout above.
Data fetch: `GET ${API_BASE}/posts/${id}/meta`
Avatar fetch: If `author.avatarUrl` exists, fetch as ArrayBuffer for ImageResponse.

### 4.3 Share Button Color Unification

**File**: `frontend/src/app/post/[id]/PostDetailClient.tsx`

- Replace `text-neutral-500` with `text-[#4a5245]` on share buttons
- Replace `hover:text-blue-500` with `hover:text-[#c9a84c]` on Copy Link
- Replace `hover:text-neutral-900` with `hover:text-[#ddd6c8]` on X button
- Replace `text-emerald-500` (copy success) with `text-[#c9a84c]`
- Replace `border-neutral-100` with `border-[#1f2a1e]` on action bar divider

### 4.4 Post Metadata Update (After Template A implementation)

**File**: `frontend/src/app/post/[id]/page.tsx`

When post has no `imageUrl`, the OG image should fall back to the dynamic per-post OG image generator rather than having no image at all. Next.js App Router handles this automatically if `opengraph-image.tsx` exists in the route segment.

---

## 5. Asset Inventory

| Asset | Status | Location |
|-------|--------|----------|
| Global OG image | Exists (needs color fix) | `frontend/src/app/opengraph-image.tsx` |
| Per-post OG image | To be created | `frontend/src/app/post/[id]/opengraph-image.tsx` |
| Per-profile OG image | To be created | `frontend/src/app/profile/[username]/opengraph-image.tsx` |
| Share buttons (detail) | Exists (needs color fix) | `PostDetailClient.tsx:349-448` |
| Share buttons (feed) | Exists (correct colors) | `PostItem.tsx:337-401` |
| OGP metadata (global) | Exists (correct) | `layout.tsx:31-50` |
| OGP metadata (post) | Exists (correct) | `post/[id]/page.tsx:11-58` |
| Schema.org JSON-LD | Exists (correct) | `layout.tsx:62-79` |
