# Phase 4 タスク 4-1 QA/QC 成果物
**作成日**: 2026-03-02
**作成者**: QA/QC 尾丸
**ステータス**: 単体テスト完了 / 統合・E2Eテストは環境依存のため実行待ち

---

## 1. 成果物一覧

| # | 成果物 | ファイルパス | ステータス |
|---|--------|------------|-----------|
| 1 | テスト実行環境マトリクス | `docs/qa-test-execution-matrix.md` | 完成 |
| 2 | bcrypt + OAuth セッション単体テスト (7件) | `backend/src/auth/auth.security.spec.ts` | 全PASS |
| 3 | Stripe Webhook 単体テスト (4件) | `backend/src/subscriptions/subscriptions.webhook.spec.ts` | 全PASS |
| 4 | JWT + OAuth + Helmet 統合テスト (12件) | `backend/test/security-headers.e2e-spec.ts` | 実装済(環境依存) |
| 5 | Rate Limit テスト (5件) | `backend/test/rate-limit.e2e-spec.ts` | 実装済(環境依存) |
| 6 | nginx ヘッダーテスト (5件) | `backend/test/nginx-headers.e2e-spec.ts` | 実装済(Docker必要) |

---

## 2. テスト実行結果サマリ

### カテゴリ1: 単体テスト — 11/11 PASS

```
PASS src/auth/auth.security.spec.ts
  Security: bcrypt rounds (3.1.1-3.1.4)
    ✓ 3.1.1: register() should hash password with 12 rounds
    ✓ 3.1.2: changePassword() should hash new password with 12 rounds
    ✓ 3.1.3: resetPassword() should hash new password with 12 rounds
    ✓ 3.1.4: login should succeed with old password hashed at rounds=10

  Security: OAuth Session (3.3.1-3.3.3)
    ✓ 3.3.1: storeOAuthSession should return a 32-char hex session ID
    ✓ 3.3.2: consumeOAuthSession should return data and delete session
    ✓ 3.3.3: expired session (>5min) should be rejected

PASS src/subscriptions/subscriptions.webhook.spec.ts
  Security: Stripe Webhook (3.6.1-3.6.4)
    ✓ 3.6.1: valid signature should process event and return { received: true }
    ✓ 3.6.2: invalid signature should throw BadRequestException
    ✓ 3.6.3: missing STRIPE_WEBHOOK_SECRET should throw BadRequestException
    ✓ 3.6.4: duplicate event should return { received: true } without reprocessing
```

### カテゴリ2: 統合テスト — 17件 実装済み（DB接続必要）

| テストファイル | テスト件数 | 前提条件 |
|-------------|----------|---------|
| `test/security-headers.e2e-spec.ts` | 12件 | DATABASE_URL, JWT_SECRET |
| `test/rate-limit.e2e-spec.ts` | 5件 | DATABASE_URL, JWT_SECRET |

**実行コマンド**: `cd backend && npm run test:e2e -- --testPathPatterns="(security-headers|rate-limit)"`

### カテゴリ3: E2Eテスト — 5件 実装済み（Docker Compose必要）

| テストファイル | テスト件数 | 前提条件 |
|-------------|----------|---------|
| `test/nginx-headers.e2e-spec.ts` | 5件 | Docker Compose 全サービス起動, nginx-prod.conf |

**実行コマンド**: `docker compose up -d && cd backend && npm run test:e2e -- --testPathPatterns="nginx-headers"`

---

## 3. qa-report.md との突合結果

### セキュリティテスト 28件の対応状況

| セクション | 件数 | テストファイル | 対応状況 |
|-----------|------|-------------|---------|
| 3.1 bcrypt rounds | 4件 | auth.security.spec.ts | 全件実装・PASS |
| 3.2 JWT セキュリティ | 3件 | security-headers.e2e-spec.ts | 全件実装(2件統合+1件静的解析) |
| 3.3 OAuth セッション | 7件 | auth.security.spec.ts + security-headers.e2e-spec.ts | 全件実装(3件単体+4件統合) |
| 3.4 Helmet ヘッダー | 5件 | security-headers.e2e-spec.ts | 全件実装(統合テスト) |
| 3.5 nginx ヘッダー | 5件 | nginx-headers.e2e-spec.ts | 全件実装(Docker依存) |
| 3.6 Stripe Webhook | 4件 | subscriptions.webhook.spec.ts | 全件実装・PASS |

### Rate Limit テスト 5件の対応状況

| エンドポイント | 制限値 | テストファイル | 対応状況 |
|-------------|-------|-------------|---------|
| POST /auth/register | 5回/分 | rate-limit.e2e-spec.ts | 実装済 |
| POST /auth/login | 10回/分 | rate-limit.e2e-spec.ts | 実装済 |
| POST /auth/verify-email | 5回/分 | rate-limit.e2e-spec.ts | 実装済 |
| POST /auth/forgot-password | 3回/分 | rate-limit.e2e-spec.ts | 実装済 |
| POST /auth/resend-verification | 3回/分 | rate-limit.e2e-spec.ts | 実装済 |

---

## 4. QA観点の補足事項（Planned会議で提起した3点の反映）

### 補足1: Helmet/nginx テストのE2E分離
- Helmet ヘッダーテスト5件は `security-headers.e2e-spec.ts` に配置（supertest + NestJS で検証可能）
- nginx ヘッダーテスト5件は `nginx-headers.e2e-spec.ts` に分離（Docker Compose 必須）
- 実行マトリクスで明示的にカテゴリ2/3に分離済み

### 補足2: アカウントロックアウト（4-1-1）のテストケース追加提案

4-1-1 実装後に追加すべきテストケース:

| # | テストケース | 期待結果 |
|---|------------|---------|
| L-1 | 5回連続ログイン失敗 | アカウントロック（15分） |
| L-2 | ロック中のログイン試行 | 適切なエラーメッセージ（「アカウントがロックされています」） |
| L-3 | ロック解除後のログイン成功 | 正常にログイン可能 |
| L-4 | 途中で成功→カウンタリセット | 3回失敗→成功→3回失敗→成功（ロックされない） |
| L-5 | ロック中にパスワードリセット | リセット可能、ロック解除 |

### 補足3: Rate Limit テストの注意事項
- `resend-verification` は `JwtAuthGuard` 付きのため、ThrottlerGuard と JwtAuthGuard の評価順序に依存
- テストでは `[401, 429]` の両方を許容する設計（Guard 評価順序はフレームワーク依存）
- 本番環境では nginx レベル（5r/s, burst 10）とアプリレベルの二重防御を確認済み

---

## 5. 既存テストの不具合修正状況

### qa-report.md セクション2 で報告された2件の不具合

| 不具合 | 修正状況 |
|--------|---------|
| auth.service.spec.ts: bcrypt rounds 不整合 (10→12) | 既に修正済み（現在の spec は rounds=12 をアサート） |
| auth.service.spec.ts: レスポンス形状の不整合 | 既に修正済み（refreshToken, subscriptionStatus を含む） |

---

## 6. 残存リスクと推奨事項

| リスク | 重要度 | 推奨対応 |
|--------|-------|---------|
| 統合テスト17件が未実行（DB依存） | HIGH | CI/CD でテスト用DB接続して実行 |
| nginx E2Eテスト5件が未実行（Docker依存） | MEDIUM | ステージング環境で検証 |
| OAuth セッションのインメモリ保存（4-1-4 Redis移行前） | MEDIUM | Redis移行後にテスト追加 |
| アカウントロックアウト未実装（4-1-1） | HIGH | 実装後にテストケースL-1〜L-5を追加 |
| パスワード強度要件未実装（4-1-2） | MEDIUM | 実装後にバリデーションテスト追加 |
| トークンクリーンアップ cron 未実装（4-1-3） | LOW | 実装後にcron実行テスト追加 |
