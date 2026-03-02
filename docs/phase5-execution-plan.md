# Phase 5: 実行計画 — Dev向けサブタスク分解

> 作成: 2026-03-02 | Planning部門 (常闇)
> 参照: docs/phase5-requirements.md

---

## 実装順序（依存関係考慮済）

### Batch 1: スキーマ + 年間プラン (Week 5)

#### ST-1: Prismaスキーマ拡張
**担当:** Dev (白銀)
**依存:** なし
**ファイル:** `backend/prisma/schema.prisma`

追加テーブル:
1. `AiAnalysis` — AI分析結果格納
2. `AiUsage` — 月間使用量追跡
3. `AffiliateReport` — パートナー月次レポート

追加フィールド:
1. `User.profileTheme` (String, default: "default")
2. `User.subscriptionPlan` (String, default: "monthly")
3. `AffiliatePartner.keywords` (String[])
4. `AffiliateClick.userAgent` (String?)
5. `AffiliateClick.converted` (Boolean, default: false)
6. `AffiliateClick.revenue` (Float?)

リレーション追加:
1. `Post.aiAnalyses` → AiAnalysis[]
2. `User.aiAnalyses` → AiAnalysis[]
3. `User.aiUsages` → AiUsage[]
4. `AffiliatePartner.reports` → AffiliateReport[]

**実行コマンド:** `npx prisma db push --accept-data-loss`

---

#### ST-2: Stripe 年間プラン対応
**担当:** Dev
**依存:** ST-1
**ファイル:**
- `backend/src/subscriptions/subscriptions.service.ts`
- `backend/src/subscriptions/subscriptions.controller.ts`
- `backend/src/subscriptions/dto/` (新規DTO)

変更内容:
1. checkout メソッドに `plan` パラメータ追加 ("monthly" | "yearly")
2. plan に応じて STRIPE_PRICE_ID / STRIPE_YEARLY_PRICE_ID を切替
3. checkout.session.completed webhook で subscriptionPlan を保存
4. status API レスポンスに subscriptionPlan を含める

```typescript
// checkout DTO 拡張
export class CreateCheckoutDto {
  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  plan?: string = 'monthly';
}
```

---

#### ST-3: 年間プラン FE対応
**担当:** FE
**依存:** ST-2
**ファイル:**
- `frontend/src/app/settings/page.tsx`
- `frontend/src/app/lp/LandingClient.tsx`

変更内容:
1. 設定ページ: プレミアムカードにタブ切替 (月額/年額)
2. 年額選択時: ¥9,800/年 表示 + 「2ヶ月分お得」バッジ
3. LP: Premium セクションに年間プラン価格追加

---

### Batch 2: AI分析 BE (Week 6前半)

#### ST-4: AI分析モジュール作成
**担当:** Dev
**依存:** ST-1
**新規ファイル:**
- `backend/src/ai-analysis/ai-analysis.module.ts`
- `backend/src/ai-analysis/ai-analysis.service.ts`
- `backend/src/ai-analysis/ai-analysis.controller.ts`
- `backend/src/ai-analysis/dto/`

実装内容:
1. Anthropic SDK インストール (`@anthropic-ai/sdk`)
2. PokerHand → 構造化テキスト変換ロジック
3. Claude API呼び出し (Haiku 4.5)
4. 使用量チェック・カウントロジック
5. 分析結果保存・取得

```
POST /posts/:id/ai-analysis
  → 認証チェック
  → プレミアム確認
  → 月間使用量チェック (AiUsage)
  → PokerHand データ取得・変換
  → Claude API 呼び出し
  → AiAnalysis に保存
  → 使用量カウント更新
  → レスポンス返却

GET /posts/:id/ai-analysis
  → 既存分析結果を返却

GET /ai-analysis/usage
  → 今月の使用量 + 上限を返却
```

---

### Batch 3: 統計API + アフィリエイト分析 (Week 6後半)

#### ST-5: 統計APIモジュール
**担当:** Dev
**依存:** ST-1
**新規ファイル:**
- `backend/src/stats/stats.module.ts`
- `backend/src/stats/stats.service.ts`
- `backend/src/stats/stats.controller.ts`

実装内容:
1. PokerHand.result のパースロジック（"Won 50bb" → +50, "Lost 25bb" → -25）
2. 勝率推移: 日/週/月別の勝率計算
3. ポジション別成績: heroPosition でグループ化
4. ストリート別アクション: ActionType × Street の集計
5. 収支累計: result の累積和

注意: `result` フィールドのフォーマットが統一されていない可能性あり。
バリデーション + フォーマット正規化が先決。

---

#### ST-6: アフィリエイト分析ダッシュボード
**担当:** Dev
**依存:** ST-1
**ファイル:**
- `backend/src/affiliates/affiliates.service.ts` (拡張)
- `backend/src/affiliates/affiliates.controller.ts` (拡張)

追加エンドポイント:
1. `GET /admin/affiliates/dashboard` — 全体集計
2. `GET /admin/affiliates/:id/stats` — パートナー別
3. `GET /admin/affiliates/hourly` — 時間帯別
4. `POST /admin/affiliates/report` — 月次レポート入力

AdminGuard で保護。

---

### Batch 4: フロントエンド実装 (Week 7)

#### ST-7: AI分析 FE
**担当:** FE
**依存:** ST-4
**ファイル:**
- `frontend/src/app/components/AiAnalysisButton.tsx` (新規)
- `frontend/src/app/components/AiAnalysisResult.tsx` (新規)
- PostItem コンポーネントに統合

UI仕様:
1. ポーカーハンド投稿にのみ「AI分析」ボタン表示
2. プレミアムユーザー: ゴールドボタン、残回数表示
3. フリーユーザー: グレーアウト + 「Premiumで利用可能」ツールチップ
4. 分析結果: カード形式で表示（総合評価 + ストリート別）

---

#### ST-8: 統計ダッシュボード FE
**担当:** FE
**依存:** ST-5
**新規ファイル:**
- `frontend/src/app/stats/page.tsx`
- `frontend/src/app/stats/StatsClient.tsx`
- `frontend/src/app/components/charts/` (グラフコンポーネント群)

実装内容:
1. `npm install recharts` (グラフライブラリ)
2. 勝率推移: LineChart
3. ポジション別成績: BarChart
4. ストリート別アクション: PieChart / StackedBar
5. 収支グラフ: AreaChart
6. プレミアム限定ゲート: フリーユーザーにはブラー + アップグレードCTA

---

#### ST-9: カスタムテーマ FE
**担当:** FE
**依存:** ST-1
**ファイル:**
- `frontend/src/app/settings/page.tsx` (テーマ選択UI追加)
- `frontend/src/app/profile/[username]/ProfileClient.tsx` (テーマ適用)

---

#### ST-10: LP ソーシャルプルーフ
**担当:** FE
**依存:** なし
**ファイル:**
- `frontend/src/app/lp/LandingClient.tsx`
- `backend/src/stats/stats.controller.ts` (公開統計API)

---

### Batch 5: アフィリエイト強化 + 分析ツール (Week 8)

#### ST-11: コンテキスチュアルアフィリエイト
**担当:** Dev + FE
**依存:** ST-1, ST-6
**ファイル:**
- `backend/src/affiliates/affiliates.service.ts` (キーワードマッチロジック)
- `frontend/src/app/components/PostItem.tsx` (関連パートナー表示)

---

#### ST-12: Clarity導入 + A/Bテスト基盤
**担当:** FE
**依存:** なし
**ファイル:**
- `frontend/src/app/lp/layout.tsx` (Clarity script追加)

---

## Dev向け注意事項

1. **prisma db push** を使うこと（migrate devは非対応環境）
2. **Stripe Price ID** はStripeダッシュボードで先に作成が必要
3. **Claude API Key** は `.env` に追加、コミットしないこと
4. **統計クエリ** はPrisma raw queryが必要になる可能性あり（複雑な集計）
5. **result フィールド** のフォーマット統一が先決 — バリデーション追加推奨
6. **Recharts** はクライアントコンポーネント専用（'use client' 必須）

## QA向けチェックポイント

1. AI分析: レート制限が正しく機能するか（月5回上限、日3回上限）
2. AI分析: 非ポーカーハンド投稿での分析リクエスト拒否
3. 年間プラン: 月額→年額の切替フロー
4. 年間プラン: 途中解約時の返金ポリシー（Stripe proration設定）
5. 統計: ポーカーハンド0件時の表示
6. テーマ: 各テーマの色がテキスト可読性を損なわないか
7. アフィリエイト: キーワードマッチの精度（誤マッチ防止）
