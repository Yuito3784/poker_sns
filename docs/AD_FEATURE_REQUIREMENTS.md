# 広告機能 要件定義・設計書

## 1. 要件定義

### 1.1 目的

Poker SNS に広告機能を簡易的に導入し、初期マネタイズの基盤を整える。

### 1.2 スコープ（簡易版）

- **Phase 1（本設計対象）**: 管理画面不要・DB保存型の簡易広告
- 将来的な拡張: 管理画面、impression/click計測、外部広告連携（Google AdSense等）は Phase 2 以降

### 1.3 機能要件

| No | 要件 | 詳細 |
|----|------|------|
| F1 | 広告の表示 | フィード・トレンド等のタイムラインに、投稿と区別できる形で広告を挿入表示する |
| F2 | 広告コンテンツ | タイトル・説明文・画像URL・リンクURL を持つ |
| F3 | 広告の取得 | API で「次に表示する広告」を取得し、クライアントで表示する |
| F4 | 表示位置 | ホーム・トレンド・検索結果等の投稿リストに、N件ごとに1件広告を挿入 |
| F5 | 広告の識別 | 「広告」であることがユーザーに明確に分かるようラベルを表示する |
| F6 | 広告の管理 | 初期はシードデータ or 環境変数/設定ファイルで広告を登録（管理画面なし） |

### 1.4 非機能要件

| No | 要件 | 詳細 |
|----|------|------|
| NF1 | パフォーマンス | 広告取得APIは軽量にし、タイムライン読み込みに影響しないこと |
| NF2 | 拡張性 | 将来 AdSlot・impression/click の計測を追加しやすい構造とする |
| NF3 | 安全性 | 広告のリンクは `rel="noopener noreferrer"` で開くこと |

### 1.5 画面イメージ

- **ホーム / トレンド / 検索結果など**  
  投稿の並びの中に「広告」として区切り線付きで1件ずつ表示。
  - 例: 3件目、6件目、9件目… に広告を挿入
- **広告カードの構成**
  - 「広告」ラベル（小さく）
  - 画像（任意）
  - タイトル
  - 説明文（1行程度）
  - CTA: リンクボタン

---

## 2. 設計

### 2.1 データモデル

#### Ad（広告）

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | UUID | ○ | 主キー |
| title | String | ○ | 広告タイトル |
| description | String | - | 説明文 |
| imageUrl | String? | - | 画像URL（外部URL可） |
| linkUrl | String | ○ | クリック時の遷移先URL |
| sortOrder | Int | ○ | 表示順（小さいほど優先） |
| isActive | Boolean | ○ | 有効/無効（default: true） |
| startAt | DateTime? | - | 表示開始日時 |
| endAt | DateTime? | - | 表示終了日時 |
| createdAt | DateTime | ○ | 作成日時 |
| updatedAt | DateTime | ○ | 更新日時 |

```prisma
model Ad {
  id          String    @id @default(uuid())
  title       String
  description String?
  imageUrl    String?
  linkUrl     String
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  startAt     DateTime?
  endAt       DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive, sortOrder])
}
```

### 2.2 API 設計

#### GET /api/ads/feed

タイムライン表示用に「次に表示する広告」を1件取得する。

**クエリパラメータ**
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| offset | number | - | オフセット（同じ広告の連続表示を避けるため、0,1,2...を渡す） |
| limit | number | - | 取得件数（default: 1） |

**認証**  
ログイン不要（パブリック）

**レスポンス例**
```json
[
  {
    "id": "uuid",
    "title": "広告タイトル",
    "description": "説明文",
    "imageUrl": "https://...",
    "linkUrl": "https://..."
  }
]
```

**ロジック**
- `isActive = true`
- `startAt <= now` かつ `endAt >= now`（または null）
- `sortOrder` 昇順
- `offset` でページネーション（`OFFSET offset LIMIT limit`）
- 該当なしの場合は空配列

### 2.3 フロントエンド設計

#### 2.3.1 広告コンポーネント

- **AdCard**（新規）
  - props: `ad: { id, title, description?, imageUrl?, linkUrl }`
  - 表示: 「広告」ラベル、画像、タイトル、説明、リンクボタン
  - クリック時: `window.open(linkUrl, '_blank', 'noopener,noreferrer')`

#### 2.3.2 広告の挿入ロジック

- **ホーム・トレンド・検索・ブックマーク** などの投稿リストで:
  - 投稿を `[post0, post1, post2, post3, ...]` として保持
  - 表示用リストを構築: `post0, post1, post2, [Ad], post3, post4, post5, [Ad], ...`
  - 広告は **3件ごと**（3件目と4件目の間）に1件挿入
  - 広告が1件しかない場合は同じ広告を繰り返し表示してよい（簡易版）

#### 2.3.3 広告取得のタイミング

- タイムライン初回表示時: `/ads/feed?offset=0&limit=5` で最大5件取得しキャッシュ
- スクロールで広告スロットに到達するたびに、キャッシュから1件使用
- キャッシュ枯渇時: `offset` を進めて再取得（`/ads/feed?offset=5&limit=3` 等）

**簡易版**: 初回のみ `limit=10` で取得し、その場でインラインに差し込む。スクロール時の追加取得は Phase 2 で対応可能。

### 2.4 ファイル構成

```
backend/
  prisma/
    schema.prisma          # Ad モデル追加
    migrations/            # 新規マイグレーション
  src/
    ads/
      ads.module.ts
      ads.controller.ts    # GET /ads/feed
      ads.service.ts
      ads.service.spec.ts
    prisma/
      prisma.service.ts    # 既存

frontend/
  src/
    app/
      components/
        AdCard.tsx         # 新規: 広告表示コンポーネント
      lib/
        api.ts             # fetchAds 等（必要に応じて）
    lib/
      types.ts             # Ad 型追加
```

### 2.5 シードデータ

マイグレーション後に、開発・検証用の広告を1〜2件シードする。

```ts
// prisma/seed.ts に追加、または手動で SQL
INSERT INTO "Ad" (id, title, description, imageUrl, linkUrl, "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'サンプル広告', 'Poker SNS のサンプル広告です', NULL, 'https://example.com', 0, true, NOW(), NOW());
```

### 2.6 環境変数・設定

- 広告のオン/オフ: 環境変数 `ADS_ENABLED=true|false`（任意、未設定時は true）
- 挿入間隔: 定数 `AD_INSERT_EVERY = 3`（3投稿ごとに1広告）

---

## 3. 実装タスク一覧（go 出し時用）

1. [ ] Prisma: `Ad` モデル追加・マイグレーション
2. [ ] Backend: `ads` モジュール（controller, service）作成
3. [ ] Backend: `GET /ads/feed` API 実装
4. [ ] Backend: シードでサンプル広告1件追加
5. [ ] Frontend: `Ad` 型定義
6. [ ] Frontend: `AdCard` コンポーネント作成
7. [ ] Frontend: ホームページに広告挿入ロジック追加
8. [ ] Frontend: トレンド・検索・ブックマークにも同様に広告挿入
9. [ ] 動作確認・スタイル調整

---

## 4. 将来拡張（Phase 2）

- 管理画面（CRUD）の追加
- impression / click の記録
- Google AdSense 等の外部タグ埋め込み
- ユーザー属性に応じた広告配信
