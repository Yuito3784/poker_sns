# DevSecOps Deliverable: Vercel Deployment Guide

## Phase 1: Frontend-Only Vercel Deploy (Immediate)

### Vercel Project Setup

1. **Import Repository**: Connect `poker_sns` Git repo to Vercel
2. **Root Directory**: Set to `frontend/`
3. **Framework Preset**: Auto-detected as Next.js (no override needed)
4. **Build Command**: `npm run build` (default)
5. **Output Directory**: `.next` (default)
6. **Node.js Version**: 20.x

### Environment Variables (Phase 1 - Minimal)

| Variable | Value | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | *(leave empty)* | No — fallback to `localhost:4000`; API calls fail gracefully |
| `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app` | Recommended for OGP/SEO |

> Phase 1 deploys frontend shell only. API-dependent features (login, feed, post) will show empty states. LP (`/lp`), Terms (`/terms`), Privacy (`/privacy`) render fully.

### Security Headers (Already Configured)

`frontend/vercel.json` applies to all routes:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

CSP is intentionally omitted on frontend — adding `connect-src 'self'` would block cross-origin API calls to the backend.

### Build Compatibility Verified

- Server components (`generateMetadata`, `sitemap.ts`, OG images) all use try/catch with fallback returns — build succeeds without backend
- Edge runtime OG image generators (`opengraph-image.tsx`) return branded fallback images when API is unreachable
- No `next/image` remote patterns needed (no external image optimization)
- `turbopack.root` in `next.config.ts` is dev-only; ignored in production builds

---

## Phase 2: Full-Stack Integration (Post-Backend Deploy)

### Backend Hosting Prerequisites

Deploy NestJS + PostgreSQL to Railway, Render, or Fly.io. Required backend env vars:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 64-byte random hex |
| `API_URL` | Backend public URL (e.g., `https://poker-sns-api.railway.app`) |
| `FRONTEND_URL` | Vercel URL |
| `CORS_ORIGINS` | Vercel URL (e.g., `https://poker-sns.vercel.app`) |
| `SMTP_*` | Mail service credentials |
| `STRIPE_*` | Stripe keys (if premium enabled) |

### Vercel Environment Variables (Phase 2 Update)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend public URL (e.g., `https://poker-sns-api.railway.app`) |
| `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app` or custom domain |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 measurement ID (optional) |

### CORS Configuration

Backend `main.ts` line 59 — CORS is env-driven:
```typescript
origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim())
```
Set `CORS_ORIGINS=https://poker-sns.vercel.app` on backend. Multiple origins supported via comma separation.

### Helmet / CSP Notes

Backend Helmet CSP (`main.ts:22-30`) applies only to backend-served responses (API JSON). Since frontend is Vercel-hosted, backend CSP does not affect client-side behavior. No changes needed.

---

## Security Checklist for Vercel Deployment

- [x] Security headers in `vercel.json` (HSTS, X-Frame-Options, nosniff, Referrer-Policy)
- [x] No secrets in client-side code (all `NEXT_PUBLIC_*` vars are non-sensitive)
- [x] JWT tokens stored in localStorage only (no query param extraction — removed in security fix)
- [x] OAuth flow uses server-side session (no base64 URL token passing)
- [x] Server components fail gracefully without API (no error page leaks)
- [x] Edge runtime OG images return branded fallback (no stack traces)
- [ ] Phase 2: Verify CORS_ORIGINS includes Vercel domain
- [ ] Phase 2: Verify backend HTTPS-only (no mixed content)
- [ ] Phase 2: Set custom domain + DNS if needed

---

## Deployment Command (CLI Alternative)

```bash
cd frontend
npx vercel --prod
```

Or connect via Vercel Dashboard Git integration for automatic deployments on push to `main`.
