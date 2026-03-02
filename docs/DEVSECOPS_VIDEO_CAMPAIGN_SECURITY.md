# DevSecOps: 動画キャンペーン セキュリティ・負荷耐性仕様

## 概要
YouTube Shorts / Instagram Reels の動画説明文に設置するアフィリエイトリンク・UTMパラメータ付きURLが外部公開されることに伴い、`/lp` エンドポイントへのトラフィック急増対策とパラメータインジェクション防止を実施する。

---

## 1. /lp エンドポイント負荷耐性

### 1.1 nginx rate limit 追加 (実装済み)

**ファイル**: `nginx-prod.conf`

```nginx
limit_req_zone $binary_remote_addr zone=lp_page:10m rate=20r/s;

location = /lp {
    limit_req zone=lp_page burst=40 nodelay;
    proxy_pass http://frontend;
    ...
}
```

| パラメータ | 値 | 理由 |
|---|---|---|
| rate | 20 r/s | 動画バズ時の正常トラフィック想定（1IP あたり） |
| burst | 40 | 短期スパイク吸収。40リクエスト分のバーストを許容 |
| zone size | 10m | 約160,000 IPアドレスを追跡可能 |

### 1.2 Docker コンテナリソース制限 (実装済み)

**ファイル**: `docker-compose.prod.yml`

| サービス | メモリ上限 | CPU上限 |
|---|---|---|
| db (PostgreSQL) | 1 GB | 2.0 |
| backend (NestJS) | 512 MB | 1.0 |
| frontend (Next.js) | 512 MB | 1.0 |
| nginx | 256 MB | 0.5 |

OOM killer によるカスケード障害を防止。

---

## 2. UTMパラメータ サニタイズ要件

### 2.1 現状分析

- `/lp` (LandingClient.tsx): UTM パラメータの取得・保存は**未実装**（NOTE_UTM_SPEC.md に計画あり）
- PostItem.tsx の共有ボタン: ハードコード値のみ使用（インジェクションリスクなし）

### 2.2 実装時のセキュリティ要件

UTM トラッキング実装時に以下を遵守すること:

#### フロントエンド（/lp クライアント側）

```typescript
// 許可する UTM パラメータのバリデーション
const UTM_VALIDATORS: Record<string, RegExp> = {
  utm_source:   /^[a-zA-Z0-9_-]{1,50}$/,
  utm_medium:   /^[a-zA-Z0-9_-]{1,50}$/,
  utm_campaign: /^[a-zA-Z0-9_-]{1,100}$/,
};

function sanitizeUtmParams(searchParams: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, validator] of Object.entries(UTM_VALIDATORS)) {
    const value = searchParams.get(key);
    if (value && validator.test(value)) {
      result[key] = value;
    }
  }
  return result;
}
```

- `utm_content`, `utm_term` は使用しない（攻撃面縮小）
- バリデーション不合格の値は無視（エラーを返さない）
- `localStorage` 保存時は JSON.stringify で安全にシリアライズ

#### バックエンド（POST /auth/register 受け取り側）

```typescript
// DTO バリデーション
@IsOptional()
@IsString()
@Matches(/^[a-zA-Z0-9_-]{1,50}$/)
utm_source?: string;

@IsOptional()
@IsString()
@Matches(/^[a-zA-Z0-9_-]{1,50}$/)
utm_medium?: string;

@IsOptional()
@IsString()
@Matches(/^[a-zA-Z0-9_-]{1,100}$/)
utm_campaign?: string;
```

- Prisma のパラメータ化クエリにより SQL インジェクションは防止済み
- UTM 値をページ上に**絶対にレンダリングしない**（Stored XSS 防止）
- ログ出力時も UTM 値をそのまま書き出さない

---

## 3. 動画説明文リンクのセキュリティ

### 3.1 推奨 URL フォーマット

```
https://pokersns.jp/lp?utm_source=youtube&utm_medium=video&utm_campaign=hand_review_001
https://pokersns.jp/lp?utm_source=instagram&utm_medium=video&utm_campaign=hand_review_001
```

### 3.2 リンク管理ポリシー

- UTM パラメータは**英数字・ハイフン・アンダースコアのみ**
- キャンペーン名の命名規則: `hand_review_{3桁連番}` または `{コンテンツ種別}_{識別子}`
- 短縮 URL サービス（bit.ly 等）は使用可。ただしリダイレクト先は必ず `pokersns.jp` ドメインであること

---

## 4. 監視・アラート

### 4.1 nginx ログ監視

`/lp` への 429 (Too Many Requests) レスポンス数を監視:

```bash
# 429 の発生頻度を確認（運用時）
grep "lp" /var/log/nginx/access.log | grep " 429 " | wc -l
```

rate limit の burst=40 を超えるリクエストが常態化した場合:
- burst 値の引き上げを検討（最大 100 まで）
- CDN (Cloudflare等) の導入を検討

### 4.2 コンテナリソース監視

```bash
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}"
```

メモリ使用率 80% 超が継続する場合はリミット値の引き上げを検討。

---

## 5. チェックリスト

| # | 項目 | ステータス |
|---|---|---|
| 1 | `/lp` nginx rate limit zone 追加 | 完了 |
| 2 | Docker コンテナリソース制限追加 | 完了 |
| 3 | UTM サニタイズ仕様策定 | 完了（本ドキュメント） |
| 4 | UTM フロントエンド実装 | 未着手（Dev チーム担当） |
| 5 | UTM バックエンド DTO バリデーション | 未着手（Dev チーム担当） |
| 6 | CDN 導入検討 | 必要に応じて |

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `nginx-prod.conf` | `lp_page` rate limit zone 追加、`location = /lp` ブロック追加 |
| `docker-compose.prod.yml` | 全サービスに `deploy.resources.limits` 追加 |
