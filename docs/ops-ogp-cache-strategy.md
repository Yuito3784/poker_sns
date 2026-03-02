# OGP画像キャッシュ戦略・運用設計書

## 1. 現状分析

### 現在のアップロード構成
| 項目 | 値 |
|------|------|
| 保存先 | Docker named volume `uploads` → コンテナ内 `/app/uploads` |
| サブディレクトリ | `avatars/`, `posts/` |
| ファイル名 | UUID + 元拡張子（衝突なし） |
| 最大サイズ | 5MB/ファイル |
| 許可MIME | jpeg, png, webp, gif |
| 配信パス | `/uploads/*` → nginx proxy → backend static assets |
| ブラウザキャッシュ | `Cache-Control: public, max-age=2592000` (30日) |

### OGP画像の追加要件
動的OGP画像（投稿シェア時に自動生成される1200x630pxのカード画像）を導入する場合、以下が新規に必要。

---

## 2. OGP画像の保存先設計

### 推奨構成: ローカルディスク + nginx直接配信

```
/app/uploads/
├── avatars/          # 既存
├── posts/            # 既存
└── ogp/              # 新規: OGP画像キャッシュ
    ├── post-{postId}.png
    └── user-{userId}.png
```

**理由:**
- 現段階ではCDNは過剰（月間ユーザー数が数万規模になるまで不要）
- Docker named volumeの既存運用に合わせることで複雑度を抑える
- nginx直接配信に切り替えることで、backendプロセスの負荷を回避可能

### nginx設定変更案

```nginx
# OGP画像は長期キャッシュ + 直接配信
location /uploads/ogp/ {
    alias /app/uploads/ogp/;
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable";
    add_header X-Content-Type-Options "nosniff";
    try_files $uri =404;
}
```

**キャッシュTTL: 7日**（投稿内容更新時にファイルを再生成するため30日は長すぎる）

---

## 3. キャッシュ戦略

### 3.1 生成タイミング
| トリガー | 処理 |
|---------|------|
| 投稿作成時 | 非同期でOGP画像を生成し `/uploads/ogp/post-{id}.png` に保存 |
| 投稿編集時 | 既存OGP画像を上書き再生成 |
| ユーザー名/アバター変更時 | そのユーザーのOGP画像を一括再生成（バッチ）は **しない**。次回シェア時のlazy再生成を推奨 |
| OGPエンドポイント直接アクセス時 | ファイルが存在しなければ生成→保存→配信（lazy generation） |

### 3.2 キャッシュ無効化
- ファイルベースなので、再生成=上書きで自動無効化
- CDN導入時は `?v={timestamp}` クエリパラメータ方式でパージ

### 3.3 レイヤー別キャッシュ設定
| レイヤー | TTL | 備考 |
|---------|-----|------|
| ディスク（生成済みファイル） | 無期限（上書きで更新） | ガベージコレクション別途 |
| nginx | 7日 | `Cache-Control: public, max-age=604800` |
| ブラウザ | 7日 | 上記ヘッダーに従う |
| SNSプラットフォーム | 各社仕様 | Twitter: ~7日、Facebook: 手動パージ可 |

---

## 4. Rate Limiting（DoS対策）

OGP画像の動的生成エンドポイントは重い処理のため、専用のrate limitが必要。

### 推奨設定
```typescript
// posts.controller.ts - OGP画像生成エンドポイント
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min per IP
@Get(':id/ogp-image')
```

### 補足対策
- 生成済みファイルが存在する場合はnginxが直接返す（backendに到達しない）
- 未生成の場合のみbackendで生成 → 2回目以降はnginx配信
- 画像サイズ固定（1200x630px PNG）で出力を予測可能に

---

## 5. ディスク容量監視

### 想定ストレージ使用量
| カテゴリ | 1枚あたり | 10万枚時 |
|---------|----------|---------|
| アバター | ~200KB | ~20GB |
| 投稿画像 | ~500KB | ~50GB |
| OGP画像 | ~150KB (1200x630 PNG) | ~15GB |

### 監視スクリプト

```bash
#!/bin/bash
# /opt/poker-sns/scripts/check-disk-usage.sh
THRESHOLD_PERCENT=80
UPLOAD_DIR="/var/lib/docker/volumes/poker_sns_uploads/_data"

USAGE=$(df "$UPLOAD_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$USAGE" -ge "$THRESHOLD_PERCENT" ]; then
  echo "[ALERT] Disk usage at ${USAGE}% for uploads volume" | \
    mail -s "Poker SNS: Disk Alert" ops@example.com
fi

# 各ディレクトリの使用量レポート
echo "=== Upload Directory Usage ==="
du -sh "$UPLOAD_DIR"/avatars/ 2>/dev/null || echo "avatars: N/A"
du -sh "$UPLOAD_DIR"/posts/   2>/dev/null || echo "posts: N/A"
du -sh "$UPLOAD_DIR"/ogp/     2>/dev/null || echo "ogp: N/A"
echo "Total:"
du -sh "$UPLOAD_DIR"/
```

### cron設定
```
# 毎日9:00にディスク使用量チェック
0 9 * * * /opt/poker-sns/scripts/check-disk-usage.sh >> /var/log/poker-sns/disk-check.log 2>&1
```

---

## 6. OGP画像ガベージコレクション

削除された投稿のOGP画像を定期的にクリーンアップ。

```bash
#!/bin/bash
# /opt/poker-sns/scripts/cleanup-ogp.sh
# 30日以上アクセスされていないOGP画像を削除
find /var/lib/docker/volumes/poker_sns_uploads/_data/ogp/ \
  -type f -atime +30 -delete

echo "[$(date)] OGP cleanup completed" >> /var/log/poker-sns/ogp-cleanup.log
```

### cron設定
```
# 毎週日曜 3:00にOGPクリーンアップ
0 3 * * 0 /opt/poker-sns/scripts/cleanup-ogp.sh
```

---

## 7. CDNへの移行判断基準

以下の **いずれか** に該当したらCDN（CloudFront or Cloudflare）導入を検討:

| 指標 | 閾値 |
|------|------|
| 月間ユニークユーザー | > 50,000 |
| /uploads/ への月間リクエスト数 | > 500,000 |
| サーバーの帯域使用量 | > 500GB/月 |
| 海外ユーザー比率 | > 20% |

### CDN移行時の変更点
1. nginx `/uploads/` → CDNオリジンに変更
2. OGP画像URLを `https://cdn.pokersns.com/ogp/...` に変更
3. `Cache-Control` に `s-maxage` を追加してCDNキャッシュを分離管理
4. フロントエンドの `metadataBase` をCDNドメインに更新

---

## 8. バックアップ運用

### uploads ボリュームのバックアップ
```bash
#!/bin/bash
# /opt/poker-sns/scripts/backup-uploads.sh
BACKUP_DIR="/opt/poker-sns/backups"
DATE=$(date +%Y%m%d)

docker run --rm \
  -v poker_sns_uploads:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/uploads-${DATE}.tar.gz" -C /data .

# 30日以上前のバックアップを削除
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +30 -delete

echo "[$(date)] Backup completed: uploads-${DATE}.tar.gz" >> /var/log/poker-sns/backup.log
```

### cron設定
```
# 毎日 4:00 にバックアップ
0 4 * * * /opt/poker-sns/scripts/backup-uploads.sh
```
