# タスク 4-5: 管理画面 要件定義書

## 現状分析

### 既存状態
- **User モデル**: `role` フィールドなし（全ユーザー同権限）
- **Admin モジュール**: 未実装
- **通報機能**: 未実装
- **広告管理**: AdsModule あり（GET /ads/feed のみ、CRUD なし）
- **アフィリエイト管理**: AffiliatesModule あり（GET のみ、CRUD なし）

### 管理に必要なデータモデル
- User: 停止・削除
- Post: 削除・通報管理
- Ad: CRUD
- AffiliatePartner: CRUD
- Report: 新規（通報モデル）

---

## 4-5-1: Admin ロール追加

### スキーマ変更
```prisma
model User {
  // ... 既存フィールド
  role    String @default("user")  // "user" | "admin"
}
```

### 選定理由: enum vs String
- **String を選択**: `role: String @default("user")`
- 理由: `prisma db push` で enum 追加時のデータ移行リスク回避
- バリデーション: アプリ層で `'user' | 'admin'` を検証

### 初期Admin設定
```sql
-- 手動でAdmin付与（seedスクリプトまたは直接SQL）
UPDATE "User" SET role = 'admin' WHERE email = 'admin@pokersns.com';
```

### Seed スクリプト
```
backend/prisma/seed-admin.ts (新規)
- 環境変数 ADMIN_EMAIL からAdmin指定
- 既存ユーザーの role を 'admin' に更新
- `npx ts-node prisma/seed-admin.ts` で実行
```

---

## 4-5-2: Admin Guard

### 実装
```
backend/src/admin/guards/admin.guard.ts (新規)
```

```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
```

### 使用方法
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController { ... }
```

### セキュリティ要件
- JwtAuthGuard を先に適用（認証→認可の順序）
- Admin エンドポイントのレートリミット: 30 req/min
- Admin 操作のアクセスログ記録（将来検討）

---

## 4-5-3: 管理API エンドポイント

### モジュール構成
```
backend/src/admin/
├── admin.module.ts
├── admin.controller.ts
├── admin.service.ts
├── guards/
│   └── admin.guard.ts
└── dto/
    ├── admin-user-query.dto.ts
    ├── admin-post-query.dto.ts
    ├── create-ad.dto.ts
    ├── update-ad.dto.ts
    ├── create-affiliate.dto.ts
    ├── update-affiliate.dto.ts
    └── handle-report.dto.ts
```

### ユーザー管理API

| メソッド | パス | 説明 | パラメータ |
|---------|------|------|-----------|
| GET | `/admin/users` | ユーザー一覧 | `?q=検索&status=active\|suspended&page=1&limit=20` |
| GET | `/admin/users/:id` | ユーザー詳細 | - |
| POST | `/admin/users/:id/suspend` | アカウント停止 | `{ reason: string }` |
| POST | `/admin/users/:id/unsuspend` | 停止解除 | - |
| DELETE | `/admin/users/:id` | アカウント削除 | - |

#### ユーザー停止の実装
```prisma
model User {
  // ... 既存フィールド
  role          String    @default("user")
  isSuspended   Boolean   @default(false)
  suspendedAt   DateTime?
  suspendReason String?
}
```

- 停止ユーザーのログイン時: `401 Account suspended` を返す
- 停止ユーザーの投稿: 非表示化（タイムラインから除外）
- JwtStrategy: `user.isSuspended === true` の場合は `UnauthorizedException`

### 投稿管理API

| メソッド | パス | 説明 | パラメータ |
|---------|------|------|-----------|
| GET | `/admin/posts` | 投稿一覧 | `?q=検索&reported=true&page=1&limit=20` |
| DELETE | `/admin/posts/:id` | 投稿削除 | - |
| GET | `/admin/posts/:id/reports` | 投稿の通報一覧 | - |

### 広告管理API

| メソッド | パス | 説明 | ボディ |
|---------|------|------|-------|
| GET | `/admin/ads` | 広告一覧 | `?active=true&page=1&limit=20` |
| POST | `/admin/ads` | 広告作成 | `{ title, description, imageUrl, linkUrl, startAt?, endAt?, sortOrder, isActive }` |
| PATCH | `/admin/ads/:id` | 広告更新 | 同上（部分更新） |
| DELETE | `/admin/ads/:id` | 広告削除 | - |
| POST | `/admin/ads/:id/upload-image` | 広告画像アップロード | multipart/form-data |

### アフィリエイト管理API

| メソッド | パス | 説明 | ボディ |
|---------|------|------|-------|
| GET | `/admin/affiliates` | パートナー一覧 | `?category=&featured=true&page=1&limit=20` |
| POST | `/admin/affiliates` | パートナー作成 | `{ name, slug, description, longDescription, category, affiliateUrl, logoUrl, bannerUrl, bonus, isFeatured, sortOrder }` |
| PATCH | `/admin/affiliates/:id` | パートナー更新 | 同上（部分更新） |
| DELETE | `/admin/affiliates/:id` | パートナー削除 | - |
| GET | `/admin/affiliates/:id/stats` | クリック統計 | `?from=&to=` |

### ダッシュボード統計API

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/admin/stats` | ダッシュボード統計 |
| GET | `/admin/stats/users` | ユーザー統計詳細 |

#### GET /admin/stats レスポンス
```json
{
  "overview": {
    "totalUsers": 1234,
    "activeUsersToday": 89,        // DAU (今日ログインしたユーザー)
    "newUsersToday": 12,
    "newUsersThisWeek": 67,
    "totalPosts": 5678,
    "postsToday": 45,
    "premiumUsers": 23,            // subscriptionStatus: 'active'
    "revenue": {                   // Stripe データ
      "mrr": 46000,               // 月次定期収益 (円)
      "activeSubscriptions": 23
    }
  },
  "affiliateClicks": {
    "today": 34,
    "thisWeek": 210,
    "thisMonth": 890
  },
  "reports": {
    "pending": 5,                  // 未対応通報数
    "resolvedThisWeek": 12
  }
}
```

#### DAU 計測方法
- `User.updatedAt` をログイン時に更新（既存の JWT 認証フローで対応可能）
- または新規: `lastLoginAt: DateTime?` フィールド追加
- 推奨: `lastLoginAt` 追加（`updatedAt` はプロフィール更新でも変わるため）

```prisma
model User {
  // ... 既存フィールド
  lastLoginAt   DateTime?
}
```

---

## 4-5-4: 管理画面フロントエンド

### ルート構成
```
frontend/src/app/admin/
├── layout.tsx           # Admin レイアウト（サイドバー付き）
├── page.tsx             # ダッシュボード（統計概要）
├── users/
│   └── page.tsx         # ユーザー管理
├── posts/
│   └── page.tsx         # 投稿管理（通報済みフィルター）
├── ads/
│   └── page.tsx         # 広告管理
├── affiliates/
│   └── page.tsx         # アフィリエイト管理
└── reports/
    └── page.tsx         # 通報管理
```

### Admin レイアウト
```
┌──────────────────────────────────────────────┐
│ Poker SNS Admin                    [ログアウト] │
├────────┬─────────────────────────────────────┤
│ サイドバー │ コンテンツエリア                        │
│ --------│                                     │
│ ダッシュボード│                                    │
│ ユーザー   │                                     │
│ 投稿     │                                     │
│ 広告     │                                     │
│ パートナー │                                     │
│ 通報     │                                     │
│ --------│                                     │
│ ← サイトへ│                                     │
└────────┴─────────────────────────────────────┘
```

### ダッシュボードページ
- **統計カード**: DAU / 新規ユーザー(今日) / 総投稿数 / プレミアム数
- **グラフ**: 過去7日間の新規ユーザー推移（将来的に Chart.js）
- **未対応通報**: 件数 + リンク
- **最新アクティビティ**: 直近のユーザー登録・投稿

### ユーザー管理ページ
- **検索**: 名前・ユーザー名・メールで検索
- **フィルター**: 全て / アクティブ / 停止中 / プレミアム
- **一覧テーブル**: アバター / 名前 / username / メール / ステータス / 登録日 / アクション
- **アクション**: 停止 / 停止解除 / 削除（確認ダイアログ付き）

### 投稿管理ページ
- **フィルター**: 全て / 通報済み
- **一覧**: 投稿内容（切り詰め） / 投稿者 / 日時 / いいね数 / 通報数 / アクション
- **アクション**: 投稿詳細表示 / 削除

### 広告管理ページ
- **一覧テーブル**: タイトル / ステータス / 期間 / 並び順 / アクション
- **作成/編集フォーム**: モーダルまたはインラインフォーム
- **画像アップロード**: ドラッグ&ドロップ対応
- **プレビュー**: AdCard コンポーネントで表示確認

### アフィリエイト管理ページ
- **一覧テーブル**: 名前 / カテゴリ / 注目 / クリック数 / アクション
- **作成/編集フォーム**: フルページフォーム
- **統計**: 日別クリック数グラフ（将来）

### アクセス制御（フロントエンド）
```typescript
// frontend/src/app/admin/layout.tsx
// - AuthContext の user.role を確認
// - role !== 'admin' → リダイレクト (/) or 403ページ表示
// - ローディング中はスケルトン表示
```

### デザイン
- 既存テーマ「The Felt Table」を踏襲
- テーブル行: `#131a14` / hover `#192118`
- ヘッダー: `#080a08`
- アクション危険ボタン（停止・削除）: `#dc2626` (赤)
- 統計カード: ボーダー `#2a3828`, 数値はゴールド `#c9a84c`

---

## 4-5-5: 投稿通報機能

### スキーマ
```prisma
model Report {
  id         String       @id @default(uuid())
  postId     String
  post       Post         @relation(fields: [postId], references: [id], onDelete: Cascade)
  reporterId String
  reporter   User         @relation("Reporter", fields: [reporterId], references: [id])
  reason     String       // "spam" | "harassment" | "inappropriate" | "other"
  detail     String?      // 自由記述（最大500文字）
  status     String       @default("pending")  // "pending" | "reviewed" | "dismissed"
  reviewedBy String?
  reviewer   User?        @relation("Reviewer", fields: [reviewedBy], references: [id])
  reviewedAt DateTime?
  createdAt  DateTime     @default(now())

  @@unique([postId, reporterId])  // 同一ユーザーは同一投稿を1回のみ通報
  @@index([status])
  @@index([postId])
}

model Post {
  // ... 既存フィールド
  reports    Report[]
}

model User {
  // ... 既存フィールド
  reports    Report[] @relation("Reporter")
  reviewedReports Report[] @relation("Reviewer")
}
```

### ユーザー側API

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/posts/:id/report` | 投稿を通報 |

#### リクエスト
```json
{
  "reason": "spam",       // "spam" | "harassment" | "inappropriate" | "other"
  "detail": "スパム投稿です"  // optional, max 500
}
```

### 管理側API

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/admin/reports` | 通報一覧 (`?status=pending&page=1&limit=20`) |
| PATCH | `/admin/reports/:id` | 通報対応 (`{ status: "reviewed" \| "dismissed" }`) |
| DELETE | `/admin/reports/:id/post` | 通報された投稿を削除 + status を reviewed に |

### ユーザー側UI
- PostItem の「...」メニューに「通報する」追加
- 通報モーダル: 理由選択（4択ラジオ）+ 詳細テキストエリア
- 通報完了: トースト「通報を受け付けました」
- 自分の投稿には通報ボタン非表示

### 管理側UI
- `/admin/reports` ページ
- フィルター: 未対応 / 対応済み / 却下
- 一覧: 投稿内容 / 通報者 / 理由 / 日時 / ステータス / アクション
- アクション: 投稿を確認 / 投稿を削除 / 通報を却下

---

## 実装優先順・依存関係

```
Phase 1 (基盤):
  4-5-1 Admin ロール追加        ← スキーマ変更
  4-5-2 Admin Guard            ← ロール依存

Phase 2 (並行可能):
  4-5-3a ユーザー管理API        ← Guard依存
  4-5-3b 広告管理API           ← Guard依存
  4-5-3c アフィリエイト管理API  ← Guard依存
  4-5-3d 統計API              ← Guard依存
  4-5-5  通報機能（BE）         ← スキーマ変更

Phase 3 (Phase 2完了後):
  4-5-4 管理画面フロントエンド   ← 全APIが完成してから
  4-5-5 通報UI（ユーザー側）    ← 通報API完成後
```

## スキーマ変更まとめ（4-5全体）

```prisma
// User モデル追加フィールド
role          String    @default("user")
isSuspended   Boolean   @default(false)
suspendedAt   DateTime?
suspendReason String?
lastLoginAt   DateTime?

// 新規モデル
model Report { ... }
```

## セキュリティ考慮事項
1. Admin Guard は JwtAuthGuard の後に適用（認証 → 認可）
2. Admin ユーザーの削除: 自分自身は削除不可
3. 投稿削除: 物理削除（Cascade で replies, likes も削除）
4. 通報の重複防止: `@@unique([postId, reporterId])`
5. Admin API のレートリミット: `@Throttle({ default: { limit: 30, ttl: 60000 } })`
6. Admin 画面のルートは `/admin` 以下に統一（nginx で IP 制限追加可能）
