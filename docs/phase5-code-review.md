# Phase 5 コードレビュー — AI分析・統計ダッシュボード・年間プラン

**Reviewer**: 風真 (Development)
**Date**: 2026-03-02
**Commit**: `56d3648` — "Add Phase 5 revenue features: AI hand analysis, stats dashboard, annual plan"
**Scope**: 13 files, +580 / -25 lines

---

## 差分ファイル一覧

| # | File | Change | Lines |
|---|------|--------|-------|
| 1 | `.env.example` | Modified | +6 |
| 2 | `backend/package.json` | Modified | +1 |
| 3 | `backend/package-lock.json` | Modified | +69 / -25 |
| 4 | `backend/prisma/schema.prisma` | Modified | +33 |
| 5 | `backend/src/ai-analysis/ai-analysis.controller.ts` | **New** | +36 |
| 6 | `backend/src/ai-analysis/ai-analysis.module.ts` | **New** | +10 |
| 7 | `backend/src/ai-analysis/ai-analysis.service.ts` | **New** | +238 |
| 8 | `backend/src/app.module.ts` | Modified | +4 |
| 9 | `backend/src/stats/stats.controller.ts` | **New** | +23 |
| 10 | `backend/src/stats/stats.module.ts` | **New** | +10 |
| 11 | `backend/src/stats/stats.service.ts` | **New** | +149 |
| 12 | `backend/src/subscriptions/subscriptions.controller.ts` | Modified | +9 / -1 |
| 13 | `backend/src/subscriptions/subscriptions.service.ts` | Modified | +17 / -1 |

---

## レビューチェックリスト

### CRITICAL (即時修正必須)

#### C-1: Stats エンドポイント — 他ユーザーのデータ閲覧に対するアクセス制御不備
- **File**: `stats.controller.ts:11-16`
- **Issue**: `GET /stats/dashboard/:userId` で任意の `targetUserId` を指定可能だが、`StatsService.getDashboard()` は認証ユーザーのプレミアム判定のみ行い、`targetUserId` がリクエスト者自身かどうかを検証しない。プレミアムユーザーは任意のユーザーの統計データ(ポジション別勝率、直近30ハンド結果など)を閲覧可能。
- **Risk**: 情報漏洩 — ユーザーのポーカー戦略・勝率データが他者に露出
- **Fix**: `targetUserId` が自分自身でない場合は拒否するか、公開設定フラグで制御する

#### C-2: AI分析 — APIキー漏洩時のコスト制御なし
- **File**: `ai-analysis.service.ts:15-16`
- **Issue**: `FREE_MONTHLY_LIMIT = 5` は個人単位のレートリミットだがシステム全体の上限がない。APIキー漏洩やアカウント大量作成による悪用で、Anthropic APIの課金が青天井になるリスク。
- **Risk**: 財務リスク — 予期しないAPI費用発生
- **Fix**: 環境変数でシステム全体の月間トークン上限を設定し、超過時は全ユーザーに対して機能停止

---

### HIGH (マージ前に修正推奨)

#### H-1: AI分析 — JSON Injection / Prompt Injection リスク
- **File**: `ai-analysis.service.ts:108-115`
- **Issue**: `formatHandForAnalysis` でユーザー入力値(`heroPosition`, `heroHand`, `result` 等)をそのままプロンプトに埋め込んでいる。PokerHandデータにプロンプトインジェクション文字列が含まれた場合、LLMの出力を操作可能。
- **Risk**: AIが不正な出力を返し、フロントエンドで表示される可能性
- **Fix**: 入力値のサニタイズ（制御文字除去、長さ制限）を追加

#### H-2: AI分析 — レスポンスJSON解析の不完全なフォールバック
- **File**: `ai-analysis.service.ts:123-127`
- **Issue**: `JSON.parse` 失敗時に `{ rawAnalysis: analysisText }` を保存するが、`analysisText` はAIの生出力であり、XSS等の危険な文字列を含む可能性がある。フロントエンドでの表示時にエスケープされていない場合、Stored XSSの起点になり得る。
- **Risk**: Stored XSS
- **Fix**: フォールバック時もテキストをサニタイズしてから保存

#### H-3: 年間プランの Webhook 処理未対応
- **File**: `subscriptions.service.ts`
- **Issue**: `createCheckoutSession` に `plan` パラメータ (`monthly`/`annual`) が追加されたが、`handleCheckoutCompleted` や `handleSubscriptionUpdated` 等のWebhookハンドラにはプランタイプを区別する処理がない。年間プランでも月額と同じ扱いで `subscriptionStatus: 'active'` になるが、`subscriptionPeriodEnd` の計算やプラン変更（月→年、年→月）のダウングレード/アップグレードフローが未考慮。
- **Risk**: 年間プラン購入後にプラン変更やキャンセルで不整合が発生する可能性
- **Fix**: metadata に `plan` を保存し、Webhook側でプラン種別を保持する仕組みを追加

---

### MEDIUM (マージ後の改善で可、警告のみ)

#### M-1: AI分析 — Anthropicクライアントのエラーハンドリング不足
- **File**: `ai-analysis.service.ts:107-120`
- **Issue**: `this.getClient().messages.create()` の呼び出しに try-catch がなく、API障害時（タイムアウト、レート制限、500エラー等）にそのまま500が返る。ユーザーへのエラーメッセージが不親切。
- **Recommendation**: try-catchでAPI固有エラーをキャッチし、適切なHTTPステータスとメッセージを返す

#### M-2: Stats — N+1に近いクエリパターン
- **File**: `stats.service.ts:60-98`
- **Issue**: `getPositionStats` と `getStreetActionStats` で全ハンドデータをメモリにロードしてからアプリケーション側で集計している。ハンド数が増加すると性能劣化する。
- **Recommendation**: Prismaの `groupBy` や raw SQLでの集計に切り替え

#### M-3: AI分析 — 非原子的なDB操作
- **File**: `ai-analysis.service.ts:129-142`
- **Issue**: `aiAnalysis.create` と `aiAnalysisUsage.upsert` が別々のクエリで実行され、トランザクションで保護されていない。`create` 成功後に `upsert` が失敗した場合、使用量カウントと実際の分析レコードが不一致になる。
- **Recommendation**: `prisma.$transaction()` でラップ

#### M-4: `@types/bcryptjs` の削除
- **File**: `package-lock.json`
- **Issue**: Phase5 diffで `@types/bcryptjs` が削除されている。もし `bcryptjs` を使用するコードが型安全を期待している場合、ビルドエラーの原因になる可能性がある（ただしJS的にランタイムには影響なし）。
- **Recommendation**: `backend/package.json` の `devDependencies` に `@types/bcryptjs` が残っているか確認

---

### LOW (改善提案、コード変更不要)

#### L-1: コントローラにDTO/Validationパイプがない
- **File**: `ai-analysis.controller.ts`, `stats.controller.ts`
- **Issue**: リクエストパラメータのバリデーションが `class-validator` / DTO を経由していない。`:id` パラメータがUUID形式かどうかの検証もない。
- **Recommendation**: 既存パターンと一致しているなら現状維持、将来的にDTO導入

#### L-2: マジックナンバーの定数化
- **File**: `ai-analysis.service.ts:14-16`
- **Issue**: `FREE_MONTHLY_LIMIT = 5` はサービスファイル内に直接記載。環境変数化すると運用時にコード変更なしで調整可能。
- **Recommendation**: 環境変数 `AI_MONTHLY_LIMIT` への切り替え検討

#### L-3: テストファイルなし
- **Issue**: 新規モジュール `ai-analysis` と `stats` にユニットテストが存在しない。
- **Recommendation**: 最低限のサービスレイヤーテストを追加

---

## 総合評価

| カテゴリ | 件数 |
|---------|------|
| CRITICAL | 2 |
| HIGH | 3 |
| MEDIUM | 4 |
| LOW | 3 |

### マージ判定: **HOLD — CRITICAL 2件の修正後に再レビュー**

Phase5 の機能実装（AI分析・統計ダッシュボード・年間プラン）は構造的にはNestJSパターンに準拠しており、Prismaスキーマ拡張も適切。ただし以下2点のCRITICAL修正がマージのブロッカー:

1. **C-1**: Stats エンドポイントのアクセス制御（他ユーザーの戦略データ漏洩リスク）
2. **C-2**: AI API 利用のシステム全体コスト制御（APIキー悪用時の青天井課金リスク）

HIGH 3件（プロンプトインジェクション対策、XSSフォールバック、Webhookプラン区別）もマージ前の修正を推奨するが、CEOのリスク許容判断次第では後続タスクとして扱うことも可能。

MEDIUM/LOW はマージ後の技術的負債として管理し、コード変更は行わない。
