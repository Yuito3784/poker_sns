# タスク 4-4: リテンション施策 要件定義書

## 現状分析

### 既存通知システム
- **Backend**: NotificationsModule (SSE + RxJS Subject)
- **通知タイプ**: LIKE, FOLLOW, REPLY, MENTION, REPOST
- **メール送信**: auth.service.ts 内の Nodemailer（パスワードリセット・メール認証のみ）
- **プッシュ通知**: 未実装
- **メール通知**: 未実装（イベントベース通知メールなし）

### 現状の課題
- ユーザーがアプリを開かないと通知に気づかない
- 再訪問のトリガーがない
- 新規ユーザーの初期体験が未設計
- エンゲージメント可視化機能なし

---

## 4-4-1: メール通知機能の拡張

### スキーマ変更 (Prisma)

```prisma
// User モデルに追加
model User {
  // ... 既存フィールド
  emailNotifyLike       Boolean @default(true)
  emailNotifyFollow     Boolean @default(true)
  emailNotifyReply      Boolean @default(true)
  emailNotifyDigest     Boolean @default(true)
  emailNotifyWeekly     Boolean @default(true)
  lastDigestSentAt      DateTime?
}
```

### バックエンド

#### メールサービスの分離
現在 `auth.service.ts` 内にある Nodemailer ロジックを独立モジュールに分離:

```
backend/src/mail/
├── mail.module.ts        # MailModule
├── mail.service.ts       # MailService (Nodemailer wrapper)
└── templates/
    ├── like-digest.hbs   # いいね日次ダイジェスト
    ├── follow-notify.hbs # フォロー即時通知
    ├── reply-notify.hbs  # リプライ即時通知
    └── weekly-digest.hbs # ウィークリーダイジェスト
```

#### 即時通知メール
| トリガー | 件名 | 送信条件 |
|---------|------|---------|
| フォロー | 「{name}さんがあなたをフォローしました」 | `emailNotifyFollow: true` |
| リプライ | 「{name}さんがあなたの投稿に返信しました」 | `emailNotifyReply: true` |

- **送信タイミング**: NotificationsService の `createNotification()` 呼び出し時にメール送信をキュー
- **重複防止**: 同一fromUser + 同一type は1時間以内に1通まで
- **非同期送信**: `Promise` で fire-and-forget（メール失敗でAPI応答をブロックしない）

#### 日次ダイジェストメール
- **対象**: `emailNotifyDigest: true` のユーザー
- **内容**: 過去24時間のいいね集計（「あなたの投稿に{n}件のいいねがありました」）
- **送信時刻**: 毎日 AM9:00 JST
- **スケジューラ**: `@nestjs/schedule` の `@Cron('0 9 * * *')` (TZ=Asia/Tokyo)
- **最小閾値**: いいね0件の場合は送信しない

### フロントエンド: 通知設定ページ

```
frontend/src/app/settings/notifications/page.tsx (新規)
```

| 設定項目 | デフォルト | 説明 |
|---------|----------|------|
| いいね通知（日次） | ON | いいね数の日次まとめ |
| フォロー通知 | ON | 新しいフォロワーを即時通知 |
| リプライ通知 | ON | 返信を即時通知 |
| ウィークリーダイジェスト | ON | 週次まとめメール |

- **API**: `PATCH /users/me/notification-settings`
- **UI**: トグルスイッチ（ゴールドアクセント）

---

## 4-4-2: ウィークリーダイジェストメール

### 内容構成
1. **今週のトレンド投稿トップ5**: いいね数上位の投稿（タイトル + いいね数 + 投稿者）
2. **新しいフォロワー一覧**: 今週フォローされたユーザー（最大10名、アバター + 名前）
3. **おすすめユーザー3名**: フォロー数が少ないアクティブユーザー

### バックエンド
```
backend/src/mail/weekly-digest.service.ts (新規)
- @Cron('0 9 * * 1') // 毎週月曜 AM9:00 JST
- バッチサイズ: 100ユーザーずつ処理
- 送信対象: emailNotifyWeekly: true && emailVerified: true
- レート制限: Nodemailer の接続プーリング使用
```

### テンプレート仕様
- HTMLメール（レスポンシブ対応）
- ダークテーマ（背景`#0d1009`、テキスト`#ddd6c8`、アクセント`#c9a84c`）
- 配信停止リンク: `/settings/notifications?unsubscribe=weekly`
- CAN-SPAM法準拠: 物理住所、配信停止リンク必須

---

## 4-4-3: プッシュ通知 (Web Push API)

### 前提条件
- **4-3-2 PWA対応が先行必須**（Service Worker必要）
- VAPID鍵ペアの生成・管理

### スキーマ変更
```prisma
model PushSubscription {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
}
```

### バックエンド
```
backend/src/push/
├── push.module.ts
├── push.service.ts        # web-push ライブラリ使用
└── push.controller.ts
```

#### エンドポイント
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/push/subscribe` | プッシュ登録（endpoint, keys） |
| DELETE | `/push/unsubscribe` | プッシュ解除 |
| GET | `/push/vapid-key` | VAPID公開鍵取得 |

#### 通知トリガー
- NotificationsService 内で `createNotification()` 時にプッシュも送信
- 通知タイプ: LIKE, FOLLOW, REPLY のみ（MENTION, REPOST は除外）

### フロントエンド
- Service Worker 内で `push` イベントハンドラ
- `Notification.requestPermission()` の適切なタイミング:
  - 初回は3回目のセッション時に表示
  - 拒否された場合は再要求しない
- 通知クリック → 該当ページへ遷移

### 環境変数
```
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@pokersns.com
```

---

## 4-4-4: 初心者ガイド（ウェルカムフロー）

### スキーマ変更
```prisma
model User {
  // ... 既存フィールド
  onboardingCompleted  Boolean @default(false)
  onboardingStep       Int     @default(0)  // 0: 未開始, 1-3: ステップ中, 4: 完了
}
```

### ステップ定義
| ステップ | タイトル | 完了条件 | バッジ |
|---------|--------|---------|--------|
| 1 | プロフィール設定 | bio + avatarUrl が設定済み | 「自己紹介完了」 |
| 2 | 初回投稿 | posts.count >= 1 | 「初投稿」 |
| 3 | 3人フォロー | following.count >= 3 | 「ソーシャル」 |

### フロントエンド
```
frontend/src/app/components/OnboardingModal.tsx (新規)
- 表示条件: user.onboardingCompleted === false && ログイン済み
- モーダル形式（スキップ可能）
- ステップインジケーター（3段階プログレスバー）
- 各ステップの説明 + CTA ボタン
- 完了時: 祝福アニメーション + バッジ付与通知
```

### バックエンド
```
GET  /users/me/onboarding  → { step, completed, badges }
POST /users/me/onboarding/skip → onboardingCompleted: true
```
- **バッジ判定**: 自動判定（APIコール時に条件チェック）
- **バッジストレージ**: 現段階ではフロントエンド表示のみ（DBモデル追加は将来検討）

---

## 4-4-5: 連続投稿ストリーク

### スキーマ変更
```prisma
model User {
  // ... 既存フィールド
  currentStreak    Int      @default(0)
  longestStreak    Int      @default(0)
  lastPostDate     DateTime?
}
```

### ロジック
```
投稿作成時 (PostsService.create):
  1. lastPostDate が「昨日」→ currentStreak++
  2. lastPostDate が「今日」→ 変更なし
  3. lastPostDate が「2日以上前」or null → currentStreak = 1
  4. currentStreak > longestStreak → longestStreak = currentStreak
  5. lastPostDate = now()
```

### フロントエンド表示
- プロフィールページ（自分・他人）に表示
- `currentStreak >= 3` の場合のみ表示
- 表示形式: 炎アイコン + 「{n}日連続投稿中」
- 位置: プロフィールヘッダーのbio下

### API
- `GET /users/:username` レスポンスに `currentStreak`, `longestStreak` 追加

---

## 4-4-6: おすすめユーザー機能

### 対象ユーザー選定ロジック
```sql
条件:
  1. フォロー数が5人未満のユーザーに対して提案
  2. おすすめ候補:
     a. 過去7日間の投稿数上位
     b. 自分がフォローしていない
     c. 自分がブロック/ミュートしていない
     d. emailVerified: true
  3. 最大5名
```

### バックエンド
```
GET /users/suggestions?limit=5
- JwtAuthGuard 必須
- レスポンス: { users: [{ id, name, username, avatarUrl, bio, postsCount }] }
```

### フロントエンド表示箇所
1. **右サイドバー**（デスクトップ、`xl:`以上）: 常時表示
2. **タイムライン挿入**（モバイル）: 投稿5件ごとに1回
3. **ウェルカムフロー Step3**: フォロー候補として表示

---

## 実装優先順・依存関係

```
Phase 1 (独立して実装可能):
  4-4-1 メール通知     ← MailModule分離が基盤
  4-4-5 投稿ストリーク  ← スキーマ変更のみ
  4-4-6 おすすめユーザー ← 既存データで実装可能

Phase 2 (Phase 1完了後):
  4-4-2 ウィークリーダイジェスト ← MailModule + @nestjs/schedule
  4-4-4 ウェルカムフロー        ← おすすめユーザーAPI利用

Phase 3 (4-3-2 PWA完了が前提):
  4-4-3 プッシュ通知 ← Service Worker + VAPID
```

## 必要パッケージ
### バックエンド
- `@nestjs/schedule` + `cron` — スケジュールジョブ
- `web-push` — プッシュ通知
- `handlebars` (or テンプレートリテラル) — メールテンプレート

### フロントエンド
- 追加パッケージなし（Web Push API はブラウザネイティブ）

## KPI 計測
| 指標 | 目標 | 計測方法 |
|------|------|---------|
| Day1 リテンション | 50%+ | 登録翌日のログイン率 |
| Day7 リテンション | 30%+ | 登録7日後のログイン率 |
| メール開封率 | 20%+ | SMTP配信ログ（将来的にSendGridで計測） |
| ウェルカムフロー完了率 | 40%+ | onboardingCompleted のDB集計 |
| 平均ストリーク日数 | 3日+ | currentStreak のDB集計 |
