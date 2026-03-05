# 月100万円達成 — 5機能マスタープラン

## 収益シミュレーション（月間目標: ¥1,000,000）

| # | 機能 | 単価 | 想定ユーザー数 | 転換率 | 月間収益 |
|---|------|------|---------------|--------|---------|
| ② | 投げ銭・チップ | ¥300 avg/回 | 500 DAU | 8% | ¥180,000 |
| ③ | 有料コンテンツ販売 | ¥500 avg/本 | 500 DAU | 6% | ¥150,000 |
| ① | 有料サロン/コミュニティ | ¥1,980/月 | — | — | ¥198,000 |
| ④ | トーナメント参加費 | ¥1,000/回 | — | — | ¥120,000 |
| ⑤ | プロコーチマッチング | ¥5,000/回 | — | — | ¥150,000 |
| — | 既存Premium月額 | ¥980/月 | — | — | ¥147,000 |
| — | 既存アフィリエイト | ¥200 avg/click | — | — | ¥55,000 |
| | **合計** | | | | **¥1,000,000** |

> 各機能の詳細目標はユーザー成長に応じて段階的に上方修正

## 実装優先順位（マージ順）

```
② feature/tipping → ③ feature/paid-content → ① feature/salon → ④ feature/tournament → ⑤ feature/coaching
```

**理由**: ②③はPrismaスキーマ変更が最小限、収益インパクトが早期に出せる

---

## 機能② 投げ銭・チップ機能

### ブランチ: `feature/tipping`

### 概要
投稿者に対してチップ（100/500/1000円 + カスタム金額）を送れる機能。Stripe PaymentIntentベースの単発決済。

### Prismaスキーマ追加

```prisma
model Tip {
  id          String   @id @default(uuid())
  amount      Int      // 金額（円）
  senderId    String
  sender      User     @relation("TipsSent", fields: [senderId], references: [id])
  receiverId  String
  receiver    User     @relation("TipsReceived", fields: [receiverId], references: [id])
  postId      String?
  post        Post?    @relation(fields: [postId], references: [id])
  stripePaymentIntentId String @unique
  status      TipStatus @default(PENDING)
  createdAt   DateTime @default(now())

  @@index([receiverId, createdAt])
  @@index([senderId, createdAt])
}

enum TipStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}
```

### APIエンドポイント

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| POST | `/tips` | 要 | チップ送信（PaymentIntent作成） |
| POST | `/tips/webhook` | — | Stripe Webhook受信 |
| GET | `/tips/received` | 要 | 受け取ったチップ一覧 |
| GET | `/tips/sent` | 要 | 送ったチップ一覧 |
| GET | `/tips/stats` | 要 | チップ統計（合計受取額等） |

### フロントエンドUI

- **チップボタン**: 各投稿のアクションバーに追加（💰アイコンなし、テキスト「チップ」）
- **金額選択モーダル**: プリセット（100/500/1000円）+ カスタム入力フィールド
- **確認画面**: 送信先ユーザー名・金額・手数料表示
- **Stripe Elements**: カード入力 or 保存済みカード選択
- **通知**: 受取者にリアルタイム通知

### セキュリティ要件
- サーバーサイドで金額確定（クライアント金額を信頼しない）
- 最小100円、最大100,000円のバリデーション
- Webhook署名検証必須
- CSRFトークン検証
- レート制限: 同一ユーザーから同一投稿へ10回/日

### プラットフォーム手数料
- 10%をプラットフォーム収益とする（将来的にStripe Connect導入時に自動分配）
- MVP段階では手動集計

---

## 機能③ 有料コンテンツ販売

### ブランチ: `feature/paid-content`

### 概要
投稿の一部を有料化。記事前半はプレビュー表示、後半をペイウォールで隠し、購入者のみ全文閲覧可能。

### Prismaスキーマ追加

```prisma
model PaidContent {
  id          String   @id @default(uuid())
  postId      String   @unique
  post        Post     @relation(fields: [postId], references: [id])
  price       Int      // 価格（円）
  previewEndIndex Int  // プレビュー表示する文字数
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ContentPurchase {
  id          String   @id @default(uuid())
  contentId   String
  content     PaidContent @relation(fields: [contentId], references: [id])
  buyerId     String
  buyer       User     @relation(fields: [buyerId], references: [id])
  stripePaymentIntentId String @unique
  status      PurchaseStatus @default(PENDING)
  createdAt   DateTime @default(now())

  @@unique([contentId, buyerId])
  @@index([buyerId, createdAt])
}

enum PurchaseStatus {
  PENDING
  COMPLETED
  REFUNDED
}
```

### Post モデル変更

```prisma
// 既存Postモデルに追加
model Post {
  // ... existing fields
  isPaid      Boolean  @default(false)
  paidContent PaidContent?
}
```

### APIエンドポイント

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| POST | `/paid-content` | 要 | 有料コンテンツ設定（投稿作成時） |
| POST | `/paid-content/:id/purchase` | 要 | 購入（PaymentIntent作成） |
| GET | `/paid-content/:id/check` | 要 | 購入済みチェック |
| POST | `/paid-content/webhook` | — | Stripe Webhook |
| GET | `/paid-content/sales` | 要 | 自分の売上一覧 |

### フロントエンドUI

- **投稿作成画面**: 「有料にする」トグル + 価格設定（100〜10,000円）+ プレビュー範囲設定
- **投稿表示**: プレビューテキスト → ぼかし/グラデーション境界 → 「¥XXXで続きを読む」CTA
- **購入済み表示**: 全文表示 + 「購入済み」バッジ
- **売上ダッシュボード**: 総売上・個別売上一覧

### デザイン仕様
- ペイウォール境界: テキストが徐々にフェードアウト（CSS gradient mask）
- 購入CTA: `background: #c9a84c; color: #0d1009;` のゴールドボタン
- プレビュー部分: 通常表示
- 有料部分: ぼかし（`filter: blur(5px)`）+ オーバーレイ

### プラットフォーム手数料
- 15%をプラットフォーム収益（コンテンツ販売はチップより手数料高め）

---

## 機能① 有料サロン/コミュニティ機能

### ブランチ: `feature/salon`

### 概要
月額制の有料グループ（サロン）を作成・参加できる機能。サロンオーナーが限定コンテンツを配信。

### Prismaスキーマ追加

```prisma
model Salon {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String
  coverImageUrl String?
  ownerId     String
  owner       User     @relation("OwnedSalons", fields: [ownerId], references: [id])
  monthlyPrice Int     // 月額（円）
  stripePriceId String?
  isActive    Boolean  @default(true)
  memberCount Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     SalonMember[]
  posts       SalonPost[]
}

model SalonMember {
  id          String   @id @default(uuid())
  salonId     String
  salon       Salon    @relation(fields: [salonId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  stripeSubscriptionId String?
  status      SalonMemberStatus @default(ACTIVE)
  joinedAt    DateTime @default(now())

  @@unique([salonId, userId])
}

model SalonPost {
  id          String   @id @default(uuid())
  salonId     String
  salon       Salon    @relation(fields: [salonId], references: [id])
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  content     String
  imageUrl    String?
  createdAt   DateTime @default(now())

  @@index([salonId, createdAt])
}

enum SalonMemberStatus {
  ACTIVE
  CANCELED
  PAST_DUE
}
```

### APIエンドポイント

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| POST | `/salons` | 要 | サロン作成 |
| GET | `/salons` | — | サロン一覧 |
| GET | `/salons/:slug` | — | サロン詳細 |
| POST | `/salons/:slug/join` | 要 | 参加（Stripe Subscription） |
| POST | `/salons/:slug/leave` | 要 | 退会 |
| POST | `/salons/:slug/posts` | 要(メンバー) | サロン投稿 |
| GET | `/salons/:slug/posts` | 要(メンバー) | サロン投稿一覧 |

### フロントエンドUI
- `/salons` — サロン一覧ページ
- `/salons/[slug]` — サロン詳細（メンバーは投稿閲覧可、非メンバーは説明+参加CTA）
- `/salons/create` — サロン作成フォーム（Premium限定）
- サロン投稿フィード（メンバー専用）

### 収益モデル
- サロン月額の20%をプラットフォーム手数料
- サロン作成はPremiumユーザー限定

---

## 機能④ トーナメント主催・参加費機能

### ブランチ: `feature/tournament`

### 概要
オンラインポーカートーナメントの主催・参加機能。参加費を徴収し、賞金プールを管理。

### Prismaスキーマ追加

```prisma
model Tournament {
  id          String   @id @default(uuid())
  name        String
  description String
  hostId      String
  host        User     @relation(fields: [hostId], references: [id])
  entryFee    Int      // 参加費（円）
  maxPlayers  Int
  prizePool   Int      @default(0)
  status      TournamentStatus @default(UPCOMING)
  startAt     DateTime
  endAt       DateTime?
  externalUrl String?  // 外部ポーカーサイトへのリンク
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  participants TournamentParticipant[]
}

model TournamentParticipant {
  id          String   @id @default(uuid())
  tournamentId String
  tournament  Tournament @relation(fields: [tournamentId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  stripePaymentIntentId String? @unique
  status      ParticipantStatus @default(REGISTERED)
  placement   Int?
  prizePaid   Int?
  createdAt   DateTime @default(now())

  @@unique([tournamentId, userId])
}

enum TournamentStatus {
  UPCOMING
  REGISTRATION_OPEN
  IN_PROGRESS
  COMPLETED
  CANCELED
}

enum ParticipantStatus {
  REGISTERED
  PAID
  CHECKED_IN
  ELIMINATED
  WINNER
}
```

### APIエンドポイント

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| POST | `/tournaments` | 要 | トーナメント作成 |
| GET | `/tournaments` | — | 一覧（upcoming/in_progress） |
| GET | `/tournaments/:id` | — | 詳細 |
| POST | `/tournaments/:id/register` | 要 | 参加登録+決済 |
| POST | `/tournaments/:id/cancel` | 要 | 参加キャンセル |
| PUT | `/tournaments/:id/status` | 要(host) | ステータス更新 |
| PUT | `/tournaments/:id/results` | 要(host) | 結果入力 |

### フロントエンドUI
- `/tournaments` — トーナメント一覧
- `/tournaments/[id]` — 詳細（参加者リスト、ステータス、結果）
- `/tournaments/create` — 作成フォーム
- カウントダウンタイマー、参加者数表示

### 収益モデル
- 参加費の15%をプラットフォーム手数料
- トーナメント作成はPremiumユーザー限定

---

## 機能⑤ プロコーチマッチング機能

### ブランチ: `feature/coaching`

### 概要
プロポーカープレイヤーによるコーチングセッション（1on1レッスン）の予約・決済機能。

### Prismaスキーマ追加

```prisma
model CoachProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  title       String   // "プロトーナメントプレイヤー" 等
  bio         String
  hourlyRate  Int      // 時給（円）
  specialties String[] // ["NLH", "PLO", "トーナメント"]
  isActive    Boolean  @default(true)
  rating      Float    @default(0)
  reviewCount Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sessions    CoachingSession[]
  availability CoachAvailability[]
}

model CoachAvailability {
  id          String   @id @default(uuid())
  coachId     String
  coach       CoachProfile @relation(fields: [coachId], references: [id])
  dayOfWeek   Int      // 0-6 (Sunday-Saturday)
  startTime   String   // "09:00"
  endTime     String   // "17:00"
}

model CoachingSession {
  id          String   @id @default(uuid())
  coachId     String
  coach       CoachProfile @relation(fields: [coachId], references: [id])
  studentId   String
  student     User     @relation(fields: [studentId], references: [id])
  scheduledAt DateTime
  durationMin Int      @default(60)
  price       Int      // 確定金額
  stripePaymentIntentId String? @unique
  status      SessionStatus @default(PENDING)
  meetingUrl  String?  // Zoom/Discord等のリンク
  reviewRating Int?    // 1-5
  reviewText  String?
  createdAt   DateTime @default(now())

  @@index([coachId, scheduledAt])
  @@index([studentId, createdAt])
}

enum SessionStatus {
  PENDING
  CONFIRMED
  PAID
  IN_PROGRESS
  COMPLETED
  CANCELED
  NO_SHOW
}
```

### APIエンドポイント

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| POST | `/coaching/profile` | 要 | コーチプロフィール作成 |
| GET | `/coaching/coaches` | — | コーチ一覧 |
| GET | `/coaching/coaches/:id` | — | コーチ詳細+空き枠 |
| POST | `/coaching/sessions` | 要 | セッション予約+決済 |
| PUT | `/coaching/sessions/:id/cancel` | 要 | キャンセル |
| PUT | `/coaching/sessions/:id/complete` | 要(coach) | 完了 |
| POST | `/coaching/sessions/:id/review` | 要(student) | レビュー投稿 |

### フロントエンドUI
- `/coaching` — コーチ一覧（評価順・専門分野フィルター）
- `/coaching/[id]` — コーチ詳細（プロフィール・空き枠カレンダー・レビュー）
- `/coaching/dashboard` — コーチ用ダッシュボード
- 予約カレンダー、Zoom/Discordリンク共有

### 収益モデル
- セッション料金の20%をプラットフォーム手数料
- コーチ登録はPremiumユーザー限定 + 審査制

---

## 共通技術要件

### Stripe決済共通
- すべてPaymentIntentベース（投げ銭・コンテンツ・トーナメント・コーチング）
- サロンのみSubscriptionベース
- Webhook署名検証必須（既存パターン踏襲）
- 冪等性キー（stripeEventId）でWebhook二重処理防止

### セキュリティ共通
- サーバーサイドで金額確定
- CSRF検証
- 各エンドポイントに適切な@Throttle設定
- 認可チェック（オーナー/メンバー/参加者権限）

### マージ前チェックリスト（各ブランチ共通）
- [ ] Prismaスキーマ変更が正しくpush可能
- [ ] 既存データとの整合性確認
- [ ] Stripe決済フローの動作確認
- [ ] 認証・認可バウンダリテスト
- [ ] ダークテーマ整合性確認
- [ ] npm audit で脆弱性なし

---

## マージスケジュール

```
Day 1-2: feature/tipping → dev
Day 3-4: feature/paid-content → dev
Day 5-6: feature/salon → dev
Day 7-8: feature/tournament → dev
Day 9-10: feature/coaching → dev
```

## 作成者
- Planning: 常闇（Senior）
- 作成日: 2026-03-05
