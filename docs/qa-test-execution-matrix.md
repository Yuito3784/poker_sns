# テスト実行環境マトリクス
**作成日**: 2026-03-02
**作成者**: QA/QC 尾丸

---

## 概要

セキュリティテスト28件 + Rate Limitテスト5件 = 合計33件を、実行環境別に3カテゴリに分類。

---

## カテゴリ1: 単体テスト（Jest + mocks、サーバー起動不要）— 11件

| # | テストID | テスト内容 | テスト対象ファイル | テストファイル |
|---|---------|-----------|------------------|-------------|
| 1 | 3.1.1 | register() で bcrypt rounds=12 を使用 | auth.service.ts:50 | auth.security.spec.ts |
| 2 | 3.1.2 | changePassword() で bcrypt rounds=12 を使用 | auth.service.ts:204 | auth.security.spec.ts |
| 3 | 3.1.3 | resetPassword() で bcrypt rounds=12 を使用 | auth.service.ts:276 | auth.security.spec.ts |
| 4 | 3.1.4 | 旧パスワード(rounds=10)でもログイン可能 | auth.service.ts:94 | auth.security.spec.ts |
| 5 | 3.3.1 | storeOAuthSession が 32文字 hex ID を返す | auth.service.ts:29-37 | auth.security.spec.ts |
| 6 | 3.3.2 | consumeOAuthSession でデータ取得＆削除 | auth.service.ts:40-46 | auth.security.spec.ts |
| 7 | 3.3.3 | 期限切れセッション(>5分)の拒否 | auth.service.ts:43 | auth.security.spec.ts |
| 8 | 3.6.1 | 有効な署名でwebhookイベント処理成功 | subscriptions.service.ts:147 | subscriptions.webhook.spec.ts |
| 9 | 3.6.2 | 無効な署名で 400 エラー返却 | subscriptions.service.ts:160 | subscriptions.webhook.spec.ts |
| 10 | 3.6.3 | STRIPE_WEBHOOK_SECRET 未設定で 400 エラー | subscriptions.service.ts:149 | subscriptions.webhook.spec.ts |
| 11 | 3.6.4 | 重複イベントのべき等処理 | subscriptions.service.ts:164-168 | subscriptions.webhook.spec.ts |

**実行コマンド**: `cd backend && npx jest --testPathPatterns="(auth.security|subscriptions.webhook)" --no-coverage --forceExit`

**検証結果 (2026-03-02)**: 11/11 PASS

---

## カテゴリ2: 統合テスト（supertest + NestJS TestingModule）— 17件

NestJS アプリケーション起動が必要だが、Docker Compose は不要。

### JWT セキュリティ (3件)
| # | テストID | テスト内容 | 検証方法 |
|---|---------|-----------|---------|
| 12 | 3.2.1 | Bearer ヘッダーからのJWT抽出が成功 | supertest: Authorization ヘッダー付きリクエスト |
| 13 | 3.2.2 | クエリパラム `?token=xxx` のJWTは拒否 | supertest: クエリパラムのみリクエスト → 401 |
| 14 | 3.2.3 | jwt.strategy.ts で fromAuthHeaderAsBearerToken() のみ使用 | ソースコード静的解析テスト |

### OAuth セッション E2E (4件)
| # | テストID | テスト内容 | 検証方法 |
|---|---------|-----------|---------|
| 15 | 3.3.4 | GET /auth/oauth-session?id=xxx が一度だけデータ返却 | supertest: 1回目200, 2回目400 |
| 16 | 3.3.5 | id パラメータ未指定で 400 返却 | supertest: パラメータなしリクエスト |
| 17 | 3.3.6 | リダイレクトURLにトークン・ユーザー情報なし | コードレビュー: oauthSession IDのみ含む |
| 18 | 3.3.7 | oauth-session エンドポイントが 10回/分でレート制限 | supertest: 11回目 → 429 |

### Helmet ヘッダー (5件)
| # | テストID | テスト内容 | 期待値 |
|---|---------|-----------|--------|
| 19 | 3.4.1 | Content-Security-Policy ヘッダー存在 | `default-src 'self'` 含む |
| 20 | 3.4.2 | Strict-Transport-Security ヘッダー存在 | `max-age=63072000; includeSubDomains; preload` |
| 21 | 3.4.3 | X-Frame-Options ヘッダー | `DENY` |
| 22 | 3.4.4 | X-Content-Type-Options ヘッダー | `nosniff` |
| 23 | 3.4.5 | X-XSS-Protection ヘッダー存在 | 値あり |

### Rate Limit テスト (5件)
| # | テストID | テスト内容 | 制限値 |
|---|---------|-----------|--------|
| 24 | 3.7.1 | POST /auth/register 制限 | 5回/分 → 6回目 429 |
| 25 | 3.7.2 | POST /auth/login 制限 | 10回/分 → 11回目 429 |
| 26 | 3.7.3 | POST /auth/verify-email 制限 | 5回/分 → 6回目 429 |
| 27 | 3.7.4 | POST /auth/forgot-password 制限 | 3回/分 → 4回目 429 |
| 28 | 3.7.5 | POST /auth/resend-verification 制限 | 3回/分 → 4回目 429 |

**実行コマンド**: `cd backend && npm run test:e2e -- --testPathPatterns="(security-headers|rate-limit)"`

**前提条件**:
- DATABASE_URL が有効な PostgreSQL を指すこと（テスト用DB推奨）
- JWT_SECRET 環境変数設定済み

---

## カテゴリ3: E2Eテスト（Docker Compose + nginx 必須）— 5件

### nginx ヘッダー (5件)
| # | テストID | テスト内容 | 検証方法 |
|---|---------|-----------|---------|
| 29 | 3.5.1 | nginx HSTS ヘッダー | `curl -I` → `max-age=63072000; includeSubDomains; preload` |
| 30 | 3.5.2 | nginx X-Content-Type-Options | `curl -I` → `nosniff` |
| 31 | 3.5.3 | nginx X-Frame-Options | `curl -I` → `DENY` |
| 32 | 3.5.4 | nginx Referrer-Policy | `curl -I` → `strict-origin-when-cross-origin` |
| 33 | 3.5.5 | HTTP → HTTPS リダイレクト | `curl -I http://domain` → 301 to https |

**実行コマンド**: `docker compose up -d && cd backend && npm run test:e2e -- --testPathPatterns="nginx-headers"`

**前提条件**:
- Docker Compose で全サービス起動済み
- SSL証明書設定済み（本番 or セルフサイン）
- nginx-prod.conf が使用されていること

---

## 実行順序と依存関係

```
Phase 1: 単体テスト (11件) ─── Jest のみ、DB不要
    ↓ すべてパス
Phase 2: 統合テスト (17件) ─── NestJS + DB 必要
    ↓ すべてパス
Phase 3: E2E テスト (5件) ──── Docker Compose + nginx 必要
```

---

## テストファイル一覧

| ファイル | カテゴリ | テスト件数 | 実行環境 |
|---------|---------|----------|---------|
| `src/auth/auth.security.spec.ts` | 単体 | 7 | Jest |
| `src/subscriptions/subscriptions.webhook.spec.ts` | 単体 | 4 | Jest |
| `test/security-headers.e2e-spec.ts` | 統合 | 12 | supertest + NestJS |
| `test/rate-limit.e2e-spec.ts` | 統合 | 5 | supertest + NestJS |
| `test/nginx-headers.e2e-spec.ts` | E2E | 5 | Docker Compose |

**合計: 33テストケース（28セキュリティ + 5 Rate Limit）**
