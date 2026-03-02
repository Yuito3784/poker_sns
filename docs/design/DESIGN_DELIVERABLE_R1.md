# Design Deliverable - Round 1
## Error Status Banner UI & Task Progress Dashboard
**Team:** Design (宝鐘 / 不知火)
**Date:** 2026-03-02
**Status:** Complete

---

## Deliverable Summary

| Item | Status | Artifact |
|------|--------|----------|
| Error Status Banner UI (3 states) | Done | `error-banner-dashboard-mockup.html` Section 2 |
| Alert Badge / Chip Variants | Done | `error-banner-dashboard-mockup.html` Section 2.2 |
| Task Progress Dashboard Mockup | Done | `error-banner-dashboard-mockup.html` Section 3 |
| Status Color Token Spec | Done | `error-banner-dashboard-mockup.html` Section 1 |
| Implementation Notes for Dev | Done | `error-banner-dashboard-mockup.html` Section 4 |

---

## 1. Error Status Banner UI

Three visual states designed on The Felt Table dark theme:

### State: Error
- Background: `rgba(176,48,48,0.15)` on `#131a14` surface
- Left accent border: `3px solid #b03030`
- Text: `#e85c5c` (title 13px/600, desc 12px/normal)
- CTA: "Details" button (`bg: #b03030, color: #fff`)
- Behavior: Persists until user dismisses or clicks action

### State: Retry / In Progress
- Background: `rgba(201,168,76,0.12)` on `#131a14` surface
- Left accent border: `3px solid #9a7c35`
- Text: `#c9a84c` (brand gold)
- Icon: Spinning refresh icon (1s linear infinite)
- CTA: "Cancel" button (`bg: #c9a84c, color: #0d1009`)
- Behavior: Shows retry attempt count, auto-updates

### State: Success / Complete
- Background: `rgba(76,160,90,0.12)` on `#131a14` surface
- Left accent border: `3px solid #3a7a42`
- Text: `#5cb868`
- CTA: "Dismiss" button (outlined, `border: 1px solid #3a7a42`)
- Behavior: Auto-dismisses after 5 seconds

### Common Specs
- Layout: `display: flex; align-items: center; gap: 12px`
- Padding: `12px 16px`
- Border radius: `8px`
- Placement: Fixed top of main content, below navbar
- Enter animation: `slideDown 0.3s ease`
- Exit animation: `fadeOut 0.2s`
- Mobile (<640px): Action button wraps full-width

---

## 2. Alert Badge / Chip

Inline status indicators for task items, nav, or headers:

- Size: `11px / 600 weight / letter-spacing 0.3px`
- Shape: `border-radius: 12px; padding: 3px 10px`
- Status dot: `6px` circle, left of label
- Retry dot uses `pulse` animation (1.5s infinite)
- Three variants: Error (red), Retry (gold), Success (green)

---

## 3. Task Progress Dashboard

Dashboard card for admin/operator task monitoring:

### Stat Grid (4-column)
- Total Tasks, Completed, In Progress, Errors
- Values: `28px / 700 weight` in state-appropriate color
- Labels: `11px / uppercase / #7a7260`
- Cards: `#192118` elevated surface, `8px radius`

### Progress Bar
- Height: `6px`, segmented fill (green=done, gold=running, red=error)
- Track: `#1f2a1e`, `border-radius: 3px`

### Task List
- Row: `12px 16px padding`, `border-bottom: 1px solid #1f2a1e`
- Status dot: `8px` colored circle (left)
- Badge: State chip (right)
- Timestamp: `11px monospace #4a5245` (right-aligned)
- Hover: `background: #192118`

### Footer
- Last health check timestamp with next check countdown
- Format: "Last check: HH:MM:SS (every 5 min) | Next: HH:MM:SS"

---

## 4. CSS Variables to Add

```css
--error-bg: rgba(176,48,48,0.15);
--error-border: #b03030;
--error-text: #e85c5c;
--success-bg: rgba(76,160,90,0.12);
--success-border: #3a7a42;
--success-text: #5cb868;
--retry-bg: rgba(201,168,76,0.12);
--retry-border: #9a7c35;
```

---

## 5. Proposed Component Structure

| Component | File | Phase |
|-----------|------|-------|
| `StatusBanner` | `components/StatusBanner.tsx` | Phase 1 (2h) |
| `AlertBadge` | `components/AlertBadge.tsx` | Phase 1 (1h) |
| `TaskDashboard` | `app/admin/tasks/page.tsx` | Phase 2 (4h) |
| `TaskMonitorContext` | `contexts/TaskMonitorContext.tsx` | Phase 2 (3h) |

---

## 6. Phase Alignment (Planning Complement)

Per Planning (桃鈴) priority matrix:

**Phase 1 (this week):**
- CSS status variables added to globals.css (0.5h)
- StatusBanner component (2h) - integrates with ExceptionFilter notifications
- AlertBadge component (1h) - reusable across sidebar/header

**Phase 2 (next week):**
- TaskDashboard page (4h) - depends on backend task monitoring API
- TaskMonitorContext (3h) - WebSocket/polling integration

**Design total estimate:** 10.5h across both phases

---

## Artifact Location

Interactive HTML mockup: `docs/design/error-banner-dashboard-mockup.html`
Open in browser to see live rendering with animations, hover states, and responsive behavior.
