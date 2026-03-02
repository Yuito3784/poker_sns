# Mobile UX Design Specification
## Task 4-3: Mobile UX Improvement - Design Deliverables

**Version:** 1.0
**Date:** 2026-03-02
**Author:** Design Team (宝鐘)
**Theme:** "The Felt Table" Dark Luxury

---

## 1. Bottom Navigation Bar Design Spec (4-3-1)

### 1.1 Layout Structure

```
+-------------------------------------------------------------------+
|  [Home]    [Explore]   [+Post]    [Notify]   [Profile]            |
|   Icon       Icon     FloatingBtn   Icon       Icon               |
|   Label     Label       ---        Label      Label               |
+-------------------------------------------------------------------+
    56px height + safe-area-inset-bottom (env(safe-area-inset-bottom))
```

- **Position:** `fixed bottom-0 left-0 right-0`
- **Visibility:** `md:hidden` (768px未満のみ表示)
- **Height:** 56px + safe area padding
- **Background:** `#080a08` (sidebar-bg) with `backdrop-filter: blur(12px)` and `background: rgba(8, 10, 8, 0.92)`
- **Top Border:** 1px solid `#161b14`
- **Z-index:** 50

### 1.2 Navigation Items (5 Tabs)

| # | Label | Icon (SVG Path) | Route | Badge |
|---|-------|-----------------|-------|-------|
| 1 | ホーム | House (Heroicons outline) | `/` | - |
| 2 | 探索 | Compass / MagnifyingGlass (Heroicons outline) | `/explore` | - |
| 3 | 投稿 | Plus (centered, elevated) | (compose modal) | - |
| 4 | 通知 | Bell (Heroicons outline) | `/notifications` | Unread count |
| 5 | プロフィール | User avatar (circular, 24px) | `/profile/{username}` | - |

### 1.3 Touch Targets

- **Minimum touch area:** 44x44px (WCAG 2.5.8)
- **Each tab width:** `calc(100% / 5)` (均等分割)
- **Icon size:** 24x24px
- **Label font-size:** 10px (Noto Sans JP)
- **Label line-height:** 14px
- **Icon-to-label gap:** 2px
- **Padding:** 6px top, 2px bottom (+ safe-area)
- **Total per-item height:** 44px min touch target within 56px container

### 1.4 Center Post Button (Elevated FAB Style)

```
            +--------+
            | + icon |   <- 48x48px circle
            +--------+
               ↑
        Elevated above the bar by 8px
```

- **Size:** 48x48px circular
- **Background:** `#c9a84c` (gold primary)
- **Icon:** Plus, 24px, color `#0d1009`
- **Border-radius:** 50%
- **Box-shadow:** `0 2px 8px rgba(201, 168, 76, 0.3)`
- **Position:** centered, translateY(-8px) relative to bar
- **Active/Pressed:** `background: #9a7c35` (gold-dim), scale(0.95)
- No label text

### 1.5 Color States

| State | Icon Color | Label Color | Background |
|-------|-----------|-------------|------------|
| **Inactive** | `#4a5245` | `#4a5245` | transparent |
| **Active** | `#c9a84c` | `#c9a84c` | `rgba(201, 168, 76, 0.06)` |
| **Pressed** | `#9a7c35` | `#9a7c35` | `rgba(201, 168, 76, 0.1)` |

- Active state determined by current route matching
- Transition: `color 150ms ease, background-color 150ms ease`

### 1.6 Notification Badge

- **Position:** absolute, top-right of bell icon
- **Min size:** 16x16px (expands for 2+ digits)
- **Background:** `#c9a84c`
- **Text color:** `#0d1009`
- **Font-size:** 9px, font-weight 700
- **Border-radius:** 8px (pill shape)
- **Border:** 2px solid `#080a08` (to separate from icon)
- **Display logic:** hidden when count = 0, show number when 1-99, show "99+" when > 99

### 1.7 Responsive Breakpoint Switching

```
Mobile  (<768px):  Bottom nav visible, Left sidebar hidden
Tablet  (768px+):  Bottom nav hidden,  Left sidebar icon-only (w-20)
Desktop (1024px+): Bottom nav hidden,  Left sidebar full (w-64)
XL      (1280px+): Bottom nav hidden,  Left sidebar full + Right sidebar
```

- **CSS rule:** `md:hidden` on bottom nav, `hidden md:flex` on sidebar
- **No animation** on switch - pure CSS media query breakpoint

### 1.8 Main Content Padding

When bottom nav is visible, main content needs bottom padding to prevent last items from being hidden:

- `pb-[calc(56px+env(safe-area-inset-bottom))]` on mobile
- `md:pb-0` on tablet/desktop

---

## 2. PWA Visual Assets Spec (4-3-2)

### 2.1 App Icon Set

| Size | Usage | Format |
|------|-------|--------|
| 48x48 | Favicon (alt) | PNG |
| 72x72 | Android low-res | PNG |
| 96x96 | Android medium | PNG |
| 128x128 | Chrome Web Store | PNG |
| 144x144 | MS tile | PNG |
| 152x152 | iOS | PNG |
| 192x192 | Android homescreen | PNG |
| 384x384 | Android splash | PNG |
| 512x512 | Android splash (hi-res) | PNG |
| maskable 512x512 | Android adaptive icon | PNG |

### 2.2 Icon Design Spec

```
+----------------------------------+
|                                  |
|    +---------Background--------+ |
|    |  Background: #0d1009      | |
|    |                           | |
|    |     [Spade Symbol]        | |
|    |     Gold: #c9a84c         | |
|    |     Centered              | |
|    |                           | |
|    +---------------------------+ |
|    Corner radius: 20% (maskable) |
+----------------------------------+
```

- **Background:** `#0d1009` (near-black)
- **Symbol:** Spade suit icon in gold `#c9a84c`
- **Safe zone (maskable):** Icon content within center 80% area
- **No text** on icon - symbol only for universal recognition
- **Style:** Flat, no gradients, matches The Felt Table aesthetic

### 2.3 Splash Screen (Web App Launch)

- **Background color:** `#0d1009`
- **Theme color:** `#0d1009`
- **Display:** Centered spade icon (128px) + "Poker SNS" text below (Playfair Display, 24px, `#c9a84c`)
- Defined in manifest.json `background_color` and `theme_color`

### 2.4 manifest.json Design Parameters

```json
{
  "name": "Poker SNS",
  "short_name": "PokerSNS",
  "description": "Poker community platform",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0d1009",
  "theme_color": "#0d1009",
  "categories": ["social", "games"]
}
```

### 2.5 Install Prompt Design

"Add to Home Screen" banner spec:

```
+---------------------------------------------------------------+
|  [Spade Icon 32px]  Poker SNS をホーム画面に追加    [追加] [x] |
|                     いつでもすぐにアクセス                      |
+---------------------------------------------------------------+
```

- **Position:** bottom of screen, above bottom nav
- **Background:** `#192118` (surface elevated)
- **Border:** 1px solid `#2a3828`
- **Border-radius:** 12px (top corners only)
- **Icon:** 32x32 app icon
- **Title:** "Poker SNS をホーム画面に追加" (`#ddd6c8`, 14px, font-weight 600)
- **Subtitle:** "いつでもすぐにアクセス" (`#7a7260`, 12px)
- **CTA button:** "追加" - `background: #c9a84c, color: #0d1009`, 32px height, border-radius 8px
- **Close button:** "x" - `color: #4a5245`, 32x32px touch target
- **Shadow:** `0 -4px 16px rgba(0, 0, 0, 0.3)`
- **Show logic:** After 2nd visit, dismiss for 7 days on close

---

## 3. Pull-to-Refresh Visual Spec (4-3-3)

### 3.1 Indicator Design

```
State 1: Pulling down
  ↓  (Arrow icon rotating based on pull distance)
  "引っ張って更新"

State 2: Threshold reached (release to refresh)
  ↑  (Arrow flipped)
  "離して更新"

State 3: Refreshing
  ◎  (Spinning loader)
  "更新中..."
```

- **Container:** Fixed at top of scroll area, hidden by default
- **Max pull distance:** 80px
- **Activation threshold:** 60px pull
- **Icon size:** 20x20px
- **Icon color:** `#7a7260` (muted) -> `#c9a84c` (gold) at threshold
- **Text:** 12px, `#7a7260`
- **Spinner:** 20x20px, stroke `#c9a84c`, 2px stroke width, spin animation 800ms linear infinite
- **Background:** `rgba(13, 16, 9, 0.9)` (semi-transparent base)
- **Transition:** opacity 150ms ease

### 3.2 Haptic Feedback

- Trigger haptic on threshold cross (if `navigator.vibrate` supported): 10ms pulse
- No haptic during pull, only on state change

---

## 4. Touch Interaction Spec (4-3-5)

### 4.1 Swipe Tab Switching

**Applicable on:** Explore page tabs, Profile page tabs

```
   ← Swipe Left: Next tab
   → Swipe Right: Previous tab

   Swipe threshold: 50px horizontal, <30px vertical
   Animation: translateX with spring easing (300ms)
```

- **Detection:** Touch start/move/end tracking
- **Min swipe distance:** 50px
- **Max vertical tolerance:** 30px (to distinguish from scroll)
- **Animation:** Current tab slides out, next tab slides in (translateX)
- **Duration:** 300ms, `cubic-bezier(0.25, 1, 0.5, 1)`
- **Visual feedback:** Content follows finger position during swipe (parallax 0.6x)

### 4.2 Long Press Context Menu

**Applicable on:** Post cards, images, user mentions

#### Post Card Long Press Menu

```
+--------------------------+
| リプライ                  |  <- Icon + Label
| リポスト                  |
| ブックマーク              |
| 共有                     |
|--------------------------|
| 通報                     |  <- Destructive (red)
+--------------------------+
```

- **Trigger:** 500ms long press
- **Haptic:** 15ms vibration on menu appear
- **Position:** Bottom sheet (mobile), anchored to press point (tablet)
- **Background:** `#192118`
- **Border:** 1px solid `#2a3828`
- **Border-radius:** 16px (top corners for bottom sheet)
- **Item height:** 48px (touch target)
- **Item padding:** 16px horizontal
- **Icon size:** 20x20px, color `#7a7260`
- **Label:** 15px, `#ddd6c8`
- **Destructive item:** Label color `#e05050`
- **Backdrop:** `rgba(0, 0, 0, 0.5)`, tap to dismiss
- **Animation:** slide up 200ms `ease-out`

#### Image Long Press Menu

```
+--------------------------+
| 画像を保存                |
| 共有                     |
+--------------------------+
```

- Same styling as post card menu
- Fewer items

### 4.3 Double-Tap to Like

- **Target:** Post card body area
- **Detection:** Two taps within 300ms, within 30px radius
- **Animation:** Heart icon pop at tap point
  - Scale: 0 -> 1.2 -> 1.0 -> 0 (600ms total)
  - Color: `#c9a84c` (gold)
  - Size: 64x64px
  - Opacity: 1 -> 0 (fade out in last 200ms)
- **Already liked:** No action (or unlike if preferred - defer to Dev)

### 4.4 Swipe-to-Dismiss (Modals / Bottom Sheets)

- **Threshold:** 100px downward swipe
- **Visual:** Sheet follows finger position
- **Below threshold:** Spring back to original position (200ms)
- **Above threshold:** Animate out + dismiss (200ms)
- **Backdrop opacity:** Decreases proportionally to swipe distance

---

## 5. Image Responsive Optimization Design Notes (4-3-4)

### 5.1 Image Container Sizing

| Context | Max Width | Aspect Ratio | Border-radius |
|---------|----------|--------------|---------------|
| Post image (single) | 100% of content | auto (max 16:9) | 12px |
| Post image (grid 2+) | 50% each | 1:1 crop | 12px (outer corners) |
| Avatar (feed) | 40px | 1:1 | 50% |
| Avatar (profile) | 80px | 1:1 | 50% |
| Avatar (bottom nav) | 24px | 1:1 | 50% |

### 5.2 Loading States

- **Placeholder:** `background: #131a14` with subtle pulse animation
  - Animate between `#131a14` and `#192118` (1.5s ease-in-out infinite)
- **Blur-up:** Load low-res first (20px wide), blur(20px), then swap to full res
- **Error state:** Show broken image icon (20px, `#4a5245`) centered on `#131a14` background

### 5.3 Srcset Breakpoints

```html
<img
  srcset="image-320w.webp 320w,
          image-640w.webp 640w,
          image-960w.webp 960w"
  sizes="(max-width: 768px) 100vw,
         (max-width: 1024px) 560px,
         560px"
/>
```

---

## 6. Dependency Map & Subtask Breakdown (4-3-1 ~ 4-3-6)

### 6.1 Subtask Dependency Graph

```
                    [Design: Icon Spec]
                          |
                          v
[4-3-1] Bottom Nav  <--- Design spec required first
    |
    v
[4-3-2] PWA Support <--- Needs bottom nav for install prompt placement
    |                     Also needs: App icon assets from Design
    v
[4-3-3] Pull-to-Refresh   (independent, can parallel with 4-3-2)
    |
[4-3-4] Image Optimization (independent, can parallel)
    |
[4-3-5] Touch Interactions (depends on 4-3-1 for bottom nav swipe context)
    |
    v
[4-3-6] Lighthouse 85+  <--- Depends on ALL above being complete
```

### 6.2 Subtask Assignment Matrix

| Subtask | Design | Dev | Parallel? | Prerequisite |
|---------|--------|-----|-----------|-------------|
| 4-3-1 Bottom Nav | Icon/color spec (this doc) | Implementation | Design spec first | - |
| 4-3-2 PWA | App icon assets, splash, install prompt UI | manifest.json, SW, install logic | Icon assets first | 4-3-1 (placement) |
| 4-3-3 Pull-to-Refresh | Indicator design (this doc) | Touch handler, animation | Parallel OK | - |
| 4-3-4 Image Optimization | Container/loading spec (this doc) | srcset, WebP pipeline | Parallel OK | - |
| 4-3-5 Touch Interactions | Gesture spec (this doc) | Touch event handlers | Parallel OK | 4-3-1 (nav context) |
| 4-3-6 Lighthouse 85+ | - (QA review) | Performance tuning | After all above | 4-3-1 ~ 4-3-5 |

### 6.3 Recommended Execution Order

**Phase A (Parallel):**
- Design: Deliver this spec + icon assets
- Dev: Sidebar structure refactor (extract shared nav config)

**Phase B (Parallel, after Phase A):**
- Dev: 4-3-1 Bottom nav implementation
- Dev: 4-3-4 Image optimization pipeline

**Phase C (Parallel, after 4-3-1):**
- Dev: 4-3-2 PWA (manifest, SW, install prompt)
- Dev: 4-3-3 Pull-to-refresh
- Dev: 4-3-5 Touch interactions

**Phase D (Sequential, after all):**
- Dev + QA: 4-3-6 Lighthouse audit and optimization

---

## 7. Shared Navigation Config (Dev Handoff)

To enable sidebar and bottom nav to share navigation items, extract this config:

```typescript
// Recommended: frontend/src/lib/navigation.ts
export const NAV_ITEMS = [
  { key: 'home',     label: 'ホーム',       route: '/',              icon: 'home' },
  { key: 'explore',  label: '探索',         route: '/explore',       icon: 'compass' },
  { key: 'compose',  label: '投稿',         route: null,             icon: 'plus',     action: 'compose' },
  { key: 'notify',   label: '通知',         route: '/notifications', icon: 'bell',     badge: true },
  { key: 'profile',  label: 'プロフィール',  route: '/profile/:user', icon: 'avatar' },
] as const;

// Sidebar has additional items not in bottom nav:
export const SIDEBAR_EXTRA_ITEMS = [
  { key: 'search',    label: '検索',         route: '/search',    icon: 'search' },
  { key: 'trends',    label: 'トレンド',      route: '/explore',   icon: 'trending' },
  { key: 'bookmarks', label: 'ブックマーク',   route: '/bookmarks', icon: 'bookmark' },
  { key: 'partners',  label: 'おすすめ',      route: '/partners',  icon: 'star' },
  { key: 'settings',  label: '設定',         route: '/settings',  icon: 'gear' },
] as const;
```

---

## 8. Performance Budget for Lighthouse 85+ (4-3-6)

### Design Constraints to Support Performance

| Metric | Target | Design Implication |
|--------|--------|--------------------|
| LCP | < 2.5s | Hero content above fold, no layout shifts |
| FID | < 100ms | Minimal JS for initial render of bottom nav |
| CLS | < 0.1 | Fixed bottom nav height, reserved image aspect ratios |
| TTI | < 3.8s | Defer non-critical animations |

### Design Recommendations

1. **Bottom nav:** Pure CSS for layout, minimal JS for route matching
2. **Icons:** Inline SVG (not icon font) - smaller payload, no FOUT
3. **Images:** Always specify width/height or aspect-ratio to prevent CLS
4. **Animations:** Use `transform` and `opacity` only (GPU-composited)
5. **Fonts:** Noto Sans JP subset for bottom nav labels (reduce payload)

---

## Appendix A: Color Token Reference

```css
/* Bottom Navigation Specific Tokens */
--bottom-nav-bg:           rgba(8, 10, 8, 0.92);
--bottom-nav-bg-solid:     #080a08;
--bottom-nav-border:       #161b14;
--bottom-nav-icon-inactive: #4a5245;
--bottom-nav-icon-active:   #c9a84c;
--bottom-nav-label-inactive: #4a5245;
--bottom-nav-label-active:  #c9a84c;
--bottom-nav-active-bg:    rgba(201, 168, 76, 0.06);
--bottom-nav-pressed-bg:   rgba(201, 168, 76, 0.1);
--bottom-nav-fab-bg:       #c9a84c;
--bottom-nav-fab-shadow:   0 2px 8px rgba(201, 168, 76, 0.3);
--bottom-nav-badge-bg:     #c9a84c;
--bottom-nav-badge-text:   #0d1009;
--bottom-nav-badge-border: #080a08;
```

## Appendix B: CSS Implementation Guide for Bottom Nav

```css
/* Bottom Navigation Container */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(8, 10, 8, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid #161b14;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-around;
}

/* Navigation Item */
.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 56px;
  min-width: 44px;
  min-height: 44px;
  gap: 2px;
  color: #4a5245;
  transition: color 150ms ease, background-color 150ms ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.bottom-nav-item.active {
  color: #c9a84c;
  background: rgba(201, 168, 76, 0.06);
}

.bottom-nav-item:active {
  color: #9a7c35;
  background: rgba(201, 168, 76, 0.1);
}

/* Center FAB Button */
.bottom-nav-fab {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #c9a84c;
  color: #0d1009;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-8px);
  box-shadow: 0 2px 8px rgba(201, 168, 76, 0.3);
  transition: background 150ms ease, transform 100ms ease;
  -webkit-tap-highlight-color: transparent;
}

.bottom-nav-fab:active {
  background: #9a7c35;
  transform: translateY(-8px) scale(0.95);
}

/* Responsive: hide on md+ */
@media (min-width: 768px) {
  .bottom-nav { display: none; }
}
```

---

*End of Mobile UX Design Specification*
