# デプロイ後スモークテスト手順書 v1

## 実施タイミング
- 本番初回デプロイ直後
- CI/CD パイプラインの deploy ジョブ後 (手動確認用)
- 障害復旧後

## 前提
- ドメイン: `DOMAIN` (例: thefelt.jp)
- HTTPS 証明書が有効であること

---

## チェックリスト

### 1. インフラ基盤
| # | 項目 | コマンド/URL | 期待結果 |
|---|------|-------------|----------|
| 1-1 | 全コンテナ起動 | `docker compose ps` | db, backend, frontend, nginx, certbot が Up |
| 1-2 | DB 接続 | `docker compose exec db pg_isready -U postgres` | accepting connections |
| 1-3 | ディスク使用量 | `df -h /` | 80% 未満 |

### 2. エンドポイント疎通
| # | 項目 | URL | 期待結果 |
|---|------|-----|----------|
| 2-1 | Health API | `GET /api/health` | HTTP 200, `{"status":"ok"}` |
| 2-2 | LP 表示 | `GET /lp` | HTTP 200, HTML にタイトル含む |
| 2-3 | HTTP→HTTPS redirect | `curl -I http://DOMAIN/` | HTTP 301 → https:// |
| 2-4 | SSL 証明書 | `curl -vI https://DOMAIN/ 2>&1 \| grep "SSL certificate"` | 有効期限30日以上 |

### 3. 認証フロー
| # | 項目 | 操作 | 期待結果 |
|---|------|------|----------|
| 3-1 | ユーザー登録 | POST `/api/auth/register` | HTTP 201, accessToken + refreshToken 含む |
| 3-2 | ログイン | POST `/api/auth/login` | HTTP 200/201, accessToken 返却 |
| 3-3 | 認証失敗 | POST `/api/auth/login` (不正パスワード) | HTTP 401 |

### 4. 機能テスト
| # | 項目 | 操作 | 期待結果 |
|---|------|------|----------|
| 4-1 | 画像アップロード | POST `/api/users/me/avatar` (multipart) | HTTP 200, avatarUrl 更新 |
| 4-2 | 投稿作成 | POST `/api/posts` (認証済み) | HTTP 201, 投稿データ返却 |
| 4-3 | SSE 通知 | GET `/api/notifications/stream` (認証済み) | text/event-stream レスポンス |

### 5. 外部連携 (Stripe テストモード)
| # | 項目 | 操作 | 期待結果 |
|---|------|------|----------|
| 5-1 | Checkout セッション作成 | POST `/api/subscriptions/create-checkout-session` | HTTP 200/201, session URL 返却 |

### 6. セキュリティヘッダ
| # | 項目 | 確認方法 | 期待結果 |
|---|------|----------|----------|
| 6-1 | HSTS | `curl -I` | `strict-transport-security` ヘッダ存在 |
| 6-2 | X-Content-Type-Options | `curl -I` | `nosniff` |
| 6-3 | X-Frame-Options | `curl -I` | `DENY` |
| 6-4 | Server header | `curl -I` | `server_tokens off` により非表示 |

---

## 実行スクリプト (自動チェック)

```bash
#!/bin/bash
DOMAIN="${1:-localhost}"
BASE="https://$DOMAIN"
PASS=0; FAIL=0

check() {
  local name="$1" url="$2" expect="$3"
  local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
  if [ "$code" = "$expect" ]; then
    echo "  PASS: $name (HTTP $code)"
    ((PASS++))
  else
    echo "  FAIL: $name (expected $expect, got $code)"
    ((FAIL++))
  fi
}

echo "=== Smoke Test: $DOMAIN ==="
check "Health API" "$BASE/api/health" "200"
check "LP page" "$BASE/lp" "200"
check "HTTPS redirect" "http://$DOMAIN/" "301"
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
```
