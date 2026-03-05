# Feature Branch Security Checklist — Revenue Features
**Date**: 2026-03-05
**Author**: DevSecOps (角巻)
**Scope**: 5 feature branches for revenue expansion (tipping, paid-content, salon, tournament, coaching)

---

## Merge Order (Ops-agreed): tipping → paid-content → salon → tournament → coaching

---

## Common Security Requirements (ALL branches)

### CI Gate (Automated — `.github/workflows/security-gate.yml`)
- [ ] `npm audit --audit-level=high` passes (backend + frontend)
- [ ] Prisma schema diff reviewed (auto-generated in PR)
- [ ] No hardcoded secrets in diff (automated scan)
- [ ] No `.env` files tracked by git

### Authentication & Authorization
- [ ] All state-changing endpoints protected by `@UseGuards(JwtAuthGuard)`
- [ ] Free / Premium / Admin role boundaries enforced
- [ ] Unauthenticated users receive 401, unauthorized users receive 403

### Input Validation
- [ ] All DTOs use `class-validator` decorators with `whitelist: true`
- [ ] `ValidationPipe({ forbidNonWhitelisted: true })` applied globally (already set in main.ts)
- [ ] Numeric inputs (amounts, IDs) validated for type and range

### Rate Limiting
- [ ] `@Throttle()` applied to payment-related endpoints
- [ ] Abuse-prone endpoints (create, purchase) have stricter limits

---

## Per-Branch Security Requirements

### 1. feature/tipping (Stripe Connect — HIGH RISK)

#### Webhook Security
- [ ] `stripe.webhooks.constructEvent()` used with raw body for ALL webhook endpoints
- [ ] Webhook secret stored in env var (`STRIPE_TIPPING_WEBHOOK_SECRET`)
- [ ] Idempotency check: `stripeEventId` uniqueness enforced before processing
- [ ] Webhook endpoint returns 400 on signature mismatch (not 500)
- [ ] Webhook events: `transfer.created`, `transfer.failed`, `payment_intent.succeeded` handled

#### Amount Tampering Prevention
- [ ] Tip amounts validated server-side against allowed presets (100/500/1000 JPY) or capped range
- [ ] Client-submitted amounts NEVER trusted — server resolves final amount
- [ ] Minimum tip amount enforced server-side (prevent 1-yen spam)
- [ ] Maximum tip amount enforced server-side (prevent accidental large transfers)

#### Stripe Connect Security
- [ ] Connected account onboarding via Stripe-hosted flow (not custom)
- [ ] Platform fee percentage set server-side only
- [ ] `transfer_data.destination` validated against verified connected accounts
- [ ] Payouts to unverified accounts blocked

#### CSRF / State Protection
- [ ] Tip creation requires valid JWT (Bearer token)
- [ ] No tip operations via GET requests
- [ ] Double-tip prevention: client-side debounce + server-side idempotency key

---

### 2. feature/paid-content (Single Payment — HIGH RISK)

#### Webhook Security
- [ ] `stripe.webhooks.constructEvent()` used for payment confirmation
- [ ] Webhook handles: `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`
- [ ] Idempotency: prevent duplicate content unlock on webhook retry

#### Price Tampering Prevention
- [ ] Content price stored in DB (`paidContent.price` column), NOT from client request
- [ ] Stripe Checkout Session created with server-side price lookup
- [ ] `metadata.contentId` attached to Checkout Session for verification
- [ ] On webhook: verify `amount_total` matches DB price before unlocking

#### Content Access Control
- [ ] Purchased content tracked in `ContentPurchase` table (userId + contentId)
- [ ] Content API returns full body only if `purchase` record exists or user is author
- [ ] Preview endpoint returns truncated content (no paywall bypass via API)
- [ ] Author cannot purchase own content (server-side check)

#### Refund Handling
- [ ] `charge.refunded` webhook revokes content access
- [ ] Partial refunds handled gracefully

---

### 3. feature/salon (Subscription Groups — MEDIUM RISK)

#### Subscription Security
- [ ] Salon subscription uses Stripe Subscription (not one-time payment)
- [ ] Subscription status checked server-side on every protected request
- [ ] Cancelled subscriptions: access revoked at period end (not immediately)
- [ ] Webhook handles: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

#### Authorization Boundaries
- [ ] Salon owner can manage members, non-owners cannot
- [ ] Private salon content not accessible via direct URL without membership
- [ ] Salon invitations: rate-limited, expirable tokens

---

### 4. feature/tournament (Event Fees — MEDIUM RISK)

#### Payment Security
- [ ] Entry fee set by tournament creator but validated against allowed range server-side
- [ ] Refund policy enforced: cancellation before deadline = full refund
- [ ] Double-entry prevention: unique constraint on (userId, tournamentId)
- [ ] Tournament capacity enforced server-side (race condition safe with DB transaction)

#### Event Integrity
- [ ] Tournament results submitted by authorized organizer only
- [ ] Score/ranking data validated server-side
- [ ] Prize distribution requires organizer confirmation + admin approval for large amounts

---

### 5. feature/coaching (Booking & Payment — MEDIUM RISK)

#### Payment Security
- [ ] Lesson price set by coach in profile, resolved server-side at booking
- [ ] Stripe PaymentIntent created server-side with coach's price
- [ ] Cancellation/refund policy enforced server-side (24h before = full refund)

#### Coach Verification
- [ ] Coach registration requires profile completion + verification step
- [ ] Students cannot book unverified coaches
- [ ] Coach availability validated server-side (prevent double-booking)

#### Privacy
- [ ] Booking details visible only to coach and student
- [ ] Coach earnings visible only to coach and platform admin

---

## Post-Merge Verification

After each branch merges to `dev`:
1. Run full `npm audit` on merged state
2. Run `npx prisma validate` to confirm schema consistency
3. Verify no regression in existing security headers (Helmet, CORS, HSTS)
4. Run existing `security-headers.e2e-spec.ts` test suite
5. Confirm webhook endpoints respond 400 to invalid signatures

---

## Escalation

- **CRITICAL/HIGH findings**: Block merge, fix immediately
- **MEDIUM/LOW findings**: Document in PR comment, allow merge with tracking issue
