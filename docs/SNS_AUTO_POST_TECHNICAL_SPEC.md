# SNS Auto-Post Technical Specification
## Development Team Deliverable - 2026-03-02

---

## 1. OGP Implementation Audit (Current State)

### 1.1 Summary Table

| Area | Status | Coverage |
|------|--------|----------|
| Global Metadata (layout.tsx) | DONE | Full - title template, OG, Twitter Card, JSON-LD |
| Root OG Image (opengraph-image.tsx) | DONE | 1200x630px, Edge Runtime, next/og |
| Post Dynamic Metadata (/post/[id]) | DONE | generateMetadata + ISR 60s revalidate |
| Post Dynamic OG Image | MISSING | No /post/[id]/opengraph-image.tsx |
| Profile Metadata (/profile/[username]) | MISSING | No generateMetadata |
| Profile Dynamic OG Image | MISSING | No /profile/[username]/opengraph-image.tsx |
| Hashtag Metadata (/hashtag/[tag]) | MISSING | No generateMetadata |
| LP Page Metadata (/lp) | MISSING | Marketing page has no OGP |
| Partners Page Metadata (/partners) | MISSING | No OGP |
| Explore Page Metadata (/explore) | MISSING | No OGP |
| Dynamic Sitemap | MISSING | Static only (5 URLs) |
| robots.txt | DONE | Proper disallow for private routes |
| Schema.org | DONE | WebSite + SearchAction |

### 1.2 Working Components

- **Global metadata** in `frontend/src/app/layout.tsx`: title template `%s | Poker SNS`, OG type=website, locale=ja_JP, Twitter card=summary_large_image
- **Root OG image** in `frontend/src/app/opengraph-image.tsx`: Edge runtime, 1200x630px, dark green gradient with gold accents, suit symbols
- **Post detail OGP** in `frontend/src/app/post/[id]/page.tsx`: fetches `/posts/:id/meta` endpoint, dynamic title/description, conditional image (summary_large_image vs summary), ISR 60s
- **Backend meta endpoint**: `GET /posts/:id/meta` (@Public) returns author.name, author.username, content, imageUrl, createdAt

### 1.3 Critical Gaps for SNS Auto-Post

**Priority HIGH** - Required before auto-posting:

1. **Dynamic OG images for posts** (`/post/[id]/opengraph-image.tsx`)
   - Without this, shared post links show the generic root OG image on X/LINE/Discord
   - Need: post content preview, author avatar, poker hand visualization
   - Estimated effort: 1 day

2. **Profile page metadata** (`/profile/[username]/page.tsx`)
   - User profile links shared on SNS show no context
   - Need: generateMetadata with username, bio, avatar, follower count
   - Backend: add `GET /users/:username/meta` endpoint
   - Estimated effort: 0.5 day

3. **Dynamic sitemap** (`frontend/src/app/sitemap.ts`)
   - Current static sitemap only covers 5 pages
   - Need: include all public posts, user profiles, hashtag pages
   - Backend: add `GET /posts/sitemap` and `GET /users/sitemap` endpoints
   - Estimated effort: 0.5 day

4. **LP page metadata** (`/lp/page.tsx`)
   - Marketing/affiliate page is primary acquisition target
   - Must have compelling OG title/description/image for paid promotion
   - Estimated effort: 0.5 day

**Priority MEDIUM** - Post-launch improvement:

5. Hashtag page metadata and OG image
6. Explore page metadata
7. Partners page metadata

---

## 2. SNS API Plan Comparison

### 2.1 X (Twitter) API v2

| Plan | Monthly Cost | Write Limit | Read Limit | Key Features |
|------|-------------|-------------|------------|--------------|
| Free | $0 | 1,500 tweets/month | None (write only) | Post tweets, delete tweets, v2 only |
| Basic | $200/month | 50,000 tweets/month | 15,000 tweets/month | Read + write, 2 app environments |
| Pro | $5,000/month | 300,000 tweets/month | 1,000,000 tweets/month | Full firehose access, analytics |
| Pay-Per-Use (New Feb 2026) | Variable | Per-call pricing | From $0.005/read | Credit-based, ~$215/month moderate use |
| Enterprise | Custom ($$$) | Custom | Full access | Dedicated support, compliance streams |

**Recommendation**: Free plan (1,500 tweets/month = ~50 tweets/day) is sufficient for MVP auto-posting. Upgrade to Pay-Per-Use if engagement monitoring is needed.

**Technical Requirements**:
- OAuth 2.0 PKCE (already implemented in our X OAuth login flow)
- Reuse `auth.service.ts` X OAuth PKCE pattern for posting permissions
- Additional scope needed: `tweet.write`, `tweet.read`, `users.read`
- Media upload: separate endpoint `POST https://upload.twitter.com/1.1/media/upload.json`

### 2.2 YouTube Data API v3

| Item | Detail |
|------|--------|
| Cost | Free (quota-based) |
| Default Quota | 10,000 units/day |
| Video Upload Cost | 1,600 units/upload |
| Max Uploads/Day | ~6 videos (default quota) |
| Extended Quota | Apply via Google Cloud Console |
| Search Cost | 100 units/request |
| Read Cost | 1 unit/request |

**Recommendation**: Free tier sufficient. 6 videos/day is more than enough for auto-posting highlights. Apply for extended quota if content volume grows.

**Technical Requirements**:
- OAuth 2.0 (Google OAuth already implemented for login)
- Reuse `google.strategy.ts` with additional scope: `https://www.googleapis.com/auth/youtube.upload`
- Videos require: title, description, tags, thumbnail, privacyStatus
- Shorts format: vertical video <= 60 seconds, #Shorts in title/description
- Use resumable upload protocol for reliability

### 2.3 Instagram Graph API (via Meta)

| Item | Detail |
|------|--------|
| Cost | Free |
| Publish Limit | 25-50 posts/24 hours (API-published) |
| Reels Duration | Up to 90 seconds |
| Account Type | Business or Creator (linked to Facebook Page) |
| Approval Process | Meta App Review (weeks to months) |
| Content Types | Feed posts, Reels, Stories, Carousels |

**Recommendation**: Free but requires Meta App Review process. Start the review process immediately as it can take weeks.

**Technical Requirements**:
- Facebook Login + Instagram Graph API permissions
- Required permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`
- Two-step publish: `POST /{ig-user-id}/media` (create container) -> `POST /{ig-user-id}/media_publish` (publish)
- Reels: `media_type=REELS`, video_url, caption
- Feed images: `media_type=IMAGE`, image_url, caption
- Carousels: create children containers first, then carousel container

### 2.4 Cost Comparison Summary

| Platform | MVP Phase (Monthly) | Growth Phase (Monthly) |
|----------|-------------------|----------------------|
| X (Twitter) | $0 (Free, 1,500 tweets) | $200 (Basic) or ~$215 (Pay-Per-Use) |
| YouTube | $0 (Free, ~6 uploads/day) | $0 (Apply for extended quota) |
| Instagram | $0 (Free, 25-50 posts/day) | $0 (Free) |
| **Total** | **$0** | **$200-215** |

---

## 3. Backend Technical Architecture

### 3.1 Current State

- **Scheduler/Queue**: None exists. No @nestjs/schedule, Bull, or cron.
- **OAuth Foundation**: X (PKCE), Google, LINE already implemented
- **Post System**: Full CRUD with images, hashtags, mentions
- **Notification System**: Event-based (LIKE, FOLLOW, REPLY, MENTION, REPOST)
- **Rate Limiting**: @nestjs/throttler (60 req/60s globally)
- **Email**: nodemailer (synchronous, no queue)

### 3.2 Proposed Module Structure

```
backend/src/
  sns-auto-post/
    sns-auto-post.module.ts          # Module registration
    sns-auto-post.controller.ts      # Admin API endpoints
    sns-auto-post.service.ts         # Orchestration logic
    platforms/
      twitter.service.ts             # X API v2 integration
      youtube.service.ts             # YouTube Data API v3
      instagram.service.ts           # Instagram Graph API
      platform.interface.ts          # Common interface
    dto/
      create-auto-post.dto.ts
      auto-post-config.dto.ts
    entities/                        # Prisma schema additions
```

### 3.3 Required Dependencies

```bash
# Scheduler for cron-based auto-posting
npm install @nestjs/schedule

# HTTP client for API calls (already available via NestJS)
# axios is already a dependency

# Optional: Queue for reliable async processing
npm install @nestjs/bullmq bullmq
# Requires Redis (can share with session store later)
```

### 3.4 Database Schema Additions

```prisma
model SnsAutoPost {
  id            String   @id @default(uuid())
  postId        String
  post          Post     @relation(fields: [postId], references: [id])
  platform      String   // "twitter" | "youtube" | "instagram"
  platformPostId String? // ID returned by the platform
  status        String   @default("pending") // pending | posted | failed
  error         String?
  scheduledAt   DateTime?
  postedAt      DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status, scheduledAt])
  @@index([postId, platform])
}

model SnsCredential {
  id            String   @id @default(uuid())
  platform      String   // "twitter" | "youtube" | "instagram"
  accessToken   String   // Encrypted
  refreshToken  String?  // Encrypted
  expiresAt     DateTime?
  scope         String?
  metadata      Json?    // Platform-specific data (channel ID, page ID, etc.)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([platform])
}
```

### 3.5 Content Transformation Logic

| Source (poker_sns Post) | X (Twitter) | YouTube | Instagram |
|------------------------|-------------|---------|-----------|
| Post text (max 280/1000 chars) | Truncate to 280 + URL | Video description | Caption (max 2,200 chars) |
| Post image | Attach as media | Video thumbnail | Feed image or carousel |
| Poker hand data | Text summary + image | Full analysis video | Infographic Reel |
| Hashtags | Preserve (auto-add #poker) | Tags field | Preserve in caption |
| Author info | Credit in tweet | Channel branding | Not applicable (single account) |
| Post URL | Append shortened URL | Description link | Link in bio / caption |

**X (Twitter) Post Template**:
```
{post.content.substring(0, 200)}

{hashtags.join(' ')}
{postUrl}
```

**YouTube Shorts Description Template**:
```
{post.content}

Poker SNSで今すぐ議論に参加
{postUrl}

#poker #ポーカー #pokersns {additionalHashtags}
```

**Instagram Reel Caption Template**:
```
{post.content}

Poker SNSで詳細をチェック（プロフィールリンク参照）

{hashtags} #poker #ポーカー #pokersns
```

### 3.6 Auto-Post Flow

```
1. Trending Post Detection (Cron: every 1 hour)
   └─ Query posts with high engagement (likes > threshold) in last 24h
   └─ Filter: not already auto-posted, has image or poker hand
   └─ Create SnsAutoPost records with status="pending"

2. Post Processing (Cron: every 15 minutes)
   └─ Fetch pending SnsAutoPost records
   └─ For each record:
       ├─ Transform content for target platform
       ├─ Upload media if needed
       ├─ Call platform API to publish
       ├─ Update status to "posted" or "failed"
       └─ Log result for monitoring

3. Rate Limit Management
   └─ Track daily/monthly usage per platform
   └─ Pause posting when approaching limits
   └─ Alert via logging when 80% capacity reached
```

---

## 4. Frontend OGP Enhancement Implementation Plan

### 4.1 Dynamic OG Image for Posts (Phase 1 - HIGH)

File: `frontend/src/app/post/[id]/opengraph-image.tsx`

```typescript
// Concept: Generate dynamic OG image with post content
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const post = await fetch(`${API_BASE}/posts/${params.id}/meta`).then(r => r.json());

  return new ImageResponse(
    // Dark poker table background
    // Author name + avatar
    // Post content preview (max 3 lines)
    // Poker hand visualization if isPokerHand
    // Poker SNS branding + gold accents
  );
}
```

### 4.2 Profile Page Metadata (Phase 1 - HIGH)

File: `frontend/src/app/profile/[username]/page.tsx` - add generateMetadata

Backend: add `GET /users/:username/meta` endpoint returning:
- name, username, bio, avatarUrl, followerCount, postCount

### 4.3 Dynamic Sitemap (Phase 1 - HIGH)

File: `frontend/src/app/sitemap.ts` - enhance with dynamic data

Backend: add lightweight endpoints:
- `GET /posts/sitemap` - returns [{id, updatedAt}] for all public posts
- `GET /users/sitemap` - returns [{username, updatedAt}] for all users

### 4.4 LP Page OGP (Phase 1 - HIGH)

File: `frontend/src/app/lp/page.tsx` - add metadata export with compelling marketing copy

File: `frontend/src/app/lp/opengraph-image.tsx` - branded OG image for marketing

---

## 5. Implementation Phases

### Phase 1: OGP Completion (Priority: IMMEDIATE)
- [ ] Dynamic OG images for post pages
- [ ] Profile page metadata + OG image
- [ ] LP page metadata + OG image
- [ ] Dynamic sitemap with posts/users
- **Estimated effort**: 3 days
- **Impact**: All SNS shares (manual and auto) display rich previews

### Phase 2: Auto-Post Infrastructure (Priority: HIGH)
- [ ] Install @nestjs/schedule
- [ ] Create sns-auto-post module scaffold
- [ ] Add SnsAutoPost and SnsCredential Prisma models
- [ ] Implement platform interface and base service
- [ ] Admin dashboard for monitoring
- **Estimated effort**: 3 days

### Phase 3: X (Twitter) Integration (Priority: HIGH)
- [ ] Implement twitter.service.ts with post/media upload
- [ ] Reuse existing PKCE OAuth flow for app-level tokens
- [ ] Trending post detection cron job
- [ ] Content transformation for tweets
- [ ] Error handling and retry logic
- **Estimated effort**: 3 days

### Phase 4: YouTube Integration (Priority: MEDIUM)
- [ ] Implement youtube.service.ts with Shorts upload
- [ ] Extend Google OAuth with upload scope
- [ ] Poker hand to video conversion (or static image + narration)
- [ ] Thumbnail generation from post content
- **Estimated effort**: 5 days (video generation complexity)

### Phase 5: Instagram Integration (Priority: MEDIUM)
- [ ] Meta App Review submission (start ASAP - weeks lead time)
- [ ] Implement instagram.service.ts with Reels/Feed publishing
- [ ] Facebook Page linking workflow
- [ ] Image/video content adaptation for Reels format
- **Estimated effort**: 4 days (+ Meta review wait time)

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| X Free tier 1,500/month limit | LOW | Sufficient for MVP; upgrade to Pay-Per-Use if needed |
| Meta App Review delay (weeks) | HIGH | Submit review request immediately in Phase 2 |
| YouTube video generation complexity | MEDIUM | Start with static image + text overlay approach |
| OAuth token expiration during auto-post | MEDIUM | Implement token refresh in SnsCredential model |
| Rate limit exceeded during peak | LOW | Track usage + pause + alert mechanism |
| Content quality on auto-generated posts | MEDIUM | Admin review queue before publishing (optional) |

---

## 7. Dependencies on Other Teams

| Dependency | From Team | Blocker For |
|------------|-----------|-------------|
| OG image design templates (3 sizes) | Design | Phase 1 - OGP dynamic images |
| OGP card E2E test cases | QA | Phase 1 - Validation |
| OAuth token encryption design | DevSecOps | Phase 2 - SnsCredential storage |
| Job scheduler failure handling spec | Operations | Phase 2 - Cron/queue setup |
| API plan budget approval | Planning | Phase 3+ - Platform integrations |

---

## Appendix: Existing Reusable Code

| Component | Location | Reuse For |
|-----------|----------|-----------|
| X OAuth PKCE flow | `backend/src/auth/auth.service.ts:545-656` | Twitter auto-post auth |
| Google OAuth strategy | `backend/src/auth/strategies/google.strategy.ts` | YouTube auth scope extension |
| OG image generation | `frontend/src/app/opengraph-image.tsx` | Design pattern for dynamic OG images |
| Post meta endpoint | `backend/src/posts/posts.controller.ts` (GET /:id/meta) | Data source for OG images |
| Image upload infrastructure | `backend/src/posts/posts.controller.ts` (upload-image) | Media preparation for SNS APIs |
| Throttler config | `backend/src/app.module.ts` | Rate limit pattern for SNS endpoints |
