# QA/QC Smoke Test Report - Release Round 1

**Date:** 2026-03-02
**QA Lead:** 尾丸 (Senior QA/QC)
**Scope:** Pre-release smoke test for security fixes

---

## Executive Summary

All 3 critical security areas passed code-level smoke test review. **Release is APPROVED from QA perspective.**

| # | Test Area | Result | Severity |
|---|-----------|--------|----------|
| 1 | JWT Authentication Flow | PASS | Critical |
| 2 | Stripe Webhook Signature Verification | PASS | Critical |
| 3 | Helmet/CSP Header Configuration | PASS | Critical |

---

## 1. JWT Authentication Flow (JWT更新・OAuthセッション消費)

### 1.1 Bcrypt Rounds Verification

| Location | File | Line | Rounds | Status |
|----------|------|------|--------|--------|
| register | auth.service.ts | ~50 | 12 | PASS |
| changePassword | auth.service.ts | ~204 | 12 | PASS |
| resetPassword | auth.service.ts | ~276 | 12 | PASS |

### 1.2 JWT Extraction Method

- **Method:** `ExtractJwt.fromAuthHeaderAsBearerToken()` only
- **Query param extraction:** Removed (confirmed absent)
- **Status:** PASS

### 1.3 OAuth Server-Side Session

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Session storage | In-memory Map | In-memory Map | PASS |
| TTL | 5 minutes | 5 min (`Date.now() + 5*60*1000`) | PASS |
| One-time consumption | Delete after read | `oauthSessions.delete(sessionId)` before validation | PASS |
| Expired cleanup | Auto-cleanup | Iterates & deletes on `storeOAuthSession` | PASS |
| URL exposure | SessionID only (no tokens) | `?oauthSession=${sessionId}` | PASS |
| Frontend cleanup | Remove from history | `window.history.replaceState({}, "", "/")` | PASS |
| Throttle | Applied | `@Throttle({ default: { ttl: 60000, limit: 10 } })` | PASS |

### 1.4 Console Token Leakage

- 3 `console.warn` statements found, all generic messages (no tokens)
- **Status:** PASS

### 1.5 Proactive Token Refresh

| Check | Status |
|-------|--------|
| 30-second expiry buffer | PASS |
| Concurrent refresh prevention (`isRefreshing` flag) | PASS |
| 401 fallback retry | PASS |
| Refresh token rotation (new token per refresh) | PASS |
| AuthContext bidirectional sync | PASS |
| Network error resilience (no clear on transient failure) | PASS |

---

## 2. Stripe Webhook Signature Verification (Stripe決済webhook署名検証)

### 2.1 Signature Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Verification method | `constructEvent()` | `this.getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)` | PASS |
| Raw body handling | Buffer | `express.raw({ type: 'application/json' })` at `/subscriptions/webhook` | PASS |
| NestFactory rawBody | `true` | `rawBody: true` in create options | PASS |
| Secret from env | `STRIPE_WEBHOOK_SECRET` | `process.env.STRIPE_WEBHOOK_SECRET` with null check | PASS |

### 2.2 Error Handling

| Scenario | Expected Response | Actual | Status |
|----------|-------------------|--------|--------|
| Invalid signature | 400 | `BadRequestException('Invalid webhook signature')` -> 400 | PASS |
| Missing webhook secret | 400 | `BadRequestException('Webhook secret not configured')` -> 400 | PASS |
| Valid signature | 200 | `{ received: true }` | PASS |

### 2.3 Idempotency

- Duplicate event detection via `subscriptionEvent.findUnique({ where: { stripeEventId } })`
- Duplicate returns `{ received: true }` without reprocessing
- **Status:** PASS

### 2.4 Unit Test Coverage

| Test ID | Description | Status |
|---------|-------------|--------|
| 3.6.1 | Valid signature processes event | Exists |
| 3.6.2 | Invalid signature throws BadRequestException | Exists |
| 3.6.3 | Missing webhook secret throws BadRequestException | Exists |
| 3.6.4 | Duplicate event idempotency | Exists |

---

## 3. Helmet/CSP Header Configuration (Helmet/CSPヘッダー実適用)

### 3.1 Helmet Configuration (backend/src/main.ts)

| Directive | Value | Status |
|-----------|-------|--------|
| defaultSrc | `'self'` | PASS |
| scriptSrc | `'self'` | PASS |
| styleSrc | `'self'`, `'unsafe-inline'` | PASS (required for Tailwind) |
| imgSrc | `'self'`, `data:`, `https:` | PASS |
| connectSrc | `'self'` | PASS |
| fontSrc | `'self'`, `https:` | PASS |
| objectSrc | `'none'` | PASS |
| frameSrc | `'none'` | PASS |
| upgradeInsecureRequests | enabled | PASS |

### 3.2 HSTS Configuration

| Parameter | Helmet | nginx-prod.conf | Match | Status |
|-----------|--------|-----------------|-------|--------|
| max-age | 63072000 (2yr) | 63072000 | Yes | PASS |
| includeSubDomains | true | present | Yes | PASS |
| preload | true | present | Yes | PASS |

### 3.3 Additional Security Headers

| Header | Helmet | nginx-prod.conf | Status |
|--------|--------|-----------------|--------|
| X-Frame-Options | DENY | DENY | PASS |
| X-Content-Type-Options | nosniff | nosniff | PASS |
| Referrer-Policy | (default) | strict-origin-when-cross-origin | PASS |
| X-Powered-By | removed | N/A | PASS |
| server_tokens | N/A | off | PASS |

### 3.4 Docker PostgreSQL Port

- **Port 5432:** NOT exposed externally in docker-compose.yml
- DB accessible only via internal Docker network (`db:5432`)
- **Status:** PASS

### 3.5 TLS/SSL (nginx-prod.conf)

| Parameter | Value | Status |
|-----------|-------|--------|
| Protocols | TLSv1.2, TLSv1.3 | PASS |
| Ciphers | ECDHE-based with forward secrecy | PASS |
| Session tickets | off | PASS |
| HTTP->HTTPS redirect | 301 | PASS |

### 3.6 Input Validation Pipeline

- `SanitizeInputPipe` + `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`
- **Status:** PASS

---

## 4. Observations (INFO - No Action Required)

| # | Observation | Severity | Action |
|---|-------------|----------|--------|
| 1 | CSP `styleSrc` allows `'unsafe-inline'` | LOW | Required for Tailwind CSS; acceptable trade-off |
| 2 | CSP `connectSrc: 'self'` may need Stripe/OAuth domains in production | MEDIUM | Verify after deployment; Stripe.js loads from separate script |
| 3 | OAuth session storage is in-memory (lost on restart) | LOW | Acceptable for short-lived sessions (5min TTL) |
| 4 | Default DB password in docker-compose.yml | LOW | Must be overridden via `.env` in production |

---

## 5. Existing Test Coverage

| Test Suite | File | Tests |
|------------|------|-------|
| Webhook signature | subscriptions.webhook.spec.ts | 4 tests (3.6.1-3.6.4) |
| Security headers | test/security-headers.e2e-spec.ts | CSP, HSTS, X-Frame-Options, noSniff, X-Powered-By |
| nginx headers | test/nginx-headers.e2e-spec.ts | HSTS, noSniff, X-Frame-Options, Referrer-Policy, redirect |

---

## QA Verdict

**RELEASE APPROVED** - All 3 critical smoke test areas pass code-level review. Security fixes from 2026-03-02 are properly implemented and consistent across backend, frontend, and nginx layers.

### Pre-Production Checklist (for DevSecOps)

- [ ] Verify `.env` has production `STRIPE_WEBHOOK_SECRET`
- [ ] Verify `.env` has production `DB_PASSWORD` (not default)
- [ ] Verify `CORS_ORIGINS` matches production domain
- [ ] Run `security-headers.e2e-spec.ts` against live instance post-deploy
- [ ] Confirm CSP `connectSrc` includes any required external domains
