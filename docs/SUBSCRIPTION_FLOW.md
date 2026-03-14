# サブスクリプション（課金）の流れ

## 概要

プレミアム加入時、**対象ユーザーの `subscriptionStatus` を DB に書き込む経路**は次の 2 つです。

1. **Stripe Webhook**（本番・推奨）
2. **成功画面フォールバック**（Webhook が届かない環境でも確実に反映）

---

## 1. 従来の流れ（Webhook のみ）

- ユーザーが「プレミアムに加入」→ Checkout Session 作成 → Stripe で支払い → `success_url` にリダイレクト
- **DB の更新は Stripe が `POST /subscriptions/webhook` に送る `checkout.session.completed` を受信したときのみ**
- ローカル開発で Webhook を転送していない、または本番で Webhook URL 未設定だと、**課金しても `subscriptionStatus` が `active` に更新されない**状態になっていた

## 2. 追加した流れ（成功画面で DB を確実に更新）

- Checkout の `success_url` に Stripe の `{CHECKOUT_SESSION_ID}` を付与  
  → 例: `/settings?subscription=success&session_id=cs_xxxxx`
- 設定画面で `subscription=success` かつ `session_id` があるとき、**先に** `POST /subscriptions/confirm-session` を呼ぶ
- バックエンドで `confirmCheckoutSession(userId, sessionId)` が以下を実行:
  1. Stripe API で `session_id` の Checkout Session を取得
  2. `session.metadata.userId` がログインユーザーと一致することを確認
  3. `session.status === 'complete'` を確認
  4. 該当ユーザーの `subscriptionStatus` を `active` に更新し、`stripeSubscriptionId` などを保存
  5. 更新後のステータス（`getStatus` と同じ形）を返す
- フロントはその返却値で `subStatus` と Auth の `subscriptionStatus` を更新

これにより、**Webhook が届かなくても、ユーザーが成功画面を開いた時点で DB が更新**されます。

---

## 3. 全体フロー（まとめ）

| 段階 | 処理 | DB 更新 |
|------|------|---------|
| 1 | ユーザーが「プレミアムに加入」クリック | なし（Session 作成のみ） |
| 2 | Stripe で支払い完了 → `success_url` へリダイレクト（`session_id` 付き） | まだなし |
| 3a | Stripe が Webhook `checkout.session.completed` を送信 | **Webhook ハンドラで User を `active` に更新** |
| 3b | 設定画面で `confirm-session` を呼ぶ（`session_id` 付きで遷移した場合） | **confirm ハンドラで User を `active` に更新**（Webhook 未到達時のフォールバック） |
| 4 | 設定・プロフィールで `GET /subscriptions/status` または confirm の返却値で表示を更新 | 参照のみ |

- 本番: Webhook が届けば 3a で更新。ユーザーが設定を開けば 3b でも更新（二重実行しても上書きで問題なし）
- ローカル: Webhook を転送していなければ 3a は動かないが、**3b で成功画面を開いたタイミングで必ず DB が更新される**

---

## 4. 関連コード

- **success_url に session_id を付与**: `backend/src/subscriptions/subscriptions.service.ts` の `createCheckoutSession`
- **confirm エンドポイント**: `POST /subscriptions/confirm-session`（Body: `{ session_id: "cs_xxx" }`）
- **confirm で User 更新**: `SubscriptionsService.confirmCheckoutSession`
- **設定画面で confirm を呼ぶ**: `frontend/src/app/settings/page.tsx` の `subscription=success` 時の `useEffect`（`session_id` があるとき先に confirm を実行）

---

## 5. レースコンディション対策（active が free で上書きされないように）

チェックアウト成功後のリダイレクト時に、複数の非同期で「ステータス取得」が走ると、**confirm-session で DB を active に更新したあと、別の取得が後から返ってきて free で上書きする**問題があった。以下で対策している。

- **Settings** (`settings/page.tsx`): URL に `subscription=success` があるときは、`useEffect([token])` 内の **fetchSubStatus を呼ばない**。confirm-session 用の Effect に任せる。
- **AuthContext** (`AuthContext.tsx`): 起動時の **syncSubscription** で、URL に `subscription=success` があるときは **何もしない**。confirm-session の結果で設定画面が auth を更新するまで待つ。

これで「confirm-session が DB を active にしたあと、別経路の status 取得で free が返ってきて上書きする」ことを防ぐ。

---

## 6. サロンとプレミアムの Webhook 分離

Stripe の 1 つの Webhook エンドポイントで、**プレミアムサブスク**と**サロン加入**の両方のイベントが届く場合がある。プレミアム用ハンドラでサロン由来のイベントを処理しないようにしている。

- **Checkout Session**  
  - 作成時: `metadata.type = 'subscription'` を付与（サロンは `type: 'salon'`）。  
  - `handleCheckoutCompleted`: **`metadata.type === 'subscription'` のときだけ** User を更新。それ以外（サロン・未設定）は return。
- **Invoice**  
  - `handleInvoicePaid` / `handleInvoicePaymentFailed`: 対象 invoice の subscription ID が、そのユーザーの **stripeSubscriptionId（プレミアム用）と一致する場合のみ** User を更新。サロン用サブスクの invoice はスキップ。
- **customer.subscription.updated / deleted**  
  - イベントの subscription ID が、そのユーザーの **stripeSubscriptionId と一致する場合のみ** User を更新。サロン用サブスクの更新・削除はスキップ。
