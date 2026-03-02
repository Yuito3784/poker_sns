# note記事 UTMパラメータ仕様書

**作成日**: 2026-03-02
**対象**: Dev チーム（フロントエンド `/lp` ルートでのトラッキング実装用）

---

## 1. UTMパラメータ体系

### 1.1 パラメータ定義

| パラメータ | 値 | 説明 |
|-----------|------|------|
| `utm_source` | `note` | 流入元プラットフォーム（固定） |
| `utm_medium` | `article` | メディア種別（固定） |
| `utm_campaign` | `article_{記事No.}` | 記事ごとの識別子 |

### 1.2 各記事のUTM値

| 記事No. | utm_campaign 値 | 完全URL例 |
|---------|----------------|-----------|
| #001 | `article_001` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_001` |
| #002 | `article_002` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_002` |
| #003 | `article_003` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_003` |
| #004 | `article_004` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_004` |
| #005 | `article_005` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_005` |
| #006 | `article_006` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_006` |
| #007 | `article_007` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_007` |
| #008 | `article_008` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_008` |
| #009 | `article_009` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_009` |
| #010 | `article_010` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_010` |
| STOCK-01 | `article_stock01` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_stock01` |
| STOCK-02 | `article_stock02` | `https://poker-sns.com/lp?utm_source=note&utm_medium=article&utm_campaign=article_stock02` |

---

## 2. フロントエンド実装仕様（Dev向け）

### 2.1 UTM取得・保存フロー

```
ユーザーが /lp?utm_source=note&utm_medium=article&utm_campaign=article_001 にアクセス
  ↓
フロントエンド: URLSearchParams から utm_source, utm_medium, utm_campaign を取得
  ↓
localStorage に保存:
  key: "utm_data"
  value: { utm_source: "note", utm_medium: "article", utm_campaign: "article_001", timestamp: "2026-03-05T..." }
  ↓
ユーザーが会員登録フォームを送信
  ↓
POST /auth/register リクエストボディに utm_source, utm_medium, utm_campaign を追加
  ↓
バックエンド: users テーブルに保存
```

### 2.2 バックエンド DB 変更

Prisma schema の User モデルに以下カラムを追加:

```
utmSource     String?   @map("utm_source")
utmMedium     String?   @map("utm_medium")
utmCampaign   String?   @map("utm_campaign")
```

### 2.3 登録API変更

`POST /auth/register` の request body に以下オプショナルフィールドを追加:

```
{
  ...既存フィールド,
  "utmSource": "note",
  "utmMedium": "article",
  "utmCampaign": "article_001"
}
```

---

## 3. 計測・レポート

### 3.1 計測対象

| 指標 | 計測方法 | 目標 |
|------|---------|------|
| CTA クリック数 | note 記事内リンクのクリック数（note Analytics） | 10+ / 記事 |
| LP 到達数 | `/lp` へのアクセス数（utm_source=note でフィルタ） | クリック数の 90%+ |
| 登録コンバージョン | users テーブルの utm_source="note" レコード数 | 月 30+ |
| 記事別コンバージョン | utm_campaign 別の登録数 | 記事ごとの効果比較 |

### 3.2 月次レポート集計SQL例

```sql
-- note経由の新規登録数（月次）
SELECT utm_campaign, COUNT(*) as registrations
FROM users
WHERE utm_source = 'note'
  AND created_at >= '2026-03-01'
  AND created_at < '2026-04-01'
GROUP BY utm_campaign
ORDER BY registrations DESC;
```

---

## 4. 注意事項

- UTM パラメータは localStorage に保存し、72 時間（3日間）の有効期限を設ける
- 既に utm_data が保存されている場合は上書きする（最新の流入元を優先）
- utm_campaign の命名規則 `article_{No.}` は厳守（集計時のフィルタに使用）
- テスト環境では `utm_source=note_test` を使い、本番データと混在させない
