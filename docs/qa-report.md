# QA/QC Report - poker_sns Project
**Date**: 2026-03-02
**Author**: QA/QC (Lint)

---

## 1. Test Coverage Status (Current State)

### Existing Test Files
| File | Type | Lines | Coverage Scope |
|------|------|-------|----------------|
| `backend/src/auth/auth.service.spec.ts` | Unit | 144 | register, login (5 cases) |
| `backend/src/posts/posts.service.spec.ts` | Unit | 270 | create, delete, like, repost, bookmark, pin (14 cases) |
| `backend/test/app.e2e-spec.ts` | E2E | 28 | 404 for unknown route only (1 case) |

**Total: 20 test cases across 3 files**

### Critical Gaps

| Module | Unit Tests | E2E Tests | Risk |
|--------|-----------|-----------|------|
| Auth (register/login) | Partial | None | HIGH - tests outdated (assert bcrypt rounds=10, actual=12) |
| Auth (OAuth/refresh/email) | None | None | CRITICAL |
| Subscriptions (Stripe) | None | None | CRITICAL - payment flow |
| Posts (feed/timeline) | Partial | None | MEDIUM |
| Replies | None | None | MEDIUM |
| Users (profile/follow) | None | None | MEDIUM |
| Notifications | None | None | LOW |
| Search | None | None | LOW |
| Ads | None | None | LOW |
| Affiliates | None | None | LOW |
| **Frontend (entire)** | **None** | **None** | **HIGH - zero test infrastructure** |

### CI/CD Status
- **No CI/CD pipeline exists** (.github/workflows, .gitlab-ci.yml, etc.)
- Backend has Jest configured and test scripts (`npm test`, `npm run test:e2e`)
- Frontend has no test scripts or testing libraries installed

---

## 2. Existing Test Defects (CRITICAL)

### BUG: auth.service.spec.ts - bcrypt rounds mismatch
**File**: `backend/src/auth/auth.service.spec.ts:57`
**Severity**: CRITICAL (test will FAIL)

```typescript
// Test asserts:
expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
// Actual code (auth.service.ts:50):
const passwordHash = await bcrypt.hash(dto.password, 12);
```

The security fix changed bcrypt rounds from 10 to 12, but the test was not updated. This test assertion is **wrong** and will fail if bcrypt is not mocked or if the mock assertion is actually exercised against real behavior.

### BUG: auth.service.spec.ts - outdated response shape
The test expects `{ accessToken, user }` but current `buildAuthResponse` returns `{ accessToken, refreshToken, user }` with `subscriptionStatus` in user. The mock setup is incomplete for current service signature (missing email service injection, refresh token logic, etc.).

---

## 3. Security Regression Test Items (6 Fixes)

### 3.1 bcrypt Rounds: 10 → 12

| # | Test Case | Expected Result | Method |
|---|-----------|----------------|--------|
| 3.1.1 | New user registration hashes with 12 rounds | Hash output validates with bcrypt rounds=12 | Unit: mock bcrypt.hash, assert called with 12 |
| 3.1.2 | Password reset hashes with 12 rounds | `auth.service.ts:204` uses 12 | Unit: same pattern |
| 3.1.3 | Change password hashes with 12 rounds | `auth.service.ts:276` uses 12 | Unit: same pattern |
| 3.1.4 | Old passwords (rounds=10) still validate on login | bcrypt.compare succeeds regardless of original rounds | Manual: login with pre-existing account |

### 3.2 JWT Query Parameter Extraction Removed

| # | Test Case | Expected Result | Method |
|---|-----------|----------------|--------|
| 3.2.1 | JWT extracted only from Authorization Bearer header | Protected endpoint returns 200 with Bearer token | E2E: supertest with Authorization header |
| 3.2.2 | JWT in query param `?token=xxx` is rejected | Protected endpoint returns 401 | E2E: supertest with query param |
| 3.2.3 | `jwt.strategy.ts` uses only `fromAuthHeaderAsBearerToken()` | Code review: no `fromUrlQueryParameter` | Code audit (VERIFIED: line 13) |

### 3.3 OAuth Session: base64 URL → Server-Side Session

| # | Test Case | Expected Result | Method |
|---|-----------|----------------|--------|
| 3.3.1 | `storeOAuthSession` returns 32-char hex ID | ID format matches `/^[a-f0-9]{32}$/` | Unit |
| 3.3.2 | `consumeOAuthSession` returns data and deletes session | Second call throws BadRequestException | Unit |
| 3.3.3 | Expired session (>5min) is rejected | BadRequestException thrown | Unit: mock Date |
| 3.3.4 | `GET /auth/oauth-session?id=xxx` returns session data once | First call 200, second call 400 | E2E |
| 3.3.5 | Missing `id` param returns 400 | BadRequestException | E2E |
| 3.3.6 | No tokens or user data appear in redirect URLs | OAuth callback redirects contain only `?oauthSession=<id>` | Manual: inspect redirect |
| 3.3.7 | Rate limited: 10 requests/minute on oauth-session | 11th request returns 429 | E2E |

### 3.4 Helmet Security Headers (CSP, HSTS, frameguard, noSniff)

| # | Test Case | Expected Result | Method |
|---|-----------|----------------|--------|
| 3.4.1 | `Content-Security-Policy` header present | Contains `default-src 'self'` | E2E: check response headers |
| 3.4.2 | `Strict-Transport-Security` header present | `max-age=63072000; includeSubDomains; preload` | E2E |
| 3.4.3 | `X-Frame-Options: DENY` header present | Exact match | E2E |
| 3.4.4 | `X-Content-Type-Options: nosniff` header present | Exact match | E2E |
| 3.4.5 | `X-XSS-Protection` header present | Present (helmet xssFilter) | E2E |

### 3.5 nginx-prod.conf Security Headers

| # | Test Case | Expected Result | Method |
|---|-----------|----------------|--------|
| 3.5.1 | HSTS header in nginx response | `max-age=63072000; includeSubDomains; preload` | Manual: curl -I against prod |
| 3.5.2 | `X-Content-Type-Options: nosniff` in nginx | Present in response | Manual |
| 3.5.3 | `X-Frame-Options: DENY` in nginx | Present in response | Manual |
| 3.5.4 | `Referrer-Policy: strict-origin-when-cross-origin` | Present in response | Manual |
| 3.5.5 | HTTP → HTTPS redirect (port 80 → 443) | 301 redirect | Manual: curl http://domain |

### 3.6 Stripe Webhook Signature Validation

| # | Test Case | Expected Result | Method |
|---|-----------|----------------|--------|
| 3.6.1 | Valid signature: webhook processes event | Returns `{ received: true }` | Unit: mock constructEvent |
| 3.6.2 | Invalid signature: returns 400 | BadRequestException('Invalid webhook signature') | Unit: constructEvent throws |
| 3.6.3 | Missing STRIPE_WEBHOOK_SECRET env | BadRequestException('Webhook secret not configured') | Unit: unset env |
| 3.6.4 | Duplicate event (idempotency) | Returns `{ received: true }` without processing | Unit: mock existing event |

### 3.7 Throttle on verify-email & Other Auth Endpoints

| # | Test Case | Expected Result | Method |
|---|-----------|----------------|--------|
| 3.7.1 | `POST /auth/register` limited to 5/min | 6th request returns 429 | E2E |
| 3.7.2 | `POST /auth/login` limited to 10/min | 11th request returns 429 | E2E |
| 3.7.3 | `POST /auth/verify-email` limited to 5/min | 6th request returns 429 | E2E |
| 3.7.4 | `POST /auth/forgot-password` limited to 3/min | 4th request returns 429 | E2E |
| 3.7.5 | `POST /auth/resend-verification` limited to 3/min | 4th request returns 429 | E2E |

---

## 4. Priority Action Items

### P0 - Immediate (Blocks confidence in existing code)
1. **Fix auth.service.spec.ts** - Update bcrypt rounds assertion from 10 to 12; update response shape to include refreshToken and subscriptionStatus. Tests are currently **broken**.
2. **Add OAuth session unit tests** - consumeOAuthSession is security-critical and has zero test coverage.
3. **Add Stripe webhook unit tests** - Payment flow has zero test coverage.

### P1 - High (Before production deployment)
4. **Add auth controller E2E tests** - Register, login, refresh, OAuth session, verify-email flows.
5. **Add Helmet/security header E2E tests** - Verify all security headers are present.
6. **Add throttle E2E tests** - Verify rate limiting on auth endpoints.
7. **Set up CI/CD pipeline** - GitHub Actions with `npm test` on PR.

### P2 - Medium (Production hardening)
8. **Frontend test infrastructure** - Install testing-library, add critical path tests.
9. **Subscription flow E2E tests** - Checkout, webhook, cancellation.
10. **Posts/Replies E2E tests** - CRUD, permissions, mentions.

### P3 - Low (Quality improvement)
11. **Coverage reporting** - `npm run test:cov` baseline, set minimum threshold.
12. **User profile/follow tests** - Block/mute, avatar upload.
13. **Search/Ads/Affiliates tests** - Lower priority modules.

---

## 5. Manual Test Checklist (Existing Features)

### Auth Flow
- [ ] Register with email/password → verify email → login
- [ ] Login with wrong password → UnauthorizedException
- [ ] Forgot password → reset email → reset with token
- [ ] Google OAuth login → redirect → session consumed
- [ ] LINE OAuth login → redirect → session consumed
- [ ] X (Twitter) OAuth → email completion flow
- [ ] Magic link login
- [ ] Access token expires (15min) → auto-refresh with refresh token
- [ ] Refresh token rotation (old token invalidated)

### Post Operations
- [ ] Create text post
- [ ] Create post with image upload
- [ ] Create post with poker hand
- [ ] Create post with @mention → notification
- [ ] Create post with #hashtag
- [ ] Delete own post
- [ ] Cannot delete others' post (403)
- [ ] Like/unlike toggle
- [ ] Repost/unrepost toggle
- [ ] Bookmark/unbookmark toggle
- [ ] Pin/unpin post

### Social Features
- [ ] Follow/unfollow user
- [ ] Block user → hidden from feed
- [ ] Mute user → hidden from feed
- [ ] User profile page loads
- [ ] Edit profile (name, bio, avatar)

### Premium/Subscription
- [ ] Stripe checkout → redirect → subscription active
- [ ] Premium badge visible on posts
- [ ] Premium users: extended character limit
- [ ] Premium users: no ads in feed
- [ ] Webhook processes invoice.paid
- [ ] Webhook processes customer.subscription.deleted

### Notifications
- [ ] Like notification
- [ ] Mention notification
- [ ] Repost notification
- [ ] Follow notification
- [ ] SSE stream connection works
- [ ] Mark as read

### Feed & Search
- [ ] Infinite scroll pagination
- [ ] Hashtag search
- [ ] User search
- [ ] Ad insertion in feed (non-premium)

### Infrastructure
- [ ] Health endpoint `/health` returns OK
- [ ] Static files served at `/uploads/`
- [ ] HTTP → HTTPS redirect (prod)
- [ ] Docker Compose builds and starts all services

---

## 6. Docker/PostgreSQL Security Note
- PostgreSQL port 5432 external exposure was removed (per MEMORY). Verify `docker-compose.yml` does not expose `5432:5432` in production config.
