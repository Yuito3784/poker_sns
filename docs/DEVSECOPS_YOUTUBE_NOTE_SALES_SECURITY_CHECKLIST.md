# DevSecOps セキュリティチェックリスト — YouTube・note・営業活動展開

> 作成: 角巻 (DevSecOps)
> 日付: 2026-03-07
> ステータス: v1 ドラフト

---

## 1. YouTube展開 セキュリティ要件

### 1-1. CSP（Content Security Policy）ヘッダー変更 — CRITICAL

YouTube OEmbed 埋め込み実装時に、現在の CSP 設定ではiframe がブロックされる。

| 設定箇所 | 現状 | 変更後 |
|----------|------|--------|
| `backend/src/main.ts` Helmet `frameSrc` | `'none'` | `'none'` → `https://www.youtube.com https://www.youtube-nocookie.com` |
| `nginx-prod.conf` CSP `frame-src` | `https://js.stripe.com` | `https://js.stripe.com https://www.youtube.com https://www.youtube-nocookie.com` |
| `backend/src/main.ts` Helmet `frameguard` | `{ action: 'deny' }` | `{ action: 'sameorigin' }` ※YouTube iframe許可のため |

**注意事項:**
- `youtube-nocookie.com` はプライバシー強化モード用（推奨）
- ワイルドカード `https://*.youtube.com` は使用しない（攻撃面を最小化）
- OEmbed実装前は変更不要。実装と同時にPRに含めること

### 1-2. UTMパラメータのトラッキング正常性 — HIGH

動画説明欄・カード機能から貼る poker_sns リンクの UTM パラメータ検証。

**検証項目:**
- [ ] `?utm_source=youtube&utm_medium=video&utm_campaign={video_id}` が nginx → Next.js まで欠落なく伝播
- [ ] nginx `proxy_pass` でクエリストリングが保持される（現行設定で問題なし、但し確認必須）
- [ ] GA4 / アナリティクス側で `utm_source=youtube` のセッションが正しく計測される
- [ ] リダイレクト経路（HTTP→HTTPS, www→non-www）で UTM パラメータが消失しない

**テスト手順:**
```bash
# ステージング環境で検証
curl -v "https://staging.poker-sns.example.com/?utm_source=youtube&utm_medium=video&utm_campaign=test001" 2>&1 | grep -i "location\|utm"
```

### 1-3. YouTube API Key 管理 — HIGH

将来的に YouTube Data API v3 を利用する場合：

- [ ] API Key は `.env` に `YOUTUBE_API_KEY` として格納、コードにハードコード禁止
- [ ] `.env.example` にプレースホルダー追加
- [ ] CI/CD パイプラインの環境変数に追加（Railway / Vercel）
- [ ] API Key にはリファラー制限を設定（Google Cloud Console）
- [ ] 読み取り専用スコープのみ使用（`youtube.readonly`）

### 1-4. OEmbed レスポンス検証 — MEDIUM

- [ ] YouTube OEmbed API (`https://www.youtube.com/oembed`) のレスポンスを信頼する前にサニタイズ
- [ ] 返される HTML（iframe タグ）の `src` ドメインがホワイトリストに一致するか検証
- [ ] XSS 防止: OEmbed レスポンスの HTML をそのまま `dangerouslySetInnerHTML` せず、許可属性のみ抽出

---

## 2. note展開 セキュリティ要件

### 2-1. CSP frame-src 追加 — HIGH

note 記事を poker_sns 内に埋め込む場合（将来的）：

| 設定箇所 | 追加ドメイン |
|----------|-------------|
| `backend/src/main.ts` Helmet `frameSrc` | `https://note.com` |
| `nginx-prod.conf` CSP `frame-src` | `https://note.com` |

**注意:** 埋め込み実装が確定するまでは追加不要。実装時に同時対応。

### 2-2. UTMパラメータ — YouTube と共通

- [ ] `?utm_source=note&utm_medium=article&utm_campaign={article_slug}` 形式を標準化
- [ ] YouTube と同じ検証手順を適用（セクション 1-2 参照）

### 2-3. note 有料記事 決済フロー安全性 — MEDIUM

note プラットフォーム側の決済のため poker_sns 側の直接対応は不要だが：

- [ ] note 記事内 CTA リンクが正規の poker_sns ドメインを指していることを定期確認
- [ ] フィッシング防止: 公式 note アカウントの URL を営業資料・サイト内で明示

### 2-4. 外部リンク遷移のセキュリティ — LOW

- [ ] note 記事への外部リンクに `rel="noopener noreferrer"` が付与されていること
- [ ] Next.js `<Link>` の外部 URL 遷移でタブナビングが発生しないこと確認

---

## 3. 営業活動 セキュリティ要件

### 3-1. 営業資料内の実績データ API — HIGH

営業資料に掲載するサービス実績データ（ユーザー数・投稿数等）の取得方法：

- [ ] 公開統計 API エンドポイント作成時は認証不要でも、レート制限を適用（`limit_req_zone` 追加）
- [ ] 個人情報を含まない集計値のみ返却（ユーザー数、総投稿数、アクティブ率等）
- [ ] キャッシュヘッダー設定（`Cache-Control: public, max-age=3600`）でサーバー負荷軽減
- [ ] SQL インジェクション防止: Prisma の型安全クエリのみ使用（raw query 禁止）

### 3-2. 営業資料 PDF のメタデータ — MEDIUM

- [ ] PDF 作成時に個人情報（作成者名、内部パス等）がメタデータに残らないよう確認
- [ ] 機密情報（内部 KPI、コスト構造）は営業資料に含めない

### 3-3. デモ環境のセキュリティ — HIGH

法人向けデモを実施する場合：

- [ ] デモ用アカウントは本番環境と分離（ステージング環境を使用）
- [ ] デモ用データは匿名化されたテストデータのみ
- [ ] デモ後にセッションを必ず無効化
- [ ] デモ環境の URL が検索エンジンにインデックスされないよう `robots.txt` と `X-Robots-Tag: noindex` 設定

---

## 4. 共通セキュリティ要件

### 4-1. 外部サービス認証情報の管理 — CRITICAL

| サービス | 認証情報 | 保管場所 |
|----------|---------|---------|
| YouTube Data API | API Key | `.env` → `YOUTUBE_API_KEY` |
| Google Analytics | Measurement ID | `.env` → `GA4_MEASUREMENT_ID` |
| note | ログイン情報 | パスワードマネージャー（1Password等） |
| X (Twitter) | API Key/Secret | `.env` → `TWITTER_*` |

- [ ] すべての認証情報は `.env` + シークレットマネージャーで管理
- [ ] `.gitignore` に `.env` が含まれていることを再確認
- [ ] CI/CD（GitHub Actions）ではリポジトリ Secrets を使用
- [ ] 平文でのパスワード記載を禁止（タスク指示書・Slack・ドキュメント含む）

### 4-2. CI/CD パイプライン拡張 — MEDIUM

YouTube/note 連携機能追加時の CI チェック項目：

- [ ] CSP ヘッダー変更時に `security-headers.e2e-spec.ts` のテストを更新
- [ ] 新しい外部ドメイン許可時は PR レビューで DevSecOps 承認必須
- [ ] `npm audit` / `pnpm audit` を定期実行し、新規依存の脆弱性チェック

### 4-3. ログ・モニタリング — MEDIUM

- [ ] YouTube/note 経由の流入ログを nginx アクセスログから集計可能にする
- [ ] CSP violation レポート URI の設定を検討（`report-uri` / `report-to` ディレクティブ）
- [ ] 不正なリファラーからの大量アクセスを検知するアラート設定

---

## 5. 実装優先度マトリクス

| 優先度 | 項目 | タイミング | 担当 |
|--------|------|-----------|------|
| **P0 CRITICAL** | 外部サービス認証情報管理ルール策定 | 即時 | DevSecOps |
| **P0 CRITICAL** | CSP ヘッダー変更（YouTube iframe許可） | OEmbed実装時 | DevSecOps + Dev |
| **P1 HIGH** | UTM パラメータ伝播検証 | チャンネル開設前 | DevSecOps + QA |
| **P1 HIGH** | デモ環境セキュリティ整備 | 営業開始前 | DevSecOps + Ops |
| **P1 HIGH** | 統計API レート制限 | API実装時 | DevSecOps + Dev |
| **P2 MEDIUM** | CI/CD セキュリティテスト更新 | CSP変更時 | DevSecOps |
| **P2 MEDIUM** | OEmbed レスポンスサニタイズ | 埋め込み実装時 | Dev + DevSecOps |
| **P2 MEDIUM** | CSP violation レポート設定 | Phase2 | DevSecOps |
| **P3 LOW** | 外部リンク rel 属性確認 | 定期レビュー | QA |

---

## 6. CSP 変更時の具体的差分（参考）

### backend/src/main.ts — YouTube OEmbed 対応時

```diff
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
-     frameSrc: ["'none'"],
+     frameSrc: ["https://www.youtube.com", "https://www.youtube-nocookie.com", "https://js.stripe.com"],
      upgradeInsecureRequests: [],
    },
  },
- frameguard: { action: 'deny' },
+ frameguard: { action: 'sameorigin' },
```

### nginx-prod.conf — YouTube OEmbed 対応時

```diff
- frame-src https://js.stripe.com;
+ frame-src https://js.stripe.com https://www.youtube.com https://www.youtube-nocookie.com;
```

---

## 7. セキュリティテスト更新要件

`backend/test/security-headers.e2e-spec.ts` に追加すべきテスト：

```typescript
// YouTube OEmbed 対応後に追加
it('CSP frame-src should allow YouTube domains', () => {
  const csp = response.headers['content-security-policy'];
  expect(csp).toContain('frame-src');
  expect(csp).toContain('https://www.youtube.com');
  expect(csp).toContain('https://www.youtube-nocookie.com');
  expect(csp).toContain('https://js.stripe.com');
});

it('X-Frame-Options should be SAMEORIGIN (not DENY) after YouTube embed', () => {
  expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
});
```
