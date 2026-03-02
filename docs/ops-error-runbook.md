# エラー発生時の運用ランブック（エラー種別ごとの次アクション判定表）

> Operations成果物 | 作成: 2026-03-02 | 担当: 白上 (Operations)

## 1. 概要

本ドキュメントは、Poker SNSサービスにおいて発生しうるエラーを種別ごとに分類し、検知方法・初動対応・エスカレーション条件・復旧手順を一覧化したものである。エラー発生時に「止まらず次のアクションへ進む」ための判定表として使用する。

---

## 2. エラー種別 判定フローチャート

```
エラー検知
  |
  +-- インフラ系？ → セクション3へ
  |     +-- コンテナ停止
  |     +-- DB接続不可
  |     +-- ディスク逼迫
  |     +-- SSL証明書期限
  |
  +-- アプリケーション系？ → セクション4へ
  |     +-- API 5xx エラー
  |     +-- 認証エラー急増
  |     +-- Prisma/DBエラー
  |
  +-- 外部サービス系？ → セクション5へ
  |     +-- Stripe連携エラー
  |     +-- OAuth連携エラー
  |     +-- Discord Webhook失敗
  |
  +-- セキュリティ系？ → セクション6へ
        +-- Rate limit超過急増
        +-- 不審なアクセスパターン
        +-- Helmet/CSPヘッダー異常
```

---

## 3. インフラ系エラー

### 3.1 コンテナ停止（backend / frontend / nginx）

| 項目 | 内容 |
|------|------|
| **検知方法** | healthcheck.sh → `docker compose ps` でState != running |
| **初回レベル** | L2 HIGH |
| **影響範囲** | サービス全体または一部機能停止 |

**次アクション判定表:**

| 状況 | アクション | コマンド |
|------|-----------|---------|
| 単一コンテナ停止 | 該当コンテナ再起動 | `docker compose restart {service}` |
| 再起動後も停止 | ログ確認 → イメージ再ビルド | `docker compose logs --tail=100 {service}` → `docker compose build --no-cache {service} && docker compose up -d {service}` |
| 再ビルドでも解消しない | 前回正常コミットへロールバック | `git log --oneline -5` → `git checkout {hash}` → 再ビルド |
| 全コンテナ停止 | ホストOS確認 → 全体再起動 | `docker compose down && docker compose up -d` |

### 3.2 DB接続不可

| 項目 | 内容 |
|------|------|
| **検知方法** | healthcheck.sh → `pg_isready` 失敗 or /health API内SELECT 1失敗 |
| **初回レベル** | L3 CRITICAL |
| **影響範囲** | 全API機能停止、データ書込不可 |

**次アクション判定表:**

| 状況 | アクション | コマンド |
|------|-----------|---------|
| pg_isready失敗 | DBコンテナ再起動 | `docker compose restart db` |
| 再起動後も接続不可 | DBログ確認（shared memory不足等） | `docker compose logs --tail=100 db` |
| OOM kill検知 | リソース制限緩和 → 再起動 | docker-compose.prod.yml の mem_limit 調整 |
| データ破損の兆候 | バックアップからリストア | `docs/ops-deploy-runbook.md` セクション3.2参照 |
| ディスク使用率100% | 緊急ディスク解放 → DB再起動 | セクション3.3参照 → `docker compose restart db` |

### 3.3 ディスク容量逼迫

| 項目 | 内容 |
|------|------|
| **検知方法** | healthcheck.sh → df使用率チェック |
| **初回レベル** | 80%: L1 WARNING / 90%: L2 HIGH / 95%: L3 CRITICAL |
| **影響範囲** | ログ書込停止 → DB書込停止 → サービス停止 |

**次アクション判定表（優先度順）:**

| 順位 | アクション | 解放見込 | コマンド |
|------|-----------|---------|---------|
| 1 | Dockerビルドキャッシュ削除 | 数GB | `docker builder prune -f` |
| 2 | 未使用イメージ削除 | 数GB | `docker image prune -f` |
| 3 | 古いnginxログ削除 | 数百MB | `find /var/log/nginx/ -name "*.gz" -mtime +7 -delete` |
| 4 | 古いバックアップ削除 | 数GB | `find /opt/poker-sns/backups/ -mtime +7 -delete`（直近3世代は保持） |
| 5 | OGP画像クリーンアップ | 可変 | `find uploads/ogp/ -atime +3 -delete` |

### 3.4 SSL証明書期限切れ間近

| 項目 | 内容 |
|------|------|
| **検知方法** | healthcheck.sh → openssl証明書期限チェック |
| **初回レベル** | 14日未満: L1 / 3日未満: L3 |

**次アクション:**

```bash
# certbot更新実行
docker compose run --rm certbot renew
# nginx再読込
docker compose exec -T nginx nginx -s reload
# 更新確認
openssl x509 -enddate -noout -in /etc/letsencrypt/live/DOMAIN/fullchain.pem
```

---

## 4. アプリケーション系エラー

### 4.1 API 5xxエラー急増

| 項目 | 内容 |
|------|------|
| **検知方法** | nginxアクセスログの5xxカウント / バックエンドログ |
| **初回レベル** | 単発: L0 / 5分で10件超: L2 |

**次アクション判定表:**

| パターン | 原因推定 | アクション |
|---------|---------|-----------|
| 全エンドポイントで5xx | バックエンドプロセス異常 | `docker compose restart backend` |
| 特定エンドポイントのみ | コード不具合（最新デプロイが原因） | ロールバック検討 |
| DB関連エラーログあり | DB接続プール枯渇 or DB停止 | セクション3.2参照 |
| メモリ不足ログあり | OOM → リソース制限調整 | docker-compose.prod.yml の mem_limit 増加 |

### 4.2 認証エラー急増（401/403）

| 項目 | 内容 |
|------|------|
| **検知方法** | nginxログ or アプリログの401/403カウント |
| **初回レベル** | 5分で50件超: L1 / 5分で200件超: L2 |

**次アクション判定表:**

| パターン | 原因推定 | アクション |
|---------|---------|-----------|
| 全ユーザーで401 | JWT秘密鍵の不一致（デプロイ時.env変更） | .env の JWT_SECRET 確認 → バックエンド再起動 |
| 特定IPから大量403 | ブルートフォース攻撃 | Rate limit確認 → 必要時IP ban |
| リフレッシュトークン失敗急増 | トークンローテーション不具合 | バックエンドログ確認 → 必要時ロールバック |

### 4.3 Prisma / DBクエリエラー

| 項目 | 内容 |
|------|------|
| **検知方法** | バックエンドログの PrismaClientKnownRequestError 等 |
| **初回レベル** | 単発: L0 / 連続: L1 / 全クエリ失敗: L3 |

**次アクション判定表:**

| エラーコード | 原因 | アクション |
|-------------|------|-----------|
| P2002 | ユニーク制約違反 | アプリロジック確認（通常は正常な重複リクエスト） |
| P2025 | レコード不存在 | 404として正常処理されていれば問題なし |
| P1001 | DB接続不可 | セクション3.2へ |
| P1008 | クエリタイムアウト | スロークエリ調査 → インデックス追加検討 |
| P1017 | 接続クローズ済み | 接続プール設定確認 → バックエンド再起動 |

---

## 5. 外部サービス系エラー

### 5.1 Stripe連携エラー

| 項目 | 内容 |
|------|------|
| **検知方法** | バックエンドログ / Stripe Dashboard |
| **初回レベル** | Webhook署名失敗: L2 / 決済失敗率>5%: L3 |
| **影響範囲** | 課金・サブスクリプション処理（売上直接影響） |

**次アクション判定表:**

| エラー | 原因推定 | アクション |
|--------|---------|-----------|
| Webhook 400 (署名失敗) | STRIPE_WEBHOOK_SECRET 不一致 | .env確認 → Stripe Dashboard でエンドポイント再設定 |
| card_declined 急増 | ユーザー側の問題（正常動作） | モニタリングのみ |
| API接続タイムアウト | Stripe側障害 | [status.stripe.com](https://status.stripe.com) 確認 → 待機 |
| rate_limit | API呼び出し過多 | バックエンドのリトライロジック確認 |

### 5.2 OAuth連携エラー（Google/X）

| 項目 | 内容 |
|------|------|
| **検知方法** | バックエンドログ / OAuth callbackエラー |
| **初回レベル** | L1 WARNING |

**次アクション判定表:**

| エラー | 原因推定 | アクション |
|--------|---------|-----------|
| redirect_uri_mismatch | 環境変数 or OAuth設定のURL不一致 | .env の CALLBACK_URL 確認 → 各プロバイダDashboard確認 |
| invalid_client | Client ID/Secret不正 | .envの認証情報確認 |
| access_denied | ユーザーが権限拒否 | 正常動作（ログ記録のみ） |

### 5.3 Discord Webhook送信失敗

| 項目 | 内容 |
|------|------|
| **検知方法** | health-check.sh内のnotify_discord関数の失敗 |
| **初回レベル** | L1 WARNING |

**次アクション:**
1. DISCORD_WEBHOOK_URL環境変数の確認
2. Discord API ステータス確認
3. Webhook URLの再生成（Discord Server Settings → Integrations）
4. フォールバック: メール通知に切替

---

## 6. セキュリティ系エラー

### 6.1 Rate Limit超過急増

| 項目 | 内容 |
|------|------|
| **検知方法** | nginxログの429レスポンス件数 |
| **初回レベル** | 通常変動: L0 / 急増(10倍超): L2 |

**次アクション判定表:**

| パターン | 原因推定 | アクション |
|---------|---------|-----------|
| 特定IPから集中 | Bot/攻撃 | UFWでIP ban: `ufw deny from {IP}` |
| 全体的に増加 | 正常トラフィック増 | rate limit閾値の調整検討 |
| auth系エンドポイント集中 | ブルートフォース | 追加のrate limit or CAPTCHA検討 |

### 6.2 不審なアクセスパターン

| 項目 | 内容 |
|------|------|
| **検知方法** | security-scan.sh (15分間隔) |
| **初回レベル** | L2 HIGH |

**次アクション:**
1. 該当IPのアクセスログ抽出: `grep {IP} /var/log/nginx/access.log`
2. GeoIP確認、正規ユーザーか判定
3. 必要時UFWでブロック
4. パターンが持続する場合はfail2ban設定追加を検討

---

## 7. エラー発生時の共通フロー

```
1. [検知] healthcheck.sh / security-scan.sh / 手動発見
      |
2. [記録] /var/log/poker-sns/ にログ出力
      |
3. [レベル判定] ops-escalation-rules.md に基づきレベル決定
      |
4. [通知] レベルに応じた通知チャンネルへ送信
      |
5. [初動] 本ランブックの該当セクションに従い即時対応
      |
6. [確認] 対応後、ヘルスチェックで復旧確認
      |  +-- 復旧 → 復旧通知 + インシデント記録
      |  +-- 未復旧 → 次のアクションへ進む（ランブック内で次の手順）
      |
7. [振返り] 30分以上のインシデントは事後レビューを実施
```

---

## 8. インシデント記録テンプレート

インシデント発生時は以下の形式で `/var/log/poker-sns/incidents/` に記録:

```
ファイル名: incident-YYYYMMDD-HHMMSS.md

# インシデント記録
- 発生日時: YYYY-MM-DD HH:MM:SS
- 検知方法: [自動/手動]
- エラー種別: [セクション番号]
- 影響範囲: [全体/一部/なし]
- 最高エスカレーションレベル: [L0-L3]
- 復旧日時: YYYY-MM-DD HH:MM:SS
- ダウンタイム: [XX分]
- 原因: [根本原因の記述]
- 対応内容: [実施した手順]
- 再発防止策: [今後の対策]
```

---

## 9. 定期レビュー

| 頻度 | 内容 |
|------|------|
| 週次 | インシデント件数・種別の集計レビュー |
| 月次 | ランブック内容の見直し・更新 |
| 四半期 | エスカレーションルールの閾値妥当性検証 |
