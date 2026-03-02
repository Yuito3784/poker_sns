# Security Header Expected Values & Verification Procedures

**Version**: 1.0
**Scope**: HTTP response headers for Poker SNS (backend + nginx)
**Reference**: OWASP Secure Headers Project, MEMORY.md security fixes (2026-03-02)

---

## 1. Expected Header Values

### 1.1 Backend (NestJS Helmet) - All `/api/*` responses

| Header | Expected Value | Source | Severity |
|--------|---------------|--------|----------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Helmet config (main.ts) | CRITICAL |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'` | Helmet config | HIGH |
| `X-Content-Type-Options` | `nosniff` | Helmet config | HIGH |
| `X-Frame-Options` | `DENY` | Helmet frameguard | HIGH |
| `X-XSS-Protection` | `0` (modern browsers) or `1; mode=block` | Helmet xssFilter | MEDIUM |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Helmet config | MEDIUM |
| `X-Powered-By` | **ABSENT** (removed by Helmet) | Helmet default | MEDIUM |

### 1.2 Nginx Production (nginx-prod.conf) - All responses

| Header | Expected Value | Source | Severity |
|--------|---------------|--------|----------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | add_header directive | CRITICAL |
| `X-Content-Type-Options` | `nosniff` | add_header directive | HIGH |
| `X-Frame-Options` | `DENY` | add_header directive | HIGH |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | add_header directive | MEDIUM |
| `Server` | **ABSENT** (server_tokens off) | server_tokens off | LOW |

### 1.3 TLS Configuration (nginx-prod.conf)

| Setting | Expected Value | Severity |
|---------|---------------|----------|
| TLS versions | TLSv1.2, TLSv1.3 only | CRITICAL |
| HTTP -> HTTPS | 301 redirect | CRITICAL |
| ACME challenge | `/.well-known/acme-challenge/` accessible over HTTP | HIGH |

### 1.4 CORS Headers (Backend)

| Header | Expected Value | Severity |
|--------|---------------|----------|
| `Access-Control-Allow-Origin` | Matches `CORS_ORIGINS` env (not `*`) | CRITICAL |
| `Access-Control-Allow-Credentials` | `true` | HIGH |
| `Access-Control-Allow-Methods` | `GET,HEAD,PUT,PATCH,POST,DELETE` | MEDIUM |
| `Access-Control-Allow-Headers` | Includes `Authorization, Content-Type` | MEDIUM |

### 1.5 Cache Control Headers

| Endpoint Pattern | Expected Cache-Control | Severity |
|-----------------|----------------------|----------|
| `/uploads/*` | `public, max-age=2592000` (30 days) | MEDIUM |
| `/_next/static/*` | `public, max-age=31536000, immutable` | LOW |
| `/api/*` (general) | `no-cache` or not cached | MEDIUM |
| `/api/posts/:id/meta` | Cached 5min (nginx proxy_cache) | LOW |

### 1.6 Rate Limiting Headers

| Zone | Expected Behavior | Severity |
|------|-------------------|----------|
| `api_general` | 30 req/s, burst 20 | HIGH |
| `api_auth` | 5 req/s, burst 10 | CRITICAL |
| `og_crawl` | 10 req/s, burst 30 | LOW |
| Response on limit | 429 Too Many Requests | HIGH |

---

## 2. Verification Procedures

### 2.1 Automated Verification Script

```bash
#!/bin/bash
# qa-security-headers-check.sh
# Run against local or production URL
# Usage: ./qa-security-headers-check.sh https://localhost

BASE_URL="${1:-http://localhost}"
PASS=0
FAIL=0
WARN=0

check_header() {
  local url="$1"
  local header_name="$2"
  local expected="$3"
  local severity="$4"

  actual=$(curl -sk -D - -o /dev/null "$url" 2>/dev/null | grep -i "^${header_name}:" | sed 's/\r$//' | cut -d: -f2- | xargs)

  if [ -z "$actual" ]; then
    if [ "$expected" = "ABSENT" ]; then
      echo "[PASS] $header_name is absent (expected)"
      PASS=$((PASS+1))
    else
      echo "[FAIL][$severity] $header_name: MISSING (expected: $expected)"
      FAIL=$((FAIL+1))
    fi
  elif [ "$expected" = "ABSENT" ]; then
    echo "[FAIL][$severity] $header_name: present but should be absent (value: $actual)"
    FAIL=$((FAIL+1))
  elif echo "$actual" | grep -qi "$expected"; then
    echo "[PASS] $header_name: $actual"
    PASS=$((PASS+1))
  else
    echo "[FAIL][$severity] $header_name: $actual (expected: $expected)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Security Header Verification ==="
echo "Target: $BASE_URL"
echo "Date: $(date)"
echo ""

echo "--- Backend API Headers (/api/health) ---"
check_header "$BASE_URL/api/health" "Strict-Transport-Security" "max-age=63072000" "CRITICAL"
check_header "$BASE_URL/api/health" "X-Content-Type-Options" "nosniff" "HIGH"
check_header "$BASE_URL/api/health" "X-Frame-Options" "DENY" "HIGH"
check_header "$BASE_URL/api/health" "X-Powered-By" "ABSENT" "MEDIUM"
check_header "$BASE_URL/api/health" "Content-Security-Policy" "default-src" "HIGH"

echo ""
echo "--- CORS Headers (OPTIONS preflight) ---"
cors_response=$(curl -sk -D - -o /dev/null -X OPTIONS \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  "$BASE_URL/api/health" 2>/dev/null)

if echo "$cors_response" | grep -qi "access-control-allow-origin: \*"; then
  echo "[FAIL][CRITICAL] CORS allows wildcard origin"
  FAIL=$((FAIL+1))
elif echo "$cors_response" | grep -qi "access-control-allow-origin: http://evil.com"; then
  echo "[FAIL][CRITICAL] CORS reflects arbitrary origin"
  FAIL=$((FAIL+1))
else
  echo "[PASS] CORS does not reflect arbitrary origin"
  PASS=$((PASS+1))
fi

echo ""
echo "--- Cache Headers ---"
check_header "$BASE_URL/api/health" "Cache-Control" "no" "MEDIUM"

echo ""
echo "--- Rate Limiting ---"
echo "Testing auth endpoint rate limit (5 req/min)..."
for i in $(seq 1 7); do
  status=$(curl -sk -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"ratetest@test.com","password":"test"}' \
    "$BASE_URL/api/auth/register" 2>/dev/null)
  if [ "$status" = "429" ]; then
    echo "[PASS] Rate limit triggered at request #$i (429)"
    PASS=$((PASS+1))
    break
  fi
  if [ "$i" = "7" ]; then
    echo "[WARN] Rate limit not triggered within 7 requests"
    WARN=$((WARN+1))
  fi
done

echo ""
echo "=== Results ==="
echo "PASS: $PASS | FAIL: $FAIL | WARN: $WARN"
if [ "$FAIL" -gt 0 ]; then
  echo "STATUS: FAILED - $FAIL security header issues found"
  exit 1
else
  echo "STATUS: PASSED"
  exit 0
fi
```

### 2.2 Manual Verification Steps

#### Step 1: Backend Helmet Headers
```bash
# Check all Helmet headers on API endpoint
curl -sI http://localhost/api/health | head -30
```

**Verify**:
- [ ] `Strict-Transport-Security` contains `max-age=63072000`
- [ ] `Content-Security-Policy` contains `default-src 'self'`
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `X-Frame-Options: DENY` present
- [ ] `X-Powered-By` is NOT present

#### Step 2: CORS Validation
```bash
# Test CORS with unauthorized origin
curl -sI -X OPTIONS \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  http://localhost/api/auth/login

# Test CORS with authorized origin
curl -sI -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  http://localhost/api/auth/login
```

**Verify**:
- [ ] Unauthorized origin: no `Access-Control-Allow-Origin` or not `*`
- [ ] Authorized origin: `Access-Control-Allow-Origin: http://localhost:3000`
- [ ] `Access-Control-Allow-Credentials: true`

#### Step 3: TLS Configuration (Production only)
```bash
# Check TLS versions
nmap --script ssl-enum-ciphers -p 443 yourdomain.com

# Verify HTTP->HTTPS redirect
curl -sI http://yourdomain.com
```

**Verify**:
- [ ] TLSv1.0 and TLSv1.1 rejected
- [ ] TLSv1.2 and TLSv1.3 accepted
- [ ] HTTP returns 301 to HTTPS

#### Step 4: Nginx Security Headers (Production)
```bash
# Check nginx-added headers
curl -sI https://yourdomain.com/ | head -20
```

**Verify**:
- [ ] `Strict-Transport-Security` present
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Server` header absent or not revealing version

#### Step 5: Cache Headers
```bash
# API responses should not be cached
curl -sI http://localhost/api/health | grep -i cache

# Static uploads should be cached
curl -sI http://localhost/uploads/test.jpg | grep -i cache
```

**Verify**:
- [ ] API: no public caching
- [ ] Uploads: `max-age=2592000` (30 days)

#### Step 6: Rate Limiting
```bash
# Test auth rate limit (5/min on register)
for i in $(seq 1 7); do
  echo "Request $i: $(curl -s -o /dev/null -w '%{http_code}' \
    -X POST -H 'Content-Type: application/json' \
    -d '{"email":"rate'$i'@test.com","username":"rate'$i'","password":"Test1234!"}' \
    http://localhost/api/auth/register)"
done
```

**Verify**:
- [ ] 429 returned before or at request #6

#### Step 7: Webhook Signature Validation
```bash
# Send webhook with invalid signature
curl -s -o /dev/null -w '%{http_code}' \
  -X POST http://localhost/api/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234,v1=invalid" \
  -d '{"type":"test"}'
```

**Verify**:
- [ ] Returns 400 (not 200 or 500)

---

## 3. Compliance Matrix

| Requirement | OWASP Ref | Header/Config | Status |
|-------------|-----------|--------------|--------|
| Prevent clickjacking | A8:2017 | X-Frame-Options: DENY | Implemented |
| Prevent MIME sniffing | A6:2017 | X-Content-Type-Options: nosniff | Implemented |
| Enforce HTTPS | A3:2017 | HSTS + HTTP->HTTPS redirect | Implemented |
| Prevent XSS | A7:2017 | CSP + X-XSS-Protection | Implemented |
| CORS restriction | A5:2017 | Origin whitelist (not *) | Implemented |
| Hide server info | A6:2017 | server_tokens off, no X-Powered-By | Implemented |
| Rate limiting | A4:2023 | Throttler + nginx limit_req | Implemented |
| Secure referrer | Privacy | Referrer-Policy: strict-origin | Implemented |
| TLS 1.2+ only | A3:2017 | ssl_protocols TLSv1.2 TLSv1.3 | Implemented |
| Webhook verification | A2:2017 | Stripe signature check + 400 on failure | Implemented |

---

## 4. Known Gaps / Warnings

| # | Item | Severity | Note |
|---|------|----------|------|
| W-1 | CSP `style-src 'unsafe-inline'` | MEDIUM | Required for Tailwind CSS inline styles. Monitor for CSP bypass. |
| W-2 | No `Permissions-Policy` header | LOW | Consider adding to restrict browser features (camera, mic, geolocation). |
| W-3 | No `Cross-Origin-Opener-Policy` | LOW | Consider adding `same-origin` for pop-up isolation. |
| W-4 | HSTS preload requires domain submission | LOW | Submit to hstspreload.org after domain is confirmed. |
