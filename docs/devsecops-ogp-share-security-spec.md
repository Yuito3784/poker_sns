# DevSecOps Security Specification: OGP / SNS Share Feature

**Author:** 角巻 (DevSecOps)
**Date:** 2026-03-02
**Status:** Review Ready

---

## 1. Current Security Posture Assessment

### 1.1 Rate Limiting (NestJS Throttler)

| Layer | Config | Status |
|-------|--------|--------|
| Global default | 60 req / 60s per IP | `app.module.ts` ThrottlerModule.forRoot |
| Auth endpoints | 3-10 req / 60s | Per-endpoint `@Throttle` |
| Post write ops | 10 req / 60s | Per-endpoint `@Throttle` |
| `GET /posts/:id/meta` | **No specific limit** (inherits global 60/min) | `@Public()` - unauthenticated |

**CRITICAL Finding:** The `/posts/:id/meta` endpoint used for OGP card fetching is public and only protected by the global 60 req/min limit. When a post goes viral on X/Twitter, SNS crawlers (Twitterbot, facebookexternalhit, LINE) will hit this endpoint repeatedly. The global limit is shared with all other endpoints, so a bot hitting `/meta` could starve legitimate API calls.

### 1.2 Nginx Rate Limiting

| Config | Status |
|--------|--------|
| `limit_req_zone` | **Not configured** |
| `limit_conn_zone` | **Not configured** |

**HIGH Finding:** No nginx-level rate limiting exists. This means the NestJS application layer is the only defense against request floods. For a production SNS receiving external traffic from X/YouTube referrals, nginx-level rate limiting is essential as the first line of defense.

### 1.3 Helmet / CSP Configuration

Current CSP directives in `main.ts`:

```
defaultSrc: ["'self'"]
scriptSrc: ["'self'"]
styleSrc: ["'self'", "'unsafe-inline'"]
imgSrc: ["'self'", 'data:', 'https:']
connectSrc: ["'self'"]
fontSrc: ["'self'", 'https:']
objectSrc: ["'none'"]
frameSrc: ["'none'"]
```

**Assessment:** CSP is solid. `imgSrc` allows `https:` which is needed for external avatar/image hosting. No changes required for share buttons (they use standard `<a>` tags to external URLs, which CSP does not restrict).

### 1.4 OGP Metadata Status

| Page | OGP | Dynamic |
|------|-----|---------|
| Root layout | og:title, og:description, twitter:card | Static |
| `/post/[id]` | og:title, og:description, og:image, twitter:card | Dynamic via `generateMetadata` |
| `/lp` | **None** (client component) | N/A |
| User profile | **Not checked** | N/A |

**MEDIUM Finding:** Landing page (`/lp`) is a `"use client"` component with no server-side metadata export. When shared on X, it will show generic fallback OGP. This is a marketing gap, not a security issue.

---

## 2. Security Requirements for New Features

### 2.1 OGP Dynamic Image Generation Endpoint (if implemented)

If a `GET /og-image/:postId` endpoint is added for dynamic OG image generation:

#### CRITICAL: Rate Limiting

```typescript
// Recommended: Strict per-endpoint throttle
@Get('og-image/:postId')
@Public()
@Throttle({ default: { ttl: 60000, limit: 20 } })
```

Plus nginx-level caching (see Section 3.2).

#### CRITICAL: Resource Exhaustion Prevention

- Image generation (Canvas/Sharp/Satori) is CPU-intensive
- Must set response timeout (10s max)
- Must limit concurrent generation (queue or semaphore, max 5 concurrent)
- Generated images MUST be cached to disk (`/uploads/og/`) with long TTL

#### HIGH: Input Validation

- `postId` must be validated as UUID format before processing
- Reject requests for non-existent posts early (before image generation)
- Set `Content-Type: image/png` explicitly; do not rely on inference

### 2.2 UTM Parameter Handling

When share URLs include `?utm_source=x&utm_medium=social&utm_campaign=...`:

#### MEDIUM: XSS via UTM Parameters

UTM values are reflected in URLs but NOT rendered in HTML by default. However:

- **Do NOT** render UTM parameter values in page content or JavaScript
- If UTM values are stored in analytics DB, sanitize with parameterized queries (Prisma does this by default)
- If UTM values are logged, ensure log injection is prevented (no raw string interpolation in structured logs)

#### LOW: CSP Impact

UTM parameters in URLs do not affect CSP. No CSP changes needed for share links.

#### MEDIUM: OAuth State + UTM Preservation

If UTM parameters need to survive OAuth login flow:

- **Do NOT** append UTM to OAuth `state` parameter directly
- Use existing `storeOAuthSession()` mechanism to store UTM alongside session
- Store UTM in the in-memory session map (already has 5-min TTL)
- After OAuth callback, retrieve UTM from session and pass to frontend via redirect query

### 2.3 SNS Share Buttons

#### LOW: Open Redirect Prevention

Share buttons construct URLs like:
```
https://twitter.com/intent/tweet?url=...&text=...
https://social-plugins.line.me/lineit/share?url=...
```

- The `url` parameter MUST be hardcoded to the app's own domain (`NEXT_PUBLIC_SITE_URL`)
- Never allow user-controlled input to set the share target URL
- `text` parameter should be sanitized (encode special chars)

#### LOW: Referrer Leakage

Current `Referrer-Policy: strict-origin-when-cross-origin` is appropriate. No change needed.

---

## 3. Recommended Infrastructure Changes

### 3.1 NestJS: Add Throttle to `/posts/:id/meta`

**Priority: HIGH** | **Effort: 5min**

```typescript
// posts.controller.ts - line 119
@Get(':id/meta')
@Public()
@Throttle({ default: { ttl: 60000, limit: 30 } })
getPostMeta(@Param('id') id: string) {
  return this.postsService.getPostMeta(id);
}
```

Rationale: 30/min is generous for crawlers (they typically request once per URL) but prevents abuse. The global 60/min fallback is too permissive for a public endpoint that does DB queries.

### 3.2 Nginx: Add Rate Limiting Zones

**Priority: HIGH** | **Effort: 15min**

Add to `nginx-prod.conf` (outside server block):

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=api_auth:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=og_meta:10m rate=10r/s;
```

Add to location blocks:

```nginx
location /api/auth/ {
    limit_req zone=api_auth burst=10 nodelay;
    # ... existing proxy config
}

location /api/posts/ {
    limit_req zone=api_general burst=20 nodelay;
    # ... existing proxy config
}

# Future OG image endpoint
location /api/og-image/ {
    limit_req zone=og_meta burst=5 nodelay;
    proxy_cache_valid 200 24h;
    add_header Cache-Control "public, max-age=86400";
    # ... proxy config
}
```

### 3.3 Cache Headers for OGP Meta Endpoint

**Priority: MEDIUM** | **Effort: 5min**

Add `Cache-Control` header to the meta endpoint response so SNS crawlers and CDNs cache the result:

```typescript
// In posts.controller.ts or via interceptor
@Get(':id/meta')
@Public()
@Throttle({ default: { ttl: 60000, limit: 30 } })
@Header('Cache-Control', 'public, max-age=300, s-maxage=600')
getPostMeta(@Param('id') id: string) {
  return this.postsService.getPostMeta(id);
}
```

### 3.4 Nginx: OG Image Cache Location (if dynamic generation is added)

**Priority: MEDIUM** | **Effort: 10min**

```nginx
proxy_cache_path /var/cache/nginx/og levels=1:2 keys_zone=og_cache:10m max_size=500m inactive=7d;

location /api/og-image/ {
    proxy_cache og_cache;
    proxy_cache_valid 200 7d;
    proxy_cache_key $uri;
    limit_req zone=og_meta burst=5 nodelay;
    add_header X-Cache-Status $upstream_cache_status;
    proxy_pass http://backend;
}
```

---

## 4. Viral Traffic Scenario Analysis

### Scenario: Post shared on X goes viral (10K+ impressions in 1 hour)

**Expected traffic pattern:**
1. Twitterbot crawls `/posts/:id/meta` — single request per unique URL (cached by Twitter for ~7 days)
2. Users clicking link → hit `/post/:id` (frontend SSR) + `/posts/:id` (API)
3. Possible registration surge → `/auth/register` (already rate-limited at 5/min)

**Current capacity with proposed changes:**

| Endpoint | Nginx Limit | NestJS Limit | Bottleneck |
|----------|-------------|--------------|------------|
| `/posts/:id/meta` | 10r/s + burst 5 | 30/min | Nginx (sufficient for crawlers) |
| `/posts/:id` | 30r/s + burst 20 | 60/min (global) | NestJS global limit per IP |
| `/auth/register` | 5r/s + burst 10 | 5/min | NestJS (intentionally strict) |
| Frontend SSR | No limit | N/A | Add `limit_req` if needed |

**Risk:** If viral traffic comes from many unique IPs (organic), per-IP rate limits are irrelevant — the bottleneck becomes DB connection pool and Node.js event loop. This is an Ops concern (horizontal scaling), not a security concern.

---

## 5. Action Items Summary

| # | Action | Priority | Owner | Status |
|---|--------|----------|-------|--------|
| 1 | Add `@Throttle` to `GET /posts/:id/meta` | HIGH | DevSecOps | **Code change ready** |
| 2 | Add nginx `limit_req_zone` configurations | HIGH | DevSecOps/Ops | Spec ready, apply at deploy |
| 3 | Add `Cache-Control` header to meta endpoint | MEDIUM | DevSecOps | **Code change ready** |
| 4 | Validate postId format in meta endpoint | MEDIUM | Development | Warning only |
| 5 | Nginx proxy_cache for future OG image endpoint | MEDIUM | Ops | Spec ready |
| 6 | Add OGP metadata to `/lp` page | LOW | Development | Marketing gap noted |
| 7 | UTM parameter sanitization guidelines | LOW | Development | Documented above |

---

## 6. Code Changes (CRITICAL/HIGH only)

### 6.1 `posts.controller.ts` — Add Throttle + Cache-Control to meta endpoint

```diff
+ import { Header } from '@nestjs/common';

  @Get(':id/meta')
  @Public()
+ @Throttle({ default: { ttl: 60000, limit: 30 } })
+ @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  getPostMeta(@Param('id') id: string) {
    return this.postsService.getPostMeta(id);
  }
```

### 6.2 `nginx-prod.conf` — Add rate limiting zones

```diff
+ # Rate limiting zones (add before server blocks)
+ limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
+ limit_req_zone $binary_remote_addr zone=api_auth:10m rate=5r/s;
+ limit_req_zone $binary_remote_addr zone=og_meta:10m rate=10r/s;

  server {
      listen 443 ssl;
      ...

      location /api/ {
+         limit_req zone=api_general burst=20 nodelay;
          rewrite ^/api/(.*) /$1 break;
          ...
      }
  }
```
