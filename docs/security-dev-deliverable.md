# Development Security Deliverable Report
Date: 2026-03-02 | Author: Development Team (風真)

---

## 1. Audit Summary

### 1-A. Image Upload Security Audit

**Files audited:**
- `backend/src/common/file-upload.config.ts`
- `backend/src/posts/posts.controller.ts`
- `backend/src/users/users.controller.ts`

**Before (vulnerabilities):**
| Issue | Severity | Description |
|-------|----------|-------------|
| No magic bytes validation | CRITICAL | Only MIME type checked; client can spoof Content-Type header and upload arbitrary files |
| No file extension whitelist | HIGH | Extension not validated; could allow unexpected file formats |

**After (fixed):**
- Magic bytes (file signature) validation added for JPEG, PNG, GIF, WebP
- File extension whitelist enforced (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`)
- Invalid files are immediately deleted from disk and request is rejected
- Validation applied to both `POST /posts/upload-image` and `PATCH /users/me/avatar`

**Existing strengths confirmed:**
- 5MB file size limit enforced via multer `limits`
- UUID-based filenames prevent directory traversal
- JWT authentication required on both endpoints
- Separate storage directories for avatars and posts

---

### 1-B. Class-Validator DTO Coverage Audit

**Total endpoints: 73**

| Status | Count | % |
|--------|-------|---|
| COVERED | 28 | 38.4% |
| PARTIAL (runtime checks only) | 8 | 11.0% |
| MISSING | 37 | 50.7% |

**CRITICAL gaps fixed (inline @Body without DTO):**
| Endpoint | Before | After |
|----------|--------|-------|
| `POST /auth/verify-email` | `@Body() body: { token: string }` | `VerifyEmailDto` with `@IsString @IsNotEmpty` |
| `POST /auth/magic-link` | `@Body() body: { email: string }` | `MagicLinkDto` with `@IsEmail` |
| `POST /auth/x/complete` | `@Body() body: { xToken, email }` | `CompleteXRegistrationDto` with `@IsString @IsNotEmpty @IsEmail` |

**MEDIUM remaining (report only, no code changes per policy):**
- 37 endpoints accept `@Param()` / `@Query()` without DTO-level validation
- Pagination params (`take`, `skip`, `limit`, `cursor`) have runtime `parseInt` + `Math.min` bounds but no class-validator enforcement
- UUID path params (`:id`, `:postId`, `:userId`) not validated with `@IsUUID()`
- Recommendation: Create shared `PaginationQueryDto` and apply `@IsUUID()` to path params in a future sprint

---

### 1-C. Rate Limiting (@Throttle) Audit

**Before:** Only `auth` module endpoints had @Throttle decorators (10 endpoints). All other write endpoints relied solely on the global default (60 req/60s).

**After — tighter per-endpoint limits added:**

| Controller | Endpoint | Limit (req/60s) |
|------------|----------|-----------------|
| PostsController | `POST /posts` (create) | 10 |
| PostsController | `POST /posts/upload-image` | 10 |
| PostsController | `POST /posts/poker-hand` | 10 |
| PostsController | `POST /posts/:id/repost` | 30 |
| PostsController | `POST /posts/:id/bookmark` | 30 |
| PostsController | `POST /posts/:id/pin` | 10 |
| PostsController | `POST /posts/:id/like` | 30 |
| RepliesController | `POST /posts/:postId/replies` | 15 |
| UsersController | `POST /users/:username/follow` | 20 |
| UsersController | `PATCH /users/me` | 10 |
| UsersController | `DELETE /users/me` | 3 |
| UsersController | `PATCH /users/me/avatar` | 10 |
| UsersController | `POST /users/:username/block` | 20 |
| UsersController | `POST /users/:username/mute` | 20 |
| SearchController | `GET /search/users` | 20 |
| SearchController | `GET /search/posts` | 20 |

**Rationale:**
- Content creation (post, reply, image): 10-15/min to prevent spam
- Toggle actions (like, bookmark, repost): 30/min to allow rapid UI interaction
- Social actions (follow, block, mute): 20/min to prevent abuse
- Account deletion: 3/min (destructive action)
- Search: 20/min to prevent user enumeration

---

### 1-D. OAuth In-Memory Session Assessment

**Current implementation:** `Map<string, { data; expiresAt }>` with 5min TTL and one-time consumption.

**Assessment: MEDIUM priority, no immediate fix needed.**
- Current design is secure for single-instance deployment
- TTL + one-time consumption prevent session fixation and replay attacks
- Cleanup logic runs on each `storeOAuthSession()` call

**Recommendation for production scale-out:** Migrate to Redis-backed session store when horizontal scaling is needed. This should be tracked as a separate infrastructure task.

---

## 2. Files Changed

### New files:
- `backend/src/auth/dto/verify-email.dto.ts`
- `backend/src/auth/dto/magic-link.dto.ts`
- `backend/src/auth/dto/complete-x-registration.dto.ts`

### Modified files:
- `backend/src/common/file-upload.config.ts` — magic bytes validation + extension whitelist
- `backend/src/auth/auth.controller.ts` — 3 endpoints migrated to proper DTOs
- `backend/src/posts/posts.controller.ts` — magic bytes validation + 7 @Throttle decorators
- `backend/src/users/users.controller.ts` — magic bytes validation + 6 @Throttle decorators
- `backend/src/replies/replies.controller.ts` — 1 @Throttle decorator
- `backend/src/search/search.controller.ts` — 2 @Throttle decorators

---

## 3. Build Verification

`npm run build` — PASSED (no TypeScript errors)

---

## 4. Cross-Team Dependencies

| Item | Target Team | Status |
|------|-------------|--------|
| DTO coverage remaining gaps (37 endpoints) | QA/QC (雪花) | Input ready: endpoint list above |
| @Throttle deployment thresholds | Operations (星街) | Input ready: rate limits above for monitoring config |
| Rate limit config alignment | DevSecOps (獅白) | Input ready: full throttle map above |
| Security UI integration (upload error messages) | Design (宝鐘) | New error messages added in Japanese |
