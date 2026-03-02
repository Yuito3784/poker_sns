# Design Deliverable: ブロッカー可視性とCEO判断導線

> Design Team / 不知火 (Junior) / 2026-03-02
> 対象タスク: 「ブロッカーとして登録されている、つまり私が決めなければいけないものはどこから確認できますか」

---

## 1. CEOがブロッカーを確認する導線設計

### 1.1 確認場所

| 導線 | パス | 形式 |
|------|------|------|
| **Primary** | `docs/decision-blockers.md` | Markdown (GitHub上で直接閲覧・編集可) |
| **Secondary** | GitHub Issue (Ops作成予定) | Issue内からdecision-blockers.mdへリンク |
| **Notification** | GitHub Issue Assign通知 | CEOをAssigneeに設定 → メール/モバイル通知 |

### 1.2 情報フロー

```
docs/decision-blockers.md (原本)
        │
        ├── GitHub Issue (リンク + CEOアサイン)
        │     └── CEOコメントで判断を記録
        │
        └── 各チームが監視
              ├── Development: VPS確定 → デプロイスクリプト調整
              ├── Design: ドメイン確定 → OGP/メタ情報更新
              └── Operations: 全確定 → 本番デプロイ実行
```

---

## 2. ブロッカー判断のUI影響分析

CEOの各判断が確定した後に、Design/Developmentが対応するUI変更の全体マップ。

### 2.1 ドメイン判断 → UI変更マトリクス (最重要)

ドメイン確定は最もUI影響範囲が広い。以下13箇所のファイルで `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_API_URL` を参照している。

| # | ファイル | UI要素 | 変更内容 |
|---|---------|--------|---------|
| 1 | `frontend/src/app/layout.tsx` | サイト全体のOGP | `metadataBase` URL更新 |
| 2 | `frontend/src/app/lp/page.tsx` | LP専用OGP | SITE_URL反映 |
| 3 | `frontend/src/app/post/[id]/page.tsx` | 投稿OGP | canonical URL |
| 4 | `frontend/src/app/post/[id]/opengraph-image.tsx` | 投稿OG画像 | API_BASE参照先 |
| 5 | `frontend/src/app/profile/[username]/page.tsx` | プロフィールOGP | canonical URL |
| 6 | `frontend/src/app/profile/[username]/opengraph-image.tsx` | プロフィールOG画像 | API_BASE参照先 |
| 7 | `frontend/src/app/hashtag/[tag]/page.tsx` | ハッシュタグOGP | SITE_URL反映 |
| 8 | `frontend/src/app/robots.ts` | robots.txt | Host directive |
| 9 | `frontend/src/app/sitemap.ts` | サイトマップ | 全URL生成 |
| 10 | `frontend/src/lib/api.ts` | API通信基盤 | API_BASE URL |
| 11 | `backend/src/auth/auth.service.ts` | メール内リンク | 認証・リセットURL |
| 12 | `frontend/public/manifest.json` | PWAマニフェスト | start_url, scope |
| 13 | `.env` | 環境変数 | 全URL設定 |

### 2.2 OGPカード表示シミュレーション

ドメイン確定後に、各SNSでの表示をこう検証する。

```
┌─────────────────────────────────────────┐
│ X (Twitter) - summary_large_image       │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │     [OGP画像 1200x630]             │ │
│ │     Background: #0d1009 → #131a14  │ │
│ │     Gold accent: #c9a84c            │ │
│ │     ♠ Poker SNS logo               │ │
│ │                                     │ │
│ ├─────────────────────────────────────┤ │
│ │ pokersns.jp                         │ │
│ │ Poker SNS - ポーカーハンドを共有..  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ LINE - OGP Compact Card                 │
│ ┌────────┬────────────────────────────┐ │
│ │ [画像] │ Poker SNS                  │ │
│ │ 120x120│ ポーカーハンドを共有・議論..│ │
│ │        │ pokersns.jp                │ │
│ └────────┴────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2.3 VPS判断 → パフォーマンスUX影響

| VPS選択肢 | OGP画像生成 | ページロード | 画像配信 |
|-----------|------------|------------|---------|
| ConoHa 2GB (推奨) | ~200ms | ~1.5s (TTFB) | CDN無し、十分 |
| ConoHa 4GB | ~150ms | ~1.2s | 余裕あり |
| Lightsail 2GB | ~250ms | ~1.8s | S3連携可 |

### 2.4 外部サービス判断 → UI表示影響

| サービス | 確定前の状態 | 確定後のUI変化 |
|---------|------------|--------------|
| Stripe本番 | テストモード → 課金不可 | プレミアムバッジ(♠)、広告非表示、4000文字上限が有効化 |
| Google OAuth | ボタン非表示 or 無効化 | Google「でログイン」ボタン活性化 |
| LINE Login | ボタン非表示 or 無効化 | LINE「でログイン」ボタン活性化 |
| X OAuth | ボタン非表示 or 無効化 | X「でログイン」ボタン活性化 |
| GA4 | トラッキング無し | GoogleAnalyticsコンポーネント有効化 |

---

## 3. Design対応 — ブロッカー解消後の即時アクション

CEOがブロッカーを判断した後、Designチームが即座に対応する項目。

### Phase 1: ドメイン確定後 (即日対応)

- [ ] OGPデフォルト画像にドメイン表記を反映したデザイン更新
- [ ] メールテンプレート内のURLリンクの視覚確認
- [ ] SNSプロフィール画像・バナーにドメイン表記追加の要否判断

### Phase 2: VPS確定 + デプロイ後 (1-2日)

- [ ] 本番環境でのOGPカード展開テスト (X, LINE, Discord)
- [ ] 画像読み込み速度の体感確認 → 必要に応じてlazy loading調整
- [ ] モバイル環境 (375px) での表示確認

### Phase 3: 外部サービス確定後 (3-5日)

- [ ] OAuth各ソーシャルボタンの表示テスト
- [ ] プレミアムバッジ表示の本番確認
- [ ] GA4ダッシュボードのUI導線確認

---

## 4. ブランド一貫性チェックリスト

ドメイン変更に伴い、以下のブランド要素が全ページで一貫していることを確認。

| 要素 | 仕様 | 確認箇所 |
|------|------|---------|
| Background | `#0d1009` | layout.tsx themeColor, globals.css |
| Gold accent | `#c9a84c` | CTA buttons, Premium badge, OGP accent |
| Font stack | Playfair Display + Noto Sans JP | layout.tsx font imports |
| Logo text | "Poker SNS" (♠ prefix) | OGP画像, Sidebar, LP |
| ドメイン表記 | `pokersns.jp` (確定後) | OGP, email footer, PWA manifest |

---

## File Index

| Document | Path |
|----------|------|
| CEO意思決定ブロッカー一覧 | `docs/decision-blockers.md` |
| 本ドキュメント | `docs/DESIGN_DELIVERABLE_BLOCKER_VISIBILITY.md` |
| 既存Design Round 1 | `docs/DESIGN_DELIVERABLE_ROUND1.md` |
| SNSテンプレート仕様 | `docs/DESIGN_SPEC_SNS_TEMPLATES.md` |
