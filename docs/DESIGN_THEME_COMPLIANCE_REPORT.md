# Design Theme Compliance Report - 5 Revenue Features

**Date**: 2026-03-05
**Reviewer**: Design (宝鐘)
**Status**: PASS - All implemented UI pages are Felt Table theme compliant

---

## Review Scope

6 new frontend pages across 3 feature modules (Salon, Tournament, Coaching) were reviewed for compliance with "The Felt Table" dark luxury design system.

Tipping and Paid Content features have backend + type definitions only; no dedicated UI pages exist yet and will require theme review when UI is implemented.

## Theme Color Reference

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0d1009` | Page background |
| Surface | `#131a14` | Cards, panels |
| Surface elevated | `#192118` | Inputs, stat blocks |
| Border | `#1f2a1e` | Card borders |
| Border medium | `#2a3828` | Input borders |
| Gold primary | `#c9a84c` | CTA buttons, prices, links |
| Gold dim | `#9a7c35` | Tags (specialties) |
| Text primary | `#ddd6c8` | Headings, body content |
| Text secondary | `#7a7260` | Descriptions, labels |
| Text muted | `#4a5245` | Loading states, metadata |
| CTA pattern | `bg: #c9a84c, color: #0d1009` | All interactive buttons |

## Per-Page Audit

### Salon Pages

| File | Status | Notes |
|------|--------|-------|
| `salons/page.tsx` | PASS | Background, cards, inputs, CTAs all compliant |
| `salons/[slug]/page.tsx` | PASS | Join CTA, post composer, post cards all compliant |

### Tournament Pages

| File | Status | Notes |
|------|--------|-------|
| `tournaments/page.tsx` | PASS | Tab bar uses gold highlight, cards, create form compliant |
| `tournaments/[id]/page.tsx` | PASS | Stat grid uses `#192118`, register CTA compliant |

### Coaching Pages

| File | Status | Notes |
|------|--------|-------|
| `coaching/page.tsx` | PASS | Coach cards with avatar fallback, specialty tags (`#9a7c35`) compliant |
| `coaching/[id]/page.tsx` | PASS | Booking form, duration select, estimated price display all compliant |

## Common Patterns Verified

- **Cards**: `background: #131a14, border: 1px solid #1f2a1e` - consistent across all pages
- **Inputs**: `background: #192118, border: 1px solid #2a3828, color: #ddd6c8` - consistent
- **CTA Buttons**: `background: #c9a84c, color: #0d1009` with opacity 0.5 for disabled - consistent
- **Back links**: Gold `#c9a84c` text with left arrow - consistent
- **Gold badges**: `background: rgba(201,168,76,0.1), color: #c9a84c` - consistent
- **Specialty tags**: `background: rgba(201,168,76,0.08), color: #9a7c35` - consistent
- **Hover states**: `hover:bg-white/[0.02]` on card buttons - consistent
- **No emojis in UI text** - verified across all pages

## Pending Items (Post-Merge)

1. **Tipping UI** - When tip button/modal is added to PostItem, must use gold CTA pattern and `#131a14` modal surface
2. **Paid Content paywall** - Preview-to-blur boundary with purchase CTA overlay must use gold CTA on `#131a14` surface
3. **Stripe Checkout transition** - Success/error callback pages should maintain dark theme continuity (no white flash)

## Decision

**Conditional approval for dev merge.** All currently implemented UI is fully compliant with the Felt Table design system. Tipping and Paid Content UI will require design review when frontend pages are implemented.
