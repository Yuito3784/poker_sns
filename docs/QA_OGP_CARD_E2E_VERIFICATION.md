# QA/QC E2E Verification Plan: OGP Card Rendering on SNS Platforms

**Document Version:** 1.0
**Author:** QA/QC (尾丸)
**Date:** 2026-03-02
**Status:** Ready for execution post-implementation
**Supplements:** `QA_OGP_SHARE_TEST_PLAN.md` (姫森)

---

## 1. Scope

自動投稿されたコンテンツのリンク先（poker_sns投稿詳細ページ）が、各SNSプラットフォーム上で正しくOGPカードとして展開されるかのE2E検証を定義する。

対象プラットフォーム:
- **X (Twitter)**: ツイート内リンクのCard展開
- **YouTube**: 動画説明欄内リンクのプレビュー
- **Instagram**: プロフィールリンク / ストーリーズリンクステッカー

---

## 2. Prerequisite: OGP Implementation Status

### 2.1 Current Coverage (based on Dev audit)

| Page | generateMetadata | Dynamic OG Image | Auto-Post Link Target |
|------|-----------------|-------------------|----------------------|
| `/post/[id]` | DONE | DONE (`opengraph-image.tsx`) | Primary (投稿詳細) |
| `/profile/[username]` | MISSING | MISSING | Secondary (プロフィール) |
| `/lp` | MISSING | MISSING | Marketing (LP経由登録) |
| `/hashtag/[tag]` | MISSING | MISSING | Discovery (ハッシュタグ一覧) |

### 2.2 Blocking Issues (Must fix before E2E execution)

| ID | Issue | Impact on E2E | Owner |
|----|-------|---------------|-------|
| BLOCK-01 | BUG-001: `/posts/:id/meta` doesn't return `_count` → OG image shows engagement stats as 0 | OGI検証でstats表示がすべて0になる | Dev |
| BLOCK-02 | `/lp` page has no metadata export | LP経由のSNS導線でOGPカードが表示されない | Dev |
| BLOCK-03 | `/profile/[username]` has no metadata | ユーザープロフィールリンク共有時にOGPカードなし | Dev |

---

## 3. X (Twitter) OGP Card E2E Tests

### 3.1 Auto-Posted Tweet → OGP Card Verification

| Test ID | Scenario | Steps | Expected Result | Priority |
|---------|----------|-------|-----------------|----------|
| X-OGP-01 | 投稿詳細リンク付きツイートのCard展開 | 1. poker_snsで投稿作成 2. 自動投稿でX にツイート（リンク付き） 3. Xタイムラインでツイート確認 | `summary_large_image`カードが表示: OG画像(1200x630), タイトル, 説明文, ドメイン名 | P0 |
| X-OGP-02 | 画像付き投稿のCard展開 | 画像付き投稿がXに自動投稿された場合 | OG画像（投稿コンテンツ+著者情報のダイナミック画像）が表示される。投稿画像自体ではなくOG画像が優先表示 | P0 |
| X-OGP-03 | ポーカーハンド投稿のCard展開 | ポーカーハンド投稿がXに自動投稿された場合 | OG画像にハンド概要が含まれる、カードタイプは`summary_large_image` | P1 |
| X-OGP-04 | LP/登録ページリンクのCard展開 | 固定プロモツイートにLPリンク含有 | LP用OG画像(マーケティングデザイン)、魅力的なtitle/description表示 | P0 |
| X-OGP-05 | プロフィールリンクのCard展開 | ユーザー紹介ツイートにプロフィールリンク含有 | プロフィール用OG画像（アバター+ユーザー名+bio）、適切なtitle表示 | P1 |

### 3.2 X Card Validator Automated Checks

| Test ID | Check Item | Method | Pass Criteria |
|---------|-----------|--------|---------------|
| X-VAL-01 | `twitter:card` meta tag | Card Validator or curl + parse | 値が `summary_large_image` or `summary` |
| X-VAL-02 | `twitter:title` meta tag | curl + parse | 空でない、"undefined"を含まない |
| X-VAL-03 | `twitter:description` meta tag | curl + parse | 空でない、HTMLタグを含まない、140文字以内 |
| X-VAL-04 | `twitter:image` meta tag | curl + parse | 有効なURL、HTTP 200で画像取得可能 |
| X-VAL-05 | OG画像レスポンス時間 | curl timing | 5秒以内にレスポンス |
| X-VAL-06 | OG画像サイズ | HTTPヘッダーContent-Length | 500KB以下 |
| X-VAL-07 | OG画像寸法 | 画像メタデータ確認 | 1200x630px |

### 3.3 Edge Cases

| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| X-EDGE-01 | 投稿削除後のOGPキャッシュ | Xは既存キャッシュを表示（正常動作）、再スクレイプでフォールバックOG画像 | P2 |
| X-EDGE-02 | 投稿編集後のOGP更新 | ISR revalidate(60s)後に新コンテンツが反映。X側はキャッシュ期限依存 | P2 |
| X-EDGE-03 | 同一URLの連続投稿 | OGPカードは毎回表示される（Xキャッシュ利用） | P2 |
| X-EDGE-04 | HTTPS証明書期限切れ時 | Xクローラーがアクセス拒否 → カードなし表示 → 証明書更新後に復旧 | P1 |

---

## 4. YouTube Description Link E2E Tests

### 4.1 動画説明欄リンクのOGP検証

| Test ID | Scenario | Steps | Expected Result | Priority |
|---------|----------|-------|-----------------|----------|
| YT-OGP-01 | 説明欄の投稿詳細リンク | 1. 自動投稿でYouTube Shorts作成 2. 説明欄にpoker_sns投稿URL記載 3. YouTube上でリンク確認 | リンクがクリッカブル、遷移先でOGPメタデータが正しい | P0 |
| YT-OGP-02 | 説明欄のLPリンク | 説明欄にLP URLを固定テンプレートで含有 | LP URLがクリッカブル、OGPメタデータが正しい | P0 |
| YT-OGP-03 | 動画サムネイルとOG画像の整合性 | サムネイルとOG画像を比較 | ブランドカラー(#c9a84c, #0d1009)が一貫している | P2 |

### 4.2 YouTube Link Preview検証

YouTubeは説明欄リンクに対してOGPカードプレビューを表示しない（テキストリンクのみ）。
ただし以下を検証する:

| Test ID | Check Item | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| YT-LINK-01 | 説明欄URLがクリッカブルか | httpsリンクが自動ハイパーリンク化 | P0 |
| YT-LINK-02 | UTMパラメータ付きURLの正常性 | `?utm_source=youtube&utm_medium=shorts` 付きURLが正しく遷移 | P0 |
| YT-LINK-03 | 遷移先ページの読み込み | リンク先poker_snsページが正常表示（404/500なし） | P0 |
| YT-LINK-04 | 遷移先ページのOGPメタデータ | curl/ブラウザDevToolsでog:title等が正しいことを確認 | P1 |

---

## 5. Instagram Link E2E Tests

### 5.1 Instagramのリンク制約

Instagramはフィード投稿・Reelsキャプションにクリッカブルリンクを設置できない。
リンク導線は以下に限定される:

| Link Location | Clickable | OGP Card | Verification Method |
|---------------|-----------|----------|---------------------|
| プロフィールのWebサイトURL | Yes | No (Instagram UI内) | 直接確認 |
| ストーリーズのリンクステッカー | Yes | No (Instagram UI内) | 直接確認 |
| Bio内リンク（Linktree等） | Yes | No | 直接確認 |
| キャプション内URL | No (text only) | N/A | N/A |

### 5.2 プロフィールリンク経由のOGP検証

| Test ID | Scenario | Steps | Expected Result | Priority |
|---------|----------|-------|-----------------|----------|
| IG-OGP-01 | プロフィールWebサイトURLからの遷移 | 1. Instagramプロフィールにpoker_sns LP URL設定 2. URLタップ 3. Instagram内ブラウザで表示確認 | LP ページが正常表示、OGPメタデータが設定されている | P0 |
| IG-OGP-02 | ストーリーズリンクステッカー経由 | 1. ストーリーにリンクステッカー(poker_sns投稿URL)を設置 2. ステッカータップ | 投稿詳細ページが正常表示、OGPメタデータが正しい | P1 |
| IG-OGP-03 | Instagram内ブラウザでのOGP表示 | Instagramアプリ内WebView でページ閲覧 | ページレイアウト崩れなし、機能（ログイン、登録）が動作する | P0 |

### 5.3 Instagram In-App Browser Compatibility

| Test ID | Check Item | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| IG-BROWSER-01 | LP ページレイアウト | レスポンシブデザインがWebViewで崩れない | P0 |
| IG-BROWSER-02 | CTA ボタン動作 | 「無料で始める」ボタンが正常にナビゲーション | P0 |
| IG-BROWSER-03 | 外部ブラウザ遷移 | 「Safariで開く」等でフルブラウザに切替可能 | P1 |
| IG-BROWSER-04 | Cookie / localStorage | Instagram WebViewでのauth token保存が動作するか | P1 |
| IG-BROWSER-05 | Google/LINE OAuth | Instagram WebView内でOAuthフローが完了するか（ポップアップブロック回避） | P1 |

---

## 6. Cross-Platform OGP Consistency Tests

### 6.1 同一投稿の各プラットフォーム表示比較

| Test ID | Check Item | X | YouTube | Instagram (遷移先) | Priority |
|---------|-----------|---|---------|-------------------|----------|
| CROSS-01 | og:title の一致 | Card title | N/A (text link) | ブラウザタブタイトル | P1 |
| CROSS-02 | og:description の一致 | Card description | N/A | meta description | P1 |
| CROSS-03 | og:image の一致 | Card画像 | N/A | N/A | P1 |
| CROSS-04 | URL正規化 | canonical URL | 説明欄URL | プロフィールURL | P0 |
| CROSS-05 | UTMパラメータ差分 | utm_source=twitter | utm_source=youtube | utm_source=instagram | P0 |

### 6.2 OGP Crawler Response Time

| Test ID | Target Page | Crawler UA | Max Response Time | Priority |
|---------|-------------|-----------|-------------------|----------|
| PERF-01 | `/post/[id]` | Twitterbot/1.0 | 3s (OG image), 500ms (HTML) | P0 |
| PERF-02 | `/post/[id]` | facebookexternalhit/1.1 | 3s (OG image), 500ms (HTML) | P1 |
| PERF-03 | `/lp` | Twitterbot/1.0 | 3s (OG image), 500ms (HTML) | P0 |
| PERF-04 | `/post/[id]` | Googlebot | 500ms (HTML) | P2 |
| PERF-05 | Concurrent 10 OG image requests | Mixed crawlers | 5s average, no 503 | P1 |

---

## 7. Automated E2E Test Implementation Recommendations

### 7.1 OGP Meta Tag Automated Verification Script

```bash
#!/bin/bash
# Usage: ./verify-ogp.sh <url>
# Verifies OGP meta tags are present and valid

URL=$1
echo "=== OGP Verification: $URL ==="

# Fetch with crawler user-agent
HTML=$(curl -sL -A "Twitterbot/1.0" "$URL")

# Extract OGP tags
OG_TITLE=$(echo "$HTML" | grep -oP 'property="og:title" content="\K[^"]+')
OG_DESC=$(echo "$HTML" | grep -oP 'property="og:description" content="\K[^"]+')
OG_IMAGE=$(echo "$HTML" | grep -oP 'property="og:image" content="\K[^"]+')
OG_URL=$(echo "$HTML" | grep -oP 'property="og:url" content="\K[^"]+')
TW_CARD=$(echo "$HTML" | grep -oP 'name="twitter:card" content="\K[^"]+')

# Validate
PASS=0; FAIL=0

check() {
  if [ -n "$2" ]; then
    echo "  PASS: $1 = $2"
    ((PASS++))
  else
    echo "  FAIL: $1 is empty"
    ((FAIL++))
  fi
}

check "og:title" "$OG_TITLE"
check "og:description" "$OG_DESC"
check "og:image" "$OG_IMAGE"
check "og:url" "$OG_URL"
check "twitter:card" "$TW_CARD"

# Verify OG image is accessible
if [ -n "$OG_IMAGE" ]; then
  IMG_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$OG_IMAGE")
  if [ "$IMG_STATUS" = "200" ]; then
    echo "  PASS: og:image returns HTTP 200"
    ((PASS++))
  else
    echo "  FAIL: og:image returns HTTP $IMG_STATUS"
    ((FAIL++))
  fi
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

### 7.2 Jest E2E Test Skeleton (Backend OGP endpoints)

```typescript
// backend/test/ogp.e2e-spec.ts (recommended, not implemented)
describe('OGP Meta Endpoints (E2E)', () => {
  it('GET /posts/:id/meta should return public post metadata', async () => {
    const res = await request(app.getHttpServer())
      .get(`/posts/${testPostId}/meta`)
      .expect(200);
    expect(res.body).toHaveProperty('author');
    expect(res.body).toHaveProperty('content');
    expect(res.body.author).toHaveProperty('username');
  });

  it('GET /posts/:id/meta with invalid ID should return 404', async () => {
    await request(app.getHttpServer())
      .get('/posts/invalid-uuid/meta')
      .expect(404);
  });

  it('GET /posts/:id/meta should not expose sensitive data', async () => {
    const res = await request(app.getHttpServer())
      .get(`/posts/${testPostId}/meta`)
      .expect(200);
    expect(res.body).not.toHaveProperty('email');
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(res.body)).not.toMatch(/token/i);
  });
});
```

---

## 8. Manual Verification Checklist

実装完了後、以下を手動確認:

### 8.1 X (Twitter)

- [ ] Card Validator (`cards-dev.twitter.com/validator`) で投稿詳細URLを検証
- [ ] 実際のツイートで投稿詳細リンクのカード展開を確認
- [ ] カード画像の品質確認（文字が読める、ブランドカラー一致）
- [ ] 日本語テキストの文字化けなし
- [ ] LP URLのカード展開を確認

### 8.2 YouTube

- [ ] 説明欄のURLがクリッカブルであることを確認
- [ ] URLタップ後の遷移先が正しいことを確認
- [ ] UTMパラメータ付きURLが正常動作することを確認

### 8.3 Instagram

- [ ] プロフィールWebサイトURLからの遷移を確認
- [ ] Instagram内ブラウザでのページ表示を確認
- [ ] CTAボタンの動作を確認
- [ ] レスポンシブデザインの崩れがないことを確認

---

## 9. Known Limitations & Out of Scope

| Item | Reason |
|------|--------|
| Facebook OGP Card検証 | Facebook共有は自動投稿スコープ外（今回はX/YouTube/IGのみ） |
| LINE OGP Card検証 | LINE自動投稿は今回のスコープ外（既存のシェアボタンはQA_OGP_SHARE_TEST_PLAN.mdでカバー済み） |
| Instagram Feed投稿内リンク | Instagramの仕様上クリッカブルリンク不可 |
| YouTube動画内リンクカード | YouTube Cards / End Screens はAPI未対応（手動設定必要） |
| OGPキャッシュ強制パージ | 各プラットフォームのキャッシュ戦略に依存、制御不可 |

---

## 10. Dependencies

| Dependency | Owner | Status | Impact |
|------------|-------|--------|--------|
| BUG-001修正（`_count` in meta endpoint） | Dev | Pending | OG画像のengagement stats検証ブロック |
| `/lp` OGPメタデータ実装 | Dev | Pending | X-OGP-04, IG-OGP-01 ブロック |
| `/profile/[username]` OGPメタデータ実装 | Dev | Pending | X-OGP-05 ブロック |
| OG画像デザインテンプレート3サイズ | Design | Done | 画像品質検証の基準 |
| OAuthトークン暗号化ストア設計 | DevSecOps | Pending | SEC関連テストの基準 |
| UTMパラメータ保持実装 | Dev | Pending | CROSS-05 のUTMパラメータ差分検証 |

---

## Appendix: Test Execution Priority Order

```
Phase 1 (OGP実装直後 - 即座に実行):
  1. X-VAL-01〜07   : メタタグ自動検証
  2. PERF-01〜03     : レスポンス時間計測
  3. CROSS-04〜05    : URL正規化・UTM検証

Phase 2 (自動投稿MVP完成後):
  4. X-OGP-01〜05    : X Card展開の目視確認
  5. YT-OGP-01〜03   : YouTube説明欄リンク検証
  6. YT-LINK-01〜04  : リンク遷移検証

Phase 3 (Instagram API連携後):
  7. IG-OGP-01〜03   : Instagram経由の遷移検証
  8. IG-BROWSER-01〜05: In-App Browser互換性検証

Phase 4 (本番デプロイ後):
  9. X-EDGE-01〜04   : エッジケース検証
  10. CROSS-01〜03    : クロスプラットフォーム整合性
  11. PERF-05         : 負荷テスト
```
