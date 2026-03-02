# GA4 セットアップガイド — Poker SNS

**作成日**: 2026-03-02
**担当**: Planning (常闇)
**タスクID**: 2-3-1 前提作業

---

## 1. GA4 プロパティ作成手順

### Step 1: Google Analytics アカウント作成
1. https://analytics.google.com/ にアクセス
2. 「管理」→「アカウントを作成」
3. アカウント名: `Poker SNS`
4. データ共有設定: 全てON推奨

### Step 2: プロパティ作成
1. 「プロパティを作成」
2. プロパティ名: `Poker SNS - Production`
3. レポートのタイムゾーン: `日本 (GMT+09:00)`
4. 通貨: `日本円 (JPY)`

### Step 3: データストリーム追加
1. プラットフォーム: `ウェブ`
2. ウェブサイトのURL: `https://pokersns.jp` (本番ドメイン確定後)
3. ストリーム名: `Poker SNS Web`
4. 拡張計測: 全てON
   - ページビュー
   - スクロール
   - 離脱クリック
   - サイト内検索
   - 動画エンゲージメント
   - ファイルのダウンロード

### Step 4: 測定ID取得
- `G-XXXXXXXXXX` 形式の測定IDをコピー
- `.env` に `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` を追加

---

## 2. カスタムイベント定義 (GA4管理画面)

### カスタムディメンション登録

| ディメンション名 | スコープ | イベントパラメータ |
|---------------|--------|----------------|
| Login Method | イベント | `method` |
| Partner Slug | イベント | `partner_slug` |
| Share Platform | イベント | `platform` |
| Has Poker Hand | イベント | `has_poker_hand` |

### コンバージョン設定

以下のイベントをコンバージョンとしてマーク:
1. `sign_up` — 新規登録
2. `subscription_checkout` — 課金開始
3. `affiliate_click` — アフィリエイトクリック

---

## 3. 環境変数

```env
# .env.example に追加
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**注意**:
- 開発環境では空文字 or 未設定で計測スキップ
- `analytics.ts` ユーティリティで `typeof window !== 'undefined' && window.gtag` チェック

---

## 4. Looker Studio ダッシュボード設計

### レポート構成

**ページ1: Overview**
- スコアカード: DAU / WAU / MAU / 新規登録数
- 折れ線: 日次アクティブユーザー推移 (30日)
- 円グラフ: 登録方法別 (email / Google / LINE / X)

**ページ2: Engagement**
- 棒グラフ: 投稿数 / いいね数 / リポスト数 (日次)
- テーブル: ハッシュタグ別投稿数 Top 20
- 折れ線: シェア数推移 (プラットフォーム別)

**ページ3: Revenue**
- スコアカード: 課金転換率 / MRR
- ファネル: LP→登録→初投稿→課金
- テーブル: アフィリエイトクリック数 (パートナー別)

**ページ4: Acquisition**
- テーブル: UTMソース別セッション数
- 地図: 地域別ユーザー分布
- 折れ線: 検索流入推移

---

## 5. チェックリスト

- [ ] GA4 プロパティ作成
- [ ] 測定ID取得 → Development に共有
- [ ] カスタムディメンション登録 (4件)
- [ ] コンバージョン設定 (3件)
- [ ] DebugView でテストイベント確認
- [ ] Looker Studio データソース接続
- [ ] ダッシュボード初版作成
