# QA/QC 本番リリース準備状況レポート
**作成者:** 尾丸 (QA/QC)
**作成日:** 2026-03-02
**対象:** poker_sns 本番リリース判定

---

## 1. セキュリティ修正の検証結果

| # | 修正項目 | 対象ファイル | 状態 | 確認内容 |
|---|---------|-------------|------|---------|
| 1 | bcrypt rounds 10→12 | `auth.service.ts` L50, L204, L276 | PASS | 3箇所すべて `bcrypt.hash(_, 12)` 確認済 |
| 2 | JWT query param 削除 | `jwt.strategy.ts` L13 | PASS | `fromAuthHeaderAsBearerToken()` のみ。クエリパラム抽出なし |
| 3 | Helmet (CSP/HSTS/frameguard/noSniff) | `main.ts` L18-43 | PASS | CSP, HSTS(2年+preload), frameguard(deny), noSniff, xssFilter すべて設定済 |
| 4 | Stripe webhook 署名検証 | `subscriptions.service.ts` L147-162 | PASS | `constructEvent()` で署名検証、失敗時 `BadRequestException` (400) 返却 |
| 5 | verify-email @Throttle | `auth.controller.ts` L60 | PASS | `@Throttle({ default: { ttl: 60000, limit: 5 } })` 適用済 |
| 6 | OAuth: サーバーサイドセッション方式 | `auth.service.ts` | PASS | `storeOAuthSession()` / `consumeOAuthSession()` (in-memory Map, 5分TTL) |
| 7 | console.warn トークン値削除 | 各所 | PASS | トークン値のログ出力なし |
| 8 | Docker PostgreSQL 外部ポート削除 | `docker-compose.yml` | PASS | ポート5432の外部公開なし |

**セキュリティ修正判定: 全8項目 PASS**

---

## 2. ビルド検証結果

| コンポーネント | 結果 | 詳細 |
|--------------|------|------|
| Backend (NestJS) | PASS | `prisma generate` + `nest build` 正常完了 |
| Frontend (Next.js 16.1.4) | PASS | Turbopack ビルド 8.5秒、静的ページ21/21生成成功 |
| Prisma Client | PASS | v5.20.0 生成完了 |

---

## 3. npm audit 結果 (依存パッケージ脆弱性)

### Backend: 18件 (1 low, 5 moderate, 12 high)

| 深刻度 | パッケージ | 脆弱性 | リスク評価 |
|--------|-----------|--------|-----------|
| HIGH | `minimatch` (≤3.1.3) | ReDoS (正規表現 DoS) | LOW - ビルドツール依存。ランタイムに影響しない |
| HIGH | `@isaacs/brace-expansion` | Uncontrolled Resource Consumption | LOW - ビルドツール依存 |
| HIGH | multer (via @nestjs/platform-express) | 既知の脆弱性 | MEDIUM - ファイルアップロード機能で使用。nginx側のbody size制限で軽減 |
| HIGH | qs (6.7.0-6.14.1) | arrayLimit bypass DoS | MEDIUM - `npm audit fix` で修正可能 |
| MODERATE | ajv (ReDoS) | $data option ReDoS | LOW - バリデーションライブラリ、ビルドツール依存 |

**推奨アクション:**
- `npm audit fix` でqs脆弱性は即時修正可能 (MEDIUM - リリース前推奨)
- multer脆弱性は@nestjs/platform-expressのアップデート待ち (nginx rate limitで軽減済)
- その他はビルドツール依存のため本番ランタイムに影響なし → リリースブロッカーではない

### Frontend: 3件 (1 moderate, 2 high)
- Next.js依存の間接脆弱性。本番ランタイムへの影響は限定的

---

## 4. 本番インフラ構成の検証

### docker-compose.prod.yml
| 項目 | 状態 | 詳細 |
|------|------|------|
| サービス定義 | OK | db, backend, frontend, nginx, certbot の5サービス |
| ポート制御 | OK | backend/frontend ポート非公開 (nginx経由のみ) |
| リソース制限 | OK | CPU/メモリ制限設定済 (DB:1GB, Backend:512MB, Frontend:512MB, Nginx:256MB) |
| 必須env検証 | OK | DB_PASSWORD, JWT_SECRET, STRIPE keys, TOKEN_ENCRYPTION_KEY の未設定エラー付き |
| ヘルスチェック | OK | PostgreSQL health check + depends_on condition |
| 再起動ポリシー | OK | `unless-stopped` 全サービス |

### nginx-prod.conf
| 項目 | 状態 | 詳細 |
|------|------|------|
| TLS | OK | TLSv1.2/1.3, ECDHE暗号スイート, HTTP/2 |
| HSTS | OK | 2年 + includeSubDomains + preload |
| セキュリティヘッダ | OK | X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| Rate Limiting | OK | API: 30req/s, Auth: 5req/s, OG: 10req/s, LP: 20req/s |
| Gzip | OK | Level 6, 各種MIME有効 |
| DOMAIN_PLACEHOLDER | WARNING | デプロイ時に実ドメインへの置換が必要 |

### Dockerfile
| 項目 | 状態 | 詳細 |
|------|------|------|
| マルチステージビルド | OK | Builder/Runner分離 (軽量イメージ) |
| 非rootユーザー | OK | nestjs:1001 / nextjs:1001 |
| Alpine base | OK | Node 20 Alpine |

---

## 5. CEOへの報告: ブロッカーと判定

### ブロッカー (リリース不可要因)

| # | ブロッカー | 担当 | 備考 |
|---|-----------|------|------|
| B-1 | **本番サーバー (VPS) 未確定** | CEO判断 | ドメイン・DNS・SSL証明書の前提条件 |
| B-2 | **ドメイン未確定** | CEO判断 | nginx-prod.conf の DOMAIN_PLACEHOLDER 置換、OAuth callback URI 設定に必要 |
| B-3 | **本番環境変数 未設定** | Dev/Ops | 32変数中、特にJWT_SECRET (64byte hex生成)、DB_PASSWORD、STRIPE_WEBHOOK_SECRET、TOKEN_ENCRYPTION_KEY が必須 |
| B-4 | **SSL証明書 未取得** | Ops | Let's Encrypt certbot 初回取得はドメイン確定後 |
| B-5 | **OAuth callback URI 未登録** | Dev | Google/LINE/X の各プロバイダにて本番ドメインのcallback URLを登録必要 |
| B-6 | **SMTP (メール送信) 未設定** | Dev | メール認証・パスワードリセットに必須。Resend推奨 (無料枠3,000通/月) |

### 非ブロッカー (リリース後対応可)

| # | 項目 | 優先度 | 詳細 |
|---|------|--------|------|
| N-1 | npm audit fix (qs脆弱性) | MEDIUM | `npm audit fix` で即修正可。nginx rate limitで軽減済 |
| N-2 | DBバックアップ自動化 | MEDIUM | pg_dump cron or マネージドDB |
| N-3 | 監視・ログ集約 | MEDIUM | アプリケーションログ/メトリクス基盤 |
| N-4 | SNS Auto-Post連携 (X/YouTube/Instagram) | LOW | OAuth設定すれば有効化 |
| N-5 | Google Analytics設定 | LOW | GA_MEASUREMENT_ID設定のみ |

---

## 6. QA/QC 判定サマリ

### コード品質: PASS
- セキュリティ修正 8/8 項目すべて適用済
- Backend/Frontend ビルド成功
- 本番Docker構成 (リソース制限、ヘルスチェック、非rootユーザー) 適切

### 本番リリース判定: **CONDITIONAL PASS (条件付き合格)**

**コードベースは本番リリース可能な状態です。**
ブロッカーはすべてインフラ・外部サービス設定であり、コード修正は不要です。

CEO決裁事項:
1. VPSプロバイダ選定 → B-1解消
2. ドメイン確定 → B-2, B-4, B-5 連鎖解消
3. SMTPサービス選定 → B-6解消

上記3点が決定されれば、環境変数設定 + `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` で即時デプロイ可能です。

---

## 7. デプロイ前 最終チェックリスト (インフラ確定後)

- [ ] 本番`.env`ファイル作成 (全32変数)
- [ ] `DOMAIN_PLACEHOLDER` を実ドメインに置換 (nginx-prod.conf)
- [ ] SSL証明書初回取得 (`certbot certonly`)
- [ ] OAuth callback URI 本番登録 (Google, LINE, X)
- [ ] Stripe webhook endpoint 本番URL登録
- [ ] SMTP接続テスト (メール送信確認)
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml build` 成功確認
- [ ] `docker compose up -d` → 全サービス healthy 確認
- [ ] フロントエンドアクセス確認 (HTTPS)
- [ ] ユーザー登録→メール認証→ログイン E2Eフロー確認
- [ ] Stripe決済テスト (テストモード)
- [ ] `npm audit fix` 適用 (qs脆弱性修正)
