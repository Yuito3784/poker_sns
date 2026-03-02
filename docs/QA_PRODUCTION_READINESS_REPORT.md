# QA/QC 本番リリース準備レポート

**作成者:** 尾丸 (QA/QC Senior)
**作成日:** 2026-03-02
**ステータス:** サーバー確保待ち (並行作業完了)

---

## 1. エグゼクティブサマリー

| 指標 | 状態 |
|------|------|
| コードベース完成度 | 全モジュール実装済み (9モジュール, 65エンドポイント) |
| セキュリティ対策 | 主要6項目修正済み (2026-03-02) |
| 本番ビルド構成 | docker-compose.prod.yml + nginx-prod.conf 整備済み |
| SSL/TLS設定 | setup-ssl.sh + ssl-renew.sh 準備済み |
| ヘルスチェック | GET /health 実装済み (DB死活確認付き) |
| テストカバレッジ | 20ケース (3ファイル) — 既存テストに1件不整合あり |
| スモークテストチェックリスト | 84ケース策定済み (P0: 30, P1: 38, P2: 16) |
| **本番デプロイ判定** | **サーバー・ドメイン確保後、スモークテスト実施で GO** |

---

## 2. 本番前チェックリスト (統合版)

### 2.1 インフラ・環境 (サーバー確保後に実施)

| # | 検証項目 | 手順 | 期待結果 | 優先度 | 担当 |
|---|---------|------|---------|--------|------|
| ENV-01 | 本番用 .env 全変数設定 | .env.example の全項目を本番値で埋める | 未設定変数なし | P0 | DevSecOps |
| ENV-02 | docker-compose.prod ビルド | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build` | 全コンテナ healthy | P0 | Ops |
| ENV-03 | DB 外部ポート非公開 | `docker compose ps` で 5432 公開なし確認 | ports 列に 5432 なし | P0 | DevSecOps |
| ENV-04 | Backend/Frontend 直接ポート非公開 | 3000, 3001 が外部公開されていない | Nginx 経由のみ | P0 | DevSecOps |
| ENV-05 | ヘルスチェック応答 | `curl https://DOMAIN/api/health` | `{"status":"ok","timestamp":"..."}` | P0 | QA |
| ENV-06 | Docker ヘルスチェック | `docker compose ps` の Health 列 | 全コンテナ healthy | P1 | Ops |

### 2.2 SSL/HTTPS (サーバー確保後に実施)

| # | 検証項目 | 手順 | 期待結果 | 優先度 |
|---|---------|------|---------|--------|
| SSL-01 | SSL証明書取得 | `./setup-ssl.sh DOMAIN EMAIL` 実行 | Certbot 成功、証明書ファイル生成 | P0 |
| SSL-02 | HTTPS 接続 | `curl -vI https://DOMAIN` | TLS 1.2+ ハンドシェイク成功 | P0 |
| SSL-03 | HTTP→HTTPS リダイレクト | `curl -I http://DOMAIN` | 301 → https://DOMAIN | P0 |
| SSL-04 | 証明書有効期限 | `openssl s_client -connect DOMAIN:443 < /dev/null 2>/dev/null \| openssl x509 -noout -dates` | notAfter が 90日後 | P0 |
| SSL-05 | ACME チャレンジパス | `curl http://DOMAIN/.well-known/acme-challenge/test` | 200 or 404 (403でないこと) | P1 |
| SSL-06 | ssl-renew.sh cron 登録 | `crontab -l \| grep ssl-renew` | `0 3 * * *` エントリあり | P1 |
| SSL-07 | TLS バージョン制限 | `nmap --script ssl-enum-ciphers DOMAIN` | TLSv1.0/1.1 拒否 | P1 |

### 2.3 セキュリティヘッダー検証 (本番デプロイ後に実施)

| # | ヘッダー | 期待値 | 検証方法 | 優先度 |
|---|---------|--------|---------|--------|
| HDR-01 | Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | `curl -I https://DOMAIN/api/health` | P0 |
| HDR-02 | X-Content-Type-Options | `nosniff` | 同上 | P0 |
| HDR-03 | X-Frame-Options | `DENY` | 同上 | P0 |
| HDR-04 | Content-Security-Policy | `default-src 'self'` 含む | 同上 | P0 |
| HDR-05 | Referrer-Policy | `strict-origin-when-cross-origin` | 同上 (nginx層) | P1 |
| HDR-06 | X-XSS-Protection | 存在確認 | 同上 (Helmet) | P1 |
| HDR-07 | Server ヘッダー非表示 | nginx バージョン非表示 | `server_tokens off` 確認 | P1 |

### 2.4 全機能スモークテスト (本番デプロイ後に実施)

既存チェックリスト (`docs/qa-smoke-test-checklist.md`) の84ケースを本番環境で実施。
以下はP0 (30ケース) の要約:

| カテゴリ | P0ケース数 | 重要テスト項目 |
|---------|-----------|--------------|
| 認証フロー | 6 | 登録、ログイン、トークンリフレッシュ、メール認証 |
| 投稿 CRUD | 9 | テキスト投稿、画像アップロード、削除、権限チェック |
| リプライ | 2 | 作成、一覧取得 |
| ユーザー | 3 | プロフィール表示、フォロー/解除 |
| 検索 | 2 | ユーザー検索、投稿検索 |
| 通知 | 1 | 一覧取得 |
| 決済 | 2 | Checkout セッション生成、Webhook 署名検証 |
| フロント | 4 | /, /lp, /profile/:user, /post/:id ページロード |
| ファイル | 1 | アップロード済み画像配信 |

### 2.5 Stripe 決済検証

| # | 検証項目 | 手順 | 期待結果 | 優先度 |
|---|---------|------|---------|--------|
| PAY-01 | Checkout セッション生成 | POST /api/subscriptions/checkout (Bearer) | 200, Stripe URL 返却 | P0 |
| PAY-02 | Webhook 署名検証 (正常) | Stripe CLI: `stripe trigger checkout.session.completed` | 200, subscription 有効化 | P0 |
| PAY-03 | Webhook 署名検証 (不正) | 不正署名で POST /api/subscriptions/webhook | 400 Bad Request | P0 |
| PAY-04 | Webhook 冪等性 | 同一 eventId で2回送信 | 2回目は処理スキップ、200 | P1 |
| PAY-05 | サブスクリプション解約 | POST /api/subscriptions/cancel (Bearer) | 200, ステータス更新 | P1 |
| PAY-06 | 解約後の再有効化 | POST /api/subscriptions/reactivate (Bearer) | 200 | P1 |
| PAY-07 | Customer Portal | POST /api/subscriptions/portal (Bearer) | 200, portal URL 返却 | P2 |

### 2.6 レート制限検証

| # | エンドポイント | 制限 | 検証手順 | 優先度 |
|---|--------------|------|---------|--------|
| RATE-01 | POST /auth/register | 5/min | 6回連続リクエスト → 429 | P1 |
| RATE-02 | POST /auth/login | 10/min | 11回連続 → 429 | P1 |
| RATE-03 | POST /auth/forgot-password | 3/min | 4回連続 → 429 | P1 |
| RATE-04 | POST /auth/verify-email | 5/min | 6回連続 → 429 | P1 |
| RATE-05 | グローバル制限 | 60/min | 61回連続 → 429 | P2 |
| RATE-06 | Nginx API 制限 (本番) | 30/sec | ab ツールで確認 | P2 |

---

## 3. 既存テスト不整合 (WARNING)

### 3.1 CRITICAL: bcrypt rounds 不一致

**ファイル:** `backend/src/auth/auth.service.spec.ts`

| 箇所 | テスト上の値 | 実コードの値 | 影響 |
|------|------------|------------|------|
| register() | rounds=10 | rounds=12 | テスト実行時にアサーション失敗 |
| レスポンス形状 | `{accessToken, user}` | `{accessToken, refreshToken, user}` | テスト不完全 |

**対応:** Development チームへ修正依頼済み。テストモック内の `bcrypt.hash` 呼出を `12` に更新、`buildAuthResponse` の戻り値に `refreshToken` と `subscriptionStatus` を追加する必要あり。

### 3.2 LOW: フロントエンドテスト基盤なし

フロントエンド (Next.js 16 + React 19) にはテストライブラリ・テストファイルが一切存在しない。本番リリースのブロッカーではないが、リリース後のリグレッション検出能力に懸念あり。

---

## 4. セキュリティ対策実装状況 (コードレビュー結果)

2026-03-02 適用済みの6項目について、コード監査結果を報告。

| # | 修正項目 | 実装状態 | 検証結果 |
|---|---------|---------|---------|
| SEC-01 | bcrypt rounds 10→12 | `auth.service.ts` 3箇所確認済み (L50, L204, L276) | PASS |
| SEC-02 | JWT query param 削除 | `jwt.strategy.ts` — `fromAuthHeaderAsBearerToken()` のみ | PASS |
| SEC-03 | OAuth base64 URL → サーバーサイドセッション | `storeOAuthSession/consumeOAuthSession` 実装確認、5分TTL、128bit ID | PASS |
| SEC-04 | console.warn トークン値削除 | トークン値のログ出力なし確認 | PASS |
| SEC-05 | Docker PostgreSQL 外部ポート削除 | `docker-compose.prod.yml` で ports 未公開 | PASS |
| SEC-06 | Helmet (CSP/HSTS/frameguard/noSniff) | `main.ts` 設定確認済み | PASS |
| SEC-07 | nginx-prod.conf ヘッダー | HSTS, noSniff, DENY, Referrer-Policy 設定確認 | PASS |
| SEC-08 | Stripe webhook 400 返却 | `subscriptions.service.ts` — 署名失敗時 BadRequestException | PASS |
| SEC-09 | verify-email Throttle | `@Throttle({default:{limit:5,ttl:60000}})` 設定確認 | PASS |

**コード監査結論: 全セキュリティ修正が正しく実装されている。**

---

## 5. @Query/@Param バリデーション未適用エンドポイント (WARNING)

以下のエンドポイントは `@Body` DTO バリデーションが未適用。`ValidationPipe` (whitelist) はグローバル設定だが、DTO が定義されていないクエリ/パスパラメータには効果なし。

### P0 (攻撃面が広い — 次スプリント推奨)

| エンドポイント | 未検証パラメータ | リスク |
|--------------|----------------|-------|
| GET /auth/line/callback | code | OAuth code インジェクション |
| GET /auth/x/callback | code, state | PKCE バイパス |
| GET /auth/magic-link/verify | token | トークン改竄 |
| GET /posts/timeline | cursor, limit | 大量データ取得 (DoS) |
| GET /posts/hashtag/:tag | tag, cursor, limit | XSS/SQLi (Prisma で緩和) |
| GET /search/users, /search/posts | q | 極長文字列 (DoS) |

### 緩和要因

- Prisma ORM によるパラメータ化クエリ → SQLi リスクは低い
- SanitizeInputPipe → XSS リスクは Body のみ緩和
- Nginx レート制限 → DoS リスクは部分的に緩和
- **本番リリースのブロッカーではないが、リリース後の優先改善事項として記録**

---

## 6. 本番デプロイ Go/No-Go 判定

### Go 条件 (全て満たすこと)

| # | 条件 | 現在の状態 |
|---|------|----------|
| 1 | サーバー確保・SSH 接続可能 | CEO 確認待ち |
| 2 | ドメイン取得・DNS A レコード設定 | CEO 確認待ち |
| 3 | 本番用 .env 全変数設定完了 | テンプレート準備済み (.env.example) |
| 4 | SSL 証明書取得成功 | setup-ssl.sh 準備済み、サーバー後に実行 |
| 5 | docker-compose.prod 全コンテナ healthy | サーバー後に実行 |
| 6 | P0 スモークテスト全件 PASS | サーバー後に実行 (30ケース) |
| 7 | セキュリティヘッダー全件確認 | サーバー後に実行 (HDR-01〜07) |

### No-Go 条件 (1つでも該当したら停止)

| # | 条件 |
|---|------|
| 1 | P0 スモークテストで認証フロー (登録/ログイン/トークンリフレッシュ) 失敗 |
| 2 | SSL 証明書取得失敗 |
| 3 | HTTP→HTTPS リダイレクト未設定 |
| 4 | Stripe Webhook 署名検証失敗 |
| 5 | DB 外部ポートが公開されている |
| 6 | JWT_SECRET / STRIPE_WEBHOOK_SECRET が未設定 |

---

## 7. リリース後モニタリング項目

| # | 監視項目 | 閾値 | 確認方法 |
|---|---------|------|---------|
| MON-01 | ヘルスチェック | 3回連続失敗 | Docker healthcheck (15秒間隔) |
| MON-02 | SSL 証明書残日数 | 30日未満で警告 | ssl-renew.sh ログ確認 |
| MON-03 | ディスク使用率 | 80% 超過 | `df -h` |
| MON-04 | メモリ使用率 | 90% 超過 | `docker stats` |
| MON-05 | 5xx エラー発生率 | 1%/時間 超過 | Nginx アクセスログ |
| MON-06 | API レスポンスタイム | P95 > 2秒 | Nginx ログ解析 |

---

## 8. テスト実行スケジュール (サーバー確保後)

| フェーズ | 実施内容 | 所要時間 | 担当 |
|---------|---------|---------|------|
| Phase 0 | .env 設定 + Docker ビルド + SSL 取得 | 30分 | DevSecOps + Ops |
| Phase 1 | インフラ検証 (ENV-01〜06, SSL-01〜07) | 20分 | QA + DevSecOps |
| Phase 2 | セキュリティヘッダー検証 (HDR-01〜07) | 15分 | QA |
| Phase 3 | P0 スモークテスト (30ケース) | 45分 | QA |
| Phase 4 | Stripe 決済テスト (PAY-01〜07) | 20分 | QA |
| Phase 5 | レート制限検証 (RATE-01〜06) | 15分 | QA |
| Phase 6 | Go/No-Go 判定 + CEO 報告 | 10分 | Planning + QA |
| **合計** | | **約2.5時間** | |

---

## 9. 他チームへの引き継ぎ事項

### → Development

1. `auth.service.spec.ts` の bcrypt rounds アサーションを `12` に更新
2. 同テストの `buildAuthResponse` 戻り値に `refreshToken`, `subscriptionStatus` 追加
3. @Query/@Param への DTO 追加 (P0 エンドポイント6件、リリース後対応可)

### → DevSecOps

1. 本番 .env に設定必要な秘密情報一覧は `.env.example` に記載済み
2. TOKEN_ENCRYPTION_KEY の生成: `openssl rand -hex 32`
3. JWT_SECRET の生成: `openssl rand -hex 64`
4. OAuth セッションの in-memory Map → Redis 移行検討 (マルチインスタンス時)

### → Operations

1. ssl-renew.sh の cron 登録を忘れずに
2. Docker healthcheck は 15秒間隔、3回リトライで設定済み
3. Nginx アクセスログの監視体制構築 (5xx 率、レスポンスタイム)
4. uploads/ ディレクトリのバックアップ対象への追加

---

*本レポートは poker_sns 全コードベース (backend 9モジュール + frontend + 本番構成ファイル) を網羅的に監査し作成。*
*既存 QA ドキュメント (qa-smoke-test-checklist.md, qa-security-test-coverage-report.md, qa-report.md) の内容を統合・更新。*
