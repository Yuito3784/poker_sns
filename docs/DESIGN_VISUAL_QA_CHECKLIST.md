# Visual QA Checklist — Vercel Deploy CEO Review

Date: 2026-03-02
Prepared by: Design (不知火)

---

## Overview

Vercelデプロイ後のCEO確認に備え、LP(/lp)・ログイン(/ 未認証)・フィード(/ 認証済み)の3画面についてビジュアルQAを実施するためのチェックリスト。

---

## 1. Design System Reference

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0d1009` | 全画面の基本背景 |
| Surface | `#131a14` | カード、フォーム背景 |
| Surface Elevated | `#192118` | ホバー時のカード |
| Border | `#1f2a1e` | デフォルトボーダー |
| Border Medium | `#2a3828` | 強調ボーダー |
| Gold Primary | `#c9a84c` | CTA、アクセント |
| Gold Dim | `#9a7c35` | 補助ゴールド |
| Gold Bright | `#d4b965` | ホバー時ゴールド |
| Text Primary | `#ddd6c8` | 本文テキスト |
| Text Secondary | `#7a7260` | 補助テキスト |
| Text Muted | `#4a5245` | 控えめなテキスト |
| Sidebar | `#080a08` | サイドバー背景 |

---

## 2. LP Page (/lp)

### 2-1. Dark Theme Color Compliance

| # | Check Item | Expected | Status |
|---|-----------|----------|--------|
| 1 | Page background | `#0d1009` | [ ] |
| 2 | Nav bar background (with blur) | `#0d1009/80` | [ ] |
| 3 | Nav bar border | `#1f2a1e/60` | [ ] |
| 4 | Hero headline color | `#ddd6c8` | [ ] |
| 5 | Hero gradient text (gold) | `#c9a84c` -> `#e0c068` -> `#c9a84c` | [ ] |
| 6 | Sub-headline color | `#7a7260` | [ ] |
| 7 | Social proof strip bg | `#080a08` | [ ] |
| 8 | Feature card bg | `#131a14` | [ ] |
| 9 | Feature card border | `#1f2a1e` | [ ] |
| 10 | Feature card hover border | `#c9a84c/40` | [ ] |
| 11 | Feature card hover bg | `#192118` | [ ] |
| 12 | Premium section card bg | `#131a14` | [ ] |
| 13 | Premium section gold border | `#c9a84c/20` | [ ] |
| 14 | Partner section bg | `#080a08` | [ ] |
| 15 | Footer bg | `#080a08` | [ ] |
| 16 | Footer border | `#1f2a1e` | [ ] |

### 2-2. CTA Button Visibility

| # | Check Item | Expected | Status |
|---|-----------|----------|--------|
| 1 | Primary CTA ("無料アカウントを作成") | bg: `#c9a84c`, text: `#0d1009` | [ ] |
| 2 | Primary CTA hover | bg: `#d4b965`, shadow increase | [ ] |
| 3 | Secondary CTA ("機能を見る") | border: `#2a3828`, text: `#7a7260` | [ ] |
| 4 | Nav CTA ("無料で始める") | border: `#c9a84c/60`, text: `#c9a84c` | [ ] |
| 5 | Nav CTA hover | bg: `#c9a84c`, text: `#0d1009` | [ ] |
| 6 | Premium CTA ("Premiumを試す") | bg: `#c9a84c`, text: `#0d1009` | [ ] |
| 7 | Partner CTA ("パートナー申請はこちら") | bg: `#c9a84c`, text: `#0d1009` | [ ] |
| 8 | Final CTA ("無料アカウントを作成する") | bg: `#c9a84c`, text: `#0d1009` | [ ] |

### 2-3. Responsive Layout (375px Mobile)

| # | Check Item | Status |
|---|-----------|--------|
| 1 | Nav items do not overflow | [ ] |
| 2 | Hero text scales properly (text-5xl on mobile) | [ ] |
| 3 | CTA buttons stack vertically on mobile | [ ] |
| 4 | Feature cards grid: 1 column on mobile | [ ] |
| 5 | How-it-works: 1 column on mobile | [ ] |
| 6 | Premium section: stacked layout on mobile | [ ] |
| 7 | Partner cards: 1 column on mobile | [ ] |
| 8 | Footer links wrap properly | [ ] |
| 9 | No horizontal scrollbar | [ ] |
| 10 | Touch targets >= 44px | [ ] |

---

## 3. Login/Auth Screen (/ Unauthenticated)

### 3-1. Dark Theme Color Compliance

| # | Check Item | Expected | Status |
|---|-----------|----------|--------|
| 1 | Auth form container bg | `#0f1410` | [ ] |
| 2 | Auth form border | `#1f2a1e` | [ ] |
| 3 | Logo icon gradient | gold gradient with `#c9a84c` | [ ] |
| 4 | Title "Poker SNS" color | `#ddd6c8` | [ ] |
| 5 | Subtitle color | `#4a5245` | [ ] |
| 6 | Google button bg | `#1a1f1e` | [ ] |
| 7 | Google button border | `#2a3828` | [ ] |
| 8 | LINE button bg | `#00b900` | [ ] |
| 9 | X button bg | `#111` | [ ] |
| 10 | Divider line color | `#1f2a1e` | [ ] |
| 11 | Input field bg | `#0d1009` | [ ] |
| 12 | Input field border | `#1f2a1e` | [ ] |
| 13 | Input text color | `#ddd6c8` | [ ] |
| 14 | Label color | `#7a7260` | [ ] |
| 15 | Submit button | bg: `#c9a84c`, text: `#0d1009` | [ ] |
| 16 | Mode switch link | `#c9a84c` | [ ] |
| 17 | Error state border | red-800/60 | [ ] |
| 18 | Error message bg | rgba(176,48,48,0.15) | [ ] |

### 3-2. CTA Button Visibility

| # | Check Item | Expected | Status |
|---|-----------|----------|--------|
| 1 | Login/Register submit button | bg: `#c9a84c`, text: `#0d1009` | [ ] |
| 2 | Submit button disabled state | opacity 60% | [ ] |
| 3 | Magic link send button | bg: `#c9a84c`, text: `#0d1009` | [ ] |
| 4 | Mode switch clickable & visible | text: `#c9a84c` | [ ] |

### 3-3. Responsive Layout (375px Mobile)

| # | Check Item | Status |
|---|-----------|--------|
| 1 | Auth form max-width respected | [ ] |
| 2 | Form fits without horizontal scroll | [ ] |
| 3 | OAuth buttons render correctly | [ ] |
| 4 | LINE / X buttons side-by-side | [ ] |
| 5 | Input fields full width | [ ] |
| 6 | Password show/hide icon accessible | [ ] |

---

## 4. Feed Page (/ Authenticated)

### 4-1. Dark Theme Color Compliance

| # | Check Item | Expected | Status |
|---|-----------|----------|--------|
| 1 | Page background | `#0d1009` | [ ] |
| 2 | Sidebar bg | `#080a08` | [ ] |
| 3 | Sidebar border | `#161b14` | [ ] |
| 4 | Post card bg | `#131a14` | [ ] |
| 5 | Post card border | `#1f2a1e` | [ ] |
| 6 | Post text color | `#ddd6c8` | [ ] |
| 7 | Secondary text | `#7a7260` | [ ] |
| 8 | Compose area bg | consistent with surface | [ ] |
| 9 | Poker hand form styling | dark theme tokens | [ ] |

### 4-2. CTA Button Visibility

| # | Check Item | Expected | Status |
|---|-----------|----------|--------|
| 1 | Post submit button | bg: `#c9a84c`, text: `#0d1009` | [ ] |
| 2 | Like/Reply/Repost icons | visible on dark bg | [ ] |
| 3 | Navigation items | readable on sidebar | [ ] |

### 4-3. Responsive Layout (375px Mobile)

| # | Check Item | Status |
|---|-----------|--------|
| 1 | Sidebar hidden on mobile or hamburger | [ ] |
| 2 | Post cards full-width | [ ] |
| 3 | Compose modal accessible | [ ] |
| 4 | No horizontal overflow | [ ] |

---

## 5. Bugs Found During Code Review

| # | Issue | Severity | File | Fix |
|---|-------|----------|------|-----|
| 1 | Suspense fallback uses light bg `#f8faf5` instead of `#0d1009` | HIGH | `frontend/src/app/page.tsx:21` | Fixed -> `#0d1009` |

---

## 6. QA Workflow

1. DevSecOps/Development deploys to Vercel -> URL shared
2. Design opens URL on Desktop (1440px) + Mobile (375px)
3. Walk through this checklist on all 3 screens
4. Screenshot any failures
5. Report results to QA (雪花) for integration with smoke test
6. Combined pass/fail -> Planning (桃鈴) -> CEO report
