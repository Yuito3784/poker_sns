# Operations Deliverable - Round 1: GitHub Push & CI/CD

**Date:** 2026-03-02
**Owner:** Operations (白上)

---

## 1. Completed Actions

### 1-1. .gitignore Security Review & Fix (CRITICAL)

- **Issue:** `.gitignore` was missing `node_modules/`, `dist/`, `.next/`, `.claude/`, `backend/src/prisma/` (generated client with platform-specific binary)
- **Fix:** Added all missing exclusion patterns
- **Verified:** `.env`, `.env.local` properly excluded; only `.env.example` templates committed

### 1-2. Repository Cleanup

- **Issue:** Nested `.git` directories in `backend/` and `frontend/` blocked `git add`
- **Fix:** Removed nested `.git` dirs to consolidate into single monorepo
- **Issue:** `backend/src/prisma/` (34 generated files including `libquery_engine-darwin.dylib.node`) was being tracked
- **Fix:** Added to `.gitignore`, removed from index

### 1-3. Initial Push to GitHub

- **Repository:** [https://github.com/Yuito3784/poker_sns.git](https://github.com/Yuito3784/poker_sns.git)
- **Branch:** `main`
- **Files:** 265 files, 60,107 lines
- **Status:** Push successful

### 1-4. CI/CD Pipeline Review

- **File:** `.github/workflows/ci-cd.yml`
- **Status:** Already configured with 4-stage pipeline:
  1. Backend test (npm ci + prisma generate + jest + build)
  2. Frontend build (npm ci + next build)
  3. Docker build & push to GHCR (main only)
  4. SSH deploy + health check + Discord notification

### 1-5. Docker Compose Config Fixes


| File                         | Issue                                      | Fix                          |
| ---------------------------- | ------------------------------------------ | ---------------------------- |
| `docker-compose.staging.yml` | GHCR images referenced `your-org`          | Changed to `yuito3784`       |
| `docker-compose.prod.yml`    | nginx config path `nginx-prod-active.conf` | Changed to `nginx-prod.conf` |


---

## 2. MEDIUM/LOW Warnings (No Code Changes)


| Severity | Item                          | Detail                                                                                            |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| MEDIUM   | Backend test coverage         | Only auth and subscription spec files exist; no integration tests for posts, users, notifications |
| MEDIUM   | Frontend has no tests         | No test framework configured in frontend                                                          |
| LOW      | `migration_lock.toml` tracked | Prisma migration lock file is committed; generally harmless but can cause merge conflicts         |


---

## 3. CEO Decision Sheet - Blockers for Production Deploy

The following 4 items require CEO decision before production deployment can proceed:

### Blocker 1: VPS/Cloud Provider Selection


| Option            | Monthly Cost (Est.) | Pros                      | Cons                    |
| ----------------- | ------------------- | ------------------------- | ----------------------- |
| **Xserver VPS**   | 2,200-4,400         | Japanese support, simple  | Limited scaling         |
| **ConoHa VPS**    | 1,848-3,608         | Cost-effective, Tokyo DC  | Manual ops              |
| **AWS Lightsail** | $10-40              | Easy start, AWS ecosystem | Cost grows with scale   |
| **Hetzner Cloud** | 5-15 EUR            | Best price-performance    | EU datacenter (latency) |


**Recommendation:** ConoHa VPS 4GB (3,608/mo) or Xserver VPS 4GB for Japan-targeted service.
**Minimum specs:** 4GB RAM, 2 vCPU, 100GB SSD (for Docker + PostgreSQL + uploads)

### Blocker 2: Domain

- **Action needed:** Purchase and configure domain (e.g., pokersns.jp, poker-sns.com)
- **Registrar suggestion:** Xserver Domain or Google Domains
- **Cost:** 1,000-3,000/year depending on TLD

### Blocker 3: Stripe Production API Keys

- **Action needed:** Switch from Stripe test mode to live mode
- **Steps:** Stripe Dashboard > Developers > API keys > Live mode
- **Required secrets for GitHub Actions:**
  - `STRIPE_SECRET_KEY` (sk_live_xxx)
  - `STRIPE_WEBHOOK_SECRET` (whsec_xxx)
  - `STRIPE_PRICE_ID` (price_xxx for premium plan)

### Blocker 4: SSL Certificate

- **Auto-handled:** Let's Encrypt via certbot (already configured in docker-compose.yml)
- **Prerequisite:** Domain must be pointed to server IP first
- **No CEO decision needed** unless custom EV certificate is desired

---

## 4. GitHub Actions Secrets Required

Once CEO provides blocker decisions, these secrets must be configured in GitHub repo settings:


| Secret Name            | Source                             |
| ---------------------- | ---------------------------------- |
| `DEPLOY_HOST`          | VPS IP or hostname                 |
| `DEPLOY_USER`          | SSH user (e.g., `deploy`)          |
| `DEPLOY_SSH_KEY`       | SSH private key for deploy user    |
| `NEXT_PUBLIC_API_URL`  | `https://{domain}/api`             |
| `NEXT_PUBLIC_SITE_URL` | `https://{domain}`                 |
| `DISCORD_WEBHOOK_URL`  | Discord channel webhook (optional) |


---

## 5. Next Steps (Pending CEO Decisions)

1. CEO selects VPS provider and domain → Ops provisions server
2. CEO provides Stripe live keys → Configure GitHub Secrets
3. Ops runs `setup-server.sh` on VPS
4. Ops triggers first production deploy via `git push main`
5. Ops verifies health check and monitoring

