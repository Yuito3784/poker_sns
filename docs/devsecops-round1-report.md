# DevSecOps Round 1 Report — poker_sns
**Date:** 2026-03-02
**Author:** 角巻 (DevSecOps)
**Status:** Completed

---

## 1. CI/CD Pipeline Assessment

### 1.1 Pipeline Status: EXISTS and FUNCTIONAL

File: `.github/workflows/ci-cd.yml`

| Stage | Trigger | Description | Status |
|---|---|---|---|
| `backend-test` | push/PR to main | npm ci, prisma generate, jest (--forceExit), build | OK |
| `frontend-build` | push/PR to main | npm ci, next build (placeholder URLs) | OK |
| `docker-build` | push to main only | GHCR login, buildx, push backend+frontend images (sha+latest tags) | OK |
| `deploy` | push to main only | SSH to prod, docker compose pull+up, health check (5 retries x 10s) | OK |
| Discord notify | post-deploy | Success/failure webhook notifications | OK |

### 1.2 Pipeline Architecture

```
PR/Push → [backend-test] ──┐
                            ├─→ [docker-build] → [deploy] → [health-check] → [discord-notify]
PR/Push → [frontend-build] ┘
                            (main push only)
```

- Registry: `ghcr.io` (GitHub Container Registry)
- Image tagging: `latest` + `${{ github.sha }}` (enables rollback)
- Build cache: GitHub Actions cache (`type=gha`, scoped per service)
- Deploy method: SSH + docker compose pull/up on `/opt/poker_sns`
- Environment protection: `environment: production` on deploy job

### 1.3 Findings

| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| CI-01 | MEDIUM | Frontend build uses placeholder `https://example.com/api` for PR builds | Warning only — OK for CI validation, prod build uses secrets |
| CI-02 | LOW | Health check uses `sleep 15` before first attempt | Warning only — acceptable startup wait |
| CI-03 | MEDIUM | No staging deploy stage in pipeline | Warning — staging env exists (docker-compose.staging.yml) but not automated in CI |
| CI-04 | LOW | No dependency vulnerability scanning (npm audit / Snyk / Trivy) | Warning — recommend adding `npm audit --audit-level=high` step |
| CI-05 | LOW | No Docker image vulnerability scanning | Warning — recommend adding Trivy scan before push |

---

## 2. Infrastructure Security Assessment

### 2.1 Docker Configuration

**Backend Dockerfile** — GOOD
- Multi-stage build (builder/runner separation)
- Non-root user (`nestjs:1001`)
- `NODE_ENV=production` set
- `.dockerignore` excludes node_modules, dist, uploads, .env

**Frontend Dockerfile** — GOOD
- Multi-stage build (builder/runner)
- Non-root user (`nextjs:1001`)
- Standalone Next.js output
- `.dockerignore` excludes node_modules, .next, .env

**docker-compose.prod.yml** — GOOD
- Backend/frontend ports `[]` (no direct exposure, nginx only)
- Resource limits set (db: 1G/2CPU, backend: 512M/1CPU, frontend: 512M/1CPU, nginx: 256M/0.5CPU)
- Required env vars use `${VAR:?error}` syntax (fail-fast on missing secrets)
- DB password, JWT_SECRET, Stripe keys, TOKEN_ENCRYPTION_KEY all enforced

**docker-compose.yml (dev)** — ACCEPTABLE
- PostgreSQL port NOT exposed externally (security fix confirmed)
- Backend port 3001 exposed (dev only, overridden in prod)
- DB healthcheck configured

### 2.2 Nginx Configuration

**nginx-prod.conf** — GOOD
- `server_tokens off` (version hidden)
- TLS 1.2/1.3 only, strong cipher suite
- HSTS (2 years, includeSubDomains, preload)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- HTTP to HTTPS redirect
- Rate limiting zones: auth (5r/s), API (30r/s), OG crawl (10r/s), LP (20r/s)
- Let's Encrypt ACME support with certbot
- OG image caching (24h, 500MB max)
- SSE stream properly configured (no buffering)

**nginx.conf (dev)** — ACCEPTABLE
- HTTP-only (expected for dev)
- Basic rate limiting

### 2.3 Application Security (Backend)

| Control | Status | Detail |
|---|---|---|
| Helmet (CSP, HSTS, frameguard, noSniff, xssFilter) | Applied | `main.ts` |
| CORS | Applied | Configurable via `CORS_ORIGINS` env |
| Input validation | Applied | `ValidationPipe` (whitelist, forbidNonWhitelisted) |
| Input sanitization | Applied | Custom `SanitizeInputPipe` |
| Rate limiting (global) | Applied | `ThrottlerModule` 60 req/60s |
| Rate limiting (auth endpoints) | Applied | `@Throttle` decorators |
| bcrypt rounds | 12 | Security fix confirmed |
| JWT extraction | Header only | Query param extraction removed |
| OAuth session | Server-side | In-memory Map, 5min TTL |
| Stripe webhook | Signature verified | Raw body + 400 on failure |
| Health endpoint | `/health` | DB connectivity check, throttle skipped |

---

## 3. Secrets Inventory

### 3.1 Required Production Secrets (GitHub Actions)

| Secret Name | Purpose | Where Used |
|---|---|---|
| `DEPLOY_HOST` | Production server hostname | CI deploy step (SSH) |
| `DEPLOY_USER` | SSH username | CI deploy step |
| `DEPLOY_SSH_KEY` | SSH private key | CI deploy step |
| `NEXT_PUBLIC_API_URL` | API URL for frontend build | CI docker-build (build-arg) |
| `NEXT_PUBLIC_SITE_URL` | Site URL for frontend build | CI docker-build (build-arg) |
| `DISCORD_WEBHOOK_URL` | Deploy notification channel | CI notify steps |
| `GITHUB_TOKEN` | GHCR authentication | Auto-provided by GitHub Actions |

### 3.2 Required Production Environment Variables (Server `.env`)

| Variable | Category | Required | Validation |
|---|---|---|---|
| `DB_PASSWORD` | Database | YES (`?` enforced) | docker-compose.prod.yml |
| `JWT_SECRET` | Auth | YES (`?` enforced) | 64-byte random hex recommended |
| `STRIPE_SECRET_KEY` | Payment | YES (`?` enforced) | `sk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Payment | YES (`?` enforced) | `whsec_xxx` |
| `STRIPE_PRICE_ID` | Payment | Recommended | `price_xxx` |
| `TOKEN_ENCRYPTION_KEY` | SNS Auto-Post | YES (`?` enforced) | 32-byte random hex |
| `API_URL` | Routing | YES | Full domain URL |
| `FRONTEND_URL` | Routing | YES | Full domain URL |
| `CORS_ORIGINS` | Security | YES | Comma-separated allowed origins |
| `SMTP_HOST` | Email | YES (for email verify) | e.g. `smtp.resend.com` |
| `SMTP_PORT` | Email | YES | 465 (TLS) or 587 (STARTTLS) |
| `SMTP_SECURE` | Email | YES | `true` for port 465 |
| `SMTP_USER` | Email | YES | |
| `SMTP_PASS` | Email | YES | |
| `SMTP_FROM` | Email | YES | `noreply@domain.com` |
| `GOOGLE_CLIENT_ID` | OAuth | Optional | For Google login |
| `GOOGLE_CLIENT_SECRET` | OAuth | Optional | For Google login |
| `LINE_CLIENT_ID` | OAuth | Optional | For LINE login |
| `LINE_CLIENT_SECRET` | OAuth | Optional | For LINE login |
| `X_CLIENT_ID` | OAuth | Optional | For X/Twitter login |
| `X_CLIENT_SECRET` | OAuth | Optional | For X/Twitter login |
| `X_AUTOPOST_CLIENT_ID` | Auto-Post | Optional | Separate app from login |
| `X_AUTOPOST_CLIENT_SECRET` | Auto-Post | Optional | |
| `YOUTUBE_CLIENT_ID` | Auto-Post | Optional | |
| `YOUTUBE_CLIENT_SECRET` | Auto-Post | Optional | |
| `INSTAGRAM_ACCESS_TOKEN` | Auto-Post | Optional | |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Auto-Post | Optional | |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Analytics | Optional | `G-XXXXXXXXXX` |

### 3.3 Secrets Protection

| Check | Status |
|---|---|
| `.env` in `.gitignore` | YES |
| `.env` in `.dockerignore` (backend) | YES |
| `.env` in `.dockerignore` (frontend) | YES |
| `.env.example` has no real values | YES (placeholder only) |
| `docker-compose.prod.yml` uses `${VAR:?}` for critical vars | YES |
| No hardcoded secrets in source code | YES |
| JWT default `change-me-in-production` overridden in prod | YES (enforced by `?`) |

---

## 4. Test Coverage (Security-Related)

| Test File | Coverage Area |
|---|---|
| `auth.service.spec.ts` | Auth service unit tests |
| `auth.security.spec.ts` | Security-specific auth tests |
| `posts.service.spec.ts` | Posts service unit tests |
| `subscriptions.service.spec.ts` | Subscription logic tests |
| `subscriptions.webhook.spec.ts` | Stripe webhook handling tests |

---

## 5. Recommendations (WARNING level, no code changes)

### HIGH Priority (for next sprint)
1. **Add staging deploy to CI/CD** — `docker-compose.staging.yml` exists but has no automated pipeline trigger
2. **Add `npm audit` to CI** — No dependency vulnerability scanning in pipeline
3. **Add Docker image scanning** — Consider Trivy or Snyk container scan before GHCR push

### MEDIUM Priority
4. **nginx-prod.conf domain placeholder** — `DOMAIN_PLACEHOLDER` needs manual replacement per deployment; consider envsubst template
5. **Certbot renewal monitoring** — No alerting if SSL renewal fails
6. **Add rollback procedure documentation** — SHA-tagged images enable rollback but no documented procedure

### LOW Priority
7. **Consider GitHub Dependabot** — Automated dependency update PRs
8. **Log aggregation** — No centralized logging solution identified
9. **Uptime monitoring** — Health check exists but no external monitoring (e.g. UptimeRobot)

---

## 6. Summary

The poker_sns project has a **solid DevSecOps foundation**:

- CI/CD pipeline is fully defined with test, build, push, deploy, and notification stages
- Docker images use multi-stage builds with non-root users
- Production compose enforces required secrets with fail-fast validation
- Nginx is properly hardened with TLS, security headers, and rate limiting
- Application-level security (Helmet, CORS, throttling, input validation) is in place
- All 6 security fixes from 2026-03-02 are verified as applied
- Secrets are properly protected from source control and Docker builds

**No CRITICAL or HIGH severity issues found in current configuration.**
All recommendations are WARNING level for future improvement.
