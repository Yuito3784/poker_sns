# QA/QC Pre-Launch Deliverables Summary

**Author**: QA/QC Team (姫森)
**Date**: 2026-03-02
**Status**: Complete (サーバー確保前の並行作業分)

---

## Deliverables Overview

本ドキュメントは、CEOからのサーバー/ドメイン情報の回答を待つ間に並行して作成したQA/QCの3つの成果物をまとめたものです。

| # | Deliverable | File | Status |
|---|-------------|------|--------|
| 1 | Smoke Test Checklist | `docs/qa-smoke-test-checklist.md` | Complete |
| 2 | Security Header Verification | `docs/qa-security-header-verification.md` | Complete |
| 3 | Stripe E2E Test Scenarios | `docs/qa-stripe-e2e-test-scenarios.md` | Complete |

---

## 1. Smoke Test Checklist

**File**: `docs/qa-smoke-test-checklist.md`

全12モジュール・84テストケースをカバーするスモークテストチェックリスト。

| Category | P0 | P1 | P2 | Total |
|----------|-----|-----|-----|-------|
| Auth (OAuth含む) | 6 | 8 | 3 | 17 |
| Posts | 9 | 6 | 1 | 16 |
| Replies | 2 | 1 | 1 | 4 |
| Users | 3 | 7 | 2 | 12 |
| Search | 2 | 1 | 1 | 4 |
| Notifications | 1 | 2 | 1 | 4 |
| Subscriptions | 2 | 2 | 1 | 5 |
| Ads | 0 | 1 | 1 | 2 |
| Affiliates | 0 | 2 | 1 | 3 |
| Discovery | 0 | 2 | 1 | 3 |
| Frontend Pages | 4 | 4 | 2 | 10 |
| File Upload | 1 | 2 | 1 | 4 |
| **Total** | **30** | **38** | **16** | **84** |

**実行方針**: P0(30件)を最優先で実行、全P0パスを本番リリースのゲート条件とする。

---

## 2. Security Header Verification

**File**: `docs/qa-security-header-verification.md`

MEMORY.mdに記載済みのセキュリティ修正(2026-03-02適用分)を含む、HTTP応答ヘッダの期待値一覧と検証手順。

**カバレッジ**:
- Helmet設定ヘッダ 7項目 (HSTS, CSP, X-Frame-Options, etc.)
- Nginx本番ヘッダ 5項目
- TLS設定 3項目
- CORSヘッダ 4項目
- キャッシュ制御 4パターン
- レート制限 3ゾーン

**検証方法**:
- 自動化スクリプト (`qa-security-headers-check.sh`) 提供済み
- 手動検証手順 7ステップ
- OWASP準拠マトリクス 10項目

**既知のWarning**:
- `style-src 'unsafe-inline'` (Tailwind CSS要件、MEDIUM)
- `Permissions-Policy` 未設定 (LOW)
- `Cross-Origin-Opener-Policy` 未設定 (LOW)
- HSTS preload ドメイン登録未実施 (LOW)

---

## 3. Stripe E2E Test Scenarios

**File**: `docs/qa-stripe-e2e-test-scenarios.md`

Stripeテストモードでの決済フロー全11シナリオ・47テストケース。

| Scenario | Priority | Tests |
|----------|----------|-------|
| Successful subscription (Happy Path) | P0 | 8 |
| Payment declined | P0 | 4 |
| 3D Secure authentication | P1 | 5 |
| Subscription cancellation | P0 | 5 |
| Subscription reactivation | P1 | 3 |
| Recurring payment (invoice.paid) | P1 | 4 |
| Payment failure (invoice.payment_failed) | P0 | 4 |
| Webhook security | P0 | 4 |
| Customer portal | P1 | 3 |
| Edge cases | P2 | 7 |
| **Total** | | **47** |

**テストカード一覧、Stripe CLIコマンド、webhook シミュレーション手順を含む。**

---

## CEOへの回答依存事項

以下の項目はCEOからの情報提供後に追加テストが必要:

| # | 依存情報 | 必要なテスト |
|---|---------|------------|
| 1 | 本番ドメイン | TLS証明書、HSTS preload、CORS設定のE2E検証 |
| 2 | 本番サーバー | 負荷テスト（同時接続数、レスポンスタイム） |
| 3 | Stripe本番キー | 本番環境でのwebhook疎通確認 |
| 4 | OAuth認証情報 | Google/LINE/X本番コールバック検証 |

---

## 他チームとの連携事項

| 連携先 | 内容 | Status |
|--------|------|--------|
| Development (兎田) | ヘルスチェックエンドポイント実装後、スモークテスト項目0-3に組込み済み | Ready |
| DevSecOps (獅白) | 本番用.envセキュリティ要件定義後、セキュリティヘッダ検証に反映 | Waiting |
| Design (宝鐘) | ブランドアセット確定後、OGP/favicon表示テスト追加 | Waiting |
| Operations (星街) | 監視設計確定後、アラート発火テスト追加 | Waiting |

---

## Release Gate Criteria (リリース判定基準)

本番リリースには以下のすべてを満たすことを推奨:

1. Smoke Test P0 全30件パス
2. Security Header CRITICAL/HIGH 全項目パス
3. Stripe P0 全25件パス (テストモード)
4. Webhook署名検証が400を返すこと確認
5. CORS設定がワイルドカード(`*`)でないこと確認
6. Rate limiting が全認証エンドポイントで機能すること確認
