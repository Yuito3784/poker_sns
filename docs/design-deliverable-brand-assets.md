# Design Team Deliverable: Brand Asset Inventory & Production Readiness

**Date**: 2026-03-02
**担当**: Design (宝鐘)
**Status**: Completed

---

## 1. Brand Asset Inventory

| Asset | Status | File Path | Notes |
|---|---|---|---|
| **favicon.ico** | OK | `frontend/src/app/favicon.ico` | 25KB, spade icon |
| **icon.svg** | OK (fixed) | `frontend/src/app/icon.svg` | 32x32, brand gold `#c9a84c` |
| **Apple Touch Icon** | NEW | `frontend/src/app/apple-icon.tsx` | 180x180 dynamic PNG, gradient gold spade |
| **OGP Image (site)** | OK | `frontend/src/app/opengraph-image.tsx` | 1200x630, edge runtime |
| **OGP Image (post)** | OK | `frontend/src/app/post/[id]/opengraph-image.tsx` | Dynamic per-post, avatar+content |
| **Web App Manifest** | NEW | `frontend/src/app/manifest.ts` | PWA-ready, theme `#0d1009` |
| **robots.txt** | OK | `frontend/src/app/robots.ts` | Disallows settings/bookmarks/notifications |
| **sitemap.xml** | OK | `frontend/src/app/sitemap.ts` | Root, explore, partners, terms, privacy |

## 2. Changes Made This Round

### 2.1 Created: `apple-icon.tsx`
- 180x180 PNG, dynamically generated via `next/og` ImageResponse
- Dark luxury gradient background (`#131a14` -> `#0d1009`)
- Gold spade gradient (`#c9a84c` -> `#9a7c35`)
- Rounded corners (36px radius) for iOS display

### 2.2 Created: `manifest.ts`
- Web App Manifest for PWA/Add-to-Home-Screen support
- `name`: "Poker SNS", `short_name`: "PokerSNS"
- `background_color` / `theme_color`: `#0d1009`
- `display`: "standalone"
- Icons: SVG (any size) + favicon.ico (48x48)

### 2.3 Verified: `icon.svg` brand color
- Confirmed updated to `#c9a84c` (brand gold) — previously `#f59e0b` (amber)
- Background updated to `#131a14` (surface) — consistent with theme

## 3. Production Domain Dependency Checklist

The following items require the **production domain** to be finalized:

| Item | Current Value | Action Required |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Set to production URL |
| `og:url` in OGP | Uses `metadataBase` | Auto-resolves from `NEXT_PUBLIC_SITE_URL` |
| `sitemap.xml` URLs | Uses `SITE_URL` | Auto-resolves from `NEXT_PUBLIC_SITE_URL` |
| `robots.txt` sitemap | Uses `SITE_URL` | Auto-resolves from `NEXT_PUBLIC_SITE_URL` |
| JSON-LD `url` | Uses `SITE_URL` | Auto-resolves from `NEXT_PUBLIC_SITE_URL` |
| Landing Page contact | `contact@pokersns.jp` | Confirm with CEO |

**Conclusion**: All meta tags and SEO references use the `NEXT_PUBLIC_SITE_URL` environment variable. Once the production domain is set in `.env`, all values resolve automatically. No manual code changes needed.

## 4. Design Theme Consistency Audit

| Element | Expected | Actual | Status |
|---|---|---|---|
| favicon icon color | `#c9a84c` | `#c9a84c` | OK |
| favicon background | `#131a14` | `#131a14` | OK |
| OGP background | `#0d1009` | `#0d1009` | OK |
| OGP gold gradient | `#c9a84c`->`#9a7c35` | `#c9a84c`->`#9a7c35` | OK |
| OGP text primary | `#ddd6c8` | `#ddd6c8` | OK |
| OGP text secondary | `#7a7260` | `#7a7260` | OK |
| Apple icon gold | `#c9a84c` | `#c9a84c` | OK |
| Manifest theme_color | `#0d1009` | `#0d1009` | OK |

All assets are consistent with the "The Felt Table" Dark Luxury theme.

## 5. MEDIUM/LOW Warnings (No Code Changes)

- **[MEDIUM]** `frontend/public/` contains Next.js default SVGs (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`). These are unused placeholder files and should be cleaned up before production.
- **[LOW]** Landing page uses hardcoded email `contact@pokersns.jp` — CEO should confirm this is the intended contact address.
- **[LOW]** No `twitter:site` or `twitter:creator` handles configured in metadata. Consider adding if a Twitter/X account exists.

## 6. Blocker Summary for CEO

| Blocker | Required From | Impact |
|---|---|---|
| Production domain name | CEO | OGP URLs, sitemap, JSON-LD, SSL cert |
| Contact email confirmation | CEO | Landing page footer |
| Twitter/X account handle | CEO (optional) | Twitter card attribution |
