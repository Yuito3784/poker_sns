# Phase 2: マーケティング基盤 — 統合サブタスク一覧 v1

**作成日**: 2026-03-02
**作成者**: Planning (常闇)
**対象期間**: Week 2〜3
**ステータス**: In Progress

---

## 0. 現状アセスメント (調査結果)

### 実装済み

| 項目 | ファイル | 状態 |
|------|---------|------|
| グローバルOG画像 | `app/opengraph-image.tsx` | 色修正必要 (緑→ダーク) |
| 投稿OG画像 | `app/post/[id]/opengraph-image.tsx` | **BUG**: `_count`未返却で統計値0表示 |
| 投稿generateMetadata | `app/post/[id]/page.tsx` | 動作中 |
| グローバルメタデータ | `app/layout.tsx` | 正常 |
| JSON-LD (WebSite) | `app/layout.tsx` | グローバルのみ |
| sitemap.ts | `app/sitemap.ts` | 5静的URLのみ |
| robots.ts | `app/robots.ts` | 基本設定済み |
| `/posts/:id/meta` API | `posts.controller.ts` | @Public, キャッシュヘッダ付き |
| シェアボタン (Feed) | `PostItem.tsx:337-401` | X + LINE + Copy。テーマ色OK |
| シェアボタン (Detail) | `PostDetailClient.tsx:349-451` | X + LINE + Copy。**色不整合あり** |
| Toast | `ToastContext.tsx` | 3タイプ (success/error/info) |
| フォント | `layout.tsx` | Noto Sans JP, Playfair, Geist |
| nginx OGキャッシュ | `nginx-prod.conf` | 24h image cache, rate limit |

### 未実装

| 項目 | 依存 |
|------|------|
| プロフィールOG画像 | `/users/:username` 公開API (存在済み) |
| プロフィールgenerateMetadata | SSR化 or Server Component分離が必要 |
| ハッシュタグgenerateMetadata | ページが`"use client"`のため要分離 |
| LP最適化メタデータ | ページが`"use client"`のため要分離 |
| 動的サイトマップ | バックエンドAPI追加必要 |
| JSON-LD (Article/Person) | ページ単位で追加 |
| GA4 | 未設置 |
| カスタムイベント | GA4後 |
| UTMパラメータ | シェアURL + アフィリエイトredirect |
| Web Share API | navigator.share() 未実装 |
| Discordシェア | 未実装 |

### 発見したバグ

| ID | 重要度 | 内容 | 修正箇所 |
|----|--------|------|----------|
| BUG-001 | **HIGH** | `getPostMeta()` が `_count` を返さない → OG画像の統計値が常に0 | `posts.service.ts:601-614` に `_count: { select: { likes:true, replies:true, reposts:true } }` 追加 |
| BUG-002 | MEDIUM | ハッシュタグページが旧テーマ (緑/amber) | `hashtag/[tag]/page.tsx` 全体 |
| BUG-003 | MEDIUM | プロフィールページが旧テーマ (白/blue) | `profile/[username]/page.tsx` 全体 |
| BUG-004 | LOW | PostDetailClient `border-neutral-100` → `border-[#1f2a1e]` | `PostDetailClient.tsx:207` |

---

## 1. タスク2-1: OGP動的画像の完成

### 依存関係マップ

```
BUG-001修正 ──┐
              ├─→ 2-1-5 (Template A再実装)
2-1-1 デザイン ┘
                      │
2-1-2 デザイン ──────→ 2-1-6 (Template B新規)
                      │
2-1-3 デザイン ──────→ 2-1-7 (Template C修正)
                      │
                      ├─→ 2-1-8 (profile generateMetadata)
                      ├─→ 2-1-9 (hashtag generateMetadata)
                      └─→ 2-1-10 (LP metadata最適化)
```

### サブタスク詳細

#### 2-1-0: [BUG-001] getPostMeta に _count 追加 (Dev, Blocker)

**ファイル**: `backend/src/posts/posts.service.ts:601-614`

**現状**:
```typescript
select: {
  id: true, content: true, imageUrl: true,
  author: { select: { name: true, username: true, avatarUrl: true } },
  createdAt: true,
  // _count が無い
}
```

**修正要件**:
```typescript
select: {
  id: true, content: true, imageUrl: true,
  author: { select: { name: true, username: true, avatarUrl: true } },
  createdAt: true,
  _count: { select: { likes: true, replies: true, reposts: true } },
}
```

**担当**: Development
**優先度**: P0 (2-1-5のBlocker)
**工数見積**: 5分

---

#### 2-1-1: Template A デザイン確認 (Design)

**ステータス**: 仕様確定済み (`docs/DESIGN_SPEC_OGP_SHARE.md` 1.3節)

既存仕様を確認:
- 1200x630px、ダークグラデーション背景 (`#0d1009 → #131a14 → #0d1009`)
- カードスート透かし (opacity 0.03, 220px)
- 著者アバター 48x48、ゴールドボーダー 2px `#c9a84c`
- 投稿テキスト: 28px, `#ddd6c8`, max 120文字 3行
- 統計表示: 18px, `#7a7260`
- ロゴ: "Poker SNS" 24px Playfair Display `#c9a84c`

**担当**: Design (確認のみ、仕様は確定済み)
**工数見積**: レビュー30分

---

#### 2-1-2: Template B デザイン確認 (Design)

**ステータス**: 仕様確定済み (`docs/DESIGN_SPEC_OGP_SHARE.md` 1.4節)

- 中央レイアウト
- アバター 80x80, border 3px `#c9a84c`
- 表示名: 36px bold `#ddd6c8`
- @username: 22px `#c9a84c`
- Bio: 20px `#7a7260`, max 80文字

**担当**: Design (確認のみ)
**工数見積**: レビュー30分

---

#### 2-1-3: Template C 色修正 (Dev)

**ファイル**: `frontend/src/app/opengraph-image.tsx`

**変更一覧** (DESIGN_SPEC準拠):

| 要素 | 現在の値 | 修正後 |
|------|---------|--------|
| 背景グラデーション | `#0f1e12, #1a2f1c, #0d1a0f` | `#0d1009, #131a14, #0d1009` |
| ロゴスペード | `#fbbf24, #d97706` | `#c9a84c, #9a7c35` |
| ロゴテキスト | `#e8f0e6` | `#ddd6c8` |
| タグライン | `#8ba388` | `#7a7260` |
| Feature chipのbg | `rgba(245,158,11,0.12)` | `rgba(201,168,76,0.12)` |
| Feature chipのborder | `rgba(245,158,11,0.3)` | `rgba(201,168,76,0.3)` |
| Feature chipのtext | `#fbbf24` | `#c9a84c` |

**担当**: Development
**依存**: なし (独立タスク)
**優先度**: P1

---

#### 2-1-5: Template A 再実装 (Dev)

**ファイル**: `frontend/src/app/post/[id]/opengraph-image.tsx` (既存ファイル修正)

**現状**: 実装済みだが、デザイン仕様との差分確認が必要。BUG-001修正が前提。

**要件**:
- `GET /posts/${id}/meta` API使用 (修正後: `_count`含む)
- ImageResponse でダイナミックレンダリング
- Cache: `max-age=3600, s-maxage=86400` (現状 revalidate:60 → 要調整)
- 日本語フォント: Noto Sans JP (next/font/google で既にロード済み。ただしEdge RuntimeのImageResponseではGoogle Fontsからfetch必要)

**フォント対応要件** (Edge Runtime制約):
```typescript
// ImageResponse内ではnext/fontは使えない。直接fetchが必要:
const notoSansJP = await fetch(
  new URL('https://fonts.gstatic.com/s/notosansjp/v52/...woff2')
).then(res => res.arrayBuffer());
// または、publicディレクトリにwoff2を配置してローカルfetch
```

**担当**: Development
**依存**: BUG-001修正、2-1-1 デザインレビュー
**優先度**: P1

---

#### 2-1-6: Template B 新規作成 (Dev)

**新規ファイル**: `frontend/src/app/profile/[username]/opengraph-image.tsx`

**データソース**: `GET /users/${username}` (公開API、認証不要)

**レスポンス形式** (既存):
```json
{
  "id": "...", "name": "...", "username": "...",
  "bio": "...", "avatarUrl": "...",
  "subscriptionStatus": "active|canceled|null",
  "_count": { "followers": 0, "following": 0, "posts": 0 }
}
```

**実装仕様**:
- runtime: "edge"
- size: { width: 1200, height: 630 }
- DESIGN_SPEC_OGP_SHARE.md 1.4節準拠のレイアウト
- avatarUrl がある場合は画像fetch、なければイニシャル表示
- Cache: `max-age=3600, s-maxage=86400`

**担当**: Development
**依存**: 2-1-2 デザインレビュー
**優先度**: P1

---

#### 2-1-7: Template C 修正実装 (Dev)

2-1-3と同一タスク。色修正の実装。

---

#### 2-1-8: /profile/[username] に generateMetadata 追加 (Dev)

**課題**: 現在 `profile/[username]/page.tsx` は `"use client"` コンポーネント。`generateMetadata` は Server Component でのみ使用可能。

**実装方針**:
1. `page.tsx` を Server Component に変更
2. `generateMetadata()` でSSRメタデータ生成
3. クライアントロジックを `ProfileClient.tsx` に分離
4. `page.tsx` で `<ProfileClient username={username} />` をレンダリング

**メタデータ仕様**:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { username } = await params;
  const res = await fetch(`${API_BASE}/users/${username}`, { next: { revalidate: 60 } });
  if (!res.ok) return { title: 'ユーザーが見つかりません' };
  const user = await res.json();
  return {
    title: `${user.name} (@${user.username})`,
    description: user.bio || `${user.name}のプロフィール - Poker SNS`,
    openGraph: {
      type: 'profile',
      username: user.username,
      title: `${user.name} (@${user.username})`,
      description: user.bio || `${user.name}のプロフィール`,
    },
    twitter: { card: 'summary_large_image' },
  };
}
```

**同時修正**: BUG-003 (プロフィールページの旧テーマ色) は本タスクのスコープ外とするが、Development側で可能なら同時対応を推奨。

**担当**: Development
**依存**: なし (独立タスク)
**優先度**: P1

---

#### 2-1-9: /hashtag/[tag] に generateMetadata 追加 (Dev)

**課題**: 同様に `"use client"` ページ。Server/Client分離が必要。

**実装方針**: 2-1-8と同じアプローチ。

**メタデータ仕様**:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  return {
    title: `#${decodedTag} の投稿`,
    description: `#${decodedTag} に関するポーカーの投稿一覧 - Poker SNS`,
    openGraph: {
      title: `#${decodedTag} の投稿 - Poker SNS`,
      description: `#${decodedTag} タグの投稿を見る`,
    },
    twitter: { card: 'summary' },
  };
}
```

**同時修正**: BUG-002 (ハッシュタグページの旧テーマ色) はスコープ外だが同時対応推奨。

**担当**: Development
**依存**: なし
**優先度**: P2

---

#### 2-1-10: /lp メタデータ最適化 (Dev)

**課題**: `"use client"` ページ。

**実装方針**: `metadata` 定数を別のServer Component `page.tsx` でexportし、`LPClient.tsx` に分離。

**メタデータ仕様**:
```typescript
export const metadata: Metadata = {
  title: 'Poker SNS - 日本初のポーカー特化SNS',
  description: 'ポーカーハンドの共有・レビュー・議論ができるSNS。GTO戦略の学習やハンドレビューに最適。無料で始められます。',
  keywords: ['ポーカー SNS', 'ポーカー ハンドレビュー', 'GTO 勉強', 'テキサスホールデム', 'ポーカー コミュニティ'],
  openGraph: {
    type: 'website',
    title: 'Poker SNS - 日本初のポーカー特化SNS',
    description: 'ポーカーハンドの共有・議論ができるSNS。戦略を磨こう。',
    url: `${SITE_URL}/lp`,
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: `${SITE_URL}/lp` },
};
```

**担当**: Development
**依存**: なし
**優先度**: P2

---

## 2. タスク2-2: SEO強化

### 依存関係マップ

```
2-2-1 動的sitemap ──→ バックエンドAPI (sitemap用) 必要
2-2-2 JSON-LD ─────→ 各ページのgenerateMetadata完了後 (2-1-8, 2-1-9)
2-2-3 canonical URL ─→ 各ページのgenerateMetadata内で設定
2-2-4 robots.txt ───→ 独立
2-2-5 Core Web Vitals → 本番デプロイ後
2-2-6 Search Console → 本番デプロイ後 + sitemap完了後
2-2-7 キーワードリサーチ → 独立 (Planning)
2-2-8 LP最適化 ─────→ 2-2-7完了後
```

### サブタスク詳細

#### 2-2-1: 動的サイトマップ実装 (Dev)

**ファイル**: `frontend/src/app/sitemap.ts` (既存を上書き)

**バックエンドAPI新規追加 (2件)**:

1. `GET /posts/sitemap` — 直近7日のいいね上位100件
   - `@Public()`, `@Throttle({ default: { ttl: 60000, limit: 5 } })`
   - `Cache-Control: public, max-age=3600`
   - レスポンス: `[{ id: string, updatedAt: string }]`
   - Prismaクエリ: `orderBy: { likes: { _count: 'desc' } }, where: { createdAt: { gte: 7日前 } }, take: 100`

2. `GET /users/sitemap` — アクティブユーザー (投稿5件以上)
   - `@Public()`, `@Throttle({ default: { ttl: 60000, limit: 5 } })`
   - `Cache-Control: public, max-age=3600`
   - レスポンス: `[{ username: string, updatedAt: string }]`
   - Prismaクエリ: `where: { posts: { _count: { gte: 5 } } }`

3. ハッシュタグ — フロントエンドで既存 `GET /posts/hashtag/:tag` を使わず、新規 `GET /posts/hashtags/active` を検討
   - 投稿10件以上のハッシュタグ一覧
   - 代替案: Prisma の `groupBy` でhashtag集計

**フロントエンド sitemap.ts 仕様**:
```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, users] = await Promise.all([
    fetch(`${API_BASE}/posts/sitemap`, { next: { revalidate: 3600 } }).then(r => r.json()),
    fetch(`${API_BASE}/users/sitemap`, { next: { revalidate: 3600 } }).then(r => r.json()),
  ]);

  return [
    // 静的ページ
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/explore`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/lp`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/partners`, changeFrequency: 'weekly', priority: 0.6 },
    // 動的ページ
    ...posts.map(p => ({
      url: `${SITE_URL}/post/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...users.map(u => ({
      url: `${SITE_URL}/profile/${u.username}`,
      lastModified: u.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
```

**担当**: Development (BE + FE)
**依存**: バックエンドAPI 2件の新規実装
**優先度**: P1

---

#### 2-2-2: JSON-LD 構造化データ追加 (Dev)

**投稿ページ** (`post/[id]/page.tsx` の generateMetadata 内 or layout):
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "投稿テキスト(truncated 110chars)",
  "author": { "@type": "Person", "name": "著者名", "url": "SITE_URL/profile/username" },
  "datePublished": "2026-03-02T...",
  "publisher": { "@type": "Organization", "name": "Poker SNS" },
  "image": "画像URL or OGP画像URL"
}
```

**プロフィールページ** (`profile/[username]/page.tsx`):
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "表示名",
  "description": "bio",
  "url": "SITE_URL/profile/username"
}
```

**LP** (`lp/page.tsx`):
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Poker SNS",
  "description": "ポーカーハンドを共有・議論できるSNS",
  "applicationCategory": "SocialNetworkingApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY",
    "description": "無料プラン"
  }
}
```

**担当**: Development
**依存**: 2-1-8, 2-1-9 (Server Component分離後に配置)
**優先度**: P2

---

#### 2-2-3: canonical URL 設定 (Dev)

全generateMetadata内に `alternates.canonical` を追加。

| ページ | canonical |
|--------|-----------|
| `/post/[id]` | `${SITE_URL}/post/${id}` |
| `/profile/[username]` | `${SITE_URL}/profile/${username}` |
| `/hashtag/[tag]` | `${SITE_URL}/hashtag/${tag}` |
| `/lp` | `${SITE_URL}/lp` |
| `/explore` | `${SITE_URL}/explore` |
| `/partners` | `${SITE_URL}/partners` |

**担当**: Development (各generateMetadata実装時に同時対応)
**優先度**: P2

---

#### 2-2-4: robots.txt 最適化 (Dev)

**ファイル**: `frontend/src/app/robots.ts`

**追加disallow**:
```typescript
disallow: [
  '/settings',
  '/bookmarks',
  '/notifications',
  '/api/',          // 追加: APIパス除外
  '/auth/',         // 追加: 認証パス除外
  '/_next/',        // 追加: Next.js内部パス
],
```

**担当**: Development
**依存**: なし
**優先度**: P3

---

#### 2-2-5: Core Web Vitals 計測・改善 (Dev + QA)

**本番デプロイ後に実施**。

チェックリスト:
- [ ] Lighthouse スコア計測 (モバイル + デスクトップ)
- [ ] LCP: 最大画像の`loading="lazy"` + `priority` 属性確認
- [ ] CLS: 画像にwidth/height指定確認
- [ ] フォント: `font-display: swap` 確認 (next/font/google はデフォルトswap)
- [ ] 未使用JS削除 (bundle analyzer)
- [ ] 目標: Lighthouse Performance 90+

**担当**: Development + QA
**依存**: 本番デプロイ完了
**優先度**: P3

---

#### 2-2-6: Google Search Console 登録 (Planning + DevSecOps)

**本番デプロイ後に実施**。

手順:
1. Search Console でプロパティ追加 (URL prefix)
2. DNS TXTレコード or HTMLファイルで所有権確認
3. sitemap.xml を送信
4. インデックス登録リクエスト (主要ページ5件)

**担当**: Planning (申請) + DevSecOps (DNS設定)
**依存**: 本番デプロイ + sitemap完了
**優先度**: P2

---

#### 2-2-7: ポーカー関連キーワードリサーチ (Planning)

**ツール**: Google Keyword Planner, Ubersuggest, ラッコキーワード

**調査対象キーワード**:
| カテゴリ | キーワード候補 |
|---------|--------------|
| ブランド | ポーカー SNS, ポーカー コミュニティ |
| 機能訴求 | ポーカー ハンドレビュー, ハンド共有, ポーカー 記録 |
| 学習系 | GTO 勉強, ポーカー 戦略, テキサスホールデム 勉強法 |
| ツール系 | ポーカー ハンド分析, ポーカー トラッカー |
| 競合比較 | PokerStove 代替, GTO Wizard 日本語 |

**成果物**: キーワードリスト (検索ボリューム + 競合度 + 推奨ページ)

**担当**: Planning
**依存**: なし (独立タスク、先行着手可)
**優先度**: P1

---

#### 2-2-8: LP ヘッドライン最適化 (Dev + Planning)

**ファイル**: `frontend/src/app/lp/page.tsx`

2-2-7のキーワードリサーチ結果に基づき、以下を最適化:
- ヒーローセクションの見出し → 主要キーワードを含む
- サブヘッドライン → ベネフィット訴求 + キーワード
- Feature説明文 → 検索意図に合わせた文言
- CTAテキスト → アクション誘導

**担当**: Development (実装) + Planning (文言策定)
**依存**: 2-2-7完了後
**優先度**: P2

---

## 3. タスク2-3: アナリティクス導入

### 依存関係マップ

```
GA4アカウント作成 ──→ 2-3-1 設置 ──→ 2-3-2 カスタムイベント
                                    ──→ 2-3-3 UTMパラメータ
                                    ──→ 2-3-4 ファネル設定
                                    ──→ 2-3-5 ダッシュボード
2-3-6 A/Bテスト ─────→ 独立調査
```

### サブタスク詳細

#### 2-3-1: GA4 設置 (Dev)

**前提**: GA4 プロパティ作成 + 測定ID取得 (Planning が実施)

**ファイル**: `frontend/src/app/layout.tsx`

**実装方針**: Next.js の `<Script>` コンポーネントを使用

```typescript
import Script from 'next/script';

// layout.tsx の <head> or <body> 内:
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
  strategy="afterInteractive"
/>
<Script id="ga4-config" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      page_path: window.location.pathname,
    });
  `}
</Script>
```

**環境変数**: `NEXT_PUBLIC_GA_MEASUREMENT_ID` を `.env` に追加

**注意**: プレミアムユーザーの広告非表示とGA4は別物。GA4はプレミアムでも計測する。

**担当**: Development
**依存**: GA4プロパティ作成 (Planning)
**優先度**: P1

---

#### 2-3-2: カスタムイベント計測 (Dev)

**ユーティリティ関数作成**: `frontend/src/lib/analytics.ts`

```typescript
export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}
```

**イベント一覧と埋め込み箇所**:

| イベント名 | パラメータ | 埋め込みファイル |
|-----------|-----------|----------------|
| `sign_up` | `method: 'email'\|'google'\|'line'\|'x'` | AuthContext.tsx (register後) |
| `login` | `method: 'email'\|'google'\|'line'\|'x'\|'magic_link'` | AuthContext.tsx (login後) |
| `post_create` | `has_poker_hand: boolean` | 投稿フォームsubmit後 |
| `post_like` | `post_id: string` | PostItem.tsx (like handler) |
| `post_repost` | `post_id: string` | PostItem.tsx (repost handler) |
| `post_bookmark` | `post_id: string` | PostItem.tsx (bookmark handler) |
| `affiliate_click` | `partner_slug: string` | パートナーカード click handler |
| `subscription_checkout` | — | Stripe checkout redirect時 |
| `subscription_cancel` | — | 解約処理実行時 |
| `share_click` | `platform: 'x'\|'line'\|'discord'\|'copy'\|'native'` | シェアボタン各click handler |

**担当**: Development
**依存**: 2-3-1 完了後
**優先度**: P1

---

#### 2-3-3: UTMパラメータ付与 (Dev)

**1. SNSシェアリンク**:

シェアボタンのURL生成時に付与:
```
?utm_source=pokersns&utm_medium=share&utm_campaign=post_share
```

**対象ファイル**: `PostItem.tsx`, `PostDetailClient.tsx` のX/LINE/Discordシェア部分

**2. アフィリエイトリダイレクト**:

**ファイル**: `backend/src/affiliates/affiliates.service.ts`

`redirect()` メソッドで、destination URLにUTMを追加:
```typescript
const url = new URL(partner.affiliateUrl);
url.searchParams.set('utm_source', 'pokersns');
url.searchParams.set('utm_medium', 'affiliate');
url.searchParams.set('utm_campaign', partner.slug);
return url.toString();
```

**担当**: Development
**依存**: なし (独立タスク)
**優先度**: P2

---

#### 2-3-4: コンバージョンファネル設定 (Planning + Data)

GA4の管理画面で設定:
1. LP訪問 (`page_view` where `page_path = '/lp'`)
2. 新規登録 (`sign_up`)
3. 初回投稿 (`post_create` where `engagement_count = 1`)
4. プレミアム課金 (`subscription_checkout`)

**担当**: Planning (GA4設定)
**依存**: 2-3-1, 2-3-2 完了後
**優先度**: P2

---

#### 2-3-5: ダッシュボード構築 (Planning + Data)

**ツール**: Looker Studio (旧 Data Studio) + GA4 データソース

**指標**:
| 指標 | ソース | 計算 |
|------|--------|------|
| DAU/WAU/MAU | GA4 Active Users | 標準レポート |
| 新規登録数 | `sign_up` イベント | 日次カウント |
| 課金転換率 | `subscription_checkout` / `sign_up` | 期間別 |
| アフィリエイトクリック数 | `affiliate_click` | partner_slug別 |

**担当**: Planning
**依存**: 2-3-2 (イベント計測稼働後)
**優先度**: P3

---

#### 2-3-6: A/Bテスト基盤検討 (Planning)

**候補**:
| ツール | 特徴 | コスト |
|--------|------|--------|
| Vercel Flags | Vercelネイティブ、Edge対応 | Vercel Pro ($20/月) |
| PostHog | OSS、自己ホスト可 | 無料〜 |
| GA4 experiments | GA4内蔵 | 無料 |

**推奨**: GA4 experiments (追加コストなし、既にGA4導入済み)

**担当**: Planning (調査・レポート)
**優先度**: P3

---

## 4. タスク2-4: シェア機能の強化

### サブタスク詳細

#### 2-4-1: Web Share API 対応 (Dev)

**ファイル**: `PostItem.tsx`, `PostDetailClient.tsx`

**実装仕様**:
```typescript
const handleNativeShare = async () => {
  const shareData = {
    title: 'Poker SNS',
    text: post.content?.slice(0, 100),
    url: `${SITE_URL}/post/${post.id}?utm_source=pokersns&utm_medium=share&utm_campaign=post_share`,
  };
  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    trackEvent('share_click', { platform: 'native' });
  } else {
    // フォールバック: 既存のX/LINE/Copyボタンを表示
  }
};
```

**表示制御**: モバイルでは `navigator.share` 対応時にネイティブシェアボタンを優先表示。非対応時は従来のX/LINE/Copyを表示。

**担当**: Development
**優先度**: P2

---

#### 2-4-2: リンクコピー改善 (Dev)

**現状**: PostItem.tsx では成功時にチェックマーク表示 (1.5s)。PostDetailClient.tsx も同様。

**改善**: ToastContext を使用してトースト通知を追加。

```typescript
const { showToast } = useToast();

const handleCopyLink = async () => {
  await navigator.clipboard.writeText(url);
  showToast('リンクをコピーしました');
  trackEvent('share_click', { platform: 'copy' });
};
```

**担当**: Development
**優先度**: P3

---

#### 2-4-3: シェアボタン色統一 (Dev)

**対象**: `PostDetailClient.tsx` (PostItem.tsx は既にテーマ準拠)

**変更箇所** (DESIGN_SPEC_OGP_SHARE.md 2.2節準拠):

| 要素 | 現在 | 修正後 |
|------|------|--------|
| Idle色 | `text-neutral-500` | `text-[#4a5245]` |
| Copy hover | `hover:text-blue-500` | `hover:text-[#c9a84c]` |
| X hover | `hover:text-neutral-900` | `hover:text-[#ddd6c8]` |
| 成功チェック | `text-emerald-500` | `text-[#c9a84c]` |
| 区切りボーダー | `border-neutral-100` | `border-[#1f2a1e]` |

**担当**: Development
**依存**: なし
**優先度**: P2

---

#### 2-4-4: Discord シェアボタン追加 (Dev)

**実装**: Discordにはネイティブシェアインテントがないため、URLコピー + Discord webhook or 単純URLコピーが現実的。

**推奨方式**: Discord用テキストをクリップボードにコピー (マークダウン形式)
```
[投稿タイトル](URL) - Poker SNS で共有
```

**代替方式**: Discord上でのEmbed表示はOGPが自動対応するため、URLコピーのみで十分。ボタンとしては「Discordで共有」アイコン + クリップボードコピー。

**アイコン**: Discord ブランドカラー `#5865F2` (hover時)

**担当**: Development
**優先度**: P3

---

#### 2-4-5: ポーカーハンド投稿の特別シェアフォーマット (Dev)

**条件**: `post.isPokerHand === true` かつ `post.pokerHand` が存在

**Xシェア時のテキストフォーマット**:
```
[NLH ${blinds}] ${heroPosition} with ${heroHand}
Result: ${result}
詳細はPoker SNSで → ${URL}
```

**例**:
```
[NLH $1/$2] BTN with A♠K♥
Result: +$45
詳細はPoker SNSで → https://pokersns.jp/post/xxx
```

**担当**: Development
**依存**: 既存のpokerHand data構造を使用
**優先度**: P3

---

## 5. 実行優先度マトリクス

### P0 (Blocker — 即座に修正)

| ID | タスク | 担当 | 工数 |
|----|--------|------|------|
| 2-1-0 | getPostMeta _count バグ修正 | Dev | 5min |

### P1 (Week 2 完了目標)

| ID | タスク | 担当 | 依存 |
|----|--------|------|------|
| 2-1-3/7 | Template C 色修正 | Dev | なし |
| 2-1-5 | Template A 再実装 | Dev | 2-1-0 |
| 2-1-6 | Template B 新規 | Dev | なし |
| 2-1-8 | profile generateMetadata | Dev | なし |
| 2-2-1 | 動的サイトマップ | Dev (BE+FE) | BE API追加 |
| 2-2-7 | キーワードリサーチ | Planning | なし |
| 2-3-1 | GA4設置 | Dev | GA4プロパティ |
| 2-3-2 | カスタムイベント | Dev | 2-3-1 |

### P2 (Week 3 完了目標)

| ID | タスク | 担当 | 依存 |
|----|--------|------|------|
| 2-1-9 | hashtag generateMetadata | Dev | なし |
| 2-1-10 | LP metadata最適化 | Dev | なし |
| 2-2-2 | JSON-LD | Dev | 2-1-8, 2-1-9 |
| 2-2-3 | canonical URL | Dev | 各metadata |
| 2-2-6 | Search Console | Planning+DevSecOps | 本番 |
| 2-2-8 | LP文言最適化 | Dev+Planning | 2-2-7 |
| 2-3-3 | UTMパラメータ | Dev | なし |
| 2-3-4 | ファネル設定 | Planning | 2-3-2 |
| 2-4-1 | Web Share API | Dev | なし |
| 2-4-3 | シェアボタン色統一 | Dev | なし |

### P3 (Week 3+ / 本番後)

| ID | タスク | 担当 | 依存 |
|----|--------|------|------|
| 2-2-4 | robots.txt最適化 | Dev | なし |
| 2-2-5 | Core Web Vitals | Dev+QA | 本番 |
| 2-3-5 | ダッシュボード | Planning | 2-3-2 |
| 2-3-6 | A/Bテスト検討 | Planning | なし |
| 2-4-2 | コピー改善 | Dev | なし |
| 2-4-4 | Discord シェア | Dev | なし |
| 2-4-5 | ポーカーハンドフォーマット | Dev | なし |

---

## 6. バックエンド新規API仕様 (Dev向け)

### API-001: GET /posts/sitemap

```
Controller: PostsController
Decorator: @Public(), @Get('sitemap'), @Throttle({ default: { ttl: 60000, limit: 5 } })
Header: Cache-Control: public, max-age=3600
Response: [{ id: string, updatedAt: string }]
Query: 直近7日のいいね上位100件
```

### API-002: GET /users/sitemap

```
Controller: UsersController
Decorator: @Public(), @Get('sitemap'), @Throttle({ default: { ttl: 60000, limit: 5 } })
Header: Cache-Control: public, max-age=3600
Response: [{ username: string, updatedAt: string }]
Query: 投稿5件以上のアクティブユーザー
```

### API-003: GET /posts/hashtags/active (Optional)

```
Controller: PostsController
Decorator: @Public(), @Get('hashtags/active'), @Throttle({ default: { ttl: 60000, limit: 5 } })
Header: Cache-Control: public, max-age=3600
Response: [{ tag: string, count: number }]
Query: 投稿10件以上のハッシュタグ
```

---

## 7. QA検証項目 (QA向け)

### OGP検証

| 検証項目 | ツール | 期待結果 |
|---------|--------|---------|
| 投稿OGP画像 | X Card Validator | 1200x630画像表示、統計値正常 |
| 投稿OGP画像 | LINE URL Preview | 画像 + タイトル + 説明 |
| 投稿OGP画像 | Discord Link Preview | Embed表示 + 画像 |
| プロフィールOGP | 上記3ツール | アバター + 名前 + bio表示 |
| グローバルOGP | 上記3ツール | ブランドカラー統一 |
| メタデータ | curl + grep | og:title, og:description, og:image 存在確認 |
| JSON-LD | Google Rich Results Test | Article/Person スキーマ valid |

### SEO検証

| 検証項目 | ツール | 期待結果 |
|---------|--------|---------|
| sitemap.xml | ブラウザ直アクセス | 動的URL 100件以上 |
| robots.txt | ブラウザ直アクセス | /api/, /auth/ disallow |
| canonical | curl | 全動的ページにcanonical存在 |
| Lighthouse | Chrome DevTools | Performance 90+ |

### Analytics検証

| 検証項目 | ツール | 期待結果 |
|---------|--------|---------|
| GA4 pageview | GA4 Realtime | ページ遷移で計測 |
| カスタムイベント | GA4 DebugView | 全10イベント発火確認 |
| UTMパラメータ | GA4 Traffic | utm_source=pokersns で流入確認 |

---

**各部門は上記を参照し、P0→P1→P2→P3の順で着手してください。**
**質問・ブロッカーは即座に Planning (常闇) へエスカレーション。**
