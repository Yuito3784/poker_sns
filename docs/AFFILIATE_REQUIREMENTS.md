# アフィリエイト機能 要件定義・設計書

## 1. 要件定義

### 1.1 目的

ポーカールーム・ツール等のアフィリエイトリンクを SNS 内に自然に配置し、ユーザーの利便性を高めながら紹介報酬による収益を得る。

### 1.2 スコープ

- **Phase 1（本設計対象）**: アフィリエイトリンク管理・表示の基盤構築。右サイドバー・専用ページでのリンク掲載。
- 将来的な拡張: クリック計測、コンバージョントラッキング、ユーザー別レコメンド、動的バナー

### 1.3 機能要件

| No | 要件 | 詳細 |
|----|------|------|
| F1 | アフィリエイトパートナー管理 | ポーカールーム・ツール等のパートナー情報をDB管理する |
| F2 | カテゴリ分類 | パートナーを「ポーカールーム」「ツール・ソフトウェア」「学習・コーチング」「グッズ」等のカテゴリで分類 |
| F3 | パートナー一覧ページ | ユーザーがカテゴリ別にアフィリエイトパートナーを閲覧できるページ |
| F4 | 右サイドバー表示 | ホーム画面の右サイドバーに「おすすめ」としてパートナーを1〜3件表示 |
| F5 | クリック計測 | アフィリエイトリンクのクリック数を記録する |
| F6 | パートナー詳細表示 | 各パートナーのロゴ・説明文・特典（ボーナス情報等）・リンクを表示 |
| F7 | 安全なリダイレクト | 全てのアフィリエイトリンクは内部リダイレクトエンドポイントを経由し、クリックを計測してから外部に遷移する |
| F8 | パートナーの有効/無効管理 | isActive フラグでパートナーの表示/非表示を制御 |

### 1.4 非機能要件

| No | 要件 | 詳細 |
|----|------|------|
| NF1 | 透明性 | アフィリエイトリンクであることを明示する（「提携リンク」ラベル） |
| NF2 | 安全性 | 外部リンクは `rel="noopener noreferrer sponsored"` で開くこと |
| NF3 | パフォーマンス | パートナー取得 API は軽量にし、サイドバー表示に影響しないこと |
| NF4 | 拡張性 | 将来のコンバージョントラッキング追加を見据えた構造とする |

### 1.5 画面イメージ

#### パートナー一覧ページ（`/partners`）

```
┌──────────────────────────────────────┐
│ [←] おすすめサービス                    │ ← ヘッダー
├──────────────────────────────────────┤
│ [ポーカールーム] [ツール] [学習] [全て]    │ ← カテゴリタブ
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ [LOGO]  GGPoker                  │ │
│ │ 世界最大級のオンラインポーカー      │ │
│ │ 🎁 初回入金100%ボーナス           │ │
│ │ [登録はこちら →]                  │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ [LOGO]  PokerStars               │ │
│ │ ...                              │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

#### 右サイドバー（ホーム画面）

```
┌──────────────────────┐
│ おすすめ               │
│ ┌──────────────────┐ │
│ │ [LOGO] GGPoker    │ │
│ │ 初回入金100%ボーナス │ │
│ │ [詳しく見る →]     │ │
│ └──────────────────┘ │
│ [全て見る →]          │
└──────────────────────┘
```

---

## 2. 設計

### 2.1 データモデル

#### AffiliatePartner（パートナー）

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | UUID | ○ | 主キー |
| name | String | ○ | パートナー名（例: "GGPoker"） |
| slug | String | ○ | URL用スラッグ（例: "ggpoker"）、ユニーク |
| description | String | ○ | 説明文 |
| longDescription | String? | - | 詳細説明（パートナーページ用） |
| category | Enum | ○ | POKER_ROOM / TOOL / LEARNING / GOODS |
| logoUrl | String? | - | ロゴ画像URL |
| bannerUrl | String? | - | バナー画像URL |
| affiliateUrl | String | ○ | アフィリエイトリンク先URL |
| bonus | String? | - | 特典情報（例: "初回入金100%ボーナス"） |
| sortOrder | Int | ○ | 表示順 |
| isActive | Boolean | ○ | 有効/無効 |
| isFeatured | Boolean | ○ | おすすめ表示対象かどうか |
| createdAt | DateTime | ○ | 作成日時 |
| updatedAt | DateTime | ○ | 更新日時 |

```prisma
enum AffiliateCategory {
  POKER_ROOM
  TOOL
  LEARNING
  GOODS
}

model AffiliatePartner {
  id              String             @id @default(uuid())
  name            String
  slug            String             @unique
  description     String
  longDescription String?
  category        AffiliateCategory
  logoUrl         String?
  bannerUrl       String?
  affiliateUrl    String
  bonus           String?
  sortOrder       Int                @default(0)
  isActive        Boolean            @default(true)
  isFeatured      Boolean            @default(false)
  clicks          AffiliateClick[]
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([isActive, category, sortOrder])
  @@index([isActive, isFeatured, sortOrder])
}
```

#### AffiliateClick（クリック計測）

```prisma
model AffiliateClick {
  id          String            @id @default(uuid())
  partner     AffiliatePartner  @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  partnerId   String
  userId      String?           // ログインユーザーの場合のみ
  referrer    String?           // どのページから来たか
  createdAt   DateTime          @default(now())

  @@index([partnerId, createdAt])
  @@index([userId])
}
```

### 2.2 API 設計

#### GET /affiliates

パートナー一覧を取得する。

**認証**: 不要（パブリック）

**クエリパラメータ**
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| category | string | - | カテゴリでフィルタ（"POKER_ROOM", "TOOL", "LEARNING", "GOODS"） |
| featured | boolean | - | "true" の場合おすすめのみ |

**レスポンス例**
```json
[
  {
    "id": "uuid",
    "name": "GGPoker",
    "slug": "ggpoker",
    "description": "世界最大級のオンラインポーカールーム",
    "category": "POKER_ROOM",
    "logoUrl": "https://...",
    "bonus": "初回入金100%ボーナス（最大$600）",
    "sortOrder": 0
  }
]
```

**ロジック**
- `isActive = true` のみ
- category 指定時はフィルタ
- featured=true 時は `isFeatured = true` のみ
- sortOrder 昇順

#### GET /affiliates/:slug

パートナー詳細を取得。

**認証**: 不要（パブリック）

**レスポンス例**
```json
{
  "id": "uuid",
  "name": "GGPoker",
  "slug": "ggpoker",
  "description": "世界最大級のオンラインポーカールーム",
  "longDescription": "GGPokerは...",
  "category": "POKER_ROOM",
  "logoUrl": "https://...",
  "bannerUrl": "https://...",
  "bonus": "初回入金100%ボーナス（最大$600）",
  "affiliateUrl": null
}
```

※ `affiliateUrl` は直接返さない（リダイレクトエンドポイント経由を強制）

#### GET /affiliates/:slug/redirect

クリックを計測し、アフィリエイトURLにリダイレクト。

**認証**: 不要（パブリック、ただしログインユーザーはトークンからIDを取得）

**クエリパラメータ**
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| ref | string | - | リファラー情報（"sidebar", "partners_page" 等） |

**レスポンス**
- HTTP 302 リダイレクト → affiliateUrl
- リダイレクト前に AffiliateClick レコードを作成

#### GET /affiliates/stats（将来拡張用）

管理者向けクリック統計。Phase 2 で実装。

### 2.3 フロントエンド設計

#### 2.3.1 型定義

```typescript
export type AffiliatePartner = {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string | null;
  category: "POKER_ROOM" | "TOOL" | "LEARNING" | "GOODS";
  logoUrl?: string | null;
  bannerUrl?: string | null;
  bonus?: string | null;
  sortOrder: number;
};
```

#### 2.3.2 パートナー一覧ページ（`/partners`）

- カテゴリタブ: 「全て」「ポーカールーム」「ツール」「学習」「グッズ」
- カード一覧: ロゴ、パートナー名、説明文、特典、CTAボタン
- CTAボタン: `/affiliates/:slug/redirect?ref=partners_page` へ遷移

#### 2.3.3 パートナーカードコンポーネント

- **AffiliateCard**（新規）
  - props: `partner: AffiliatePartner`, `referrer?: string`
  - 表示: ロゴ、名前、説明、特典バッジ、CTAボタン
  - 「提携リンク」ラベルを小さく表示
  - CTAクリック → `window.open(API_BASE + '/affiliates/' + slug + '/redirect?ref=' + referrer, '_blank', 'noopener,noreferrer')`

#### 2.3.4 右サイドバー（ホーム画面拡張）

- 既存の検索バーの下に「おすすめサービス」セクションを追加
- `GET /affiliates?featured=true` で取得（最大3件表示）
- 「全て見る →」リンク → `/partners`

#### 2.3.5 サイドバーナビゲーション

- 左サイドバーに「おすすめ」ナビリンクを追加（`/partners`）

### 2.4 ファイル構成

```
backend/
  prisma/
    schema.prisma               # AffiliatePartner + AffiliateClick 追加
  src/
    affiliates/
      affiliates.module.ts
      affiliates.controller.ts
      affiliates.service.ts

frontend/
  src/
    app/
      partners/
        page.tsx                # 新規: パートナー一覧ページ
      components/
        AffiliateCard.tsx       # 新規: パートナーカード
    lib/
      types.ts                  # 変更: AffiliatePartner 型追加
```

### 2.5 シードデータ

マイグレーション後に、代表的なパートナーをシードする。

```sql
INSERT INTO "AffiliatePartner" (id, name, slug, description, category, bonus, "affiliateUrl", "sortOrder", "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'GGPoker', 'ggpoker',
   '世界最大級のオンラインポーカールーム。豊富なトーナメントとキャッシュゲームが楽しめます。',
   'POKER_ROOM', '初回入金100%ボーナス（最大$600）',
   'https://example.com/ggpoker', 0, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'PokerStars', 'pokerstars',
   '世界で最もプレイヤー数が多いオンラインポーカーサイト。',
   'POKER_ROOM', '初回入金ボーナス$600',
   'https://example.com/pokerstars', 1, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'GTO Wizard', 'gto-wizard',
   'ブラウザベースのGTOトレーニングツール。ハンドごとの最適戦略を学べます。',
   'TOOL', '7日間無料トライアル',
   'https://example.com/gtowizard', 0, true, true, NOW(), NOW());
```

### 2.6 環境変数

```
# 特に追加の環境変数は不要
# アフィリエイトURLはDB管理のため
```

---

## 3. 実装タスク一覧

1. [ ] Prisma: AffiliatePartner + AffiliateClick モデル追加 → マイグレーション
2. [ ] Prisma: シードデータ投入（マイグレーションSQL）
3. [ ] Backend: affiliates モジュール作成（controller, service, module）
4. [ ] Backend: GET /affiliates 一覧API実装
5. [ ] Backend: GET /affiliates/:slug 詳細API実装
6. [ ] Backend: GET /affiliates/:slug/redirect リダイレクト+クリック計測 実装
7. [ ] Frontend: AffiliatePartner 型定義
8. [ ] Frontend: AffiliateCard コンポーネント作成
9. [ ] Frontend: /partners ページ作成（カテゴリタブ付き一覧）
10. [ ] Frontend: ホーム画面右サイドバーに「おすすめサービス」追加
11. [ ] Frontend: 左サイドバーに「おすすめ」ナビリンク追加
12. [ ] 動作確認・スタイル調整

---

## 4. 将来拡張（Phase 2）

- 管理画面（パートナーCRUD）
- クリック統計ダッシュボード（日別・パートナー別）
- コンバージョントラッキング（Postback URL）
- ユーザー属性に応じたパートナーレコメンド
- 動的バナー広告（パートナーバナーをフィード内に表示）
- パートナー個別詳細ページ（`/partners/:slug`）
- レビュー・評価機能（ユーザーがパートナーを評価）
