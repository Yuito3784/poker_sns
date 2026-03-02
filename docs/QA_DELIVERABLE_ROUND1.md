# QA/QC Round 1 Deliverable

**Author**: 尾丸 (QA/QC Senior)
**Date**: 2026-03-02
**Branch**: climpire/dea4c777
**Status**: Complete

---

## 1. Planned会議 補完計画の反映

### 1.1 スモークテスト仕様ドラフト — 合格基準 (最終版)

Planned会議で雪花 (QA/QCリーダー) が定義した **3系統のコアフロー** を最小合格基準として確定。
既存の `docs/qa-smoke-test-checklist.md` (84ケース) から該当P0ケースを抽出・マッピング。

#### 合格判定: 3系統すべて PASS で GO

| # | 系統 | 対応テストケース | ケース数 | 判定基準 |
|---|------|----------------|---------|---------|
| A | 認証フロー | 1-1, 1-3, 1-5, 1-8 | 4 | 登録 → メール認証 → ログイン → トークンリフレッシュ 全ステップ成功 |
| B | 決済フロー | 7-1, 7-5, PAY-02 | 3 | Stripe checkout生成 → webhook受信 → premium badge反映 |
| C | 投稿CRUD + 画像 | 2-1, 2-4, 2-8, 2-10 | 4 | テキスト投稿作成 → 画像アップロード → タイムライン表示 → 投稿削除 |
| | **合計** | | **11** | **全11件 PASS = GO** |

**No-Go トリガー (1件でも該当で停止):**
- 系統A: ログイン失敗 or トークンリフレッシュ失敗
- 系統B: Webhook署名検証失敗 (400が返らない)
- 系統C: 画像アップロード後に `/uploads/` で配信されない

#### 手動実行フロー (推定15分)

```
[系統A] 認証フロー
  1. POST /api/auth/register → 201, accessToken+refreshToken確認
  2. POST /api/auth/verify-email (DBから直接token取得 or メール確認)
     → 200, emailVerified=true
  3. POST /api/auth/login → 200, 新規accessToken+refreshToken
  4. POST /api/auth/refresh → 200, トークンペア更新

[系統B] 決済フロー
  5. POST /api/subscriptions/checkout (Bearer) → 200, checkoutUrl
  6. stripe trigger checkout.session.completed (Stripe CLI)
     → webhook 200, user.subscriptionStatus='premium'
  7. GET /api/users/:username → subscriptionStatus='premium' 確認

[系統C] 投稿CRUD + 画像
  8. POST /api/posts/upload-image (multipart, jpg) → 201, imageUrl
  9. POST /api/posts {content, imageUrl} → 201, 投稿データ
  10. GET /api/posts/timeline → 200, 投稿がリストに含まれる
  11. DELETE /api/posts/:id → 200, 投稿削除
```

---

### 1.2 OAuth セッション in-memory Map リスク評価

Planned会議で兎田 (Developmentリーダー) が指摘した、OAuthセッションの `in-memory Map` がマルチプロセス環境で動作しない問題について QA観点で評価。

**コード確認箇所:** `backend/src/auth/auth.service.ts` L27-47

```typescript
private readonly oauthSessions = new Map<string, { data: OAuthSessionData; expiresAt: Date }>();
```

| 評価項目 | 結果 |
|---------|------|
| **現在の影響度** | LOW — Docker compose で backend は単一コンテナ (replicas=1) |
| **将来の影響度** | HIGH — スケールアウト時 (PM2 cluster / k8s replicas > 1) に OAuth ログイン失敗 |
| **発生条件** | OAuth コールバックが storeOAuthSession と異なるプロセスに到達した場合 |
| **TTL** | 5分 (短い=リスク限定的) |
| **セッションID強度** | 128bit random — 推測不可能 |
| **本番リリースブロッカーか** | **NO** — 単一インスタンス構成では問題なし |

**推奨対応 (リリース後):**

| 優先度 | 対応策 | 工数目安 |
|--------|-------|---------|
| P1 (スケール前) | Redis 移行: `ioredis` + `SETEX` (5分TTL) | 2h |
| P2 (代替) | DB (Prisma) に一時テーブル追加 | 3h |

**QA判定:** 初回リリース時は単一インスタンス構成のため **GO**。スケールアウト計画が出た時点でブロッカーに昇格。

---

## 2. レビュー対象ブランチ QA評価

Planning (桃鈴) のレビューで特定された6ブランチの QA リスク評価。

| # | Branch | 変更内容 | QAリスク | テスト影響 |
|---|--------|---------|---------|-----------|
| 1 | `cece7d29` | CI/CD GHCR lowercase修正 + standalone output | LOW | CI/CDパイプラインのみ、機能テスト影響なし |
| 2 | `9ce718bd` | Phase5収益機能 (AI分析/Stats/年額プラン) | **HIGH** | 新エンドポイント追加 → スモークテスト拡張が必要 |
| 3 | `e0f4ba83` | エラー通知パイプライン + タスク監査 | MEDIUM | app.module.ts競合あり、モジュール構成変更 |
| 4 | `07a5b50e` | CI/CD通知 + 自動リカバリ + ヘルスチェック | LOW | ci-cd.ymlリベース必要、機能テスト影響なし |
| 5 | `b9e5c974` | ダークテーマSuspense修正 | LOW | フロントエンドUIのみ、既存テスト影響なし |
| 6 | `7125774c` | E2Eテスト設定修正 | LOW (positive) | テスト基盤改善、マージ推奨 |

### マージ順序 QA推奨

```
1. 7125774c (E2Eテスト修正) — テスト基盤改善を先にマージ
2. b9e5c974 (Suspense修正) — 低リスク、競合なし
3. cece7d29 (GHCR修正) — CI/CDのみ、重複ブランチ7件は削除
4. 07a5b50e (CI/CD通知) — リベース後マージ
5. e0f4ba83 (エラー通知) — app.module.ts競合解消後
6. 9ce718bd (Phase5) — 最後にマージ、QAスモークテスト拡張と同時
```

**Branch 2 (`9ce718bd`) 追加テスト要件:**
- AI分析エンドポイント疎通テスト
- 統計データ取得テスト
- 年額プランのStripe checkout テスト
→ マージ後にスモークテストチェックリスト v1.1 で追加予定

---

## 3. 既存テスト不整合の追跡

`QA_PRODUCTION_READINESS_REPORT.md` で報告済みの不整合の現在状態。

| # | 不整合 | ファイル | 重要度 | Status |
|---|-------|---------|-------|--------|
| 1 | bcrypt rounds 10→12 不一致 | auth.service.spec.ts | CRITICAL | Development修正依頼済み、未修正 |
| 2 | buildAuthResponse 戻り値不完全 | auth.service.spec.ts | HIGH | Development修正依頼済み、未修正 |
| 3 | フロントエンドテスト基盤なし | frontend/ | LOW | リリース後対応 |

**QA判定:** 項目1-2はユニットテストのアサーション不整合であり、本番動作には影響しない。テスト実行時にFAILするが、本番リリースのブロッカーではない。

---

## 4. Release Gate 最終版 (Round 1 確定)

### 4.1 必須条件 (全て PASS で GO)

| # | Gate | 検証方法 | 状態 |
|---|------|---------|------|
| G-1 | 3系統コアフロー PASS (11ケース) | セクション1.1の手動実行フロー | サーバー待ち |
| G-2 | セキュリティヘッダー CRITICAL 全件 PASS | HDR-01〜04 (HSTS, noSniff, DENY, CSP) | サーバー待ち |
| G-3 | SSL/HTTPS 正常動作 | SSL-01〜03 (証明書, HTTPS, リダイレクト) | サーバー待ち |
| G-4 | DB外部ポート非公開 | ENV-03 確認 | コード上確認済み |
| G-5 | Webhook署名検証 400返却 | PAY-03 | コード上確認済み |

### 4.2 推奨条件 (FAIL でも GO 可、ただし要記録)

| # | Gate | 内容 |
|---|------|------|
| R-1 | P0スモークテスト残り19件 | 3系統以外のP0 (検索、通知、フロントページ等) |
| R-2 | レート制限検証 | RATE-01〜04 |
| R-3 | OAuth フロー | Google/LINE/X 各プロバイダ (本番キー依存) |

### 4.3 リリース後 優先改善 (P1)

| # | 項目 | 担当 |
|---|------|------|
| POST-1 | @Query/@Param バリデーション追加 (6エンドポイント) | Development |
| POST-2 | OAuth in-memory Map → Redis 移行 | Development |
| POST-3 | auth.service.spec.ts 不整合修正 | Development |
| POST-4 | フロントエンドテスト基盤構築 | Development + QA |
| POST-5 | Phase5 (9ce718bd) マージ後のスモークテスト v1.1 | QA |

---

## 5. 成果物一覧

本 Round 1 で QA/QC が作成・更新した全ドキュメント:

| # | ファイル | 内容 | 状態 |
|---|---------|------|------|
| 1 | `docs/qa-smoke-test-checklist.md` | 全84ケースのスモークテスト仕様 | 既存 (v1.0) |
| 2 | `docs/QA_PRODUCTION_READINESS_REPORT.md` | 本番リリース準備レポート | 既存 |
| 3 | `docs/qa-deliverable-prelaunch.md` | Pre-launch成果物サマリー | 既存 |
| 4 | `docs/qa-security-header-verification.md` | セキュリティヘッダー検証仕様 | 既存 |
| 5 | `docs/qa-stripe-e2e-test-scenarios.md` | Stripe E2Eシナリオ (47ケース) | 既存 |
| 6 | `docs/ops-deploy-smoke-test-runbook.md` | デプロイ後スモークテスト手順書 | 既存 |
| 7 | **`docs/QA_DELIVERABLE_ROUND1.md`** | **本ドキュメント (Round1統合成果物)** | **NEW** |

---

## 6. 他チームへの依頼事項

### → Development (兎田)
1. `auth.service.spec.ts` bcrypt rounds → 12 に更新
2. `buildAuthResponse` テストに refreshToken, subscriptionStatus 追加
3. OAuth in-memory Map の Redis 移行をスケールアウト前に実施

### → Operations
1. スモークテスト実行スクリプト (`ops-deploy-smoke-test-runbook.md`) のcron/CD統合
2. 本番デプロイ後にQAチームへ通知 → スモークテスト実施トリガー

### → Planning (桃鈴)
1. 6ブランチのマージ順序はセクション2の推奨に従うことを提案
2. Phase5 (`9ce718bd`) マージ後のスモークテスト拡張をスケジュールに追加

---

*本レポートは Planned会議の補完計画 (スモークテスト仕様3系統合格基準 + OAuth in-memory Mapリスク評価) を反映し、Round 1 QA/QC成果物として統合したものです。*
