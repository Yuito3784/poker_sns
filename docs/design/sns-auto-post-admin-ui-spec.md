# SNS Auto-Post Admin UI Design Spec

## 1. Scope Decision (Design Supplement)

**Planningからの質問**: 管理画面UIが今回スコープに含まれるか

**Design回答**: 管理画面UIは**今回スコープに含めるべき**。理由:
- CEOタスク 3-1-12 で管理APIが定義済み（history / toggle / stats）
- APIが存在してUIがない状態はオペレーション不能
- ただし、**専用の管理画面ページ(`/admin`)は不要**。既存の`/settings`ページに「SNS自動投稿」セクションを追加する形で十分
- フェーズ1では管理者（認証済みユーザーのうち管理権限を持つ者）のみアクセス可能なセクションとして実装

---

## 2. Design System Reference

既存プロジェクトの「The Felt Table」デザインシステムに準拠:

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0d1009` | ページ背景 |
| `--card` | `#131a14` | カード・セクション背景 |
| `--card-hover` | `#192118` | ホバー時の表面色 |
| `--border` | `#1f2a1e` | デフォルト境界線 |
| `--border-medium` | `#2a3828` | 強調境界線 |
| `--accent` / `--gold` | `#c9a84c` | CTA・アクセント |
| `--gold-dim` | `#9a7c35` | ゴールド控えめ |
| `--gold-bright` | `#d4b965` | ゴールド明るめ |
| `--foreground` | `#ddd6c8` | プライマリテキスト |
| `--muted` | `#7a7260` | セカンダリテキスト |
| `--sidebar-muted` | `#4a5245` | ミュートテキスト |
| `--sidebar-bg` | `#080a08` | サイドバー背景 |

**フォント**: Noto Sans JP (本文), Playfair Display (見出し装飾), Geist (UI)
**CTAボタン**: `background: #c9a84c, color: #0d1009`
**ステータスカラー**:
- Success: `#4ade80` (green-400)
- Error/Failed: `#ef4444` (red-500)
- Pending: `#c9a84c` (gold)
- Warning: `#f59e0b` (amber-500)

---

## 3. UI Structure: Settings Page Extension

### 3.1 Navigation

既存の `/settings` ページに新セクションを追加。サイドバーのナビゲーション変更は不要。

```
/settings ページ内:
  [パスワード変更]
  [サブスクリプション管理]
  [SNS自動投稿]      <-- 新規追加（管理者のみ表示）
  [アカウント削除]
```

### 3.2 管理者チェック

- `currentUser.role === 'ADMIN'` の場合のみ「SNS自動投稿」セクションを表示
- 非管理者にはセクション自体を非表示

---

## 4. Wireframe: SNS Auto-Post Section

### 4.1 Stats Overview (GET /sns-auto-post/stats)

```
┌─────────────────────────────────────────────────────────────┐
│  SNS Auto-Post                                              │
│  X (Twitter) への自動投稿管理                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   42     │  │  38      │  │  92.3%   │  │  4       │   │
│  │ 総投稿数 │  │ 成功     │  │ 成功率   │  │ 失敗     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────┐                │
│  │ 今日の投稿: 3 / 50   │  │ 月間: 142 /  │                │
│  │ ████████░░  60%      │  │   1,500      │                │
│  └──────────────────────┘  └──────────────┘                │
│                                                             │
│  自動投稿  [━━━━━ ON ━━━━━]         ← toggle switch        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Stats Cards Layout**:
- 4つのカードを横並び（モバイルでは2x2グリッド）
- 各カード: `bg-[#131a14]`, `border: 1px solid #1f2a1e`, `rounded-lg`, `p-4`
- 数値: `text-2xl font-bold text-[#ddd6c8]`
- ラベル: `text-xs text-[#7a7260]`
- 成功率カードの数値色: 90%以上 → `#4ade80`, 70-89% → `#c9a84c`, 70%未満 → `#ef4444`

**Rate Limit Progress Bars**:
- 日次/月次の利用量をプログレスバーで表示
- バー背景: `#1f2a1e`, バーフィル: `#c9a84c`
- 80%超過時: バーフィル色を `#f59e0b` (警告) に変更
- テキスト: `[現在値] / [上限]`

**Toggle Switch**:
- ON: track `bg-[#c9a84c]`, thumb `bg-[#0d1009]`
- OFF: track `bg-[#2a3828]`, thumb `bg-[#4a5245]`
- ラベル: ON = `text-[#c9a84c]`, OFF = `text-[#4a5245]`

### 4.2 Post History (GET /sns-auto-post/history)

```
┌─────────────────────────────────────────────────────────────┐
│  投稿履歴                                                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Filter ────────────────────────────────────────────┐   │
│  │  [全て ▼]  [成功 ▼]  [失敗 ▼]  [待機中 ▼]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● 成功  2026-03-02 14:30                            │   │
│  │ "昨日のBBでのAKsのプレイが話題になってい..."       │   │
│  │ Posted by @username                                  │   │
│  │ X投稿ID: 1234567890  [外部リンク↗]                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● 失敗  2026-03-02 14:15                            │   │
│  │ "UTGからの3betレンジについて..."                    │   │
│  │ Error: Rate limit exceeded (429)                     │   │
│  │ リトライ: 2/3                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ 待機中  2026-03-02 15:00 (予定)                   │   │
│  │ "フロップでのチェックレイズ戦略..."                 │   │
│  │ 予定送信時刻: 15:00                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [さらに読み込む]                                           │
└─────────────────────────────────────────────────────────────┘
```

**History List Item**:
- コンテナ: `bg-[#131a14]`, `border: 1px solid #1f2a1e`, `rounded-lg`, `p-4`, `mb-2`
- ホバー: `bg-[#192118]`
- ステータスインジケーター (左端の●):
  - `posted` (成功): `bg-[#4ade80]` 丸ドット
  - `failed` (失敗): `bg-[#ef4444]` 丸ドット
  - `pending` (待機中): `bg-[#c9a84c]` 丸ドット (中抜き ○)
- 日時: `text-xs text-[#4a5245]`
- コンテンツプレビュー: `text-sm text-[#ddd6c8]`, 1行に truncate
- エラーメッセージ: `text-xs text-[#ef4444]`, `bg-[#ef4444]/10 rounded px-2 py-1`
- 外部リンク: `text-xs text-[#c9a84c]` with underline on hover

**Filter Chips**:
- デフォルト: `bg-transparent`, `border: 1px solid #2a3828`, `text-[#7a7260]`, `rounded-full px-3 py-1 text-xs`
- アクティブ: `bg-[#c9a84c]/10`, `border-color: #c9a84c`, `text-[#c9a84c]`

---

## 5. Component Specifications

### 5.1 SnsAutoPostSection (Settings内コンポーネント)

```
Props:
  - token: string
  - isAdmin: boolean

State:
  - stats: { totalPosts, successCount, failedCount, successRate, dailyUsage, dailyLimit, monthlyUsage, monthlyLimit }
  - isEnabled: boolean
  - history: SnsAutoPostHistory[]
  - historyFilter: 'all' | 'posted' | 'failed' | 'pending'
  - loading: boolean

API Calls:
  - GET /sns-auto-post/stats → stats + isEnabled
  - GET /sns-auto-post/history?status={filter}&limit=20&cursor={cursor}
  - POST /sns-auto-post/toggle → { enabled: boolean }
```

### 5.2 StatsCard (再利用可能)

```
Props:
  - label: string
  - value: string | number
  - color?: string (optional override)

Styling:
  bg-[#131a14] border border-[#1f2a1e] rounded-lg p-4
  Value: text-2xl font-bold
  Label: text-xs text-[#7a7260] mt-1
```

### 5.3 RateLimitBar (再利用可能)

```
Props:
  - current: number
  - limit: number
  - label: string (e.g. "今日の投稿")

Styling:
  Bar container: h-2 bg-[#1f2a1e] rounded-full
  Bar fill: bg-[#c9a84c] rounded-full, transition-all duration-300
  Warning (>=80%): bg-[#f59e0b]
  Text: text-xs text-[#7a7260]
```

### 5.4 ToggleSwitch

```
Props:
  - enabled: boolean
  - onToggle: () => void
  - loading?: boolean

Sizing: w-12 h-6 rounded-full
  Track ON:  bg-[#c9a84c]
  Track OFF: bg-[#2a3828]
  Thumb:     h-5 w-5 rounded-full shadow
  Thumb ON:  bg-[#0d1009] translate-x-6
  Thumb OFF: bg-[#4a5245] translate-x-0.5
  Transition: transition-all duration-200
```

---

## 6. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| `lg` (1024px+) | Stats: 4列, History: フル幅 |
| `md` (768px+) | Stats: 2x2グリッド, History: フル幅 |
| `sm` (< 768px) | Stats: 1列スタック, History: カード縮小 |

---

## 7. Interaction States

### Toggle 操作
1. ユーザーがトグルをクリック
2. 即座にUIを楽観的に更新（optimistic update）
3. `POST /sns-auto-post/toggle` を呼び出し
4. 失敗時: UIを元に戻し、トースト通知でエラー表示

### フィルター操作
- フィルターチップクリック → 即座にフィルター適用
- API再フェッチ（ローディングスケルトン表示）

### ページネーション
- 「さらに読み込む」ボタン → カーソルベースのページネーション
- 既存のInfinite Scroll (Intersection Observer) パターンと同様

---

## 8. Empty / Error States

### データなし (History)
```
┌─────────────────────────────────────┐
│                                     │
│     まだ自動投稿はありません         │
│     text-[#4a5245] text-sm          │
│                                     │
└─────────────────────────────────────┘
```

### API Error
```
┌─────────────────────────────────────┐
│                                     │
│   データの読み込みに失敗しました     │
│   [再試行]                           │
│   text-[#ef4444]                    │
│                                     │
└─────────────────────────────────────┘
```

### Loading Skeleton
- Stats Cards: `bg-[#1f2a1e] animate-pulse rounded h-16`
- History Items: `bg-[#1f2a1e] animate-pulse rounded-lg h-20 mb-2` x 3

---

## 9. Accessibility

- Toggle: `role="switch"`, `aria-checked={enabled}`, `aria-label="自動投稿の有効/無効"`
- Filter chips: `role="radiogroup"` with individual `role="radio"`
- Stats cards: `aria-label` で値とラベルを結合（例: `aria-label="総投稿数: 42"`）
- History items: `role="article"`
- 外部リンク: `target="_blank" rel="noopener noreferrer"` + `aria-label="Xで投稿を開く"`
- フォーカス: 既存の `:focus-visible { outline: 2px solid rgba(201,168,76,0.5) }` を継承

---

## 10. Implementation Notes for Dev

1. **新規ページ不要**: `/settings` ページの既存構造にセクションを追加
2. **管理者判定**: Userモデルにroleフィールドが必要（まだない場合はバックエンドで対応）
3. **API型定義**: `frontend/src/lib/types.ts` に以下を追加:

```typescript
export type SnsAutoPostStats = {
  totalPosts: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  dailyUsage: number;
  dailyLimit: number;
  monthlyUsage: number;
  monthlyLimit: number;
  isEnabled: boolean;
};

export type SnsAutoPostHistory = {
  id: string;
  postId: string;
  platform: string;
  externalId: string | null;
  status: 'pending' | 'posted' | 'failed';
  content: string;
  mediaUrl: string | null;
  scheduledAt: string;
  postedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  post?: {
    author: {
      username: string;
    };
  };
};
```

4. **トースト通知**: 既存の `useToast()` コンテキストを使用
5. **アニメーション**: 既存の `animate-fade-in` クラスを活用
