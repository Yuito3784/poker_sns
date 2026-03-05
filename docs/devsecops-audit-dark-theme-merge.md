# DevSecOps Security Audit Report
## fix/dark-theme-all-pages Branch Pre-Push Verification

**Date:** 2026-03-05
**Auditor:** DevSecOps (角巻)
**Scope:** npm audit + security header regression check before push/merge to dev

---

## 1. npm audit Results

### Frontend (3 vulnerabilities: 1 moderate, 2 high)

| Package | Severity | Issue | Fix Available |
|---------|----------|-------|---------------|
| ajv (transitive) | moderate | Prototype pollution | `npm audit fix` |
| minimatch <=3.1.3 | high | ReDoS via wildcards/GLOBSTAR/extglobs | `npm audit fix` |
| next 15.6.0-canary.0 - 16.1.4 | high | DoS via Image Optimizer, RSC deserialization, PPR endpoint | `npm audit fix --force` (next@16.1.6) |

**Assessment:** These are pre-existing transitive dependency vulnerabilities, NOT introduced by the dark-theme changes. The `next` vulnerability requires a major version bump (`--force`) and should be handled in a separate maintenance task.

### Backend (13 vulnerabilities: 1 low, 6 moderate, 6 high)

| Package | Severity | Issue | Fix Available |
|---------|----------|-------|---------------|
| cookie <0.7.0 | low | Out-of-bounds read | `npm audit fix` |
| body-parser <1.20.3 | moderate | DoS via URL encoding | `npm audit fix` |
| express <4.21.1 | moderate | Multiple issues | `npm audit fix` |
| path-to-regexp (multiple) | moderate/high | ReDoS | `npm audit fix` |
| send/serve-static | moderate | Template injection/traversal | `npm audit fix` |
| multer | high | DoS (cleanup/recursion/resource exhaustion) | `npm audit fix` |
| qs 6.7.0 - 6.14.1 | moderate | arrayLimit bypass DoS | `npm audit fix` |
| serialize-javascript <=7.0.2 | high | RCE via RegExp.flags/Date.toISOString | `npm audit fix` |

**Assessment:** All are pre-existing transitive dependency vulnerabilities from express/NestJS ecosystem, NOT introduced by the dark-theme changes. No new vulnerabilities detected from this branch's code changes.

---

## 2. Security Header Verification

### Helmet Configuration (backend/src/main.ts)

| Header | Expected | Actual | Status |
|--------|----------|--------|--------|
| Content-Security-Policy | directives with self/inline/https | Present (lines 27-38) | OK |
| HSTS | maxAge=63072000, includeSubDomains, preload | Present (lines 40-44) | OK |
| X-Frame-Options | DENY | frameguard: { action: 'deny' } (line 45) | OK |
| X-Content-Type-Options | nosniff | noSniff: true (line 46) | OK |
| XSS-Filter | enabled | xssFilter: true (line 47) | OK |
| Cross-Origin-Resource-Policy | cross-origin | Present (line 26) | OK |

### nginx-prod.conf Security Headers

| Header | Expected | Actual | Status |
|--------|----------|--------|--------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | Present (line 61) | OK |
| X-Content-Type-Options | nosniff | Present (line 62) | OK |
| X-Frame-Options | DENY | Present (line 63) | OK |
| Referrer-Policy | strict-origin-when-cross-origin | Present (line 64) | OK |
| Content-Security-Policy | Full directive set with Stripe | Present (line 65) | OK |
| Permissions-Policy | camera/mic/geo denied, payment self | Present (line 66) | OK |

---

## 3. Verdict

**PASS** - Safe to push and merge to dev.

- No new security vulnerabilities introduced by the dark-theme changes
- All existing Helmet CSP and nginx security headers remain intact with no regression
- Pre-existing dependency vulnerabilities are tracked but unrelated to this branch

### Recommendations (separate maintenance tasks)
- **MEDIUM:** Run `npm audit fix` on both frontend and backend to address fixable vulnerabilities
- **LOW:** Plan Next.js upgrade to 16.1.6+ to address DoS vulnerabilities (requires testing)
- **LOW:** Plan multer/express ecosystem update for backend
