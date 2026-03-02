# Stripe Payment Flow E2E Test Scenarios (Test Mode)

**Version**: 1.0
**Environment**: Stripe Test Mode (`sk_test_*` / `pk_test_*`)
**Tools**: Stripe CLI (`stripe listen`), Stripe Dashboard (Test Mode)
**Reference**: Poker SNS Subscription Module

---

## Prerequisites

| Item | Value | Note |
|------|-------|------|
| Stripe Secret Key | `sk_test_*` | Set in `.env` |
| Stripe Price ID | `price_*` (test) | Monthly subscription price |
| Stripe Webhook Secret | `whsec_*` | From `stripe listen` or Dashboard |
| Stripe CLI | Installed | For local webhook forwarding |
| Test Card (Success) | `4242 4242 4242 4242` | Any future date, any CVC |
| Test Card (Decline) | `4000 0000 0000 0002` | Generic decline |
| Test Card (3DS) | `4000 0027 6000 3184` | Requires authentication |
| Test Card (Insufficient) | `4000 0000 0000 9995` | Insufficient funds |

### Local Webhook Setup
```bash
# Terminal 1: Forward Stripe webhooks to local backend
stripe listen --forward-to http://localhost:3001/api/subscriptions/webhook
# Copy the webhook signing secret (whsec_...) to .env as STRIPE_WEBHOOK_SECRET
```

---

## Scenario 1: Successful Subscription (Happy Path)

**Priority**: P0
**Precondition**: User registered, email verified, no existing subscription

| Step | Action | Expected Result | Verify |
|------|--------|-----------------|--------|
| 1.1 | POST `/api/subscriptions/checkout` with Bearer token | 200, `{ checkoutUrl: "https://checkout.stripe.com/..." }` | URL is valid Stripe checkout |
| 1.2 | Open checkoutUrl in browser | Stripe Checkout page loads | Price matches subscription plan |
| 1.3 | Enter test card `4242 4242 4242 4242`, any future exp, any CVC | Payment succeeds | Redirected to `/settings?subscription=success` |
| 1.4 | Stripe fires `checkout.session.completed` webhook | Backend processes event | Check stripe CLI output |
| 1.5 | GET `/api/subscriptions/status` | `{ status: "active", periodEnd: "<date>", cancelAtPeriodEnd: false }` | Status is active |
| 1.6 | Check user in DB | `stripeCustomerId`, `stripeSubscriptionId` populated, `subscriptionStatus: "active"` | `SELECT * FROM "User" WHERE id=...` |
| 1.7 | Check `SubscriptionEvent` table | Event logged with `stripeEventId` | Idempotency record exists |
| 1.8 | Verify premium features | User sees premium badge, extended char limit, no ads in feed | UI check |

---

## Scenario 2: Payment Declined

**Priority**: P0
**Precondition**: User registered, email verified, no existing subscription

| Step | Action | Expected Result | Verify |
|------|--------|-----------------|--------|
| 2.1 | POST `/api/subscriptions/checkout` | 200, checkoutUrl returned | |
| 2.2 | Enter declined card `4000 0000 0000 0002` | Payment fails on Stripe Checkout | Error message displayed |
| 2.3 | GET `/api/subscriptions/status` | `{ status: null }` or no subscription | No subscription created |
| 2.4 | Check DB | No `stripeSubscriptionId` set | Confirm no partial state |

---

## Scenario 3: 3D Secure Authentication Required

**Priority**: P1
**Precondition**: User registered, email verified

| Step | Action | Expected Result | Verify |
|------|--------|-----------------|--------|
| 3.1 | POST `/api/subscriptions/checkout` | 200, checkoutUrl | |
| 3.2 | Enter 3DS card `4000 0027 6000 3184` | 3DS authentication modal appears | |
| 3.3 | Complete 3DS authentication | Payment succeeds after auth | Redirect to success |
| 3.4 | `checkout.session.completed` fires | Backend processes | Status becomes active |
| 3.5 | Fail 3DS authentication (if applicable) | Payment fails, no subscription | No webhook fired |

---

## Scenario 4: Subscription Cancellation

**Priority**: P0
**Precondition**: User has active subscription

| Step | Action | Expected Result | Verify |
|------|--------|-----------------|--------|
| 4.1 | POST `/api/subscriptions/cancel` with Bearer | 200 | |
| 4.2 | GET `/api/subscriptions/status` | `{ status: "active", cancelAtPeriodEnd: true, periodEnd: "<date>" }` | Still active until period end |
| 4.3 | Stripe fires `customer.subscription.updated` | Backend syncs `cancelAtPeriodEnd` flag | DB updated |
| 4.4 | Verify UI | Shows "Cancels on <date>" message | Settings page check |
| 4.5 | After period ends (simulate via Stripe CLI) | `customer.subscription.deleted` fires | `subscriptionStatus: "canceled"` |

---

## Scenario 5: Subscription Reactivation

**Priority**: P1
**Precondition**: User has subscription with `cancelAtPeriodEnd=true`

| Step | Action | Expected Result | Verify |
|------|--------|-----------------|--------|
| 5.1 | POST `/api/subscriptions/reactivate` with Bearer | 200 | |
| 5.2 | GET `/api/subscriptions/status` | `{ status: "active", cancelAtPeriodEnd: false }` | Cancellation reversed |
| 5.3 | Stripe fires `customer.subscription.updated` | `cancelAtPeriodEnd` synced to false | DB updated |

---

## Scenario 6: Recurring Payment Success (invoice.paid)

**Priority**: P1
**Precondition**: Active subscription approaching renewal

| Step | Action | Expected Result | Verify |
|------|--------|-----------------|--------|
| 6.1 | Simulate `invoice.paid` via Stripe CLI | `stripe trigger invoice.paid` | Webhook received |
| 6.2 | Backend processes event | `subscriptionStatus` remains "active" | |
| 6.3 | `subscriptionPeriodEnd` updated | New period end date set | DB check |
| 6.4 | `SubscriptionEvent` logged | New event row with `stripeEventId` | Idempotency |

---

## Scenario 7: Recurring Payment Failure (invoice.payment_failed)

**Priority**: P0
**Precondition**: Active subscription

| Step | Action | Expected Result | Verify |
|------|--------|-----------------|--------|
| 7.1 | Simulate `invoice.payment_failed` via Stripe CLI | `stripe trigger invoice.payment_failed` | Webhook received |
| 7.2 | Backend processes event | `subscriptionStatus: "past_due"` | DB updated |
| 7.3 | User accesses premium features | Behavior depends on business logic (allow/deny during grace) | Check behavior |
| 7.4 | GET `/api/subscriptions/status` | `{ status: "past_due" }` | API reflects state |

---

## Scenario 8: Webhook Security

**Priority**: P0

| Step | Action | Expected Result | Verify |
|------|--------|-----------------|--------|
| 8.1 | POST `/api/subscriptions/webhook` with no Stripe-Signature | 400 Bad Request | Not 200/500 |
| 8.2 | POST with invalid signature `Stripe-Signature: t=1,v1=bad` | 400 Bad Request | Signature rejected |
| 8.3 | POST with valid signature (via Stripe CLI) | 200 | Event processed |
| 8.4 | Replay same event (duplicate `stripeEventId`) | 200 but no duplicate processing | Check `SubscriptionEvent` count |

### Webhook Security Test Commands
```bash
# Invalid signature
curl -X POST http://localhost/api/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=invalidsignature" \
  -d '{"id":"evt_test","type":"checkout.session.completed"}'
# Expected: 400

# No signature header
curl -X POST http://localhost/api/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -d '{"id":"evt_test","type":"checkout.session.completed"}'
# Expected: 400

# Valid event via Stripe CLI
stripe trigger checkout.session.completed
# Expected: 200
```

---

## Scenario 9: Customer Portal

**Priority**: P1
**Precondition**: User has active subscription

| Step | Action | Expected Result | Verify |
|------|--------|-----------------|--------|
| 9.1 | POST `/api/subscriptions/portal` with Bearer | 200, `{ portalUrl: "https://billing.stripe.com/..." }` | Valid URL |
| 9.2 | Open portalUrl in browser | Stripe Customer Portal loads | User can manage billing |
| 9.3 | Update payment method in portal | New payment method saved | Stripe Dashboard confirms |

---

## Scenario 10: Edge Cases

**Priority**: P2

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| 10.1 | Checkout without auth | POST `/api/subscriptions/checkout` no Bearer | 401 |
| 10.2 | Checkout with existing active sub | POST `/api/subscriptions/checkout` when already active | Returns existing checkout or error |
| 10.3 | Cancel without subscription | POST `/api/subscriptions/cancel` when no sub | 400 or appropriate error |
| 10.4 | Reactivate non-canceled sub | POST `/api/subscriptions/reactivate` when active (not canceling) | 400 or no-op |
| 10.5 | Rate limit on checkout | 6 checkout requests in 1 minute | 429 on 6th |
| 10.6 | Premium badge after cancel | After subscription ends | Badge removed, ad-free revoked |
| 10.7 | Concurrent webhook events | Send multiple webhooks rapidly | All processed, no race conditions |

---

## Scenario 11: Stripe CLI Simulation Commands

Quick reference for simulating all webhook events:

```bash
# Checkout completed
stripe trigger checkout.session.completed

# Invoice paid (renewal)
stripe trigger invoice.paid

# Invoice payment failed
stripe trigger invoice.payment_failed

# Subscription updated
stripe trigger customer.subscription.updated

# Subscription deleted (expired/canceled)
stripe trigger customer.subscription.deleted

# Full subscription lifecycle
stripe trigger payment_intent.succeeded
```

---

## Test Execution Summary

| Scenario | Tests | Priority | Estimated Time |
|----------|-------|----------|----------------|
| 1. Successful subscription | 8 | P0 | 10 min |
| 2. Payment declined | 4 | P0 | 5 min |
| 3. 3D Secure | 5 | P1 | 5 min |
| 4. Cancellation | 5 | P0 | 5 min |
| 5. Reactivation | 3 | P1 | 3 min |
| 6. Recurring payment | 4 | P1 | 5 min |
| 7. Payment failure | 4 | P0 | 5 min |
| 8. Webhook security | 4 | P0 | 5 min |
| 9. Customer portal | 3 | P1 | 5 min |
| 10. Edge cases | 7 | P2 | 10 min |
| **Total** | **47** | | **~58 min** |

**P0 (Must pass before release)**: Scenarios 1, 2, 4, 7, 8 = 25 tests
**P1 (Should pass)**: Scenarios 3, 5, 6, 9 = 15 tests
**P2 (Nice to have)**: Scenario 10 = 7 tests
