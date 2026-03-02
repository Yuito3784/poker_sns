# QA/QC Release Gate Deliverable - Round 1

**Author**: QA/QC (尾丸)
**Date**: 2026-03-02
**Branch**: climpire/e99b792a
**Status**: Complete

---

## 目次

1. [リリース品質ゲート総括](#1-リリース品質ゲート総括)
2. [スモークテスト計画 (4経路カバレッジ)](#2-スモークテスト計画)
3. [セキュリティ修正検証チェックリスト](#3-セキュリティ修正検証チェックリスト)
4. [セキュリティ検証curlコマンド集](#4-セキュリティ検証curlコマンド集)
5. [エラーページ・レスポンシブ検証](#5-エラーページレスポンシブ検証)
6. [既存QAドキュメント参照マップ](#6-既存qaドキュメント参照マップ)

---

## 1. リリース品質ゲート総括

### Gate判定基準 (全項目パスでリリース可)

| # | Gate条件 | 検証方法 | 判定 |
|---|---------|---------|------|
| G-1 | Smoke Test P0 全30件パス | `docs/qa-smoke-test-checklist.md` 実行 | 待機 |
| G-2 | Security Header CRITICAL/HIGH 全項目パス | 本ドキュメント §4 curlコマンド実行 | 待機 |
| G-3 | Stripe P0 全件パス (テストモード) | `docs/qa-stripe-e2e-test-scenarios.md` 実行 | 待機 |
| G-4 | bcrypt rounds=12 コード検証 | 本ドキュメント §3.1 | **PASS** |
| G-5 | OAuth セッション方式 (クエリパラム廃止) | 本ドキュメント §3.2 | **PASS** |
| G-6 | JWT Bearer token only (クエリ抽出廃止) | 本ドキュメント §3.3 | **PASS** |
| G-7 | Webhook署名不正時 400返却 | 本ドキュメント §4.5 | 待機 |
| G-8 | CORS ワイルドカード不使用 | 本ドキュメント §4.3 | 待機 |
| G-9 | エラーページ (404/500) 存在確認 | 本ドキュメント §5.1 | **要対応** |
| G-10 | レスポンシブ表示 主要5画面 | 本ドキュメント §5.2 | 待機 |

**総合判定**: G-1/G-2/G-3/G-7/G-8/G-10 はデプロイ後に実施。G-9 はコード対応推奨。

---

## 2. スモークテスト計画

既存の `docs/qa-smoke-test-checklist.md` (84テストケース) に基づき、リリース前に最低限カバーすべき **4経路** を抜粋。

### 2.1 認証フロー (P0: 6件)

| # | テスト | エンドポイント | 期待結果 |
|---|-------|-------------|---------|
| AUTH-1 | ユーザー登録 | `POST /api/auth/register` | 201, tokens返却 |
| AUTH-2 | ログイン | `POST /api/auth/login` | 200, tokens返却 |
| AUTH-3 | トークンリフレッシュ | `POST /api/auth/refresh` | 200, 新トークンペア |
| AUTH-4 | メール認証 | `POST /api/auth/verify-email` | 200, emailVerified=true |
| AUTH-5 | 不正パスワード拒否 | `POST /api/auth/login` (wrong pw) | 401 |
| AUTH-6 | 重複メール拒否 | `POST /api/auth/register` (dup) | 409 |

### 2.2 投稿CRUD (P0: 5件)

| # | テスト | エンドポイント | 期待結果 |
|---|-------|-------------|---------|
| POST-1 | テキスト投稿作成 | `POST /api/posts` | 201, post返却 |
| POST-2 | タイムライン取得 | `GET /api/posts/timeline` | 200, 配列 |
| POST-3 | 投稿削除 (自分) | `DELETE /api/posts/:id` | 200 |
| POST-4 | 他人の投稿削除拒否 | `DELETE /api/posts/:otherId` | 403 |
| POST-5 | いいねトグル | `POST /api/posts/:id/like` | 200, 状態切替 |

### 2.3 Stripe決済 (P0: 3件)

| # | テスト | エンドポイント | 期待結果 |
|---|-------|-------------|---------|
| STRIPE-1 | チェックアウトセッション生成 | `POST /api/subscriptions/checkout` | 200, checkoutUrl |
| STRIPE-2 | サブスクステータス取得 | `GET /api/subscriptions/status` | 200, status obj |
| STRIPE-3 | Webhook不正署名拒否 | `POST /api/subscriptions/webhook` (bad sig) | 400 |

### 2.4 画像アップロード (P0: 2件)

| # | テスト | エンドポイント | 期待結果 |
|---|-------|-------------|---------|
| IMG-1 | 投稿画像アップロード | `POST /api/posts/upload-image` | 201, imageUrl |
| IMG-2 | 非画像ファイル拒否 | `POST /api/posts/upload-image` (.txt) | 400 |

**合計**: 16件 (最短スモークテスト。全84件は `docs/qa-smoke-test-checklist.md` 参照)

---

## 3. セキュリティ修正検証チェックリスト

### 3.1 bcrypt rounds強化 (10→12)

**検証方法**: ソースコード静的検査 (コード変更不要)

| # | ファイル | 箇所 | 期待値 | 検証結果 |
|---|---------|------|-------|---------|
| BC-1 | `backend/src/auth/auth.service.ts` | `register()` L50 | `bcrypt.hash(dto.password, 12)` | **PASS** |
| BC-2 | `backend/src/auth/auth.service.ts` | `changePassword()` L204 | `bcrypt.hash(newPassword, 12)` | **PASS** |
| BC-3 | `backend/src/auth/auth.service.ts` | `resetPassword()` L276 | `bcrypt.hash(newPassword, 12)` | **PASS** |

**検証コマンド** (CI向け):
```bash
# bcrypt roundsが12であることを静的に検証
grep -n "bcrypt.hash" backend/src/auth/auth.service.ts | while read line; do
  if echo "$line" | grep -q ", 12)"; then
    echo "[PASS] $line"
  else
    echo "[FAIL] $line — rounds != 12"
  fi
done
```

### 3.2 OAuth セッション方式 (クエリパラムトークン廃止)

**検証方法**: ソースコード静的検査 + デプロイ後動作確認

| # | 検証項目 | 検証結果 | 詳細 |
|---|---------|---------|------|
| OA-1 | `storeOAuthSession()` 実装 | **PASS** | `auth.service.ts` — in-memory Map, 32char hex ID, 5min TTL |
| OA-2 | `consumeOAuthSession()` 実装 | **PASS** | 1回限り使用 (delete後return), 期限切れ検証あり |
| OA-3 | OAuth callback → sessionId方式 | **PASS** | Google/LINE/X 各callbackで `storeOAuthSession` → redirect with `?oauthSession=` |
| OA-4 | `GET /auth/oauth-session?id=xxx` エンドポイント | **PASS** | Throttle付き (60s/10回), `consumeOAuthSession` 呼出 |
| OA-5 | 旧方式 (クエリパラムにtoken直接渡し) 削除 | **PASS** | callback URLにaccessToken/refreshTokenを直接含めるコードなし |

**デプロイ後検証コマンド**:
```bash
# 無効なセッションIDで400系エラーが返ることを確認
curl -s -w "\n%{http_code}" "${BASE_URL}/api/auth/oauth-session?id=invalid_session_id_12345"
# 期待: 400 Bad Request + "セッションが無効または期限切れです"

# IDパラメータなしで400が返ることを確認
curl -s -w "\n%{http_code}" "${BASE_URL}/api/auth/oauth-session"
# 期待: 400 Bad Request + "セッションIDが必要です"
```

### 3.3 JWT クエリパラム抽出削除

**検証方法**: ソースコード静的検査

| # | 検証項目 | 検証結果 | 詳細 |
|---|---------|---------|------|
| JWT-1 | `jwtFromRequest` 設定 | **PASS** | `ExtractJwt.fromAuthHeaderAsBearerToken()` のみ使用 |
| JWT-2 | `fromUrlQueryParameter` 不使用 | **PASS** | `jwt.strategy.ts` にクエリパラム抽出コードなし |
| JWT-3 | `fromQueryString` 不使用 | **PASS** | プロジェクト全体で検索しても該当なし |

**検証コマンド** (CI向け):
```bash
# JWT戦略にクエリパラム抽出が含まれていないことを確認
if grep -q "fromUrlQueryParameter\|fromQueryString\|query.*token" backend/src/auth/jwt.strategy.ts; then
  echo "[FAIL] JWT strategy contains query parameter extraction"
else
  echo "[PASS] JWT strategy uses Bearer token only"
fi
```

### 3.4 Helmet CSP/HSTS設定

**検証方法**: ソースコード静的検査 + デプロイ後ヘッダ確認

| # | 検証項目 | 検証結果 | 詳細 |
|---|---------|---------|------|
| HE-1 | CSP `default-src 'self'` | **PASS** | `main.ts` Helmet設定確認済み |
| HE-2 | CSP `script-src 'self'` | **PASS** | インラインスクリプト禁止 |
| HE-3 | CSP `frame-src 'none'` | **PASS** | iframe埋込み禁止 |
| HE-4 | CSP `object-src 'none'` | **PASS** | Flashプラグイン等禁止 |
| HE-5 | HSTS `max-age=63072000` (2年) | **PASS** | `includeSubDomains` + `preload` 付き |
| HE-6 | `frameguard: deny` | **PASS** | X-Frame-Options: DENY |
| HE-7 | `noSniff: true` | **PASS** | X-Content-Type-Options: nosniff |
| HE-8 | `xssFilter: true` | **PASS** | X-XSS-Protection 有効 |

### 3.5 Stripe Webhook署名検証

| # | 検証項目 | 検証結果 | 詳細 |
|---|---------|---------|------|
| SW-1 | `constructEvent()` による署名検証 | **PASS** | `subscriptions.service.ts` L147-162 |
| SW-2 | 署名不正時 `BadRequestException` throw | **PASS** | catch節で400返却 |
| SW-3 | コントローラでの400レスポンス | **PASS** | `subscriptions.controller.ts` L69-73 |
| SW-4 | イベント重複処理防止 (idempotency) | **PASS** | `subscriptionEvent.findUnique` チェック |

### 3.6 console.warn トークン値削除

| # | 検証項目 | 検証結果 |
|---|---------|---------|
| CW-1 | `console.warn` にトークン値が含まれていないこと | **PASS** |

**検証コマンド**:
```bash
# console.warn/log にtokenやsecretが含まれていないか検索
grep -rn "console\.\(warn\|log\|error\)" backend/src/ | grep -i "token\|secret\|password\|key" || echo "[PASS] No sensitive values in console output"
```

### 3.7 Docker PostgreSQL ポート外部公開削除

| # | 検証項目 | 検証結果 | 詳細 |
|---|---------|---------|------|
| DP-1 | 本番compose: db ports 未公開 | **PASS** | `docker-compose.prod.yml` にdb ports設定なし |
| DP-2 | 本番compose: backend ports 未公開 | **PASS** | `ports: []` (nginx経由のみ) |

### 3.8 verify-email @Throttle

| # | 検証項目 | 検証結果 |
|---|---------|---------|
| VE-1 | `verify-email` エンドポイントにThrottle設定 | **PASS** |

---

## 4. セキュリティ検証curlコマンド集

以下はデプロイ後にコピペで実行可能なコマンド集。`BASE_URL` を環境に合わせて設定。

### 4.0 環境変数設定

```bash
# ローカル環境
export BASE_URL="http://localhost"

# 本番環境 (ドメイン確定後に変更)
# export BASE_URL="https://yourdomain.com"
```

### 4.1 Helmet CSPヘッダ検証

```bash
echo "=== 4.1 Helmet CSP Header Check ==="
HEADERS=$(curl -sI "${BASE_URL}/api/health" 2>/dev/null)

# CSP
echo "$HEADERS" | grep -i "content-security-policy" | {
  read line
  if echo "$line" | grep -q "default-src"; then
    echo "[PASS] CSP header present: $line"
  else
    echo "[FAIL] CSP header missing or invalid"
  fi
}

# X-Powered-By が除去されていること
if echo "$HEADERS" | grep -qi "x-powered-by"; then
  echo "[FAIL] X-Powered-By header should be removed by Helmet"
else
  echo "[PASS] X-Powered-By header absent (Helmet active)"
fi
```

### 4.2 HSTS検証

```bash
echo "=== 4.2 HSTS Header Check ==="
HSTS=$(curl -sI "${BASE_URL}/api/health" 2>/dev/null | grep -i "strict-transport-security")
if echo "$HSTS" | grep -q "max-age=63072000"; then
  echo "[PASS] HSTS max-age=63072000 (2 years)"
else
  echo "[FAIL] HSTS header missing or max-age incorrect: $HSTS"
fi

if echo "$HSTS" | grep -q "includeSubDomains"; then
  echo "[PASS] HSTS includeSubDomains present"
else
  echo "[FAIL] HSTS includeSubDomains missing"
fi

if echo "$HSTS" | grep -q "preload"; then
  echo "[PASS] HSTS preload present"
else
  echo "[FAIL] HSTS preload missing"
fi
```

### 4.3 X-Frame-Options / X-Content-Type-Options検証

```bash
echo "=== 4.3 X-Frame-Options & X-Content-Type-Options ==="
HEADERS=$(curl -sI "${BASE_URL}/api/health" 2>/dev/null)

XFO=$(echo "$HEADERS" | grep -i "x-frame-options")
if echo "$XFO" | grep -qi "DENY"; then
  echo "[PASS] X-Frame-Options: DENY"
else
  echo "[FAIL] X-Frame-Options missing or not DENY: $XFO"
fi

XCTO=$(echo "$HEADERS" | grep -i "x-content-type-options")
if echo "$XCTO" | grep -qi "nosniff"; then
  echo "[PASS] X-Content-Type-Options: nosniff"
else
  echo "[FAIL] X-Content-Type-Options missing: $XCTO"
fi
```

### 4.4 CORS検証 (不正オリジン拒否)

```bash
echo "=== 4.4 CORS Arbitrary Origin Rejection ==="
CORS=$(curl -sI -X OPTIONS \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  "${BASE_URL}/api/auth/login" 2>/dev/null)

if echo "$CORS" | grep -qi "access-control-allow-origin: \*"; then
  echo "[FAIL] CORS allows wildcard origin (*)"
elif echo "$CORS" | grep -qi "access-control-allow-origin: http://evil.com"; then
  echo "[FAIL] CORS reflects arbitrary origin (http://evil.com)"
else
  echo "[PASS] CORS does not allow arbitrary origin"
fi
```

### 4.5 Stripe Webhook署名不正時の400確認

```bash
echo "=== 4.5 Stripe Webhook Invalid Signature ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/api/subscriptions/webhook" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=invalid_signature_value" \
  -d '{"id":"evt_test","type":"checkout.session.completed"}')

if [ "$STATUS" = "400" ]; then
  echo "[PASS] Webhook returns 400 on invalid signature"
else
  echo "[FAIL] Webhook returned $STATUS (expected 400)"
fi
```

### 4.6 OAuth旧方式クエリパラムトークン拒否

```bash
echo "=== 4.6 OAuth Old-Style Query Param Token Rejection ==="

# 無効なOAuthセッションIDで400が返ること
STATUS1=$(curl -s -o /dev/null -w "%{http_code}" \
  "${BASE_URL}/api/auth/oauth-session?id=invalid_fake_session_id")
if [ "$STATUS1" = "400" ]; then
  echo "[PASS] Invalid oauth-session ID returns 400"
else
  echo "[FAIL] Invalid oauth-session ID returned $STATUS1 (expected 400)"
fi

# セッションIDなしで400が返ること
STATUS2=$(curl -s -o /dev/null -w "%{http_code}" \
  "${BASE_URL}/api/auth/oauth-session")
if [ "$STATUS2" = "400" ]; then
  echo "[PASS] Missing oauth-session ID returns 400"
else
  echo "[FAIL] Missing oauth-session ID returned $STATUS2 (expected 400)"
fi

# JWTをクエリパラムで渡してもAPIにアクセスできないこと
STATUS3=$(curl -s -o /dev/null -w "%{http_code}" \
  "${BASE_URL}/api/posts/timeline?token=eyJhbGciOiJIUzI1NiJ9.fake")
if [ "$STATUS3" = "401" ]; then
  echo "[PASS] JWT in query param rejected (401)"
else
  echo "[WARN] JWT query param test returned $STATUS3 (expected 401 — may be 200 if route is public)"
fi
```

### 4.7 Referrer-Policy検証 (nginx本番)

```bash
echo "=== 4.7 Referrer-Policy (nginx-prod) ==="
RP=$(curl -sI "${BASE_URL}/" 2>/dev/null | grep -i "referrer-policy")
if echo "$RP" | grep -qi "strict-origin-when-cross-origin"; then
  echo "[PASS] Referrer-Policy: strict-origin-when-cross-origin"
else
  echo "[INFO] Referrer-Policy: $RP (nginx-prod only — check after production deploy)"
fi
```

### 4.8 レート制限検証

```bash
echo "=== 4.8 Rate Limit Check (auth endpoint) ==="
HIT_429=false
for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"ratetest${i}@example.com\",\"username\":\"ratetest${i}\",\"password\":\"TestPass123!\"}")
  if [ "$STATUS" = "429" ]; then
    echo "[PASS] Rate limit triggered at request #$i (429)"
    HIT_429=true
    break
  fi
done
if [ "$HIT_429" = "false" ]; then
  echo "[WARN] Rate limit not triggered within 10 requests (may depend on nginx config)"
fi
```

### 4.9 一括実行スクリプト

```bash
#!/bin/bash
# qa-security-verification.sh
# Usage: ./qa-security-verification.sh [BASE_URL]
# Example: ./qa-security-verification.sh https://pokersns.example.com

export BASE_URL="${1:-http://localhost}"
PASS=0; FAIL=0; WARN=0

echo "========================================="
echo " Poker SNS Security Verification"
echo " Target: $BASE_URL"
echo " Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo ""

# (上記 §4.1〜4.8 を順次実行)
# 各テストで PASS/FAIL/WARN をカウント

echo ""
echo "========================================="
echo " Results: PASS=$PASS | FAIL=$FAIL | WARN=$WARN"
echo "========================================="
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
```

---

## 5. エラーページ・レスポンシブ検証

### 5.1 エラーページ (404/500) 検証

#### 現状分析

| ページ | ファイル | 状態 |
|--------|---------|------|
| 404 Not Found | `frontend/src/app/not-found.tsx` | **未作成** |
| 500 Error | `frontend/src/app/error.tsx` | **未作成** |
| ErrorBoundary | `frontend/src/app/components/ErrorBoundary.tsx` | 作成済み (Reactエラー境界) |

#### 指摘事項

| # | 項目 | 重要度 | 説明 |
|---|------|-------|------|
| EP-1 | `not-found.tsx` 未作成 | **HIGH** | Next.js App Routerのカスタム404ページが未作成。ユーザーが存在しないURLにアクセスするとNext.jsデフォルトの404が表示される。ブランドイメージに沿ったページを作成すべき。 |
| EP-2 | `error.tsx` 未作成 | **HIGH** | サーバーサイドエラー時のカスタム500ページが未作成。未処理例外時にNext.jsデフォルトエラーページが表示される。 |
| EP-3 | ErrorBoundary はクライアントのみ | **MEDIUM** | 既存の`ErrorBoundary`はReactクライアントサイドレンダリングエラーのみキャッチ。SSRエラーは`error.tsx`が必要。 |

#### 推奨アクション (Development部門向け)

- `frontend/src/app/not-found.tsx` を作成 — "The Felt Table" テーマに沿ったデザイン
- `frontend/src/app/error.tsx` を作成 — `"use client"` + リトライボタン付き
- 両ページとも日本語テキスト、ナビゲーションリンク (ホームに戻る) を含むこと

#### デプロイ後検証手順

```bash
echo "=== Error Page Verification ==="

# 404ページ
STATUS_404=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/nonexistent-page-xyz")
BODY_404=$(curl -s "${BASE_URL}/nonexistent-page-xyz")
echo "404 page status: $STATUS_404"
if echo "$BODY_404" | grep -qi "poker\|ホーム\|戻る"; then
  echo "[PASS] Custom 404 page with brand content"
else
  echo "[WARN] 404 page may be using default Next.js template"
fi

# 500ページ (直接テスト困難 — ErrorBoundaryの動作確認で代替)
echo "[INFO] 500 error page requires runtime error trigger for verification"
```

### 5.2 レスポンシブ表示チェックリスト

以下の5画面 x 3ブレークポイントで目視確認を実施。

#### ブレークポイント

| デバイス | 幅 | 確認方法 |
|---------|-----|---------|
| Mobile | 375px | Chrome DevTools — iPhone SE |
| Tablet | 768px | Chrome DevTools — iPad Mini |
| Desktop | 1280px | ブラウザ通常表示 |

#### 確認マトリクス

| # | ページ | URL | Mobile 375px | Tablet 768px | Desktop 1280px |
|---|--------|-----|:---:|:---:|:---:|
| RS-1 | ホーム (タイムライン) | `/` | [ ] | [ ] | [ ] |
| RS-2 | ランディングページ | `/lp` | [ ] | [ ] | [ ] |
| RS-3 | プロフィール | `/profile/:username` | [ ] | [ ] | [ ] |
| RS-4 | 投稿詳細 | `/post/:id` | [ ] | [ ] | [ ] |
| RS-5 | 設定 | `/settings` | [ ] | [ ] | [ ] |

#### 確認観点

| # | チェック項目 | 重要度 |
|---|------------|-------|
| RC-1 | テキストが画面外にはみ出さない | HIGH |
| RC-2 | ボタン・リンクがタップ可能サイズ (44px以上) | HIGH |
| RC-3 | 画像がアスペクト比を維持してリサイズ | MEDIUM |
| RC-4 | サイドバーが適切に折りたたまれる (Mobile) | HIGH |
| RC-5 | フォーム入力欄が画面幅に収まる | HIGH |
| RC-6 | 横スクロールが発生しない | MEDIUM |
| RC-7 | フォントサイズが読みやすい (最小14px) | MEDIUM |

#### viewport meta確認

```
frontend/src/app/layout.tsx — viewport: { themeColor: "#0d1009" }
```

Next.js App Routerのデフォルトで `<meta name="viewport" content="width=device-width, initial-scale=1">` が挿入される。**問題なし**。

---

## 6. 既存QAドキュメント参照マップ

| ドキュメント | 対象範囲 | 優先度 |
|------------|---------|-------|
| `docs/qa-smoke-test-checklist.md` | 全モジュール84テストケース | P0-P2 |
| `docs/qa-security-header-verification.md` | HTTPヘッダ期待値 + 自動検証スクリプト | CRITICAL-LOW |
| `docs/qa-stripe-e2e-test-scenarios.md` | Stripe決済フロー47テストケース | P0-P2 |
| `docs/qa-security-test-coverage-report.md` | セキュリティテストカバレッジ | Reference |
| `docs/qa-phase4-security-deliverable.md` | Phase4セキュリティ検証結果 | Reference |
| `docs/QA_PRODUCTION_READINESS_REPORT.md` | 本番準備状況レポート | Reference |
| **本ドキュメント** | リリースゲート判定 + セキュリティ修正検証 + curlコマンド集 | **CRITICAL** |

---

## 付録: 既存ユニットテスト状況

| ファイル | テスト数 | カバレッジ |
|---------|---------|----------|
| `auth.service.spec.ts` | 認証フロー一般 | register, login, tokens |
| `auth.security.spec.ts` | 7件 | bcrypt rounds x3, OAuth session x3, 期限切れ |
| `posts.service.spec.ts` | 投稿CRUD | create, delete, timeline |
| `subscriptions.service.spec.ts` | Stripe連携 | checkout, status, cancel |
| `subscriptions.webhook.spec.ts` | 4件 | 署名検証, 不正署名, missing secret, idempotency |

**推奨**: デプロイ前に `cd backend && npm run test` を実行し全件パスを確認。

---

## まとめ

### コード検証済み項目 (PASS)
- bcrypt rounds=12 (3箇所)
- OAuth セッション方式移行完了
- JWT Bearer token only
- Helmet CSP/HSTS/frameguard/noSniff設定
- Stripe webhook署名検証 + 400返却
- Docker本番構成 (ポート非公開, 環境変数必須化)
- console出力からのトークン値削除

### デプロイ後実施待ち
- スモークテスト P0 (16件最短 / 30件フル)
- セキュリティヘッダ curlコマンド実行 (§4)
- CORS検証
- レート制限検証
- レスポンシブ表示確認

### 要対応 (Development部門へエスカレーション)
- **EP-1**: `not-found.tsx` (404ページ) 未作成 — HIGH
- **EP-2**: `error.tsx` (500ページ) 未作成 — HIGH
