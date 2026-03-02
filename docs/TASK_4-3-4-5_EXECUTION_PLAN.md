# タスク 4-3/4-4/4-5 統合実行計画

## スキーマ変更統合（一括 prisma db push）

全タスクのスキーマ変更を1回の `prisma db push` にまとめる:

```prisma
// ===== User モデル追加フィールド =====

// 4-5-1: Admin ロール
role              String    @default("user")     // "user" | "admin"

// 4-5-5: アカウント停止
isSuspended       Boolean   @default(false)
suspendedAt       DateTime?
suspendReason     String?

// 4-4-1: メール通知設定
emailNotifyLike   Boolean   @default(true)
emailNotifyFollow Boolean   @default(true)
emailNotifyReply  Boolean   @default(true)
emailNotifyDigest Boolean   @default(true)
emailNotifyWeekly Boolean   @default(true)
lastDigestSentAt  DateTime?

// 4-4-4: オンボーディング
onboardingCompleted Boolean @default(false)
onboardingStep      Int     @default(0)

// 4-4-5: 投稿ストリーク
currentStreak     Int       @default(0)
longestStreak     Int       @default(0)
lastPostDate      DateTime?

// 4-5-3: DAU計測
lastLoginAt       DateTime?

// ===== 新規モデル =====

// 4-5-5: 通報
model Report {
  id         String   @id @default(uuid())
  postId     String
  post       Post     @relation(...)
  reporterId String
  reporter   User     @relation("Reporter", ...)
  reason     String
  detail     String?
  status     String   @default("pending")
  reviewedBy String?
  reviewer   User?    @relation("Reviewer", ...)
  reviewedAt DateTime?
  createdAt  DateTime @default(now())
  @@unique([postId, reporterId])
  @@index([status])
  @@index([postId])
}

// 4-4-3: プッシュ通知
model PushSubscription {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(...)
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  @@index([userId])
}
```

---

## 依存関係マップ

```
                    ┌─────────────────┐
                    │ スキーマ一括変更   │
                    │ (prisma db push) │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  4-5 管理基盤  │ │ 4-4 リテンション│ │ 4-3 モバイルUX │
    │  Admin Guard  │ │  MailModule  │ │ BottomNav    │
    │  ロール       │ │  分離        │ │ 画像最適化    │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
    ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐
    │ 管理API群     │ │ 即時通知メール │ │ PWA対応      │
    │ (CRUD)       │ │ ストリーク    │ │ プルリフレッシュ│
    │ 通報API      │ │ おすすめ      │ │              │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
    ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐
    │ Admin UI     │ │ ダイジェスト   │ │ タッチ操作    │
    │ (FE)        │ │ ウェルカムフロー│ │ Lighthouse   │
    │ 通報UI      │ │              │ │              │
    └──────────────┘ └──────┬───────┘ └──────────────┘
                            │
                    ┌───────┴───────┐
                    │ プッシュ通知    │
                    │ (PWA依存)     │
                    └───────────────┘
```

---

## 実行フェーズ（推奨順序）

### Phase 0: 基盤準備（全タスク共通）
| # | サブタスク | 担当 | 工数目安 | ブロッカー |
|---|----------|------|---------|----------|
| 0-1 | Prisma スキーマ一括変更 + db push | Dev | 小 | なし |
| 0-2 | MailModule 分離（auth.serviceから独立） | Dev | 中 | なし |

### Phase 1: 並行実施グループA
| # | サブタスク | 担当 | 工数目安 | ブロッカー |
|---|----------|------|---------|----------|
| 4-5-1 | Admin ロール + Guard | Dev(BE) | 小 | Phase 0 |
| 4-3-1 | BottomNav コンポーネント分離+5アイコン化 | Dev(FE) | 中 | Design: アイコン |
| 4-3-4 | next/image 移行 + WebP | Dev(FE) | 中 | なし |
| 4-4-5 | 投稿ストリーク実装 | Dev(BE+FE) | 小 | Phase 0 |
| 4-4-6 | おすすめユーザーAPI + UI | Dev(BE+FE) | 中 | なし |

### Phase 2: 並行実施グループB
| # | サブタスク | 担当 | 工数目安 | ブロッカー |
|---|----------|------|---------|----------|
| 4-5-3 | Admin API (users/posts/ads/affiliates/stats) | Dev(BE) | 大 | 4-5-1 |
| 4-5-5 | 通報機能 (BE API + FE UI) | Dev(BE+FE) | 中 | Phase 0 |
| 4-4-1 | メール通知拡張 (即時+日次) | Dev(BE) | 中 | Phase 0-2 |
| 4-3-2 | PWA対応 (manifest + SW) | Dev(FE) | 中 | Design: アイコン |
| 4-3-3 | プルトゥリフレッシュ | Dev(FE) | 小 | なし |

### Phase 3: 後続タスク
| # | サブタスク | 担当 | 工数目安 | ブロッカー |
|---|----------|------|---------|----------|
| 4-5-4 | Admin UI フロントエンド | Dev(FE) | 大 | 4-5-3 |
| 4-4-2 | ウィークリーダイジェスト | Dev(BE) | 中 | 4-4-1 |
| 4-4-4 | ウェルカムフロー | Dev(FE) | 中 | 4-4-6 |
| 4-3-5 | タッチ操作最適化 | Dev(FE) | 中 | 4-3-1 |
| 4-4-1b | 通知設定ページ (FE) | Dev(FE) | 小 | 4-4-1 |

### Phase 4: 最終
| # | サブタスク | 担当 | 工数目安 | ブロッカー |
|---|----------|------|---------|----------|
| 4-4-3 | プッシュ通知 | Dev(BE+FE) | 大 | 4-3-2 (PWA) |
| 4-3-6 | Lighthouse 85+ 達成 | Dev(FE) | 中 | 全最適化完了 |

---

## 必要パッケージ一覧

### バックエンド
| パッケージ | 用途 | タスク |
|-----------|------|--------|
| `@nestjs/schedule` | Cronジョブ (ダイジェスト) | 4-4-1, 4-4-2 |
| `web-push` | Web Push通知 | 4-4-3 |
| `handlebars` | メールテンプレート | 4-4-1, 4-4-2 |

### フロントエンド
| パッケージ | 用途 | タスク |
|-----------|------|--------|
| なし | ブラウザAPI直接使用 | - |

### 環境変数追加
```
# 4-4-3 プッシュ通知
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@pokersns.com

# 4-5-1 初期Admin
ADMIN_EMAIL=admin@pokersns.com
```

---

## Design部門 全依頼事項

| # | 依頼内容 | 期限 | ブロッカー先 |
|---|---------|------|------------|
| D-1 | ボトムナビ5アイコンSVG (active/inactive) | Phase 1 前 | 4-3-1 |
| D-2 | PWAアイコンセット (192/512/maskable/apple) | Phase 2 前 | 4-3-2 |
| D-3 | プルリフレッシュ スピナーアニメーション仕様 | Phase 2 前 | 4-3-3 |
| D-4 | 長押しボトムシート デザイン | Phase 3 前 | 4-3-5 |
| D-5 | オフラインフォールバックページ | Phase 2 前 | 4-3-2 |
| D-6 | Admin画面 ワイヤーフレーム | Phase 3 前 | 4-5-4 |
| D-7 | ウェルカムフロー モーダルデザイン | Phase 3 前 | 4-4-4 |

---

## リスク・注意事項

1. **スキーマ一括変更**: 全フィールドにデフォルト値を設定済みのため、既存データへの影響なし
2. **MailModule分離**: auth.serviceへの影響を最小限に（メール送信メソッドの呼び出し元を MailService に差し替え）
3. **PWA Service Worker**: Next.js App Router との互換性確認が必要（next-pwa 非使用）
4. **Admin初期設定**: 本番環境では環境変数からAdmin指定、SQLでの直接更新は開発環境のみ
5. **プッシュ通知**: iOS Safari 16.4+ のみ対応（古いiOSは非対応、フォールバック不要）
6. **Lighthouse 85+**: サードパーティスクリプト（Stripe.js）がスコアに影響する可能性 → 遅延読み込みで対応
