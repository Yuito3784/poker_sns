# Poker SNS - Smoke Test Checklist (Local Docker-Compose)

**Version**: 1.0
**Environment**: `docker compose up` (docker-compose.yml)
**Prerequisite**: All containers healthy (`docker compose ps` shows all services "Up")

---

## Pre-Test Verification

| # | Item | Command / Action | Expected | Pass/Fail |
|---|------|-----------------|----------|-----------|
| 0-1 | All containers running | `docker compose ps` | db, backend, frontend, nginx all "Up" | |
| 0-2 | DB healthy | `docker compose exec db pg_isready` | "accepting connections" | |
| 0-3 | Backend health | `curl http://localhost/api/health` | 200 OK | |
| 0-4 | Frontend loads | `curl -s -o /dev/null -w "%{http_code}" http://localhost` | 200 | |

---

## 1. Auth Module (13 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 1-1 | Register new user | POST `/api/auth/register` with email/username/password | 201, returns accessToken + refreshToken | P0 |
| 1-2 | Register duplicate email | POST `/api/auth/register` with existing email | 409 Conflict | P0 |
| 1-3 | Login valid credentials | POST `/api/auth/login` with registered email/password | 200, tokens returned | P0 |
| 1-4 | Login invalid password | POST `/api/auth/login` with wrong password | 401 Unauthorized | P0 |
| 1-5 | Refresh token | POST `/api/auth/refresh` with valid refreshToken | 200, new token pair | P0 |
| 1-6 | Refresh with expired token | POST `/api/auth/refresh` with expired refreshToken | 401 Unauthorized | P1 |
| 1-7 | Logout | POST `/api/auth/logout` with Bearer token | 200, refresh tokens revoked | P1 |
| 1-8 | Email verification | POST `/api/auth/verify-email` with token from email | 200, emailVerified=true | P0 |
| 1-9 | Resend verification | POST `/api/auth/resend-verification` with Bearer | 200 | P1 |
| 1-10 | Forgot password | POST `/api/auth/forgot-password` with email | 200 (always, prevent enumeration) | P1 |
| 1-11 | Reset password | POST `/api/auth/reset-password` with valid token | 200, password changed | P1 |
| 1-12 | Change password | POST `/api/auth/change-password` with current+new | 200 | P1 |
| 1-13 | Rate limit auth | POST `/api/auth/register` 6 times in 1 min | 429 on 6th request | P1 |

### OAuth (manual browser test)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 1-14 | Google OAuth flow | Click Google login button | Redirect to Google, callback returns tokens | P1 |
| 1-15 | LINE OAuth flow | Click LINE login button | Redirect to LINE, callback returns tokens | P1 |
| 1-16 | X OAuth flow | Click X login button | PKCE flow, callback returns tokens | P1 |
| 1-17 | Magic link login | POST `/api/auth/magic-link` with email | Email received, link logs in | P2 |

---

## 2. Posts Module (16 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 2-1 | Create text post | POST `/api/posts` with content (Bearer, verified email) | 201, post created | P0 |
| 2-2 | Create post without auth | POST `/api/posts` without Bearer | 401 | P0 |
| 2-3 | Create post unverified email | POST `/api/posts` with unverified user | 403 | P0 |
| 2-4 | Upload post image | POST `/api/posts/upload-image` with image file | 201, returns imageUrl | P0 |
| 2-5 | Upload non-image file | POST `/api/posts/upload-image` with .txt file | 400 or 422 | P1 |
| 2-6 | Upload >5MB image | POST `/api/posts/upload-image` with 6MB file | 413 | P1 |
| 2-7 | Create poker hand post | POST `/api/posts/poker-hand` with hand data | 201 | P1 |
| 2-8 | Delete own post | DELETE `/api/posts/:id` | 200, post removed | P0 |
| 2-9 | Delete other user's post | DELETE `/api/posts/:otherId` | 403 Forbidden | P0 |
| 2-10 | Get timeline | GET `/api/posts/timeline` with Bearer | 200, array of posts | P0 |
| 2-11 | Timeline pagination | GET `/api/posts/timeline?cursor=xxx` | 200, next page of posts | P1 |
| 2-12 | Get user posts | GET `/api/posts/user/:userId` | 200, user's posts | P0 |
| 2-13 | Get single post | GET `/api/posts/:id` | 200, post detail | P0 |
| 2-14 | Like/unlike toggle | POST `/api/posts/:id/like` twice | First: liked, Second: unliked | P0 |
| 2-15 | Bookmark toggle | POST `/api/posts/:id/bookmark` twice | First: bookmarked, Second: removed | P1 |
| 2-16 | Repost toggle | POST `/api/posts/:id/repost` twice | First: reposted, Second: removed | P1 |

---

## 3. Replies Module (4 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 3-1 | Create reply | POST `/api/posts/:postId/replies` with content | 201, reply created | P0 |
| 3-2 | Get replies | GET `/api/posts/:postId/replies` | 200, array of replies | P0 |
| 3-3 | Reply without auth | POST `/api/posts/:postId/replies` no Bearer | 401 | P1 |
| 3-4 | Reply pagination | GET `/api/posts/:postId/replies?cursor=xxx` | 200, paginated | P2 |

---

## 4. Users Module (12 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 4-1 | Get user profile | GET `/api/users/:username` | 200, profile data | P0 |
| 4-2 | Get non-existent user | GET `/api/users/nonexistent` | 404 | P1 |
| 4-3 | Update profile | PATCH `/api/users/me` with displayName | 200, updated | P0 |
| 4-4 | Upload avatar | PATCH `/api/users/me/avatar` with image | 200, avatarUrl set | P1 |
| 4-5 | Follow user | POST `/api/users/:username/follow` | 200, following=true | P0 |
| 4-6 | Unfollow user | POST `/api/users/:username/follow` again | 200, following=false | P0 |
| 4-7 | Get followers | GET `/api/users/:username/followers` | 200, array | P1 |
| 4-8 | Get following | GET `/api/users/:username/following-list` | 200, array | P1 |
| 4-9 | Block user | POST `/api/users/:username/block` | 200, blocked | P1 |
| 4-10 | Mute user | POST `/api/users/:username/mute` | 200, muted | P1 |
| 4-11 | Block/mute status | GET `/api/users/:username/block-mute-status` | 200, status flags | P2 |
| 4-12 | Delete account | DELETE `/api/users/me` with password confirmation | 200, account deleted | P1 |

---

## 5. Search Module (4 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 5-1 | Search users | GET `/api/search/users?q=test` | 200, matching users | P0 |
| 5-2 | Search posts | GET `/api/search/posts?q=poker` | 200, matching posts | P0 |
| 5-3 | Search too short query | GET `/api/search/users?q=a` | 400 (min 2 chars) | P1 |
| 5-4 | Search empty results | GET `/api/search/users?q=zzzzzzzzz` | 200, empty array | P2 |

---

## 6. Notifications Module (4 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 6-1 | Get notifications | GET `/api/notifications` with Bearer | 200, notification list | P0 |
| 6-2 | SSE stream connect | GET `/api/notifications/stream` with Bearer | 200, event-stream content type | P1 |
| 6-3 | Mark all read | PATCH `/api/notifications/read-all` | 200 | P1 |
| 6-4 | Mark one read | PATCH `/api/notifications/:id/read` | 200 | P2 |

---

## 7. Subscription Module (5 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 7-1 | Create checkout session | POST `/api/subscriptions/checkout` with Bearer | 200, checkoutUrl returned | P0 |
| 7-2 | Get subscription status | GET `/api/subscriptions/status` with Bearer | 200, status object | P0 |
| 7-3 | Cancel subscription | POST `/api/subscriptions/cancel` with Bearer | 200 | P1 |
| 7-4 | Reactivate subscription | POST `/api/subscriptions/reactivate` with Bearer | 200 | P1 |
| 7-5 | Webhook invalid signature | POST `/api/subscriptions/webhook` with bad sig | 400 | P0 |

---

## 8. Ads Module (2 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 8-1 | Get feed ads | GET `/api/ads/feed` | 200, ad array | P1 |
| 8-2 | Ads pagination | GET `/api/ads/feed?offset=10&limit=5` | 200, paginated | P2 |

---

## 9. Affiliates Module (3 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 9-1 | List affiliates | GET `/api/affiliates` | 200, partner list | P1 |
| 9-2 | Get affiliate detail | GET `/api/affiliates/:slug` | 200, partner detail | P1 |
| 9-3 | Affiliate redirect | GET `/api/affiliates/:slug/redirect` | 302 redirect | P2 |

---

## 10. Hashtags & Discovery (3 tests)

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| 10-1 | Posts by hashtag | GET `/api/posts/hashtag/poker` | 200, filtered posts | P1 |
| 10-2 | Trending posts | GET `/api/posts/trending?period=24h` | 200, trending list | P1 |
| 10-3 | OG metadata | GET `/api/posts/:id/meta` | 200, og tags | P2 |

---

## 11. Frontend Page Loading (10 tests)

| # | Test Case | URL | Expected | Priority |
|---|-----------|-----|----------|----------|
| 11-1 | Homepage | `/` | 200, renders feed | P0 |
| 11-2 | Landing page | `/lp` | 200, LP content | P0 |
| 11-3 | Search page | `/search` | 200, search form | P1 |
| 11-4 | User profile | `/profile/:username` | 200, profile view | P0 |
| 11-5 | Post detail | `/post/:id` | 200, post view | P0 |
| 11-6 | Settings | `/settings` | 200 (authed) | P1 |
| 11-7 | Notifications | `/notifications` | 200 (authed) | P1 |
| 11-8 | Bookmarks | `/bookmarks` | 200 (authed) | P1 |
| 11-9 | Privacy policy | `/privacy` | 200 | P2 |
| 11-10 | Terms of service | `/terms` | 200 | P2 |

---

## 12. File Upload & Static Serving (4 tests)

| # | Test Case | Steps | Expected | Priority |
|---|-----------|-------|----------|----------|
| 12-1 | Upload serves correctly | Upload image, GET `/uploads/:file` | 200, image content | P0 |
| 12-2 | Cache headers on uploads | GET `/uploads/:file` | Cache-Control: max-age=2592000 | P1 |
| 12-3 | Non-existent upload | GET `/uploads/nonexistent.jpg` | 404 | P2 |
| 12-4 | Image magic bytes check | Upload file with fake extension | Rejected | P1 |

---

## Summary

| Module | P0 | P1 | P2 | Total |
|--------|-----|-----|-----|-------|
| Auth | 6 | 8 | 3 | 17 |
| Posts | 9 | 6 | 1 | 16 |
| Replies | 2 | 1 | 1 | 4 |
| Users | 3 | 7 | 2 | 12 |
| Search | 2 | 1 | 1 | 4 |
| Notifications | 1 | 2 | 1 | 4 |
| Subscriptions | 2 | 2 | 1 | 5 |
| Ads | 0 | 1 | 1 | 2 |
| Affiliates | 0 | 2 | 1 | 3 |
| Discovery | 0 | 2 | 1 | 3 |
| Frontend Pages | 4 | 4 | 2 | 10 |
| File Upload | 1 | 2 | 1 | 4 |
| **Total** | **30** | **38** | **16** | **84** |

**Execution order**: P0 first (30 tests) -> P1 (38 tests) -> P2 (16 tests)
**Estimated execution time**: P0 ~45min, Full suite ~2h (manual)
