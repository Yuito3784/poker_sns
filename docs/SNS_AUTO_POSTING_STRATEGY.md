# SNS Auto-Posting Strategy Document

> Planning Team / 常闇 作成 / 2026-03-02
> 目的: X・YouTube・Instagram Reelsへの自動投稿でpoker_snsへの流入を最大化する

---

## 1. SNS API Platform Comparison Table

### 1-1. コスト・投稿数上限比較

| 項目 | X (Twitter) | YouTube Data API v3 | Instagram Graph API |
|------|------------|---------------------|---------------------|
| **基本料金** | Free: $0 / Basic: $200/月 / Pro: $5,000/月 / 従量課金: ~$0.01/投稿 | 無料（クォータ制） | 無料（レート制限あり） |
| **投稿上限** | Free: 500件/月 / Basic: 10,000件/月 / 従量課金: 上限なし（2M読取制限） | デフォルト: 6動画/日（10,000ユニット/日、upload=1,600ユニット） | 25件/24時間（Reels+Feed+Stories合算） |
| **メディアアップロード** | 全プランで対応（Freeは制限あり） | 動画アップロード対応 | JPEG画像、動画対応 |
| **OAuth** | OAuth 2.0 + PKCE | OAuth 2.0 | OAuth 2.0 |
| **アカウント要件** | 開発者アカウント | Google Cloud Project + YouTube Channel | Business/Creator Account + Facebook Page |
| **審査** | アプリ登録のみ | クォータ増加時に審査 | アプリ審査必須 |

### 1-2. レートリミット詳細

| Platform | Rate Limit | Window |
|----------|-----------|--------|
| **X** | 100リクエスト/15分（ユーザー単位）、2,400ツイート/日（アカウント上限） | 15分 / 24時間 |
| **YouTube** | 10,000ユニット/日（デフォルト）、upload=1,600ユニット/回 | 日次リセット（PT 0:00） |
| **Instagram** | 200 APIコール/時間/アカウント、25投稿/24時間 | 1時間 / 24時間 |

### 1-3. 推奨プラン（poker_sns規模）

| Platform | 推奨プラン | 月額コスト | 理由 |
|----------|-----------|-----------|------|
| **X** | Basic ($200/月) or 従量課金 | $0〜$200 | 1日3-5投稿で月90-150件 → Freeの500件/月でもMVP可。スケール時Basic |
| **YouTube** | 無料（デフォルトクォータ） | $0 | 1日1-2本Shortsで十分。6本/日の上限内 |
| **Instagram** | 無料（Graph API） | $0 | 1日3-5投稿で25件/日の上限内 |

**MVP段階の推定月額コスト: $0（全プラットフォーム無料枠で開始可能）**

---

## 2. OGP (Open Graph Protocol) 現状監査

### 2-1. 実装済み

| 項目 | 状態 | ファイル |
|------|------|---------|
| サイト全体OGPメタタグ | 実装済み | `frontend/src/app/layout.tsx` |
| 投稿詳細ページ動的OGP | 実装済み | `frontend/src/app/post/[id]/page.tsx` |
| 動的OG画像生成（next/og） | 実装済み | `frontend/src/app/opengraph-image.tsx` |
| Twitter Card設定 | 実装済み | layout.tsx + post/[id]/page.tsx |
| JSON-LD構造化データ | 実装済み | layout.tsx (WebSite schema) |
| 投稿メタデータAPI | 実装済み | `/posts/:id/meta` エンドポイント |

### 2-2. 未実装（Gap）

| 項目 | 優先度 | 説明 |
|------|--------|------|
| **投稿別動的OG画像** | HIGH | 現状はサイト共通OG画像のみ。投稿内容（ハンド情報・投稿者名）を含む動的OG画像が未実装 |
| **プロフィールページOGP** | HIGH | `/profile/[username]` がClient Componentのため`generateMetadata`なし |
| **ハッシュタグページOGP** | MEDIUM | `/hashtag/[tag]` の動的メタタグ未確認 |
| **YouTube用サムネイル生成** | MEDIUM | 1280x720px のサムネイル画像生成エンドポイントなし |
| **Instagram Reels用サムネイル** | MEDIUM | 1080x1920px 縦型画像生成なし |

### 2-3. OGP改善優先順位

1. **投稿別動的OG画像** → SNSシェア時のCTR直結
2. **プロフィールページ `generateMetadata`** → ユーザーがプロフィールをシェアした際のOGP表示
3. **YouTube/Reelsサムネイルサイズ対応** → 自動投稿連携の前提条件

---

## 3. Auto-Posting Implementation Strategy

### 3-1. アーキテクチャ概要

```
[poker_sns投稿] → [Content Transform Engine] → [Platform Adapters] → [X / YouTube / Instagram]
                           ↓
                   [Job Queue (BullMQ)]
                           ↓
                   [Retry / Dead Letter]
                           ↓
                   [Monitoring Dashboard]
```

### 3-2. Phase分割

#### Phase 1: X自動投稿（MVP）— 推定工期: 1-2週間

**機能要件:**
- poker_snsの注目投稿（いいね数 or リポスト数が閾値超え）を自動でXに投稿
- 投稿内容: 投稿本文（140字以内に要約） + poker_snsへのリンク + OG画像
- ハッシュタグ自動付与: #ポーカー #TexasHoldem 等
- スケジュール投稿: 1日3-5回（エンゲージメント高い時間帯に配信）

**技術要件:**
- NestJS Module: `SnsAutoPostModule`
- BullMQ ジョブキュー（Redis依存）
- X API v2 OAuth 2.0 + PKCE連携
- Cron: 毎時実行 → 閾値チェック → キュー投入

**コンテンツ変換ロジック:**
```
投稿テキスト（280字制限）:
  - 投稿者名 + 投稿本文（先頭100字）
  - ハンド情報あれば: "AA vs KK フロップで..." 形式
  - poker_snsリンク
  - ハッシュタグ（最大3個）
```

#### Phase 2: YouTube Shorts自動投稿 — 推定工期: 2-3週間

**機能要件:**
- poker_snsの人気ハンド解析を元にショート動画を自動生成
- 動画内容: ハンドヒストリーのアニメーション + テキストオーバーレイ
- サムネイル: ブランド統一デザイン（1280x720px）
- 説明欄: poker_snsリンク + ハッシュタグ

**技術要件:**
- FFmpeg / Remotion による動画生成
- YouTube Data API v3 videos.insert
- 動画テンプレート（ポーカーテーブル背景 + カードアニメーション）
- 1日1-2本ペース

**コンテンツ変換ロジック:**
```
ショート動画（60秒以内、9:16縦型）:
  - タイトル: "このハンド、あなたならどうする？ #shorts"
  - 内容: ハンドのシチュエーション → 結果 → 議論ポイント
  - CTA: "詳しくはプロフィールのリンクから"
```

#### Phase 3: Instagram Reels自動投稿 — 推定工期: 2-3週間

**機能要件:**
- Phase 2で生成した動画をInstagram Reels向けに再利用
- キャプション: 投稿本文 + ハッシュタグ（最大30個）
- 投稿頻度: 1日2-3回

**技術要件:**
- Instagram Graph API Content Publishing
- Meta App審査通過が前提
- Container-based publishing（create → poll → publish）
- ハッシュタグ戦略: ポーカー関連 + バイラル系

**コンテンツ変換ロジック:**
```
Reels（90秒以内、9:16縦型）:
  - キャプション: 投稿本文 + CTA + ハッシュタグ30個
  - 動画: YouTube Shorts素材を再利用（同一9:16フォーマット）
  - CTA: "もっとハンドを見る → プロフィールリンク"
```

### 3-3. コンテンツ自動選定ロジック

```
選定基準（優先度順）:
1. 直近24時間以いいね数 >= 5 の投稿
2. リポスト数 >= 3 の投稿
3. ハンド情報付き投稿（ポーカーコンテンツとして価値が高い）
4. コメント数 >= 10 の投稿（議論を呼んでいる）
5. プレミアムユーザーの投稿（優先度ブースト）

除外条件:
- 過去に自動投稿済みの投稿（重複排除）
- ブロック/ミュート数が多いユーザーの投稿
- テキストのみで短すぎる投稿（20字未満）
```

### 3-4. スケジューリング戦略

| Platform | 投稿時間 | 頻度 | 理由 |
|----------|---------|------|------|
| **X** | 7:00, 12:00, 18:00, 21:00, 23:00 (JST) | 3-5回/日 | 通勤・昼休み・夜のエンゲージメントピーク |
| **YouTube** | 18:00, 21:00 (JST) | 1-2回/日 | 夕方以降の視聴率が高い |
| **Instagram** | 12:00, 18:00, 21:00 (JST) | 2-3回/日 | 昼・夕方・夜のアクティブ時間帯 |

---

## 4. 必要なインフラ・依存関係

| 項目 | 詳細 | 担当チーム |
|------|------|-----------|
| Redis | BullMQジョブキュー用 | DevSecOps |
| FFmpeg | 動画生成（Phase 2-3） | Dev |
| X Developer Account | API v2 Basic Plan（MVP: Free可） | Ops |
| Google Cloud Project | YouTube Data API有効化 | Ops |
| Meta Developer Account | Instagram Graph API + アプリ審査 | Ops |
| OAuthトークン暗号化ストア | 各SNS APIトークンの安全な管理 | DevSecOps |
| Slack Webhook | 投稿失敗時の通知 | Ops |

---

## 5. DB Schema追加（要件定義）

```
// Prisma schema additions
model SnsAutoPost {
  id            String   @id @default(uuid())
  postId        String   // poker_sns投稿ID
  platform      String   // "x" | "youtube" | "instagram"
  externalId    String?  // SNS側の投稿ID
  status        String   // "queued" | "processing" | "posted" | "failed"
  content       String   // 変換後のコンテンツ
  mediaUrl      String?  // メディアURL
  scheduledAt   DateTime // 投稿予定時刻
  postedAt      DateTime? // 実際の投稿時刻
  errorMessage  String?  // 失敗時のエラー
  retryCount    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  post          Post     @relation(fields: [postId], references: [id])

  @@index([platform, status])
  @@index([scheduledAt])
}

model SnsApiToken {
  id            String   @id @default(uuid())
  platform      String   @unique // "x" | "youtube" | "instagram"
  accessToken   String   // 暗号化して保存
  refreshToken  String?  // 暗号化して保存
  expiresAt     DateTime?
  scopes        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 6. KPI・成功指標

| KPI | 目標値（3ヶ月後） | 測定方法 |
|-----|-----------------|---------|
| X経由の新規ユーザー登録 | 月100人 | UTMパラメータ追跡 |
| YouTube Shorts視聴回数 | 月10,000回 | YouTube Analytics |
| Instagram Reels再生回数 | 月10,000回 | Instagram Insights |
| 自動投稿からのCTR | 2%以上 | UTMパラメータ + GA |
| 投稿失敗率 | 1%以下 | 内部モニタリング |
| 月間アクティブユーザー増加 | +30% | 内部DB集計 |

---

## 7. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| X APIプラン変更・値上げ | HIGH | 従量課金への移行準備、投稿頻度の動的調整 |
| Instagram アプリ審査不通過 | HIGH | Meta Business Suiteの要件を事前に完全準拠 |
| 自動投稿がスパム判定される | HIGH | 投稿頻度の適切な制限、多様なコンテンツ生成 |
| OAuthトークン漏洩 | CRITICAL | 暗号化ストア使用、トークンローテーション自動化 |
| 動画生成サーバー負荷 | MEDIUM | ジョブキューで非同期処理、生成上限設定 |
| コンテンツ品質低下 | MEDIUM | 人力レビューフロー（初期）、フィードバックループ |

---

## 8. 実行タイムライン

```
Week 1-2:  [Phase 1] X自動投稿 MVP
           - SnsAutoPostModule実装
           - X API OAuth連携
           - コンテンツ変換エンジン
           - BullMQジョブキュー設定
           - 投稿別動的OG画像実装

Week 3-4:  [Phase 1 完了 + Phase 2 開始]
           - X自動投稿の本番運用開始
           - YouTube Shorts動画テンプレート作成
           - FFmpeg/Remotion動画生成パイプライン

Week 5-6:  [Phase 2 完了 + Phase 3 開始]
           - YouTube Shorts自動投稿の本番運用開始
           - Instagram Graph APIアプリ審査申請
           - Reels投稿連携実装

Week 7-8:  [Phase 3 完了 + 最適化]
           - Instagram Reels自動投稿の本番運用開始
           - KPIモニタリングダッシュボード
           - コンテンツ品質チューニング
```

---

## 9. 各チームへの依頼事項サマリ

| チーム | 依頼内容 | 優先度 |
|--------|---------|--------|
| **Dev** | SnsAutoPostModule実装、投稿別動的OG画像、FFmpeg動画生成 | P0 |
| **Design** | OG画像テンプレート（1200x630 / 1280x720 / 1080x1920）、動画テンプレート | P0 |
| **DevSecOps** | OAuthトークン暗号化ストア、Redis設定、APIキー管理 | P0 |
| **QA** | 自動投稿E2Eテスト、OGPカード展開検証、異常系テスト | P1 |
| **Ops** | SNSアカウント開設・API登録、Slack通知設定、KPIモニタリング | P1 |
