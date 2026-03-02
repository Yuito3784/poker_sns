# DevSecOps Security Audit Report
**Date**: 2026-03-02
**Auditor**: DevSecOps Team (角巻)
**Scope**: npm dependency CVEs, Docker base image CVEs, config integrity verification

---

## 1. npm audit Results

### Backend (18 vulnerabilities: 1 low, 5 moderate, 12 high)

| Package | Severity | CVE / Advisory | Fix Available | Notes |
|---------|----------|----------------|---------------|-------|
| **multer** <=2.0.2 | HIGH | GHSA-xf7r-hgr6-v32p, GHSA-v52c-386h-88mc | `npm audit fix --force` (breaking: @nestjs/testing@7.5.5) | DoS via incomplete cleanup / resource exhaustion. **Runtime dependency - CRITICAL priority.** |
| **serialize-javascript** <=7.0.2 | HIGH | GHSA-5c6j-r48x-rmvq | `npm audit fix --force` (breaking: @nestjs/cli@7.6.0) | RCE via RegExp.flags. Build-time only (webpack/terser). |
| **minimatch** <=3.1.3 | HIGH | GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74 | `npm audit fix` | ReDoS. Mostly dev/test deps (jest, eslint, glob). |
| **@isaacs/brace-expansion** 5.0.0 | HIGH | GHSA-7h2j-956f-4vf2 | `npm audit fix` | Uncontrolled Resource Consumption. |
| **ajv** <6.14.0 / <8.18.0 | MODERATE | GHSA-2g4f-4pwh-qvx6 | `npm audit fix --force` (breaking) | ReDoS with `$data` option. Transitive via @nestjs/cli. |
| **qs** 6.7.0-6.14.1 | MODERATE | GHSA-w7fw-mjwx-rm74 | `npm audit fix` | arrayLimit bypass DoS. |
| **webpack** <=5.99.6 | MODERATE | GHSA-4vvj-4cpr-p986 | `npm audit fix --force` (breaking) | Cross-realm object access. Build-time only. |

### Frontend (3 vulnerabilities: 1 moderate, 2 high)

| Package | Severity | CVE / Advisory | Fix Available | Notes |
|---------|----------|----------------|---------------|-------|
| **next** 15.6.0-canary.0 - 16.1.4 | HIGH | GHSA-9g9p-9gw9-jx7f, GHSA-h25m-26qc-wcjf, GHSA-5f7q-jpqc-wp7h | `npm audit fix --force` (installs next@16.1.6) | DoS via Image Optimizer, HTTP deserialization DoS, PPR memory exhaustion. **Runtime - CRITICAL priority.** |
| **minimatch** <=3.1.3 | HIGH | GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj | `npm audit fix` | ReDoS. Dev dependency. |
| **ajv** <6.14.0 | MODERATE | GHSA-2g4f-4pwh-qvx6 | `npm audit fix` | ReDoS. Dev dependency. |

---

## 2. Docker Base Image CVE Assessment

Docker is not installed on this workstation, so container scanning (trivy/grype) could not be performed locally. Assessment based on public CVE databases.

### Base Images Used

| Image | Used In | Latest CVEs (2026) |
|-------|---------|-------------------|
| `node:20-alpine` | backend/Dockerfile, frontend/Dockerfile | CVE-2025-59465 (HIGH): HTTP/2 HEADERS crash DoS. CVE-2025-55131 (HIGH): vm module memory disclosure. CVE-2026-21636 (MEDIUM): UDS permission bypass. **Fixed in Node.js 20.20.0+** |
| `postgres:16-alpine` | docker-compose.yml | CVE-2026-2006 (CRITICAL): Buffer overrun -> arbitrary code execution. CVE-2026-2007 (HIGH): Heap buffer overflow via pg_trgm. CVE-2026-2003: oidvector memory disclosure. **Fixed in PostgreSQL 16.12+** |
| `nginx:alpine` | docker-compose.yml | CVE-2026-1642 (MEDIUM): SSL upstream injection MitM. **Fixed in nginx 1.28.2+ / 1.29.5+** |
| `certbot/certbot` | docker-compose.yml | No critical CVEs reported for 2026. |

### Recommendations
- Pin `node:20.20-alpine` or later in both Dockerfiles
- Pin `postgres:16.12-alpine` or later in docker-compose.yml
- Pin `nginx:1.28.2-alpine` or later in docker-compose.yml
- Run `docker pull` to refresh images before next build
- Install trivy or grype on CI runner for automated container scanning

---

## 3. Configuration Integrity Verification

### nginx-prod.conf - PASS

All security headers from 2026-03-02 security fixes confirmed intact:
- `server_tokens off` - present (line 1)
- `Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"` - present (line 61)
- `X-Content-Type-Options "nosniff"` - present (line 62)
- `X-Frame-Options "DENY"` - present (line 63)
- `Referrer-Policy "strict-origin-when-cross-origin"` - present (line 64)
- Rate limiting zones configured: api_general, api_auth, og_crawl, lp_page
- SSL protocols restricted to TLSv1.2/1.3
- No unintended changes detected

### docker-compose.prod.yml - PASS

Security posture verified:
- PostgreSQL port 5432 NOT exposed externally (no `ports:` in db service)
- Backend ports: `[]` (Nginx-only access)
- Frontend ports: `[]` (Nginx-only access)
- All sensitive env vars use `${VAR:?error}` syntax (fail-fast on missing secrets)
- Resource limits configured for all services
- No unintended changes detected

### docker-compose.yml (dev) - WARNING (acceptable)

- Backend port 3001 exposed (dev convenience, not in prod override)
- DB password uses fallback default `postgres` (overridden in prod)
- No port 5432 external exposure (security fix confirmed)

---

## 4. Priority Action Items

### CRITICAL (immediate fix recommended)

| # | Item | Impact | Action |
|---|------|--------|--------|
| 1 | **next** DoS vulnerabilities (3 CVEs) | Production frontend crash risk | `cd frontend && npm install next@16.1.6` |
| 2 | **multer** DoS (2 CVEs) | Production file upload crash | Monitor @nestjs/platform-express for patched release |
| 3 | **PostgreSQL** CVE-2026-2006 | Remote code execution on DB | Pin `postgres:16.12-alpine` or later |
| 4 | **Node.js** CVE-2025-59465 | HTTP/2 crash DoS | Pin `node:20.20-alpine` or later in Dockerfiles |

### HIGH (fix before next deploy)

| # | Item | Impact | Action |
|---|------|--------|--------|
| 5 | serialize-javascript RCE | Build-time only, lower risk | Update when @nestjs/cli releases compatible version |
| 6 | nginx CVE-2026-1642 | MitM on upstream TLS | Pin `nginx:1.28.2-alpine` or later |

### MEDIUM/LOW (warning only, no code changes per policy)

- minimatch ReDoS (dev/test dependencies)
- ajv ReDoS (build/dev dependencies)
- qs arrayLimit bypass
- webpack cross-realm access (build-time)

---

## 5. CI/CD Pipeline Recommendations

Once GitHub OAuth token is connected:

1. Add `npm audit --audit-level=high` step to CI pipeline (fail on HIGH+)
2. Add trivy/grype container scan step for Docker images
3. Schedule weekly automated dependency audit (GitHub Dependabot or Renovate)
4. Add SBOM generation step for supply chain visibility

---

## 6. Summary

| Category | Status |
|----------|--------|
| Backend npm audit | 18 vulns (12 HIGH, 5 MOD, 1 LOW) |
| Frontend npm audit | 3 vulns (2 HIGH, 1 MOD) |
| Docker base images | 4 new 2026 CVEs identified (requires image pin updates) |
| nginx-prod.conf integrity | PASS - all security headers intact |
| docker-compose.prod.yml integrity | PASS - no port leaks, secrets enforced |
| Previous security fixes (2026-03-02) | PASS - all confirmed intact |

**Overall Risk**: MEDIUM-HIGH. Runtime dependencies (next, multer) and base images (postgres, node) have actionable CVEs. Config integrity is solid.
