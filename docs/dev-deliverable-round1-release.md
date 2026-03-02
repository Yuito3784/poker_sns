# Development Deliverable - Round 1: Release Readiness

**Date:** 2026-03-02
**Owner:** Development (風真)

---

## 1. Build Verification

| Component | Version | Build Status | Notes |
|-----------|---------|-------------|-------|
| Backend (NestJS) | 0.0.1 | PASS | Prisma 5.20.0 generate + nest build |
| Frontend (Next.js) | 16.1.4 | PASS | 21 routes, static + dynamic pages |
| React | 19.2.3 | OK | Used by frontend |
| Prisma Client | 5.20.0 | Generated | Schema validated |

### Frontend Routes (21 total)

| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | Home/Feed |
| `/lp` | Static | Landing Page (affiliate) |
| `/explore` | Static | Explore |
| `/search` | Static | Search |
| `/partners` | Static | Affiliate partners |
| `/bookmarks` | Static | Bookmarks |
| `/notifications` | Static | Notifications |
| `/settings` | Static | User settings |
| `/forgot-password` | Static | Password reset request |
| `/reset-password` | Static | Password reset form |
| `/verify-email` | Static | Email verification |
| `/privacy` | Static | Privacy policy |
| `/terms` | Static | Terms of service |
| `/hashtag/[tag]` | Dynamic | Hashtag feed |
| `/post/[id]` | Dynamic | Post detail |
| `/profile/[username]` | Dynamic | User profile |
| `/opengraph-image` | Dynamic | OGP root image |
| `/post/[id]/opengraph-image` | Dynamic | OGP per-post |
| `/profile/[username]/opengraph-image` | Dynamic | OGP per-profile |
| `/sitemap.xml` | Revalidate 1h | SEO sitemap |
| `/robots.txt` | Static | SEO robots |

---

## 2. Security Fixes Committed (All in `main`)

All security fixes from the 2026-03-02 audit are committed:

| Fix | Commit | Status |
|-----|--------|--------|
| bcrypt rounds 10 -> 12 | 5e9d74a | Merged |
| JWT query param extraction removed | 5e9d74a | Merged |
| OAuth: base64 URL -> server-side session | 5e9d74a | Merged |
| Console.warn token values removed | 5e9d74a | Merged |
| Docker PostgreSQL port closed | 5e9d74a | Merged |
| Helmet CSP/HSTS/frameguard/noSniff | 5e9d74a | Merged |
| nginx-prod.conf security headers | 0d0cd1c | Merged |
| Stripe webhook 400 on signature fail | 5e9d74a | Merged |
| verify-email @Throttle added | 5e9d74a | Merged |

---

## 3. Vercel Deployment Configuration

### Existing Config (`frontend/vercel.json`)

Security headers already configured:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Vercel Project Settings (Manual Setup Required)

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `frontend` |
| Build Command | `npm run build` (auto-detected) |
| Output Directory | `.next` (auto-detected) |
| Install Command | `npm install` (auto-detected) |
| Node.js Version | 18.x or 20.x |

### Required Environment Variables (Vercel Dashboard)

| Variable | Value | Type |
|----------|-------|------|
| `NEXT_PUBLIC_API_URL` | `https://{backend-domain}/api` | Plain |
| `NEXT_PUBLIC_SITE_URL` | `https://{vercel-domain}` | Plain |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Plain |

### Phase 1 Deploy (Frontend Only, No Backend API)

For immediate deployment without a backend:
1. Set `NEXT_PUBLIC_API_URL` to empty or placeholder
2. Frontend will render static pages (LP, terms, privacy, etc.)
3. Auth/feed features will show loading/error states (expected)

### Phase 2 Deploy (Full Stack)

Once backend is deployed (VPS/Cloud):
1. Update `NEXT_PUBLIC_API_URL` to actual backend URL
2. Redeploy frontend on Vercel
3. Ensure backend CORS_ORIGINS includes the Vercel domain

---

## 4. Deployment Steps for CEO/Ops

### Vercel (Frontend)

```bash
# 1. Install Vercel CLI (if not installed)
npm i -g vercel

# 2. From project root, link and deploy
cd frontend
vercel --prod

# Or connect GitHub repo via Vercel Dashboard:
# https://vercel.com/new -> Import Git Repository -> Select poker_sns
# Set Root Directory to "frontend"
```

### Backend (VPS - Pending CEO Decision on Provider)

```bash
# After VPS provisioned:
docker compose -f docker-compose.prod.yml up -d
```

---

## 5. MEDIUM/LOW Warnings (No Code Changes Made)

| Severity | Item | Detail |
|----------|------|--------|
| MEDIUM | `npx` required locally | Global Prisma v7 conflicts with project v5; use `npx` or `node_modules/.bin/` |
| MEDIUM | 18 npm vulnerabilities (backend) | Non-critical; audit fix available |
| LOW | 3 npm vulnerabilities (frontend) | Non-critical |

---

## 6. Checklist Summary

- [x] `docs/ops-deliverable-round1-github.md` reviewed and confirmed committed
- [x] Backend build: PASS (Prisma generate + NestJS compile)
- [x] Frontend build: PASS (21 routes, static generation OK)
- [x] `vercel.json` security headers: Configured
- [x] Vercel deployment guide: Documented
- [x] Environment variable list for Vercel: Documented
- [x] Two-phase deployment strategy: Documented (Phase 1: static, Phase 2: full-stack)
