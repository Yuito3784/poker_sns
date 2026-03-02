# タスク 4-3: モバイルUX改善 要件定義書

## 現状分析

### 既存モバイル対応
- **ボトムナビ**: 4アイコン実装済み（ホーム/検索/通知/プロフィール）、`md:hidden`で表示
- **サイドバー**: `hidden md:flex`で768px以上に表示、`lg:w-64`でラベル表示
- **FAB**: 投稿用フローティングボタンあり（モバイルのみ）
- **右サイドバー**: `xl:block hidden`で大画面のみ
- **PWA**: 未実装（manifest.json、Service Worker なし）
- **レスポンシブ**: Tailwindブレークポイント md/lg/xl 使用中

### 主要ブレークポイント
| ブレーク | 幅 | 用途 |
|---------|------|------|
| < md | < 768px | モバイル（ボトムナビ、FAB） |
| md | 768px+ | タブレット（サイドバーアイコンのみ） |
| lg | 1024px+ | デスクトップ（サイドバー+ラベル） |
| xl | 1280px+ | ワイド（右サイドバー追加） |

---

## 4-3-1: ボトムナビゲーションバー拡張

### 現状
- 4アイコン: ホーム / 検索 / 通知 / プロフィール
- 実装箇所: `frontend/src/app/page.tsx` 内 `<nav>` (インラインコンポーネント)

### 変更要件
1. **5アイコンに拡張**: ホーム / 探索 / 投稿 / 通知 / プロフィール
2. **コンポーネント分離**: `page.tsx`から`BottomNav.tsx`を切り出し
3. **投稿ボタン統合**: 現在のFABを廃止し、ボトムナビ中央に「+」投稿アイコン配置
4. **サイドバーとナビ項目を統一**: 同じナビアイテム配列から生成

### デザインスペック
| 項目 | 仕様 |
|------|------|
| 高さ | 56px (`h-14`) |
| 背景 | `#080a08` (サイドバーと統一) |
| 上部ボーダー | `#161b14` |
| アクティブ色 | `#c9a84c` (ゴールド) |
| 非アクティブ色 | `#4a5245` (ミュートテキスト) |
| アイコンサイズ | 24x24px |
| タッチターゲット | 最小 44x44px |
| 投稿ボタン | 中央、40x40px丸ボタン、背景`#c9a84c`、アイコン`#0d1009` |
| フォントサイズ | 10px (`text-[10px]`) ラベル付き |

### 実装方針
```
frontend/src/app/components/BottomNav.tsx (新規)
- usePathname() でアクティブ状態判定
- 未読通知バッジ表示（既存ロジック流用）
- 投稿タップ → 投稿モーダル or /compose へ遷移
- safe-area-inset-bottom 対応 (iPhone X+)
```

### ナビアイテム定義
| アイコン | ラベル | パス | 備考 |
|---------|--------|------|------|
| Home | ホーム | `/` | |
| Compass | 探索 | `/explore` | |
| Plus (丸) | 投稿 | - | モーダル起動 |
| Bell | 通知 | `/notifications` | 未読バッジ |
| User | マイページ | `/profile/[me]` | 自分のusername |

---

## 4-3-2: PWA対応

### 必要ファイル

#### 1. `frontend/public/manifest.json`
```json
{
  "name": "Poker SNS",
  "short_name": "PokerSNS",
  "description": "ポーカープレイヤーのためのSNS",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d1009",
  "theme_color": "#0d1009",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

#### 2. Service Worker (`frontend/public/sw.js`)
- **キャッシュ戦略**: Network First (API) + Cache First (静的アセット)
- **プリキャッシュ対象**: App Shell (HTML, CSS, JS bundles)
- **ランタイムキャッシュ**: 画像 (Cache First, 30日), API (Network First, 5分)
- **オフラインフォールバック**: `/offline.html` 表示

#### 3. Service Worker 登録
```typescript
// frontend/src/app/layout.tsx に追加
// <script> で /sw.js を登録
// navigator.serviceWorker.register('/sw.js')
```

#### 4. アイコンセット (Design部門作成)
| サイズ | 用途 | ファイル |
|--------|------|---------|
| 192x192 | Android ホーム画面 | icon-192.png |
| 512x512 | Android スプラッシュ | icon-512.png |
| 192x192 | マスカブル | icon-maskable-192.png |
| 512x512 | マスカブル | icon-maskable-512.png |
| 180x180 | Apple Touch Icon | apple-touch-icon.png |

#### 5. 「ホーム画面に追加」プロンプト
- `beforeinstallprompt` イベントをキャッチ
- カスタムバナー表示（3回目訪問時）
- 閉じたら30日間非表示（localStorage管理）

### ライブラリ選定
- **next-pwa は非推奨** (App Router対応不完全)
- **手動実装**: `public/sw.js` + Service Worker API 直接使用
- **Workbox不要**: キャッシュ戦略がシンプルなため

---

## 4-3-3: プルトゥリフレッシュ

### 実装要件
- モバイルのみ（`< md`ブレークポイント）
- タイムラインフィード上部で下方向スワイプ
- 閾値: 60px 引っ張りで発動
- アニメーション: ゴールドのスピナー回転
- 発動後: タイムラインAPIを再取得

### 技術方針
- **Touch Events API** (`touchstart`, `touchmove`, `touchend`)
- カスタムフック `usePullToRefresh(callback)` として実装
- `overscroll-behavior: contain` でブラウザデフォルト無効化
- スクロール位置が0の場合のみ有効化

### コンポーネント
```
frontend/src/hooks/usePullToRefresh.ts (新規)
- threshold: 60px
- resistance: 0.4 (引っ張り量の減衰係数)
- callback: async () => void
- 戻り値: { isRefreshing, pullDistance, handlers }
```

---

## 4-3-4: 画像レスポンシブ最適化

### 現状
- 投稿画像: `<img>` タグで表示（`object-cover`、固定幅）
- アバター: `<img>` タグ、40px/48px
- Next.js `<Image>` コンポーネント未使用

### 変更要件

#### フロントエンド
1. **Next.js `<Image>` への移行**: 投稿画像・アバターを`next/image`に置き換え
2. **自動WebP変換**: Next.js Image Optimization が自動対応
3. **srcset/sizes 設定**:
   - 投稿画像: `sizes="(max-width: 768px) 100vw, 576px"`
   - アバター: `sizes="40px"` / `sizes="48px"`
4. **Lazy Loading**: `loading="lazy"` (フォールドより下)
5. **Blur Placeholder**: 低解像度プレースホルダー

#### バックエンド（将来検討）
- Sharp によるリサイズ処理は現段階では不要
- Next.js Image Optimization で十分なパフォーマンス改善が見込める

### next.config 設定
```javascript
images: {
  remotePatterns: [
    { hostname: 'localhost' },
    { hostname: process.env.NEXT_PUBLIC_API_HOST }
  ],
  formats: ['image/webp', 'image/avif'],
  deviceSizes: [390, 768, 1024, 1280],
  imageSizes: [40, 48, 64, 128]
}
```

---

## 4-3-5: タッチ操作最適化

### 実装要件

#### スワイプでタブ切り替え
- **対象**: トレンドページ（24h / 7d タブ）
- **操作**: 左右スワイプでタブ切り替え
- **閾値**: 50px + 200ms以内
- **カスタムフック**: `useSwipeNavigation(tabs, currentTab, onChange)`

#### 長押しメニュー
- **対象**: PostItem コンポーネント
- **操作**: 500ms 長押しでコンテキストメニュー表示
- **メニュー項目**: コピー / ブックマーク / 共有 / 通報 (自分の投稿: 削除/ピン留め)
- **カスタムフック**: `useLongPress(callback, delay)`
- **UI**: ボトムシート形式（モバイル）

### 注意事項
- `touch-action: manipulation` でダブルタップズームを防止
- `user-select: none` はテキスト選択を阻害するため限定的に使用
- スクロール中の誤発動防止（移動量チェック）
- ハプティックフィードバック: `navigator.vibrate(10)` (対応ブラウザのみ)

---

## 4-3-6: Lighthouse モバイルスコア 85+

### 現状の推定ボトルネック
1. **画像未最適化**: `<img>` 直接使用、WebP未対応
2. **大きなJSバンドル**: page.tsx が巨大（1600行+）
3. **フォント読み込み**: 4フォントファミリー（Geist, Geist Mono, Playfair, Noto Sans JP）
4. **CSS未最適化**: Tailwind v4 の未使用スタイル
5. **サードパーティスクリプト**: Stripe.js

### 改善施策（パフォーマンスバジェット）
| メトリクス | 目標値 | 施策 |
|-----------|--------|------|
| FCP | < 1.8s | フォントpreload、クリティカルCSS |
| LCP | < 2.5s | 画像最適化、next/image |
| TBT | < 200ms | コード分割、dynamic import |
| CLS | < 0.1 | 画像サイズ明示、フォントdisplay:swap |
| SI | < 3.4s | SSR/Streaming活用 |

### 具体的施策
1. `page.tsx` のコンポーネント分割（サイドバー、フィード、右サイドバー）
2. `next/dynamic` で非初期表示コンポーネントを遅延読み込み
3. フォント最適化: `display: 'swap'`（既に設定済みか確認）
4. Prefetch: 主要ルートのprefetch設定

---

## 実装優先順・依存関係

```
Phase 1 (並行可能):
  4-3-1 ボトムナビ拡張    ← Design: アイコンスペック必要
  4-3-4 画像最適化        ← 独立して実装可能

Phase 2 (Phase 1 完了後):
  4-3-2 PWA対応          ← Design: アイコンセット必要
  4-3-3 プルトゥリフレッシュ ← フィードコンポーネント分離後

Phase 3:
  4-3-5 タッチ操作        ← PostItem分離後
  4-3-6 Lighthouse 85+   ← 全最適化統合後に計測・調整
```

## Design部門への依頼事項
1. ボトムナビ5アイコンのSVG素材（active/inactive各状態）
2. PWAアイコンセット（192/512/maskable/apple-touch）
3. プルトゥリフレッシュのスピナーアニメーション仕様
4. 長押しメニューのボトムシートデザイン
5. オフラインフォールバックページのデザイン
