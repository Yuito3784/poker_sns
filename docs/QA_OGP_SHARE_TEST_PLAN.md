# QA/QC Test Plan: OGP & SNS Share Feature

**Document Version:** 1.0
**Author:** QA/QC (姫森)
**Date:** 2026-03-02
**Status:** Ready for execution post-implementation

---

## 1. Scope

This document defines the test plan for:
- OGP (Open Graph Protocol) meta tag verification across SNS platforms
- Dynamic OG image generation validation
- SNS share button functionality (cross-browser / cross-device)
- Content encoding and edge-case handling

---

## 2. Current Implementation Audit Summary

### 2.1 OGP Metadata Coverage

| Page | Metadata | OG Image | Status |
|------|----------|----------|--------|
| `/` (Root Layout) | Static `metadata` export with og:title, og:description, twitter:card | `/opengraph-image.tsx` (Edge, 1200x630) | Implemented |
| `/post/[id]` | Dynamic `generateMetadata` via `/posts/:id/meta` API | `/post/[id]/opengraph-image.tsx` (Edge, 1200x630) | Implemented |
| `/privacy` | Static title only | Inherits root OG image | Partial - no og:description |
| `/terms` | Static title only | Inherits root OG image | Partial - no og:description |
| `/lp` (Landing Page) | **None** | **None** | **MISSING** |
| `/profile/[username]` | **None** | **None** | **MISSING** |
| `/explore` | **None** | **None** | **MISSING** |
| `/hashtag/[tag]` | **None** | **None** | **MISSING** |

### 2.2 Share Button Coverage

| Component | Copy Link | X/Twitter | LINE | Web Share API |
|-----------|-----------|-----------|------|---------------|
| PostItem (feed) | Yes | Yes | Yes | No |
| PostDetailClient | Yes | Yes | Yes | No |

### 2.3 Discovered Bugs

| ID | Severity | Description | File | Line |
|----|----------|-------------|------|------|
| BUG-001 | **MEDIUM** | `/posts/:id/meta` endpoint does not return `_count` (likes/replies/reposts), but OG image template references `post._count?.likes` etc. Stats always display 0 in OG image. | `backend/src/posts/posts.service.ts` | L601-614 |
| BUG-002 | **LOW** | Post meta fallback in `generateMetadata` returns generic og:image from root, not explicitly set. May cause stale cache on SNS platforms. | `frontend/src/app/post/[id]/page.tsx` | L15-18 |

---

## 3. OGP Platform Verification Test Plan

### 3.1 Pre-Test Requirements

- Application deployed to a publicly accessible URL (localhost will not work for SNS crawler validation)
- SSL certificate active (HTTPS required for OGP crawlers)
- Backend `/posts/:id/meta` endpoint accessible without auth (`@Public()` decorator confirmed)

### 3.2 Test Matrix: Platform x Page

| Test ID | Platform | Debugger Tool | Target Page | Expected Card Type |
|---------|----------|---------------|-------------|-------------------|
| OGP-T01 | Twitter/X | [Card Validator](https://cards-dev.twitter.com/validator) | `/` (Top) | summary_large_image |
| OGP-T02 | Twitter/X | Card Validator | `/post/{id}` (with image) | summary_large_image |
| OGP-T03 | Twitter/X | Card Validator | `/post/{id}` (no image) | summary |
| OGP-T04 | Facebook | [Sharing Debugger](https://developers.facebook.com/tools/debug/) | `/` (Top) | website |
| OGP-T05 | Facebook | Sharing Debugger | `/post/{id}` | article |
| OGP-T06 | LINE | [Page Poker](https://poker.line.naver.jp/) | `/` (Top) | Standard card |
| OGP-T07 | LINE | Page Poker | `/post/{id}` | Standard card |
| OGP-T08 | Discord | Paste URL in channel | `/post/{id}` | Embed preview |
| OGP-T09 | Slack | Paste URL in channel | `/post/{id}` | Link unfurl |

### 3.3 Verification Checklist per Test

For each test ID above, verify:

- [ ] **Title**: Displays correct page title (not empty, not "undefined")
- [ ] **Description**: Displays description (max ~140 chars, no HTML tags)
- [ ] **Image**: OG image renders correctly at 1200x630
  - [ ] Image loads within 5 seconds
  - [ ] No broken image icon
  - [ ] Text is readable (not clipped, not garbled)
  - [ ] Brand colors match (#0d1009 background, #c9a84c gold)
- [ ] **URL**: Canonical URL is correct (HTTPS, no trailing artifacts)
- [ ] **Card Type**: Matches expected type from matrix above
- [ ] **Site Name**: Shows "Poker SNS"

### 3.4 OG Image Content Verification

| Test ID | Scenario | Expected OG Image Content |
|---------|----------|--------------------------|
| OGI-01 | Root page | Spade logo + "Poker SNS" + tagline + 3 feature chips |
| OGI-02 | Post with content (short) | Author avatar initial + name + @username + full content + stats |
| OGI-03 | Post with content (120+ chars) | Content truncated with "..." at 120 chars |
| OGI-04 | Post with no content | Author info + empty content area + stats at 0 |
| OGI-05 | Post not found (invalid ID) | Fallback: spade + "Poker SNS" only |
| OGI-06 | Author with long name (30+ chars) | Name does not overflow layout |
| OGI-07 | Author with Japanese name | Japanese characters render correctly (no tofu) |
| OGI-08 | Post with only emoji content | Emoji renders (may vary by Edge runtime font support) |

---

## 4. Share Button Test Plan

### 4.1 Cross-Browser / Cross-Device Test Matrix

| Test ID | Browser | OS | Device | Test Target |
|---------|---------|-----|--------|-------------|
| SB-01 | Chrome (latest) | Windows 11 | Desktop | PostItem + PostDetailClient |
| SB-02 | Firefox (latest) | Windows 11 | Desktop | PostItem + PostDetailClient |
| SB-03 | Edge (latest) | Windows 11 | Desktop | PostItem + PostDetailClient |
| SB-04 | Safari (latest) | macOS | Desktop | PostItem + PostDetailClient |
| SB-05 | Chrome (latest) | Android 14+ | Mobile | PostItem + PostDetailClient |
| SB-06 | Safari (latest) | iOS 17+ | iPhone | PostItem + PostDetailClient |
| SB-07 | Chrome (latest) | iOS 17+ | iPhone | PostItem + PostDetailClient |
| SB-08 | Samsung Internet | Android 14+ | Mobile | PostItem + PostDetailClient |

### 4.2 Share Button Functional Tests

For each browser/device combination above:

#### Copy Link Button
| Test ID | Action | Expected Result |
|---------|--------|-----------------|
| CL-01 | Click copy link on a post in feed | URL `{origin}/post/{id}` copied to clipboard; check icon shown for 1.5s |
| CL-02 | Paste clipboard content | URL matches `https://{domain}/post/{actual-post-id}` |
| CL-03 | Click copy link in post detail page | Same URL copied; check icon feedback |
| CL-04 | Click copy link when clipboard API unavailable | No JS error thrown; button remains interactive |

#### X/Twitter Share Button
| Test ID | Action | Expected Result |
|---------|--------|-----------------|
| XS-01 | Click X share on poker hand post | Opens `twitter.com/intent/tweet` with text="ポーカーハンド" and correct URL |
| XS-02 | Click X share on regular post | Opens intent with text=first 30 chars of content |
| XS-03 | Click X share (logged out of X) | Twitter login page shown; after login, tweet composer with pre-filled content |
| XS-04 | Verify no event propagation | Clicking share does not navigate to post detail (stopPropagation works) |

#### LINE Share Button
| Test ID | Action | Expected Result |
|---------|--------|-----------------|
| LS-01 | Click LINE share on desktop | Opens `social-plugins.line.me/lineit/share` with correct URL |
| LS-02 | Click LINE share on mobile (LINE installed) | LINE app opens with share dialog |
| LS-03 | Click LINE share on mobile (LINE not installed) | Falls back to LINE web share page |

---

## 5. Encoding & Edge-Case Test Scenarios

### 5.1 Special Character Encoding in Share URLs

| Test ID | Post Content | Verify |
|---------|-------------|--------|
| ENC-01 | `AKo on BTN, 3bet to $15` | Dollar sign properly encoded in share URL |
| ENC-02 | `UTG opens 2.5x & hero 3bets` | Ampersand `&` properly encoded (not breaking URL params) |
| ENC-03 | `日本語のポーカー投稿テスト` | Japanese text properly encoded in encodeURIComponent |
| ENC-04 | `Check/raise the flop?` | Forward slash properly encoded |
| ENC-05 | Content with `#hashtag` | Hash symbol doesn't break URL fragment |
| ENC-06 | Content with newlines (`\n`) | Newlines properly handled in share text |
| ENC-07 | Content with `<script>alert(1)</script>` | HTML tags escaped; no XSS in OG description |
| ENC-08 | Content with emoji `AA 🚀🔥` | Emoji preserved in share text |
| ENC-09 | Empty content post | Share text falls back gracefully (not "undefined" or "null") |
| ENC-10 | Content exactly 30 chars | X share text not truncated with "..." |
| ENC-11 | Content 31+ chars | X share text truncated at 30 chars |
| ENC-12 | URL in content `https://example.com/hand` | URL-in-URL properly double-encoded |

### 5.2 OGP Meta Tag Encoding

| Test ID | Scenario | Verify |
|---------|----------|--------|
| META-01 | Post content contains `"` (double quotes) | og:description properly escapes quotes in meta tag |
| META-02 | Post content contains `<>` (angle brackets) | Angle brackets HTML-escaped in meta tag |
| META-03 | Author username with special chars | og:title renders correctly |
| META-04 | Post content is exactly 140 chars | Description not truncated with "..." |
| META-05 | Post content is 141+ chars | Description truncated at 140 with "..." |

### 5.3 Edge Cases

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EDGE-01 | Share button clicked rapidly (double-click) | Only one share window opens; no duplicate clipboard writes |
| EDGE-02 | OG image fetch with slow backend (>5s response) | OG image endpoint returns fallback within reasonable timeout |
| EDGE-03 | OG image fetch with backend down | Fallback generic "Poker SNS" OG image renders |
| EDGE-04 | Post deleted after OG image cached | SNS platform shows stale cache; re-scrape shows fallback |
| EDGE-05 | Concurrent OG image requests (same post) | Edge runtime handles concurrent requests without crash |
| EDGE-06 | Post ID with invalid format (non-UUID) | `generateMetadata` returns fallback; no 500 error |
| EDGE-07 | Very long post (1000 chars max) | OG description truncated at 140; OG image text at 120 |

---

## 6. Security Verification

| Test ID | Category | Check |
|---------|----------|-------|
| SEC-01 | XSS via OGP | Inject `<img onerror=alert(1)>` in post content; verify og:description is escaped |
| SEC-02 | SSRF via OG image | OG image endpoint does not accept arbitrary URLs as parameters |
| SEC-03 | Rate limiting | OG image endpoint respects global rate limit (60 req/min) |
| SEC-04 | Information leak | OG meta does not expose email, internal IDs beyond post ID, or auth tokens |
| SEC-05 | Cache poisoning | OG image `revalidate: 60` cache header is respected; cannot serve poisoned content |

---

## 7. Performance Criteria

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| OG image generation time | < 3 seconds | Edge runtime logs |
| Meta endpoint response | < 200ms | Backend response time |
| Share button interaction | < 100ms feedback | User-perceived latency |
| OG image file size | < 500KB | Network tab inspection |

---

## 8. Missing Coverage Recommendations (WARNING only, no code changes)

| Priority | Recommendation |
|----------|---------------|
| **HIGH** | Add `generateMetadata` to `/profile/[username]` page for profile sharing on SNS |
| **HIGH** | Add `generateMetadata` to `/lp` landing page (critical for marketing campaigns) |
| **MEDIUM** | Fix BUG-001: Add `_count` to `/posts/:id/meta` so OG image shows real engagement stats |
| **MEDIUM** | Implement Web Share API (`navigator.share`) as primary share method on mobile with fallback to current buttons |
| **LOW** | Add `generateMetadata` to `/explore` and `/hashtag/[tag]` pages |
| **LOW** | Fix BUG-002: Set explicit fallback OG image URL in `generateMetadata` catch block |
| **LOW** | Add Facebook share button (currently only X and LINE) |

---

## 9. Test Execution Tracking Template

| Test ID | Tester | Date | Environment | Result | Notes |
|---------|--------|------|-------------|--------|-------|
| OGP-T01 | | | | PASS/FAIL | |
| OGP-T02 | | | | PASS/FAIL | |
| ... | | | | | |

---

## Appendix A: Platform Debugger URLs

- **Twitter/X Card Validator**: https://cards-dev.twitter.com/validator
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
- **LINE Page Poker**: https://poker.line.naver.jp/
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
- **Open Graph Preview**: https://www.opengraph.xyz/

## Appendix B: Test Data Fixtures

```
# Minimum viable test posts to create before testing:

1. Regular post (short text, no image)
   Content: "UTGから2.5xオープン"

2. Regular post (long text, with image)
   Content: "BTNから3betして、フロップはA-K-7r。ここでCBを打つべきか迷ったが..."
   Image: Attached

3. Poker hand post
   Content: Auto-generated hand history

4. Post with special characters
   Content: "Check/raise? 50% pot → $150 & villain calls #bluff"

5. Post with only emoji
   Content: "🃏♠♥♦♣"

6. Post with Japanese + English mix
   Content: "River betは1/3 potでvalue targeting worse Ax"

7. Post with maximum length (1000 chars)
   Content: [Generate 1000 char lorem text]
```
