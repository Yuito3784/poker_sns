# Phase 1 課金・決済テストケースマトリクス (Task 1-4)

**作成日**: 2026-03-02
**作成者**: QA/QC 雪花
**ステータス**: v1.0 — テスト実装済み・全パス

---

## 概要

Phase 1 タスク 1-4「決済・課金の自動テスト」に基づき、Webhook ハンドラ・サブスクリプション操作・プレミアム機能の包括的テストケースを策定・実装した。

**完了基準**: 課金関連テスト15件以上が全パス → **実績: 34件パス**

---

## 1. テストファイル一覧

| ファイル | テスト数 | カバー範囲 |
|---|---|---|
| `subscriptions/subscriptions.service.spec.ts` | 28件 | Webhook全ハンドラ, Checkout, Cancel, Reactivate, Portal, Status |
| `posts/posts.service.spec.ts` (追加分) | 6件 | プレミアム文字数制限 (free/active/canceled/past_due) |

---

## 2. Webhook ハンドラテストマトリクス (Task 1-4-2)

### 2-1. 署名検証

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| W-01 | 不正な signature | 異常系 | BadRequestException (400) | PASS |
| W-02 | STRIPE_WEBHOOK_SECRET 未設定 | 異常系 | BadRequestException (400) | PASS |

### 2-2. べき等性 (Idempotency)

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| W-03 | 既存 stripeEventId の重複イベント | べき等 | received:true, DB更新なし | PASS |
| W-10 | payment_failed 重複イベント | べき等 | received:true, DB更新なし | PASS |

### 2-3. checkout.session.completed

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| W-04 | 正常チェックアウト完了 | 正常系 | status→active, stripeCustomerId/stripeSubscriptionId保存 | PASS |
| W-05 | metadata.userId 欠損 | 異常系 | user.update 未呼出 | PASS |

### 2-4. invoice.paid

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| W-06 | 正常課金成功 | 正常系 | status→active, subscriptionPeriodEnd更新 | PASS |
| W-07 | DB に顧客未登録 | 異常系 | user.update 未呼出 | PASS |

### 2-5. invoice.payment_failed

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| W-08 | 決済失敗 | 正常系 | status→past_due, SubscriptionEvent記録 | PASS |
| W-09 | DB に顧客未登録 | 異常系 | user.update 未呼出 | PASS |
| W-10 | 重複イベント | べき等 | received:true, DB更新なし | PASS |

### 2-6. customer.subscription.updated

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| W-11 | cancel_at_period_end=true | 正常系 | status→canceled, periodEnd更新 | PASS |
| W-12 | cancel_at_period_end=false (再開) | 正常系 | status→active, periodEnd更新 | PASS |

### 2-7. customer.subscription.deleted

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| W-13 | サブスク削除 | 正常系 | status→free, stripeSubscriptionId=null, periodEnd=null | PASS |
| W-14 | DB に顧客未登録 | 異常系 | user.update 未呼出 | PASS |

### 2-8. 未知のイベントタイプ

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| W-15 | payment_intent.succeeded 等 | 正常系 | received:true, 処理スキップ | PASS |

---

## 3. サブスクリプション操作テスト

### 3-1. createCheckoutSession

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| S-01 | ユーザー未検出 | 異常系 | UnauthorizedException | PASS |
| S-02 | 既にactiveユーザー | 異常系 | BadRequestException | PASS |
| S-03 | freeユーザーの正常チェックアウト | 正常系 | checkoutUrl返却, Stripe Customer作成 | PASS |
| S-04 | 既存stripeCustomerId再利用 | 正常系 | customers.create 未呼出 | PASS |

### 3-2. cancelSubscription

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| S-05 | サブスクなし | 異常系 | BadRequestException | PASS |
| S-06 | 正常キャンセル | 正常系 | cancel_at_period_end=true, status→canceled | PASS |

### 3-3. reactivateSubscription

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| S-07 | サブスクなし | 異常系 | BadRequestException | PASS |
| S-08 | 正常再開 | 正常系 | cancel_at_period_end=false, status→active | PASS |

### 3-4. getStatus

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| S-09 | ユーザー未検出 | 異常系 | UnauthorizedException | PASS |
| S-10 | canceled + subscription有 | 正常系 | cancelAtPeriodEnd=true | PASS |
| S-11 | active | 正常系 | cancelAtPeriodEnd=false | PASS |

### 3-5. createPortalSession

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| S-12 | stripeCustomerId なし | 異常系 | BadRequestException | PASS |
| S-13 | 正常ポータルURL取得 | 正常系 | portalUrl返却 | PASS |

---

## 4. プレミアム機能テスト (Task 1-4-3)

### 4-1. 文字数制限

| # | テストケース | 区分 | 期待結果 | ステータス |
|---|---|---|---|---|
| P-01 | free ユーザー 281文字投稿 | 異常系 | BadRequestException (280文字制限) | PASS |
| P-02 | free ユーザー 280文字投稿 | 正常系 | 投稿成功 | PASS |
| P-03 | active ユーザー 1001文字投稿 | 異常系 | BadRequestException (1000文字制限) | PASS |
| P-04 | active ユーザー 1000文字投稿 | 正常系 | 投稿成功 | PASS |
| P-05 | canceled ユーザー 500文字投稿 | 正常系 | 投稿成功 (猶予期間中は1000文字) | PASS |
| P-06 | past_due ユーザー 281文字投稿 | 異常系 | BadRequestException (280文字 = free同等) | PASS |

### 4-2. フィード広告の表示/非表示

広告表示ロジックの現状分析:
- **バックエンド**: `GET /ads/feed` は `@Public()` デコレータ付きで、ユーザーの subscriptionStatus を参照していない
- **フロントエンド**: フィード広告の premium 非表示はクライアントサイドで `subscriptionStatus` を参照して制御
- **テスト対象**: フロントエンドロジックのため、バックエンド単体テストの範囲外

> **備考**: 広告非表示の E2E テストは別途フロントエンドテスト基盤構築後に追加予定

---

## 5. 未実装 Webhook ハンドラ (要 Dev 対応)

以下は CEO タスク 1-1-7, 1-1-8 で要求されているが、現時点で `subscriptions.service.ts` に未実装:

| Webhook イベント | タスク番号 | ステータス | テスト方針 |
|---|---|---|---|
| `charge.dispute.created` | 1-1-7 | **未実装** | 実装後に正常系・異常系・べき等性の3ケース追加 |
| `charge.refunded` | 1-1-8 | **未実装** | 実装後に正常系・異常系・べき等性の3ケース追加 |

実装後のテスト追加見込み: +6件 → 合計 40件

---

## 6. 決済失敗メール通知テスト (要 Dev 対応)

タスク 1-1-6 の `invoice.payment_failed` でのメール送信は、MailService 共通化完了後にテスト追加予定:

| # | テストケース | 区分 | 前提条件 |
|---|---|---|---|
| M-01 | payment_failed 時にメール送信関数が呼ばれること | 正常系 | MailService 注入完了 |
| M-02 | メール送信失敗時もステータス更新は成功すること | 異常系 | MailService mock |

---

## 7. 日次 cron バッチテスト (要 Dev 対応)

タスク 1-1-9 のサブスクリプション状態同期バッチは未実装。実装後のテスト方針:

| # | テストケース | 区分 |
|---|---|---|
| C-01 | Stripe側active / DB側active → 変更なし | 正常系 |
| C-02 | Stripe側canceled / DB側active → DB更新 | 正常系 |
| C-03 | Stripe側deleted / DB側active → status→free | 正常系 |
| C-04 | Stripe API エラー時のリトライ/スキップ | 異常系 |

---

## 8. 既存テスト不具合報告

| 重要度 | ファイル | 行 | 内容 |
|---|---|---|---|
| MEDIUM | `auth/auth.security.spec.ts:200` | L200 | OAuth session TTL (5分) テストが失敗中。`consumeOAuthSession` の TTL チェックロジックまたはテストの `Date.now` モック方法を確認要。本課金テストとは無関係。 |

---

## 9. テスト実行コマンド

```bash
# 課金関連テストのみ実行
cd backend && npx jest --testPathPatterns='subscriptions.service.spec|posts.service.spec' --verbose

# 全テスト実行
cd backend && npx jest --verbose
```

---

## 10. サマリ

| 指標 | 目標 | 実績 |
|---|---|---|
| テストケース数 | 15件以上 | **34件** (実装済みパス) |
| Webhook ハンドラカバレッジ | 5イベントタイプ | 5/5 (実装済み全て) |
| サブスクリプション操作 | checkout/cancel/reactivate/status/portal | 13件 |
| プレミアム機能テスト | 文字数制限 | 6件 (4ステータスカバー) |
| 未実装分の見込み追加 | - | +8件 (dispute/refund/mail/cron) |
