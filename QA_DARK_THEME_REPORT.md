# QA/QC Dark Theme Unification Report

**Date**: 2026-03-05
**Auditor**: QA/QC 尾丸
**Reference Page**: `/notifications` (正解見本)
**Design Tokens**: bg `#0d1009` / surface `#131a14` / elevated `#192118` / border `#1f2a1e` / text `#ddd6c8`

---

## 1. White/Light Background Pages (CRITICAL)

| # | Page/Route | File | Current Background | Severity |
|---|-----------|------|-------------------|----------|
| 1 | `/privacy` | `frontend/src/app/privacy/page.tsx` | `bg-white text-neutral-900` | CRITICAL |
| 2 | `/terms` | `frontend/src/app/terms/page.tsx` | `bg-white text-neutral-900` | CRITICAL |
| 3 | `/verify-email` | `frontend/src/app/verify-email/page.tsx` | `bg-white text-neutral-900` + `bg-white` card | CRITICAL |
| 4 | `/explore` | `frontend/src/app/explore/page.tsx` | `bg-[#eef3ea] text-neutral-900` | CRITICAL |
| 5 | `/hashtag/[tag]` | `frontend/src/app/hashtag/[tag]/HashtagClient.tsx` | `bg-[#eef3ea] text-neutral-900` | CRITICAL |
| 6 | `/post/[id]` | `frontend/src/app/post/[id]/PostDetailClient.tsx` | `bg-[#faf9f7] text-neutral-900` + `bg-white` (loading/error/modal) | CRITICAL |
| 7 | `/reset-password` | `frontend/src/app/reset-password/page.tsx` | `bg-gradient from-[#f8faf5] to-[#e8f0e6]` + `bg-white` cards | CRITICAL |
| 8 | `/forgot-password` | `frontend/src/app/forgot-password/page.tsx` | `bg-gradient from-[#f8faf5] to-[#e8f0e6]` + `bg-white` card | CRITICAL |
| 9 | `/partners` | `frontend/src/app/partners/page.tsx` | `bg-[#faf9f7] text-neutral-900` | CRITICAL |

## 2. Components with Light Theme Remnants (HIGH)

| # | Component | File | Issues |
|---|----------|------|--------|
| 1 | `SearchResults` | `frontend/src/app/components/SearchResults.tsx` | `border-neutral-200`, `hover:bg-neutral-50`, `text-neutral-600` |
| 2 | `NotificationDropdown` | `frontend/src/app/components/NotificationDropdown.tsx` | `text-neutral-600`, `text-neutral-500` |
| 3 | Post Detail Modal | `PostDetailClient.tsx:569` | Delete confirmation dialog uses `bg-white` |

## 3. Acceptable Uses (NO ACTION NEEDED)

- `hover:bg-white/5` and `hover:bg-white/[0.03]` in dark-themed pages = subtle hover overlay on dark background. OK.
- Pages already using dark theme: `/notifications`, `/settings`, `/search`, `/bookmarks`, `/` (home), `/profile/[username]`

## 4. WCAG AA Contrast Ratio Analysis

Background: `#0d1009` (relative luminance ≈ 0.003)

| Color Token | Hex | Contrast Ratio | AA Normal (4.5:1) | AA Large (3:1) |
|-------------|-----|---------------|-------------------|----------------|
| Text primary | `#ddd6c8` | ~13.4:1 | PASS | PASS |
| Gold primary | `#c9a84c` | ~8.1:1 | PASS | PASS |
| Text `#9a8e7a` | `#9a8e7a` | ~5.85:1 | PASS | PASS |
| Text `#8ba388` | `#8ba388` | ~6.42:1 | PASS | PASS |
| Text secondary `#7a7260` | `#7a7260` | ~3.96:1 | **FAIL** | PASS |
| Sidebar text `#6b7a66` | `#6b7a66` | ~4.15:1 | **FAIL** | PASS |
| Text muted `#4a5245` | `#4a5245` | ~2.38:1 | **FAIL** | **FAIL** |

### Contrast Warnings (MEDIUM)

- **`#7a7260`** (3.96:1): Used for secondary text. Fails AA for normal text by a narrow margin. Recommend bumping to `#8a8270` (~5.0:1) or limiting to large text / decorative use.
- **`#6b7a66`** (4.15:1): Used for timestamps, helper text. Similar margin failure. Recommend `#7b8a76` (~5.2:1) or accept as "large text only".
- **`#4a5245`** (2.38:1): Used for muted/placeholder text. Fails both AA levels. This is acceptable ONLY for purely decorative elements. If used for readable content, recommend `#5a6255` (~3.1:1 minimum).

> Note: These contrast warnings are MEDIUM severity per MVP Code Review Policy — reported as warnings only, no code changes applied by QA.

## 5. Inline Style Audit

Multiple pages use `style={{ background: "...", color: "..." }}` for dark theme colors. This is the current pattern used in already-fixed pages (`/notifications`, `/settings`). While Tailwind utility classes are preferred per DevSecOps constraint, the existing pattern should remain consistent. **New fixes should follow whichever pattern the reference page uses.**

The notifications page (reference) uses inline `style=` for theme colors. This means:
- Dark theme colors via inline style is the established pattern
- No CSP violation risk since Helmet CSP already permits inline styles on these pages

## 6. Staging Verification Checklist

Post-fix, verify each page visually:

- [ ] `/privacy` - Dark background, readable text
- [ ] `/terms` - Dark background, readable text
- [ ] `/verify-email` - Dark card on dark background
- [ ] `/explore` - Dark background, tabs styled correctly
- [ ] `/hashtag/[tag]` - Dark background, posts readable
- [ ] `/post/[id]` - Dark background, loading/error states dark, delete modal dark
- [ ] `/reset-password` - Dark card on dark background
- [ ] `/forgot-password` - Dark card on dark background
- [ ] `/partners` - Dark background, partner cards dark
- [ ] `SearchResults` component - Dark borders, dark hover states
- [ ] `NotificationDropdown` component - Text colors match theme
- [ ] Build passes (`npm run build`) with no errors

## 7. Summary

| Severity | Count | Action |
|----------|-------|--------|
| CRITICAL | 9 pages | Dev must fix - white/light backgrounds |
| HIGH | 3 components | Dev must fix - light theme remnants |
| MEDIUM | 3 color tokens | Warning only - contrast ratio borderline |
| OK | 6+ pages | Already dark-themed, no action needed |

**Total files requiring modification**: 11 files across 9 pages + 2 components + 1 modal
