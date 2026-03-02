# 効果測定・アクセス追跡 運用設計書

## 1. 概要

シェア機能導入後の効果を定量的に測定するため、以下の3つの軸で追跡を行う:
1. **UTMパラメータによるリファラー追跡**（外部SNSからの流入）
2. **シェアボタンクリック数の計測**（アプリ内イベント）
3. **nginxアクセスログからの集計**（インフラレベル）

---

## 2. UTMパラメータ設計

### 2.1 シェアURL生成ルール

シェアボタンから生成されるURLに以下のUTMパラメータを付与:

```
https://pokersns.com/post/{id}?utm_source={platform}&utm_medium=social&utm_campaign=share
```

| パラメータ | 値 | 説明 |
|-----------|------|------|
| `utm_source` | `twitter`, `line`, `copy` | シェア先プラットフォーム |
| `utm_medium` | `social` | 固定値（SNSシェア） |
| `utm_campaign` | `share` | シェアボタン経由であることを示す |

### 2.2 フロントエンド実装時の注意点（Devチーム向け）

```typescript
// シェアURL生成の例
function buildShareUrl(postId: string, platform: string): string {
  const base = `${SITE_URL}/post/${postId}`;
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: 'social',
    utm_campaign: 'share',
  });
  return `${base}?${params.toString()}`;
}
```

- UTMパラメータはフロントエンドのみで付与（バックエンドAPIに影響しない）
- `utm_content` は将来的にA/Bテスト時に追加可能（現段階では不要）

---

## 3. nginxアクセスログ設定

### 3.1 ログフォーマット拡張

現在のnginx設定にはカスタムログフォーマットが未設定。UTM追跡のためにログフォーマットを拡張する。

```nginx
# nginx.conf / nginx-prod.conf に追加
log_format analytics '$remote_addr - $remote_user [$time_local] '
                     '"$request" $status $body_bytes_sent '
                     '"$http_referer" "$http_user_agent" '
                     '"$arg_utm_source" "$arg_utm_medium" "$arg_utm_campaign"';

access_log /var/log/nginx/access.log analytics;
```

### 3.2 UTMパラメータ別の集計スクリプト

```bash
#!/bin/bash
# /opt/poker-sns/scripts/utm-report.sh
# 日次UTM流入レポート

LOG_FILE="/var/log/nginx/access.log"
REPORT_DATE=${1:-$(date -d yesterday +%d/%b/%Y)}

echo "=== UTM Flow Report: $REPORT_DATE ==="
echo ""

echo "--- By Source ---"
grep "$REPORT_DATE" "$LOG_FILE" | \
  awk -F'"' '{print $8}' | \
  grep -v '^-$' | \
  sort | uniq -c | sort -rn | head -20

echo ""
echo "--- By Campaign ---"
grep "$REPORT_DATE" "$LOG_FILE" | \
  awk -F'"' '{print $10}' | \
  grep -v '^-$' | \
  sort | uniq -c | sort -rn | head -20

echo ""
echo "--- Share Referrers (Top 20) ---"
grep "$REPORT_DATE" "$LOG_FILE" | \
  grep "utm_source" | \
  awk -F'"' '{print $6}' | \
  sort | uniq -c | sort -rn | head -20
```

### cron設定
```
# 毎日 6:00 にUTMレポート生成
0 6 * * * /opt/poker-sns/scripts/utm-report.sh >> /var/log/poker-sns/utm-report.log 2>&1
```

---

## 4. シェアボタンクリック追跡

### 4.1 方式: バックエンドAPIイベントログ

シェアボタンクリック時にフロントエンドから軽量なAPIコールを送信し、バックエンドでログに記録する。

### 4.2 エンドポイント設計（Devチーム向け仕様）

```
POST /api/analytics/share-event
Content-Type: application/json

{
  "postId": "xxx",
  "platform": "twitter" | "line" | "copy",
  "timestamp": "2026-03-02T12:00:00Z"
}
```

- 認証不要（匿名シェアも追跡するため）
- Rate limit: 30 req/min per IP（abuse防止）
- レスポンス: `204 No Content`（ファイアアンドフォーゲット）

### 4.3 ログ保存先

Phase 1（MVP）: ファイルベースログ
```
/var/log/poker-sns/share-events.jsonl
```

各行がJSON:
```json
{"postId":"abc123","platform":"twitter","ip":"xxx.xxx.xxx.xxx","timestamp":"2026-03-02T12:00:00Z"}
```

Phase 2（スケール時）: PostgreSQLテーブルに移行
```sql
CREATE TABLE share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  platform VARCHAR(20) NOT NULL,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_events_created ON share_events(created_at);
CREATE INDEX idx_share_events_platform ON share_events(platform);
```

### 4.4 集計スクリプト

```bash
#!/bin/bash
# /opt/poker-sns/scripts/share-event-report.sh
LOG_FILE="/var/log/poker-sns/share-events.jsonl"
DATE=${1:-$(date -d yesterday +%Y-%m-%d)}

echo "=== Share Event Report: $DATE ==="

echo "--- By Platform ---"
grep "$DATE" "$LOG_FILE" | \
  jq -r '.platform' | \
  sort | uniq -c | sort -rn

echo ""
echo "--- Top Shared Posts ---"
grep "$DATE" "$LOG_FILE" | \
  jq -r '.postId' | \
  sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Total Share Events ---"
grep -c "$DATE" "$LOG_FILE"
```

---

## 5. KPI定義とダッシュボード

### 5.1 追跡すべきKPI

| KPI | 定義 | 目標（初月） |
|-----|------|-------------|
| シェア率 | シェアクリック数 / 投稿閲覧数 | > 2% |
| SNS流入数 | utm_source付きのユニークセッション数 | > 500/月 |
| シェア経由登録率 | utm付きアクセスからの新規登録数 / utm付きアクセス数 | > 5% |
| プラットフォーム別シェア数 | 各SNSへのシェアクリック数 | Twitter > 50% |
| OGP表示成功率 | SNSデバッガーでのエラー率 | > 95% |

### 5.2 週次レポートテンプレート

```
📊 Poker SNS Weekly Share Report (YYYY/MM/DD - YYYY/MM/DD)

1. シェアボタンクリック数
   - Twitter/X: XXX
   - LINE:      XXX
   - コピー:     XXX
   - 合計:       XXX

2. SNS経由流入数
   - Twitter/X: XXX (前週比 +XX%)
   - LINE:      XXX (前週比 +XX%)
   - Direct:    XXX
   - 合計:       XXX

3. シェア経由新規登録数: XXX (CVR: X.X%)

4. 最もシェアされた投稿 Top 5:
   1. [post-id] XXXシェア
   ...

5. 改善提案:
   - ...
```

---

## 6. 将来のアナリティクス拡張ロードマップ

| フェーズ | 内容 | トリガー条件 |
|---------|------|-------------|
| Phase 1 (現在) | nginxログ + ファイルベースイベントログ | 即時実装可能 |
| Phase 2 | PostgreSQLイベントテーブル + 管理画面ダッシュボード | 月間シェア数 > 1,000 |
| Phase 3 | Google Analytics 4 or Plausible導入 | 月間UU > 10,000 |
| Phase 4 | Mixpanel等の行動分析ツール | 有料サブスク100人超 |

---

## 7. セキュリティ考慮事項（DevSecOpsチーム連携）

- UTMパラメータはフロントエンド表示に**使用しない**（XSSリスク回避）
- シェアイベントAPIのIPアドレスログは30日で自動削除（GDPR/個人情報配慮）
- アクセスログのローテーション: logrotateで14日保持 + 圧縮アーカイブ90日
- CSPヘッダーにシェア先ドメインの追加は**不要**（シェアはリンク遷移であり、CSP対象外）
