# Development Team Deliverable - Round 1
## 本番リリース向け Dev側ブロッカー/リスク報告書
**作成者**: 風真 (Development)
**日付**: 2026-03-02
**ブランチ**: climpire/66ded6ba

---

## 1. 補完計画の実行結果

### 1-1. コードベース健全性確認: 完了

全モジュール（Auth, Posts, Replies, Users, Notifications, Search, Ads, Affiliates, Subscriptions）のコードを確認。直近のセキュリティ修正は全てmainにマージ済み。

**セキュリティ修正の適用状況（全て確認済み）:**

| 修正項目 | ファイル | 状態 |
|----------|----------|------|
| bcrypt 12 rounds (3箇所) | `auth.service.ts` L50, L204, L276 | PASS |
| JWT query param 抽出削除 | `jwt.strategy.ts` L13 | PASS |
| OAuth session方式 | `auth.service.ts` L27-47 | PASS |
| console.warnからトークン値削除 | `auth.service.ts` L152, L258, L511 | PASS |
| PostgreSQL port非公開 | `docker-compose.yml` | PASS |
| Helmet CSP/HSTS/frameguard | `main.ts` L18-43 | PASS |
| nginx HSTS/headers | `nginx-prod.conf` L61-64 | PASS |
| Stripe webhook署名検証 | 該当コントローラ | PASS |
| verify-email Throttle | `auth.controller.ts` | PASS |

### 1-2. 復旧後動作確認手順（提案）

以下をDev側標準手順として提案:

```
# 1. ローカル起動確認
docker compose build --no-cache
docker compose up -d
curl -s http://localhost:4000/health | jq .

# 2. フロント画面確認
open http://localhost:3000

# 3. DB接続確認
docker compose exec backend npx prisma db push --accept-data-loss

# 4. 基本API確認
curl -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"Test1234!","username":"testuser","displayName":"Test"}'
```

---

## 2. 本番リリースブロッカー（CRITICAL）

### BUG-001: `frontend/next.config.ts` に `output: 'standalone'` が未設定 [修正済み]

- **影響**: Docker本番ビルドが失敗する（`.next/standalone` ディレクトリが生成されない）
- **Dockerfileの該当行**: `frontend/Dockerfile:21` — `COPY --from=builder /app/.next/standalone ./`
- **修正内容**: `next.config.ts` に `output: 'standalone'` を追加
- **コミット**: `0e8b4f1` （本ブランチで修正済み）
- **ステータス**: **修正済み — mainへのマージ待ち**

修正後、Dev側から見た本番ビルドブロッカーは **0件** です。

---

## 3. 本番リリースリスク（リリース後対応可）

### RISK-001: `nginx-prod.conf` の `DOMAIN_PLACEHOLDER` 置換（LOW）
- `nginx-prod.conf` L33, L49, L51-52 に `DOMAIN_PLACEHOLDER` が残っている
- デプロイスクリプト or envsubst で実ドメインに置換する手順が必要
- **対応**: DevSecOps獅白さんと連携してデプロイ手順に含める

### RISK-002: `subscriptionStatus` がString型（LOW）
- `prisma/schema.prisma` で `subscriptionStatus` が `String @default("free")` 定義
- Prisma enumにすれば不正値のDB挿入を防げるが、アプリ側でバリデーション済み
- **対応**: リリース後のスキーマ改善タスクとして扱う

### RISK-003: SSL証明書の初期取得（MEDIUM）
- `nginx-prod.conf` は Let's Encrypt証明書を前提としている
- 初回デプロイ時は certbot による証明書取得を先行実行する必要あり
- **対応**: DevSecOps/Opsと連携してデプロイ手順に含める

---

## 4. アーキテクチャ確認サマリ

| レイヤー | 構成 | 状態 |
|----------|------|------|
| Backend | NestJS 11 + Prisma 5 + PostgreSQL | OK |
| Frontend | Next.js 16 + React 19 + Tailwind | OK (standalone修正済み) |
| Auth | JWT (15min access + 30day refresh + rotation) | OK |
| Security | Helmet, CSP, HSTS, sanitize pipe, throttle | OK |
| Docker (dev) | docker-compose.yml | OK |
| Docker (prod) | docker-compose.prod.yml (ports閉鎖, 必須env検証) | OK |
| Docker (staging) | docker-compose.staging.yml (GHCR image) | OK |
| Nginx | TLS 1.2/1.3, rate limit, SSE対応, OGキャッシュ | OK |
| Dockerfile (backend) | Multi-stage, non-root user, prod deps only | OK |
| Dockerfile (frontend) | Multi-stage, non-root user, standalone output | OK (修正後) |

---

## 5. 結論

**Dev側判定: 本番リリース Go**

- BUG-001（唯一のブロッカー）は本ブランチで修正済み。mainマージ後に解消。
- RISK-001, RISK-003 はDevSecOps/Opsとの連携事項でありDev側の作業ではない。
- RISK-002 はリリース後改善。
- コードベースは健全であり、セキュリティ修正も全て適用済み。

**DevSecOps向け引き継ぎ事項:**
1. 本ブランチの `0e8b4f1` をmainにマージ後、Docker本番ビルドの通過確認をお願いします
2. `nginx-prod.conf` の `DOMAIN_PLACEHOLDER` 置換手順の確認
3. Let's Encrypt証明書の初期取得手順の整備
4. `.env` 本番値の設定漏れチェック（`docker-compose.prod.yml` の `:?` 構文で未設定時は起動失敗するため安全）
