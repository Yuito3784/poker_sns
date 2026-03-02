# Phase 5: 収益最大化 — 要件定義書 v1.0

> 作成: 2026-03-02 | Planning部門 (常闇)
> ステータス: Draft → Dev/QAレビュー待ち

---

## 1. 現状分析サマリ

### 既存アセット
| 項目 | 現状 |
|------|------|
| Prismaスキーマ | User, Post, PokerHand, PokerStreet, PokerAction, AffiliatePartner, AffiliateClick, Ad, SubscriptionEvent |
| Stripe連携 | 単一プラン(STRIPE_PRICE_ID), checkout/cancel/reactivate/portal/webhook |
| アフィリエイト | 4カテゴリ(POKER_ROOM/TOOL/LEARNING/GOODS), クリック追跡(partnerId/userId/referrer), リダイレクト方式 |
| ポーカーハンド | TableType/Position/Street/ActionType enum完備, ストリート別アクション記録済 |
| AI分析 | 未実装（テーブル・エンドポイント・ロジック全て無し） |
| 統計ダッシュボード | 未実装 |
| カスタムテーマ | 未実装（全UIハードコード） |
| 年間プラン | 未実装（単一Price IDのみ） |

### 収益構造の現状
- プレミアム: ¥980/月（単一プラン）
- アフィリエイト: クリック追跡のみ（CVR/収益の分析機能なし）
- 広告: フィード内Ad挿入（プレミアム会員は非表示）

---

## 2. タスク 5-1: プレミアム機能の拡充

### 5-1-1: AI ハンド分析機能

#### API選定: Claude API (Anthropic)
**選定理由:**
- ポーカー戦略の論理的分析に強い推論能力
- 日本語対応が良好
- 既存NestJSアーキテクチャとの親和性

#### コスト試算

| モデル | 入力単価 | 出力単価 | 1リクエスト想定 | 1リクエストコスト |
|--------|----------|----------|-----------------|-------------------|
| Claude Haiku 4.5 | $1/MTok | $5/MTok | 入力2K tok + 出力1K tok | ~$0.007 (約¥1.1) |
| Claude Sonnet 4.6 | $3/MTok | $15/MTok | 入力2K tok + 出力1K tok | ~$0.021 (約¥3.2) |

**推奨:** Claude Haiku 4.5（コスト最適、ポーカー分析に十分な能力）

**月間コスト想定:**
| シナリオ | ユーザー数 | 月間リクエスト | 月間API費用 |
|----------|-----------|---------------|-------------|
| 初期 | 100人 | 500回 | ¥550 |
| 成長期 | 1,000人 | 5,000回 | ¥5,500 |
| 目標達成 | 5,000人 | 25,000回 | ¥27,500 |

**損益分岐点:**
- 無料枠: 月5回/ユーザー → プレミアム限定
- プレミアム¥980/月のうちAI分析コスト: 最大¥5.5/ユーザー (0.56%)
- 追加課金（無制限パック）: ¥500/月 → 100リクエストでも¥110コスト → 利益率78%

#### レート制限設計

| ユーザー種別 | 月間回数 | 1日上限 | 追加課金 |
|-------------|---------|---------|---------|
| フリー | 0回 | - | 不可 |
| プレミアム | 5回/月 | 3回/日 | ¥500/月で無制限 |
| 無制限パック | 無制限 | 10回/日 | - |

#### 必要なDB変更

```prisma
// 新規テーブル: AI分析結果
model AiAnalysis {
  id        String   @id @default(uuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  analysis  String   @db.Text  // AI分析結果(JSON or Markdown)
  model     String              // 使用モデル名
  inputTokens  Int
  outputTokens Int
  createdAt DateTime @default(now())

  @@unique([postId, userId])  // 1投稿1ユーザーにつき1分析
  @@index([userId, createdAt])
}

// 新規テーブル: 使用量追跡
model AiUsage {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  month     String   // "2026-03" 形式
  count     Int      @default(0)
  hasUnlimited Boolean @default(false) // 無制限パック購入済
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, month])
  @@index([userId])
}
```

#### APIエンドポイント設計

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| POST | `/posts/:id/ai-analysis` | JWT + Premium | ハンド分析リクエスト |
| GET | `/posts/:id/ai-analysis` | JWT | 分析結果取得 |
| GET | `/ai-analysis/usage` | JWT | 今月の使用量確認 |

#### Claudeプロンプト設計方針
- システムプロンプト: ポーカーGTO戦略の専門家として振る舞う
- 入力: PokerHand + PokerStreet + PokerAction を構造化テキストに変換
- 出力構造:
  - 総合評価（A/B/C/D/F）
  - ストリート別アクション評価
  - 改善ポイント（最大3点）
  - GTO観点からの推奨アクション

---

### 5-1-2: 詳細統計ダッシュボード（プレミアム限定）

#### 必要データソース
- 既存: PokerHand + PokerStreet + PokerAction テーブル
- 追加テーブル不要（集計クエリで対応可能）

#### 統計項目と実装方針

| 統計 | データソース | 実装 |
|------|-------------|------|
| 勝率推移グラフ | PokerHand.result パース | BE集計API + FEグラフ |
| ポジション別成績 | PokerHand.heroPosition + result | BE集計API |
| ストリート別アクション分析 | PokerAction集計 | BE集計API |
| 収支グラフ | PokerHand.result パース(累計) | BE集計API + FEグラフ |

#### APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/stats/overview` | 総合統計サマリ |
| GET | `/stats/winrate?period=30d` | 勝率推移（期間指定） |
| GET | `/stats/position` | ポジション別成績 |
| GET | `/stats/actions` | ストリート別アクション分析 |
| GET | `/stats/profit?period=30d` | 収支推移 |

#### FEグラフライブラリ
- 推奨: **Recharts** (React用、軽量、SVGベース)
- 理由: Next.js App Routerとの互換性良好、SSR対応

---

### 5-1-3: カスタムプロフィールテーマ（プレミアム限定）

#### スコープ（MVP）
- プリセットテーマ5種から選択（カスタムカラーピッカーは将来対応）
- プロフィールヘッダー背景のカスタマイズ

| テーマ名 | ヘッダー色 | アクセント |
|----------|-----------|-----------|
| Default (Felt Green) | #1a2f1c | #c9a84c |
| Royal Blue | #0f1a2e | #4a8fd4 |
| Crimson | #2e0f14 | #d44a5c |
| Midnight | #0d0d14 | #8a7ad4 |
| Platinum | #1a1a1a | #c0c0c0 |

#### DB変更
```prisma
// User テーブルに追加
model User {
  // ... existing fields
  profileTheme  String  @default("default")  // テーマ名
}
```

---

### 5-1-4: 年間プラン導入

#### 価格設計
| プラン | 月額換算 | 年額 | 割引率 |
|--------|---------|------|--------|
| 月額プラン | ¥980 | ¥11,760 | - |
| 年間プラン | ¥817 | ¥9,800 | 16.7% (約2ヶ月分) |

#### Stripe設定
- 新規Price ID作成: `STRIPE_YEARLY_PRICE_ID` (.envに追加)
- Checkout時にプラン選択UI追加
- Webhook: 既存ロジックで対応可能（subscription.updatedで同期）

#### DB変更
```prisma
// User テーブルに追加
model User {
  // ... existing fields
  subscriptionPlan  String  @default("monthly")  // "monthly" | "yearly"
}
```

#### FE変更
- 設定ページのプレミアムカードにプラン切替タブ追加
- LPのPremiumセクションに年間プラン表示

---

## 3. タスク 5-2: アフィリエイト収益の最大化

### 5-2-1: アフィリエイトクリック分析ダッシュボード

#### 既存データ
- AffiliateClick: partnerId, userId(optional), referrer, createdAt
- 不足: CVR追跡、収益データ

#### 追加が必要なDB変更

```prisma
// AffiliateClick テーブル拡張
model AffiliateClick {
  // ... existing fields
  userAgent    String?   // ブラウザ情報
  converted    Boolean   @default(false)  // CVR追跡用
  revenue      Float?    // パートナー報告の収益(手動入力)
}

// パートナー月次レポート（管理者入力）
model AffiliateReport {
  id         String   @id @default(uuid())
  partnerId  String
  partner    AffiliatePartner @relation(fields: [partnerId], references: [id])
  month      String   // "2026-03"
  clicks     Int
  conversions Int
  revenue    Float    // 円換算
  createdAt  DateTime @default(now())

  @@unique([partnerId, month])
}
```

#### 分析API

| Method | Path | 説明 |
|--------|------|------|
| GET | `/admin/affiliates/dashboard` | 全体サマリ |
| GET | `/admin/affiliates/:partnerId/stats` | パートナー別詳細 |
| GET | `/admin/affiliates/hourly` | 時間帯別クリック傾向 |
| POST | `/admin/affiliates/report` | 月次レポート入力 |

### 5-2-3: コンテキスチュアルアフィリエイト

#### ロジック
- 投稿内容のキーワードマッチング:
  - `isPokerHand === true` → TOOL カテゴリのパートナー優先表示
  - `content` に「チップ」「テーブル」「グッズ」→ GOODS カテゴリ
  - `content` に「入金」「ボーナス」「ポーカールーム」→ POKER_ROOM カテゴリ
- PostItem コンポーネント下部に関連パートナー1件を表示

#### AffiliatePartnerテーブル追加フィールド
```prisma
model AffiliatePartner {
  // ... existing fields
  keywords     String[]  // マッチングキーワード配列
}
```

---

## 4. タスク 5-3: LP の継続改善

### 5-3-1: ヒートマップ分析
- **推奨:** Microsoft Clarity（完全無料、制限なし）
- 実装: `<Script>` タグをLP layout.tsxに追加のみ
- 設定: clarity.microsoft.com でプロジェクト作成 → ID取得

### 5-3-3: ソーシャルプルーフの追加
- ユーザー数表示: `GET /stats/public` エンドポイント新設
  - 総ユーザー数、総投稿数、総ハンド分析数
  - 10分キャッシュ
- LP Hero セクション直下にカウンターバー配置

---

## 5. 実装優先順位と依存関係

```
Week 5: スキーマ設計 + 年間プラン
  ├── 5-1-4: 年間プラン (Stripe Price作成 + BE/FE) ← 最も独立性高い
  ├── DB: AiAnalysis, AiUsage テーブル追加
  └── DB: User.profileTheme, User.subscriptionPlan 追加

Week 6: AI分析 + 統計API
  ├── 5-1-1: AI分析 BE (Claude API連携 + エンドポイント)
  ├── 5-1-2: 統計API (集計クエリ実装)
  └── 5-2-1: アフィリエイト分析API

Week 7: フロントエンド
  ├── 5-1-1: AI分析 FE (分析結果表示UI)
  ├── 5-1-2: 統計ダッシュボード FE (Recharts)
  ├── 5-1-3: カスタムテーマ FE
  └── 5-3-3: LP ソーシャルプルーフ

Week 8: 最適化 + アフィリエイト強化
  ├── 5-2-3: コンテキスチュアルアフィリエイト
  ├── 5-3-1: Clarity導入
  ├── 5-3-2: CTA A/Bテスト準備
  └── QA + パフォーマンスチューニング
```

---

## 6. リスク・懸念事項

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Claude API コスト超過 | 中 | レート制限 + 日次上限 + Haiku使用 |
| PokerHand.result パース不統一 | 高 | result フォーマットバリデーション追加 |
| Stripe年間プランの既存ユーザー移行 | 低 | 新規契約のみ対象、既存ユーザーは次回更新時に選択可能 |
| 統計データ量増加によるクエリ性能 | 中 | インデックス設計 + キャッシュ導入 |

---

## 7. KPI・完了基準

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| プレミアム課金転換率 | 5%以上 | (有料ユーザー / 全ユーザー) × 100 |
| AI分析利用率 | プレミアムの60%以上 | AiUsage テーブル集計 |
| 年間プラン選択率 | 新規契約の30%以上 | Stripe Dashboard |
| アフィリエイト月間収益 | ¥450,000 | AffiliateReport集計 |
| LP CVR | 10%以上 | Clarity + GA4 |

---

## 8. 環境変数追加一覧

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-haiku-4-5-20251001

# Stripe 年間プラン
STRIPE_YEARLY_PRICE_ID=price_xxxxx

# AI分析 追加課金プラン
STRIPE_AI_UNLIMITED_PRICE_ID=price_xxxxx

# Microsoft Clarity
NEXT_PUBLIC_CLARITY_ID=xxxxx
```
