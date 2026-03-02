# DevSecOps Release Security Audit Report

**Date:** 2026-03-02
**Auditor:** DevSecOps (Vault + 獅白 + 角巻)
**Scope:** Pre-release security audit for poker_sns production deployment

---

## 1. Secret Management Audit

**Status: PASS**

| Check | Result | Details |
|-------|--------|---------|
| No hardcoded secrets in source | PASS | All secrets use `process.env.*` with safe dev defaults |
| .env files excluded from git | PASS | Root, backend, frontend `.gitignore` all exclude `.env*` |
| docker-compose.prod.yml secret enforcement | PASS | Uses `${VAR:?error}` syntax — fails on missing secrets |
| CI/CD secrets via GitHub Secrets | PASS | DEPLOY_SSH_KEY, STRIPE keys, DISCORD_WEBHOOK all via `${{ secrets.* }}` |
| Test files use mock values only | PASS | `sk_test_fake`, `whsec_test_fake` — no real keys |
| .env.example templates complete | PASS | Root (70 lines), backend (23 lines), frontend (6 lines) |

**Required Production Secrets (docker-compose.prod.yml enforced):**
- `DB_PASSWORD` — PostgreSQL password
- `JWT_SECRET` — JWT signing key (min 32 chars recommended)
- `STRIPE_SECRET_KEY` — Stripe live secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `TOKEN_ENCRYPTION_KEY` — Token encryption key

---

## 2. Docker Build Security & Reproducibility

**Status: PASS (8.5/10)**

### Dockerfiles (Backend + Frontend)

| Check | Backend | Frontend |
|-------|---------|----------|
| Multi-stage build | Yes (builder→runner) | Yes (builder→runner) |
| Non-root user | `nestjs` (UID 1001) | `nextjs` (UID 1001) |
| `npm ci` (lockfile-based) | Yes | Yes |
| Prisma generate | Yes (explicit step) | N/A |
| .dockerignore | node_modules, dist, .env | node_modules, .next, .env |
| Node version | `node:20-alpine` | `node:20-alpine` |

### docker-compose.prod.yml

| Check | Result | Details |
|-------|--------|---------|
| Resource limits | PASS | DB: 1GB/2CPU, Backend/Frontend: 512MB/1CPU, Nginx: 256MB/0.5CPU |
| Port isolation | PASS | Backend/Frontend ports set to `[]` — only Nginx exposed (80, 443) |
| Restart policy | PASS | `unless-stopped` on all services |
| Health checks | PASS | DB + Backend have health checks |
| Volume mounts | PASS | nginx-prod.conf mounted `:ro` |
| Named volumes | PASS | Certbot certs in named volumes |

### WARNING: Staging Config

docker-compose.staging.yml uses `:latest` tags as defaults. Not a production blocker but should be changed to semver tags before staging is used as pre-prod environment.

---

## 3. nginx-prod.conf Security Headers

**Status: PASS (after fixes applied)**

### Security Headers

| Header | Value | Status |
|--------|-------|--------|
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | PRESENT |
| X-Content-Type-Options | `nosniff` | PRESENT |
| X-Frame-Options | `DENY` | PRESENT |
| Referrer-Policy | `strict-origin-when-cross-origin` | PRESENT |
| Content-Security-Policy | See below | ADDED (this audit) |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(self)` | ADDED (this audit) |

### CSP Policy Details

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' https://api.stripe.com;
frame-src https://js.stripe.com;
object-src 'none';
base-uri 'self';
form-action 'self'
```

**CSP Notes:**
- `unsafe-inline` / `unsafe-eval` required for Next.js runtime
- Stripe JS and API domains whitelisted for payment flow
- `img-src https:` allows external images (user avatars, OGP)
- `object-src 'none'` blocks Flash/Java plugin attacks

### TLS Configuration

| Setting | Value | Assessment |
|---------|-------|------------|
| Protocols | TLSv1.2, TLSv1.3 | Strong (no legacy SSL/TLS 1.0/1.1) |
| Ciphers | ECDHE-based only | Strong forward secrecy |
| Session cache | 10m shared | Standard |
| Session tickets | Off | Secure (prevents ticket key compromise) |
| Server tokens | Off | Hides Nginx version |

### Rate Limiting

| Zone | Rate | Burst | Target |
|------|------|-------|--------|
| api_general | 30r/s | 20 | General API |
| api_auth | 5r/s | 10 | Auth endpoints (brute-force protection) |
| og_crawl | 10r/s | 30 | OG meta endpoints |
| lp_page | 20r/s | 40 | Landing page |

---

## 4. Changes Applied in This Audit

### CRITICAL Fix: Added Content-Security-Policy header
**File:** `nginx-prod.conf` line 65
**Risk:** Without CSP, XSS attacks have no browser-level mitigation.

### HIGH Fix: Added Permissions-Policy header
**File:** `nginx-prod.conf` line 66
**Risk:** Without Permissions-Policy, malicious scripts could access camera/microphone/geolocation.

---

## 5. Post-Deploy Verification Commands

After deployment, run these curl commands to verify security headers:

```bash
# HSTS header
curl -sI https://DOMAIN | grep -i strict-transport

# CSP header
curl -sI https://DOMAIN | grep -i content-security-policy

# X-Frame-Options
curl -sI https://DOMAIN | grep -i x-frame-options

# X-Content-Type-Options
curl -sI https://DOMAIN | grep -i x-content-type-options

# Permissions-Policy
curl -sI https://DOMAIN | grep -i permissions-policy

# Referrer-Policy
curl -sI https://DOMAIN | grep -i referrer-policy

# HTTP→HTTPS redirect
curl -sI http://DOMAIN | grep -i location

# Stripe webhook signature rejection (should return 400)
curl -X POST https://DOMAIN/api/subscriptions/webhook \
  -H "stripe-signature: invalid" \
  -d '{}' -w "%{http_code}" -o /dev/null -s

# TLS version check (should show TLS 1.2 or 1.3)
openssl s_client -connect DOMAIN:443 -tls1_2 </dev/null 2>&1 | grep "Protocol"
```

---

## 6. Release Readiness Summary

| Category | Status | Blocker? |
|----------|--------|----------|
| Secret management | PASS | No |
| Docker build reproducibility | PASS | No |
| Non-root containers | PASS | No |
| TLS/HTTPS configuration | PASS (pending domain) | No |
| Security headers (HSTS, CSP, etc.) | PASS (fixed) | No |
| Rate limiting | PASS | No |
| Port isolation | PASS | No |
| Resource limits | PASS | No |
| Health checks | PASS | No |

**Verdict: READY FOR PRODUCTION DEPLOYMENT** (pending CEO decisions on VPS, domain, Stripe keys)

---

## 7. Recommendations (Non-blocking)

| Priority | Item | Details |
|----------|------|---------|
| MEDIUM | Pin Node image to semver | `node:20.x.x-alpine` instead of `node:20-alpine` |
| MEDIUM | Staging image tags | Change `:latest` to semver in docker-compose.staging.yml |
| LOW | Expand .dockerignore | Add `.git`, `*.md`, test configs |
| LOW | Add `git-secrets` pre-commit hook | Prevent accidental secret commits |
