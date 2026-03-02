# Marketing Implementation Specification
## poker_sns マーケティング強化 技術仕様書

**作成日**: 2026-03-02
**作成者**: Planning (常闇)
**ステータス**: Draft
**優先度**: P0 — ユーザー獲得直結

---

## 1. 現状分析 (As-Is)

### 1.1 OGP/メタデータ対応状況

| ページ | metadata | OGP | Twitter Card | 動的OG画像 | 状態 |
|--------|----------|-----|--------------|-------------|------|
| layout.tsx (グローバル) | title/desc | type/locale/siteName | card/title/desc | opengraph-image.tsx | **og:image/twitter:image未参照** |
| `/post/[id]` | generateMetadata() | 完全対応 | 完全対応 | 投稿画像があればimageUrl使用 | OK |
| `/profile/[username]` | なし | なし | なし | なし | **未対応** |
| `/hashtag/[tag]` | なし | なし | なし | なし | **未対応** |
| `/explore` | なし | なし | なし | なし | **未対応** |
| `/lp` | なし | なし | なし | なし | **未対応** |
| `/partners` | なし | なし | なし | なし | **未対応** |

### 1.2 SNSシェア機能状況

| 機能 | 対応 | 場所 |
|------|------|------|
| X (Twitter) シェア | PostItem + PostDetailClient | intent/tweet URL |
| LINE シェア | PostItem + PostDetailClient | social-plugins.line.me |
| リンクコピー | なし | — |
| Facebook シェア | なし | — |
| Instagram | N/A (URLシェア不可) | — |

### 1.3 SEO状況

- sitemap.ts: 5静的ルートのみ（動的ページ未含）
- robots.ts: 基本設定済み
- JSON-LD: WebSiteスキーマのみ（Person/Article未対応）
- canonical URL: 動的ルートで未設定

---

## 2. 実装計画 (To-Be)

### Phase 1: OGP完全対応 (優先度: P0, 工数: 2-3日)

SNSでシェアされた際のカード表示を最適化する。これが全マーケティング施策の基盤。

#### 2.1.1 グローバルmetadata修正

**ファイル**: `frontend/src/app/layout.tsx`

```
変更内容:
- metadata.openGraph.images に opengraph-image.tsx の参照を追加
- metadata.twitter.images を追加
- twitter:site / twitter:creator を追加（Xアカウント作成後）
```

#### 2.1.2 プロフィールページ動的メタデータ

**ファイル**: `frontend/src/app/profile/[username]/page.tsx`

```
要件:
- generateMetadata() で /users/:username API からデータ取得
- title: "${name}(@${username}) | Poker SNS"
- description: bio || "${name}さんのポーカー投稿。フォロワー${count}人"
- og:type: "profile"
- og:image: ユーザーアバター or デフォルトOG画像
- twitter:card: "summary" (アバターがある場合)
- revalidate: 300 (5分キャッシュ)
```

**バックエンドAPI**: 既存 `GET /users/:username` で十分（公開エンドポイント）

#### 2.1.3 ハッシュタグページ動的メタデータ

**ファイル**: `frontend/src/app/hashtag/[tag]/page.tsx`

```
要件:
- generateMetadata() でタグ名をデコード
- title: "#${tag} の投稿 | Poker SNS"
- description: "#${tag} に関するポーカーの投稿一覧"
- og:type: "website"
- og:image: デフォルトOG画像
```

#### 2.1.4 LPページメタデータ

**ファイル**: `frontend/src/app/lp/page.tsx`

```
要件:
- 静的metadata export
- title: "Poker SNS - 日本初のポーカー特化SNS"
- description: "ハンドを共有し、戦略を議論し、上達を加速する。無料で始めよう。"
- og:image: LP専用OG画像（別途生成 or 静的ファイル）
- twitter:card: "summary_large_image"
```

#### 2.1.5 Exploreページメタデータ

**ファイル**: `frontend/src/app/explore/page.tsx`

```
要件:
- 静的metadata export
- title: "トレンド投稿を探す | Poker SNS"
- description: "今話題のポーカーハンドと戦略的ディスカッション"
```

### Phase 2: シェア機能強化 (優先度: P0, 工数: 1-2日)

#### 2.2.1 リンクコピー機能追加

**ファイル**: `frontend/src/app/components/PostItem.tsx`, `PostDetailClient.tsx`

```
要件:
- navigator.clipboard.writeText() でURLコピー
- コピー完了時にトースト通知表示
- フォールバック: document.execCommand('copy')
```

#### 2.2.2 UTMパラメータ付きシェアURL

```
要件:
- シェアURLにUTMパラメータを付与
  - utm_source: "twitter" | "line"
  - utm_medium: "social"
  - utm_campaign: "share"
- 例: https://pokersns.jp/post/123?utm_source=twitter&utm_medium=social&utm_campaign=share
```

#### 2.2.3 Web Share API対応

```
要件:
- navigator.share() が利用可能な場合はネイティブシェアUI表示
- モバイルUX改善に直結
- フォールバック: 既存のX/LINEシェアボタン表示
```

### Phase 3: 動的OG画像生成の強化 (優先度: P1, 工数: 2-3日)

#### 2.3.1 投稿詳細用OG画像

**ファイル**: `frontend/src/app/post/[id]/opengraph-image.tsx` (新規)

```
要件:
- Next.js ImageResponse (Edge Runtime)
- サイズ: 1200x630px
- デザイン:
  - 背景: #0d1009 (The Felt Table)
  - ゴールドアクセント: #c9a84c
  - 投稿テキスト（最大3行、省略表示）
  - 著者名 + @username
  - ポーカーハンドの場合: テーブルタイプ/ブラインド表示
  - Poker SNSロゴ
- キャッシュ: revalidate 3600 (1時間)
```

#### 2.3.2 プロフィール用OG画像

**ファイル**: `frontend/src/app/profile/[username]/opengraph-image.tsx` (新規)

```
要件:
- ユーザーアバター（外部画像取得）
- ユーザー名 + bio
- フォロワー数/投稿数
- ブランドフレーム
```

#### 2.3.3 OG画像Rate Limiting

```
要件:
- Edge Runtimeのためバックエンド側Throttle不要
- Cache-Control: public, max-age=3600, s-maxage=86400
- CDN（Vercel/Cloudflare）でキャッシュ
```

### Phase 4: SEO強化 (優先度: P1, 工数: 1日)

#### 2.4.1 動的サイトマップ

**ファイル**: `frontend/src/app/sitemap.ts` (既存修正)

```
要件:
- 既存の静的ルートに加え:
  - 人気ユーザープロフィール（フォロワー数上位）
  - 最近の投稿（直近7日間）
  - アクティブなハッシュタグ
- バックエンドAPI追加: GET /posts/sitemap (公開、ページネーション)
- バックエンドAPI追加: GET /users/sitemap (公開、ページネーション)
- revalidate: 86400 (24時間)
```

#### 2.4.2 JSON-LD拡張

```
要件:
- 投稿詳細: Article or SocialMediaPosting スキーマ
- プロフィール: Person スキーマ
- LP: Organization スキーマ
```

#### 2.4.3 Canonical URL設定

```
要件:
- 全動的ルートに alternates.canonical を設定
- クエリパラメータ正規化
```

### Phase 5: SNS自動投稿基盤 (優先度: P2, 工数: 5-7日)

アプリ内のトレンド投稿を自動でSNSに投稿し、外部リーチを獲得する。

#### 2.5.1 X (Twitter) API連携

```
技術要件:
- Twitter API v2 (OAuth 2.0 with PKCE)
- 必要スコープ: tweet.write, users.read
- レートリミット: 1,500 tweets/month (Free tier) → Basic $100/month で 3,000/month
- 実装:
  - バックエンドにSNS自動投稿モジュール (social-posting.module.ts)
  - Cronジョブで1日3-5回自動投稿
  - コンテンツ: トレンド投稿の要約 + リンク + ハッシュタグ
  - 投稿テンプレート:
    "🃏 今日のトレンドハンド\n{投稿テキスト要約}\n\n続きを読む👇\n{URL}\n\n#ポーカー #poker #PokerSNS"
```

#### 2.5.2 YouTube Shorts / Instagram Reels 連携

```
技術要件:
- 現段階では手動運用推奨（API制限が厳しい）
- 自動化する場合:
  - YouTube Data API v3: OAuth 2.0, 動画アップロード
  - Instagram Graph API: ビジネスアカウント必須、Reels公開は制限あり
- コンテンツ戦略:
  - ポーカーハンド解説ショート動画（テキストベースアニメーション）
  - 生成にはサーバーサイド動画生成ライブラリが必要（remotion等）
  - MVP段階では手動作成 + テンプレート提供が現実的
```

#### 2.5.3 自動投稿コンテンツ選定ロジック

```
要件:
- 選定基準:
  1. 直近24時間のいいね数上位投稿
  2. ポーカーハンド投稿を優先（ビジュアルがリッチ）
  3. 画像付き投稿を優先（SNS engagement率が高い）
  4. 同一投稿の重複投稿防止
- バックエンドAPI: GET /posts/trending (既存) を活用
- 投稿履歴テーブル: SocialPost (postId, platform, postedAt, externalId)
```

---

## 3. 優先度マトリクス

| Phase | 項目 | 優先度 | 工数 | 期待効果 |
|-------|------|--------|------|----------|
| 1 | OGP完全対応 | P0 | 2-3日 | シェア時のCTR 2-3倍改善 |
| 2 | シェア機能強化 | P0 | 1-2日 | シェア率向上、流入経路追跡 |
| 3 | 動的OG画像強化 | P1 | 2-3日 | SNSフィードでの視認性向上 |
| 4 | SEO強化 | P1 | 1日 | 検索流入増加 |
| 5 | SNS自動投稿 | P2 | 5-7日 | 外部リーチ獲得 |

**推奨実行順序**: Phase 1 → Phase 2 → Phase 4 → Phase 3 → Phase 5

Phase 1-2 が最も ROI が高い。シェアされた際のカード表示が魅力的でなければ、いくら自動投稿してもCTRは上がらない。

---

## 4. 必要なSNSアカウント

### 4.1 X (Twitter)

```
アカウント名: @PokerSNS_jp
プロフィール:
  - 表示名: Poker SNS | ポーカー特化SNS
  - Bio: ハンドを共有し、戦略を議論し、上達を加速する。日本初のポーカー特化SNS 🃏
  - URL: https://pokersns.jp/lp?utm_source=twitter&utm_medium=social&utm_campaign=profile
  - ヘッダー画像: The Felt Table テーマ (1500x500px)
  - アイコン: ロゴ (400x400px)
コンテンツ戦略:
  - 1日3-5ツイート
  - トレンドハンド紹介
  - ポーカー戦略Tips
  - 新機能アナウンス
  - ユーザーの優良投稿リポスト
```

### 4.2 YouTube

```
チャンネル名: Poker SNS
コンテンツ:
  - Shorts: ハンド解説 (60秒)
  - 通常動画: 機能紹介、使い方ガイド
  - 投稿頻度: Shorts週3-5本、通常動画月1-2本
```

### 4.3 Instagram

```
アカウント名: @pokersns_jp
コンテンツ:
  - Reels: ハンド解説、ポーカーTips
  - ストーリー: 新機能告知、ユーザーハイライト
  - フィード: ブランドビジュアル、統計インフォグラフィック
  - 投稿頻度: Reels週3-5本、フィード週1-2枚
```

---

## 5. 効果測定 KPI

| KPI | 現状 | 目標 (1ヶ月後) | 目標 (3ヶ月後) |
|-----|------|----------------|----------------|
| SNSシェア数/日 | 計測なし | 10回/日 | 50回/日 |
| OGPカードCTR | 計測なし | 2% | 5% |
| X フォロワー | 0 | 500 | 3,000 |
| YouTube 登録者 | 0 | 100 | 1,000 |
| Instagram フォロワー | 0 | 300 | 2,000 |
| 新規登録/日 (SNS経由) | 0 | 5人/日 | 20人/日 |
| 月間リファラー流入 | 計測なし | 500 | 3,000 |

---

## 6. 技術的リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| X API Free tierの制限 (1,500/月) | 中 | 投稿頻度の最適化、Basic tier ($100/月) への移行検討 |
| OG画像動的生成のパフォーマンス | 低 | Edge Runtime + CDNキャッシュで対応 |
| 動的サイトマップのスケーラビリティ | 低 | ページネーション + revalidate で対応 |
| OAuthトークン管理のセキュリティ | 高 | 環境変数管理、トークンの暗号化保存 |
| Instagram/YouTube API制限 | 高 | MVP段階では手動運用、段階的自動化 |

---

## 7. Devチームへの実装指示サマリ

### 即時着手 (Phase 1-2):

1. **layout.tsx**: グローバルmetadataにog:image/twitter:imageを追加
2. **profile/[username]/page.tsx**: generateMetadata()追加
3. **hashtag/[tag]/page.tsx**: generateMetadata()追加
4. **lp/page.tsx**: 静的metadata export追加
5. **explore/page.tsx**: 静的metadata export追加
6. **PostItem.tsx / PostDetailClient.tsx**: リンクコピー + UTMパラメータ + Web Share API
7. シェアURLにUTMパラメータ付与

### 次フェーズ (Phase 3-4):

8. **post/[id]/opengraph-image.tsx**: 投稿用動的OG画像
9. **profile/[username]/opengraph-image.tsx**: プロフィール用動的OG画像
10. **sitemap.ts**: 動的ページ追加
11. JSON-LD拡張 (Article, Person)
12. canonical URL設定

### 将来 (Phase 5):

13. social-posting.module.ts: SNS自動投稿モジュール
14. SocialPostテーブル: 投稿履歴管理
15. Cronジョブ: 自動投稿スケジューラ

---

## 8. Designチームへの依頼事項

1. OG画像テンプレートのデザインスペック (1200x630px)
   - 投稿用、プロフィール用、デフォルト用の3パターン
   - The Felt Table テーマ準拠
2. X ヘッダー画像 (1500x500px)
3. SNSアイコン画像 (400x400px)
4. Instagram フィード用テンプレート (1080x1080px)

---

## 9. DevSecOpsチームへの依頼事項

1. OG画像エンドポイントのキャッシュヘッダー設計
2. SNS OAuth トークンの安全な保存方式
3. UTMパラメータのCSP影響確認
4. シェアURL生成時のXSS対策確認

---

## 10. QAチームへの依頼事項

1. 各SNSデバッガーツールでのOGPカード表示検証
   - Twitter Card Validator
   - Facebook Sharing Debugger
   - LINE URL Scheme テスト
2. クロスブラウザ シェアボタン動作テスト
3. 特殊文字・長文のエンコーディング検証
4. Web Share API のフォールバック動作テスト
