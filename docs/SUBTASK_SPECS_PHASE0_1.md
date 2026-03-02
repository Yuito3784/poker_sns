# Phase 0-1 サブタスク仕様書
## 各部門への具体的タスク指示

**作成日**: 2026-03-02
**参照**: REVENUE_1M_EXECUTION_ROADMAP.md

---

## DevSecOps (獅白) — Phase 0: 本番デプロイ

### ST-001: VPS選定・契約・初期設定

**目的**: 本番稼働用サーバーの確保

**推奨候補** (比較済み):

| VPS | プラン | CPU | RAM | SSD | 月額 | 備考 |
|-----|-------|-----|-----|-----|------|------|
| ConoHa VPS | 4GBプラン | 4コア | 4GB | 100GB | ¥3,091 | API操作可、国内DC |
| さくらVPS | 4GBプラン | 4コア | 4GB | 200GB | ¥3,520 | 安定、老舗 |
| Vultr | 4GB Cloud | 2コア | 4GB | 80GB | $24≈¥3,600 | グローバル |

**選定基準**: Docker対応 + 国内DC + 月額¥4,000以下

**完了後の成果物**:
- サーバーIP
- SSH接続情報 (鍵認証)
- 初期OS設定済み (Ubuntu 22.04 LTS推奨)

---

### ST-002: 本番デプロイ実行

**手順**: `docs/ops-deploy-runbook.md` に従う

**チェックリスト**:
```
[ ] git clone + .env設定
[ ] docker compose build (backend, frontend)
[ ] docker compose up -d
[ ] prisma db push
[ ] nginx + SSL (certbot)
[ ] SSL自動更新cron: 0 0 1 * * certbot renew --webroot ...
[ ] DBバックアップcron: 0 3 * * * pg_dump ...
[ ] uploadsバックアップcron: 0 4 * * 0 tar czf ...
```

**セキュリティチェック** (既に報告済みの項目確認):
```
[ ] PostgreSQL port 5432 外部非公開
[ ] Helmet (CSP, HSTS, frameguard, noSniff) 有効
[ ] nginx-prod.conf セキュリティヘッダー設定済み
[ ] .env にハードコード秘密値なし
[ ] CORS_ORIGINS に本番ドメインのみ
```

---

## Development (桃鈴) — Phase 1: OGP/SEO + 課金UI

### ST-003: OGP完全対応

**参照仕様**: `docs/MARKETING_IMPLEMENTATION_SPEC.md` Phase 1

**実装ファイル一覧**:

1. **`frontend/src/app/profile/[username]/page.tsx`**
   - `generateMetadata()` 追加
   - `/users/:username` API からデータ取得
   - og:type = "profile"

2. **`frontend/src/app/hashtag/[tag]/page.tsx`**
   - `generateMetadata()` 追加
   - タグ名デコードしてtitle/descriptionに使用

3. **`frontend/src/app/lp/page.tsx`**
   - 静的 `metadata` export
   - LP専用OG画像参照

4. **`frontend/src/app/explore/page.tsx`**
   - 静的 `metadata` export

5. **`frontend/src/app/partners/page.tsx`**
   - 静的 `metadata` export

**テスト方法**:
```bash
# OGPメタタグ確認
curl -s https://domain/profile/testuser | grep -E 'og:|twitter:'
curl -s https://domain/hashtag/poker | grep -E 'og:|twitter:'
```

### ST-004: 動的sitemap

**ファイル**: `frontend/src/app/sitemap.ts`

**現状**: 5静的ルートのみ
**目標**: 全投稿 + 全ユーザー + 全ハッシュタグの動的URL

**バックエンドAPI追加** (必要な場合):
- `GET /posts/sitemap` — 全投稿ID + updatedAt
- `GET /users/sitemap` — 全ユーザーname + updatedAt

### ST-005: 課金導線UI

1. **プレミアム訴求ページ** (`/premium` 新規ルート)
   - プレミアム特典一覧 (文字数拡張、広告非表示、バッジ、AI分析)
   - 料金表示: ¥980/月
   - CTA: ゴールドボタン `#c9a84c` × ダークテキスト `#0d1009`
   - Stripe Checkout へのリダイレクト

2. **280文字CTA**
   - 投稿フォームで280文字超入力時に表示
   - 「プレミアムなら1,000文字まで投稿可能」メッセージ
   - `/premium` へのリンク

3. **LP→登録→課金リダイレクト**
   - `?from=lp` パラメータをcookieに保存
   - 登録完了後、cookie確認して `/premium` にリダイレクト

---

## Design (宝鐘) — Phase 1: OG画像 + 課金UI

### ST-006: OG画像テンプレート (3種)

**サイズ**: 1200 x 630px (OGP標準)

**共通要素**:
- 背景: `#0d1009` (ブランドカラー)
- ロゴ: 左上 or 下部中央
- フォント: Noto Sans JP (日本語対応)

**投稿用テンプレート**:
```
┌─────────────────────────────────────┐
│  [アバター] ユーザー名              │
│                                     │
│  投稿本文 (2-3行, 最大100文字)      │
│                                     │
│  #hashtag1 #hashtag2                │
│                                     │
│          ── Poker SNS ──            │
└─────────────────────────────────────┘
```

**プロフィール用テンプレート**:
```
┌─────────────────────────────────────┐
│        [大きいアバター]             │
│        ユーザー名                   │
│        @username                    │
│                                     │
│   投稿 123  フォロワー 456          │
│                                     │
│          ── Poker SNS ──            │
└─────────────────────────────────────┘
```

**ハッシュタグ用テンプレート**:
```
┌─────────────────────────────────────┐
│                                     │
│          #ハッシュタグ名            │
│                                     │
│      投稿数: 1,234件                │
│                                     │
│          ── Poker SNS ──            │
└─────────────────────────────────────┘
```

### ST-007: プレミアム訴求ページデザイン

**The Felt Table テーマ準拠**:
- ヒーロー: ゴールドグラデーション文字「Premium」
- 特典カード: Surface (`#131a14`) + Border (`#2a3828`)
- CTA: `background: #c9a84c, color: #0d1009`
- 料金: ¥980/月 (大きく中央表示)

---

## Planning (常闇) — 即時アクション

### ST-008: アフィリエイト申請

| サービス | 申請URL | 必要情報 |
|---------|---------|---------|
| GGPoker Affiliate | affiliates.ggpoker.com | サイトURL、トラフィック見込み、プロモーション方法 |
| KKPoker Agent | kkpoker.net/agent | 同上 |
| GTO Wizard Affiliate | gtowizard.com/affiliate | 同上 |

**申請時の記載ポイント**:
- 日本初のポーカー特化SNS
- 月間想定トラフィック: 10,000PV (3ヶ月後目標)
- ターゲット: 日本のポーカープレイヤー
- プロモーション: サイト内バナー + 記事内リンク + 投稿内推薦

### ST-009: X Developer Account申請

- developer.twitter.com で申請
- Free tier (1,500ツイート/月) で開始
- 用途: ポーカーSNSのトレンド投稿自動共有

---

**各部門は本ドキュメントの担当セクションを参照し、着手してください。**
**質問・ブロッカーは即座にPlanning (常闇) へエスカレーション。**
