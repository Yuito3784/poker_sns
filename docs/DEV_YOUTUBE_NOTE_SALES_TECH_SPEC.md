# Development技術仕様書: YouTube・note・営業活動

**作成日**: 2026-03-07
**担当**: Development (兎田・白銀)
**ステータス**: v1 ドラフト

---

## 1. YouTube OEmbed埋め込み対応

### 1.1 技術スコープ

poker_sns投稿内にYouTube動画リンクが含まれる場合、自動的にレスポンシブなiframeプレーヤーを表示する。

### 1.2 フロントエンドコンポーネント設計

```
frontend/src/app/components/YouTubeEmbed.tsx (新規)
```

**実装方針**:
- 投稿テキスト内のYouTube URL（`youtube.com/watch?v=`, `youtu.be/`）を正規表現で検出
- `youtube-nocookie.com` ドメインを使用（プライバシー強化モード）
- レスポンシブ対応: `aspect-ratio: 16/9` + `max-width: 100%`
- 遅延読み込み: `loading="lazy"` 属性でパフォーマンス最適化

**コンポーネントインターフェース**:
```typescript
interface YouTubeEmbedProps {
  videoId: string;  // YouTube動画ID
}
```

**URL解析ユーティリティ**:
```typescript
// frontend/src/lib/youtube.ts (新規)
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;

export function extractYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}
```

**PostItem.tsx への統合**:
- `PostItem.tsx` 内でテキストレンダリング時にYouTube URLを検出
- URL部分をクリッカブルリンク + 下部にembedプレーヤーを表示
- 1投稿あたり最大1動画のみ埋め込み（パフォーマンス考慮）

### 1.3 CSP（Content Security Policy）変更

#### バックエンド: `backend/src/main.ts`

**現状**:
```typescript
frameSrc: ["'none'"],
```

**変更後**:
```typescript
frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://js.stripe.com'],
```

#### nginx: `nginx-prod.conf`

**現状**:
```
frame-src https://js.stripe.com;
```

**変更後**:
```
frame-src https://js.stripe.com https://www.youtube-nocookie.com;
```

> **注意**: `youtube-nocookie.com` を使用することで、YouTube側のトラッキングCookieを抑制。獅白さん（DevSecOps）のレビュー必須。

### 1.4 実装優先度とフェーズ

| フェーズ | 内容 | 見積もり |
|---------|------|---------|
| Phase 1 | YouTubeEmbed コンポーネント + URL解析ユーティリティ | 0.5日 |
| Phase 2 | PostItem.tsx 統合 + CSP変更 | 0.5日 |
| Phase 3 | QAテスト（表示崩れ、各ブラウザ、モバイル） | 0.5日 |

---

## 2. UTMパラメータ統合対応

### 2.1 現状整理

| チャネル | utm_source | utm_medium | utm_campaign | 実装状況 |
|---------|-----------|-----------|-------------|---------|
| note | `note` | `article` | `article_{No.}` | 仕様策定済み（NOTE_UTM_SPEC.md）、未実装 |
| SNS共有 | `pokersns` | `share` | `post_share` | PostItem.tsx で実装済み |
| YouTube | `youtube` | `video` | `video_{ID}` | **新規** |

### 2.2 YouTube用UTMパラメータ定義

| パラメータ | 値 | 説明 |
|-----------|------|------|
| `utm_source` | `youtube` | 流入元プラットフォーム（固定） |
| `utm_medium` | `video` | メディア種別（固定） |
| `utm_campaign` | `video_{連番}` | 動画ごとの識別子（例: `video_001`） |

**動画説明欄テンプレート用URL**:
```
https://poker-sns.com/lp?utm_source=youtube&utm_medium=video&utm_campaign=video_001
```

### 2.3 バックエンド実装（note UTM対応と同時実施）

NOTE_UTM_SPEC.md で定義済みの変更をYouTube分も統合して実施:

**Prisma schema変更** (`backend/prisma/schema.prisma`):
```prisma
model User {
  // ... 既存フィールド
  utmSource     String?   @map("utm_source")
  utmMedium     String?   @map("utm_medium")
  utmCampaign   String?   @map("utm_campaign")
}
```

**RegisterDto変更** (`backend/src/auth/dto/register.dto.ts`):
```typescript
@IsOptional()
@IsString()
utmSource?: string;

@IsOptional()
@IsString()
utmMedium?: string;

@IsOptional()
@IsString()
utmCampaign?: string;
```

**フロントエンド localStorage フロー**:
- 既存の NOTE_UTM_SPEC.md のフローをそのまま適用
- `utm_source=youtube` も同じ仕組みで保存・送信
- GA4の `GoogleAnalytics.tsx` が既にUTMパラメータをトラッキング済み

### 2.4 実装優先度

| 優先度 | 内容 | 依存 |
|-------|------|------|
| P1 | Prisma schema + RegisterDto + AuthService 変更 | なし |
| P2 | フロントエンド UTM localStorage 保存・送信 | P1 |
| P3 | GA4イベントへの utm_source ディメンション追加 | P2 |

---

## 3. 営業資料用プラットフォーム実績データAPI

### 3.1 背景

営業資料に掲載するサービス実績データ（ユーザー数・投稿数等）を取得するための管理者専用APIエンドポイントを新設。

### 3.2 エンドポイント設計

```
GET /api/stats/platform
```

**認証**: JWT + 管理者ロール（将来的にAdmin Guard追加時）
**現時点**: JWT認証のみ（管理者UIは未実装のためCLIやcurlで使用想定）

**レスポンス**:
```json
{
  "totalUsers": 150,
  "activeUsers30d": 85,
  "totalPosts": 1200,
  "totalPokerHands": 450,
  "premiumSubscribers": 12,
  "affiliatePartners": 5,
  "generatedAt": "2026-03-07T12:00:00Z"
}
```

### 3.3 実装箇所

**StatsService** (`backend/src/stats/stats.service.ts`) に追加:

```typescript
async getPlatformStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeUsers30d, totalPosts, totalPokerHands, premiumSubscribers, affiliatePartners] =
    await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { isPokerHand: true } }),
      this.prisma.user.count({ where: { subscriptionStatus: 'active' } }),
      this.prisma.affiliatePartner.count({ where: { isActive: true } }),
    ]);

  return {
    totalUsers,
    activeUsers30d,
    totalPosts,
    totalPokerHands,
    premiumSubscribers,
    affiliatePartners,
    generatedAt: now.toISOString(),
  };
}
```

**StatsController** に追加:
```typescript
@Get('platform')
@UseGuards(JwtAuthGuard)
getPlatformStats() {
  return this.statsService.getPlatformStats();
}
```

### 3.4 実装優先度

| 優先度 | 内容 | 見積もり |
|-------|------|---------|
| P1 | StatsService.getPlatformStats() 実装 | 0.25日 |
| P2 | StatsController エンドポイント追加 | 0.1日 |
| P3 | レスポンスキャッシュ（5分TTL） | 0.1日 |

---

## 4. 技術的依存関係マトリクス

```
YouTube OEmbed ──→ CSP変更 ──→ DevSecOpsレビュー
                                    ↓
                              nginx-prod.conf更新
                                    ↓
                              QA: 表示崩れテスト

UTM統合 ──→ Prisma schema変更 ──→ DB push
               ↓
         RegisterDto変更 ──→ フロントエンド連携
               ↓
         GA4イベント拡張

Platform Stats API ──→ 営業資料データ提供（独立して実装可能）
```

---

## 5. 全体スケジュール（推奨）

| 週 | タスク | 担当 |
|----|-------|------|
| Week 1 | UTM schema変更 + RegisterDto + Platform Stats API | Dev |
| Week 1 | CSP変更案作成 → DevSecOpsレビュー依頼 | Dev → DevSecOps |
| Week 2 | YouTubeEmbed コンポーネント実装 | Dev |
| Week 2 | フロントエンド UTM localStorage 連携 | Dev |
| Week 3 | PostItem.tsx 統合 + QAテスト | Dev → QA |

---

## 6. DevSecOpsへの確認事項

1. **CSP frameSrc**: `youtube-nocookie.com` ドメイン追加の承認
2. **nginx-prod.conf**: frame-src ディレクティブ変更の承認
3. **Referrer-Policy**: YouTube/note からの流入時に `strict-origin-when-cross-origin` で問題ないか確認

## 7. QAへの検証依頼事項

1. YouTube埋め込み: iOS Safari / Android Chrome / Desktop各ブラウザでの表示確認
2. UTMパラメータ: localStorage保存→登録フロー→DBレコード確認のE2Eテスト
3. Platform Stats API: レスポンス値の正確性検証
