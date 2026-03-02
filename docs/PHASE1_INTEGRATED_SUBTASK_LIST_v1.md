# Phase 1: 収益基盤の完成 — 統合サブタスク一覧 v1

**作成日**: 2026-03-02
**作成者**: 常闇 (Planning)
**ステータス**: Draft → レビュー待ち

---

## 凡例

| 記号 | 意味 |
|------|------|
| `[DONE]` | 実装済み・動作確認済み |
| `[GAP]` | 未実装・追加必要 |
| `[FIX]` | 既存実装に修正が必要 |
| P0 | ブロッカー（他タスクの前提） |
| P1 | 必須（MVP完了基準） |
| P2 | 推奨（品質向上） |

---

## タスク 1-1: Stripe プレミアム課金の本番稼働

### A. バックエンド — 既存実装の状態

| # | サブタスク | 状態 | 備考 |
|---|-----------|------|------|
| 1-1-1 | Stripe アカウント本番モード有効化 | `[GAP]` | 手動作業。銀行口座・本人確認 |
| 1-1-2 | Dashboard で商品作成（¥980/月） | `[GAP]` | 手動作業 |
| 1-1-3 | 本番環境変数設定 | `[GAP]` | STRIPE_SECRET_KEY, WEBHOOK_SECRET, PRICE_ID |
| 1-1-4 | Customer Portal 有効化 | `[DONE]` | `/subscriptions/billing-portal` エンドポイント実装済み |
| 1-1-5 | Webhook 登録 | `[GAP]` | Dashboard手動設定 |

### B. バックエンド — Webhook ハンドラ

| # | サブタスク | 状態 | 担当 | 優先度 | 依存 |
|---|-----------|------|------|--------|------|
| 1-1-W1 | `checkout.session.completed` | `[DONE]` | — | — | — |
| 1-1-W2 | `invoice.paid` | `[DONE]` | — | — | — |
| 1-1-W3 | `invoice.payment_failed` | `[DONE]` | — | — | — |
| 1-1-W4 | `customer.subscription.updated` | `[DONE]` | — | — | — |
| 1-1-W5 | `customer.subscription.deleted` | `[DONE]` | — | — | — |
| 1-1-6 | 決済失敗メール通知 (payment_failed → メール送信) | `[GAP]` | Dev | P0 | 1-1-M1 |
| 1-1-7 | `charge.dispute.created` ハンドラ追加 | `[GAP]` | Dev | P1 | — |
| 1-1-8 | `charge.refunded` ハンドラ追加 | `[GAP]` | Dev | P1 | — |

### C. バックエンド — 新規インフラ（補完会議で追加）

| # | サブタスク | 状態 | 担当 | 優先度 | 依存 | 備考 |
|---|-----------|------|------|--------|------|------|
| 1-1-M1 | MailService 共通化 | `[GAP]` | Dev | **P0** | — | auth内のnodemailer直接呼出を共通モジュールへ切出。sendPaymentFailedNotice / sendDisputeNotice 等のインターフェース追加 |
| 1-1-C1 | @nestjs/schedule 導入 + CronService 基盤 | `[GAP]` | Dev | P0 | — | package.json に @nestjs/schedule 追加、AppModule に ScheduleModule.forRoot() 登録 |
| 1-1-9 | サブスクリプション日次同期バッチ | `[GAP]` | Dev | P1 | 1-1-C1 | Stripe API で active サブスクリプション一覧取得 → DB差分更新。@Cron('0 3 * * *') |

### D. フロントエンド — サブスクリプションUI

| # | サブタスク | 状態 | 担当 | 優先度 | 依存 |
|---|-----------|------|------|--------|------|
| 1-1-10a | /settings プラン表示 (free/active/canceled/past_due) | `[DONE]` | — | — | — |
| 1-1-10b | 課金ボタン → Stripe Checkout | `[DONE]` | — | — | — |
| 1-1-10c | 解約ボタン + 期末解約確認ダイアログ | `[DONE]` | — | — | — |
| 1-1-10d | 再開ボタン (canceled 時) | `[DONE]` | — | — | — |
| 1-1-10e | 次回請求日表示 | `[DONE]` | — | — | — |
| 1-1-10f | Customer Portal リンク | `[DONE]` | — | — | — |
| 1-1-11a | 投稿フォーム280文字超アップセルバナー | `[GAP]` | FE + Design | P1 | 1-1-D1 |
| 1-1-11b | 広告表示時「プレミアムなら広告なし」リンク | `[GAP]` | FE + Design | P2 | 1-1-D2 |
| 1-1-11c | プロフィール PRO バッジ横「PRO になる」ボタン | `[GAP]` | FE + Design | P2 | — |
| 1-1-12 | 文字数制限の動的切替 | `[DONE]` | — | — | BE: 280/1000, FE: 同期済み |
| 1-1-13 | フィード広告のプレミアム非表示 | `[DONE]` | — | — | 4ページに実装済み |
| 1-1-14 | past_due 支払更新促進バナー | `[DONE]` | — | — | /settings に実装済み |
| 1-1-14b | past_due バナーをフィード上部にも表示 | `[GAP]` | FE + Design | P1 | 1-1-D3 |

### E. デザインカンプ（補完会議で追加）

| # | サブタスク | 状態 | 担当 | 優先度 | 依存 |
|---|-----------|------|------|--------|------|
| 1-1-D1 | アップセルバナー デザインカンプ | `[GAP]` | Design | P0 | — |
| 1-1-D2 | 広告内「プレミアムなら広告なし」リンク デザイン | `[GAP]` | Design | P1 | — |
| 1-1-D3 | past_due フィード上部バナー デザイン | `[GAP]` | Design | P1 | — |
| 1-1-D4 | 解約確認ダイアログ デザイン微調整 | `[DONE]` | — | — | 実装済み |

---

## タスク 1-1 依存関係グラフ

```
1-1-M1 (MailService共通化) ──→ 1-1-6 (決済失敗メール)
                              ──→ 1-1-7 (dispute通知メール)
                              ──→ 1-1-8 (refund通知メール)

1-1-C1 (@nestjs/schedule導入) ──→ 1-1-9 (日次同期バッチ)

1-1-D1 (アップセルバナーデザイン) ──→ 1-1-11a (FE実装)
1-1-D2 (広告内リンクデザイン)     ──→ 1-1-11b (FE実装)
1-1-D3 (past_dueバナーデザイン)   ──→ 1-1-14b (FE実装)
```

---

## タスク 1-2: アフィリエイトパートナー契約獲得

| # | サブタスク | 状態 | 担当 | 優先度 | 備考 |
|---|-----------|------|------|--------|------|
| 1-2-1 | ポーカールーム一覧リサーチ | `[GAP]` | BD | P1 | GGPoker, PokerStars, KKPoker, 888poker, Natural8, WPT Global |
| 1-2-2 | GGPoker アフィリエイト申請 | `[GAP]` | BD | P1 | 承認1〜2週間 |
| 1-2-3 | PokerStars アフィリエイト申請 | `[GAP]` | BD | P1 | |
| 1-2-4 | KKPoker アフィリエイト申請 | `[GAP]` | BD | P1 | 日本人ユーザー多い |
| 1-2-5 | ポーカー学習ツール契約 | `[GAP]` | BD | P1 | GTO Wizard, PokerTracker, Upswing |
| 1-2-6 | Amazon/楽天 アフィリエイト登録 | `[GAP]` | BD | P2 | ポーカーグッズ |
| 1-2-7 | AffiliatePartner DB seed 投入 | `[GAP]` | Dev | P1 | 契約確定後 |
| 1-2-8 | 契約書・規約確認 | `[GAP]` | BD + Legal | P1 | ブランドガイドライン |
| 1-2-9 | パートナーKPI目標設定 | `[GAP]` | Planning | P2 | 月間CTR, CVR, 収益目標 |

---

## タスク 1-3: 広告枠の設計と営業

| # | サブタスク | 状態 | 担当 | 優先度 | 備考 |
|---|-----------|------|------|--------|------|
| 1-3-1 | 広告枠仕様策定 | `[DONE]` | — | — | フィード内(3投稿毎), サイドバー, LP特集 — 仕様は実装済み |
| 1-3-2 | メディアキット作成 | `[GAP]` | Planning + Design | P1 | サイト概要, PV/UU想定, 料金表 |
| 1-3-3 | 営業先リスト作成 | `[GAP]` | BD | P1 | |
| 1-3-4 | 営業メールテンプレート | `[GAP]` | BD | P1 | |
| 1-3-5 | Google AdSense 申請 | `[GAP]` | BD | P2 | サイト公開後 |
| 1-3-6 | 広告管理 CRUD エンドポイント | `[GAP]` | Dev | P1 | 現在はDB直接操作のみ、管理API未実装 |
| 1-3-6b | 広告管理画面 フロントエンド | `[GAP]` | FE + Design | P2 | 1-3-6完了後 |

---

## タスク 1-4: 決済・課金の自動テスト

### 現状のテストカバレッジ

| モジュール | テストファイル | 状態 |
|-----------|--------------|------|
| auth | auth.service.spec.ts | `[FIX]` bcrypt rounds=10のアサーションが実装(12)と不一致 |
| posts | posts.service.spec.ts | `[FIX]` getCharLimit用のuser.findUniqueモック未設定 |
| subscriptions | — | `[GAP]` テストファイルなし |
| ads | — | `[GAP]` テストファイルなし |

### テスト計画（25件以上目標）

| # | テストケース | 担当 | 優先度 | 種別 |
|---|-------------|------|--------|------|
| 1-4-1 | Stripe Checkout フロー E2E | QA | P1 | E2E |
| **Webhook ユニットテスト (1-4-2)** | | | | |
| 1-4-2a | checkout.session.completed → status=active | QA+Dev | P1 | Unit |
| 1-4-2b | invoice.paid → subscriptionPeriodEnd更新 | QA+Dev | P1 | Unit |
| 1-4-2c | invoice.payment_failed → status=past_due | QA+Dev | P1 | Unit |
| 1-4-2d | customer.subscription.deleted → status=free | QA+Dev | P1 | Unit |
| 1-4-2e | 重複イベント べき等処理 | QA+Dev | P1 | Unit |
| 1-4-2f | 不正signature → 400エラー | QA+Dev | P1 | Unit |
| **新規Webhookテスト（補完会議追加分）** | | | | |
| 1-4-2g | invoice.payment_failed → メール送信検証 | QA+Dev | P1 | Unit |
| 1-4-2h | invoice.payment_failed → メール送信失敗時も処理継続 | QA+Dev | P1 | Unit |
| 1-4-2i | invoice.payment_failed → べき等性 | QA+Dev | P1 | Unit |
| 1-4-2j | charge.dispute.created → 正常処理 | QA+Dev | P1 | Unit |
| 1-4-2k | charge.dispute.created → 異常系 | QA+Dev | P1 | Unit |
| 1-4-2l | charge.dispute.created → べき等性 | QA+Dev | P1 | Unit |
| 1-4-2m | charge.refunded → 正常処理 | QA+Dev | P1 | Unit |
| 1-4-2n | charge.refunded → 異常系 | QA+Dev | P1 | Unit |
| 1-4-2o | charge.refunded → べき等性 | QA+Dev | P1 | Unit |
| **プレミアム機能テスト (1-4-3)** | | | | |
| 1-4-3a | free ユーザー文字数制限=280 | QA+Dev | P1 | Unit |
| 1-4-3b | active ユーザー文字数制限=1000 | QA+Dev | P1 | Unit |
| 1-4-3c | free ユーザーにフィード広告表示 | QA | P1 | Integration |
| 1-4-3d | active ユーザーにフィード広告非表示 | QA | P1 | Integration |
| **既存テスト修正** | | | | |
| 1-4-F1 | auth.service.spec.ts bcrypt rounds 10→12 修正 | QA+Dev | P0 | Fix |
| 1-4-F2 | posts.service.spec.ts getCharLimit モック追加 | QA+Dev | P0 | Fix |
| **日次同期バッチテスト** | | | | |
| 1-4-B1 | 日次同期 正常系（Stripe→DB差分更新） | QA+Dev | P1 | Unit |
| 1-4-B2 | 日次同期 Stripe API障害時のエラーハンドリング | QA+Dev | P1 | Unit |
| 1-4-B3 | 日次同期 差分なし時のスキップ | QA+Dev | P2 | Unit |

**合計: 25件**（既存修正2件 + 新規23件）

---

## 実行順序（クリティカルパス）

```
Week 1 前半:
  [P0] 1-1-M1 MailService共通化
  [P0] 1-1-C1 @nestjs/schedule導入
  [P0] 1-4-F1, 1-4-F2 既存テスト修正
  [P0] 1-1-D1〜D3 デザインカンプ作成

Week 1 後半:
  [P1] 1-1-6 決済失敗メール（← 1-1-M1 完了後）
  [P1] 1-1-7 dispute ハンドラ
  [P1] 1-1-8 refund ハンドラ
  [P1] 1-1-9 日次同期バッチ（← 1-1-C1 完了後）
  [P1] 1-1-11a アップセルバナー（← 1-1-D1 完了後）
  [P1] 1-1-14b past_dueフィードバナー（← 1-1-D3 完了後）

Week 2 前半:
  [P1] 1-4-2a〜2o Webhook ユニットテスト
  [P1] 1-4-3a〜3d プレミアム機能テスト
  [P1] 1-3-2 メディアキット作成
  [P1] 1-3-6 広告管理CRUD

Week 2 後半:
  [P1] 1-4-1 E2E テスト
  [P1] 1-4-B1〜B3 バッチテスト
  [P2] 1-1-11b, 1-1-11c アップセル追加導線
  [P1] 1-1-1〜1-1-3, 1-1-5 Stripe本番設定（手動）

並行（BD担当、開発ブロックなし）:
  1-2-1〜1-2-9 アフィリエイト契約獲得
  1-3-3〜1-3-5 広告営業
```

---

## リスク・注意事項

| リスク | 影響 | 対策 |
|--------|------|------|
| MailService共通化がブロッカー | 1-1-6〜8の3タスクが着手不可 | Week 1前半で最優先完了 |
| Stripe本番審査遅延 | 本番稼働が遅れる | テスト環境で全フロー検証を先行 |
| アフィリエイト審査1〜2週間 | Phase 1期間内に承認が間に合わない可能性 | Week 1初日に申請、審査待ち中は他タスク進行 |
| 既存テスト2件が失敗状態 | CI/CD導入時に即座にブロック | P0で即時修正 |
| past_dueユーザーへの対応が/settingsのみ | ユーザーがsettingsを見ない場合気づかない | フィード上部バナー(1-1-14b)を追加 |

---

## 完了基準チェックリスト

### タスク 1-1 完了基準
- [ ] テスト環境でチェックアウト→課金→解約→再開の全フロー動作
- [ ] 決済失敗時にメール通知が送信される
- [ ] チャージバック・返金 webhook が処理される
- [ ] 日次同期バッチが正常稼働
- [ ] past_due ユーザーにフィード上部バナー表示

### タスク 1-2 完了基準
- [ ] 最低5社のアフィリエイト契約締結
- [ ] AffiliatePartner データ DB 登録済み

### タスク 1-3 完了基準
- [ ] 広告主2社以上と契約
- [ ] AdSense審査通過
- [ ] 広告管理CRUDエンドポイント実装

### タスク 1-4 完了基準
- [ ] 課金関連テスト25件以上が全パス
- [ ] 既存テスト修正完了（bcrypt rounds, getCharLimitモック）
