# DevSecOps成果物: SNSマーケティング運用セキュリティ監査レポート

**作成日**: 2026-03-07
**担当**: DevSecOps 角巻
**対象**: X（Twitter）SNS運用開始に伴うインフラ・セキュリティ確認

---

## 1. セキュリティ監査結果

### CRITICAL: Xアカウント認証情報の平文露出

| 項目 | 詳細 |
|------|------|
| 重大度 | **CRITICAL** |
| 内容 | Xアカウント(@poker93626)のパスワードがタスク指示内に平文で記載されている |
| リスク | チャットログ・タスク管理ツール経由での認証情報漏洩 |

**即時対応アクション（運用開始前に必須）:**

1. **パスワード変更**: 現在のパスワードを即座に変更し、16文字以上・英数記号混合の強固なパスワードを設定
2. **2FA有効化**: X設定 > セキュリティ > 二要素認証 で認証アプリ（Google Authenticator等）を設定
3. **認証情報管理**: パスワードは1Password/Bitwarden等のシークレットマネージャーで管理し、平文での共有を禁止
4. **タスク指示の修正**: 本タスク指示からパスワード記載を削除し、シークレットマネージャーへの参照に置換

---

## 2. UTMパラメータ インフラ透過確認

### 確認結果: 問題なし

nginx-prod.confの各locationブロックを検証し、UTMクエリパラメータ（utm_source, utm_medium, utm_campaign等）がバックエンド・フロントエンドまで正常に透過されることを確認。

| チェック項目 | 結果 | 根拠 |
|-------------|------|------|
| HTTP→HTTPSリダイレクト時のクエリ保持 | OK | `return 301 https://$host$request_uri;` — $request_uriはクエリ含む |
| APIプロキシ時のクエリ保持 | OK | `rewrite ^/api/(.*) /$1 break;` — rewriteはクエリを自動保持 |
| フロントエンドプロキシ時のクエリ保持 | OK | `proxy_pass http://frontend;` — クエリは透過される |
| ランディングページ(/lp)のクエリ保持 | OK | 同上、rate limitのみ適用でクエリは透過 |

**補足**: Next.js App Router側でも`useSearchParams()`によりUTMパラメータを取得可能。フロントエンドでのGA4イベント送信やサーバーサイドでのトラッキングに支障なし。

---

## 3. SNS運用に関連するインフラセキュリティチェックリスト

### 3.1 OGPメタタグ配信のセキュリティ

| チェック項目 | 状態 | 備考 |
|-------------|------|------|
| OGPエンドポイントのrate limit | OK | `og_crawl` zone: 10r/s, burst=30 |
| OGP画像キャッシュ | OK | nginx proxy_cache 24h、max_size=500m |
| CSP設定でimg-srcにhttps:許可 | OK | `img-src 'self' data: blob: https:` |

### 3.2 既存セキュリティヘッダー（確認済み）

| ヘッダー | 設定値 | 状態 |
|----------|--------|------|
| HSTS | max-age=63072000; includeSubDomains; preload | OK |
| X-Content-Type-Options | nosniff | OK |
| X-Frame-Options | DENY | OK |
| Referrer-Policy | strict-origin-when-cross-origin | OK |
| CSP | 適切に設定済み | OK |
| Permissions-Policy | camera/mic/geo無効化 | OK |

### 3.3 SNS運用自動化ツール導入時の注意事項

スケジューラー（Buffer/SocialDog等）導入時に以下を遵守:

- X API キーは環境変数またはシークレットマネージャーで管理（`.env`ファイルへの直接記載禁止）
- API キーのスコープは最小権限（Read + Write のみ、DM権限不要）
- Webhook受信エンドポイントを追加する場合はnginx-prod.confにrate limitを設定
- CI/CDパイプラインでの自動投稿を実装する場合はGitHub Actions Secretsを使用

---

## 4. 推奨アクション優先度マトリクス

| 優先度 | アクション | 担当 | 期限 |
|--------|-----------|------|------|
| P0（即時） | Xアカウントパスワード変更＋2FA有効化 | CEO/Ops | 運用開始前 |
| P0（即時） | タスク指示から平文パスワード削除 | Planning | 即日 |
| P1（運用開始前） | シークレットマネージャー導入 | DevSecOps | 1週間以内 |
| P2（運用中） | API キー管理ポリシー策定 | DevSecOps | ツール導入時 |

---

## 5. 結論

**UTMパラメータのインフラ透過は問題なく機能しており、コード変更は不要。**

**最優先課題はXアカウントの認証情報セキュリティ。** パスワードの平文露出はCRITICALリスクであり、運用開始前に必ずパスワード変更・2FA有効化・シークレットマネージャー導入を実施すること。

既存のnginx設定・セキュリティヘッダーはSNS運用に必要な要件を満たしており、追加のインフラ変更は現時点では不要。
