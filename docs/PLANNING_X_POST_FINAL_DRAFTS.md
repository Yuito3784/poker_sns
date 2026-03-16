# X投稿文案 最終ドラフト — @poker93626

> Planning Team / 常闇 作成 / 2026-03-07
> 目的: OGPメタタグ棚卸し結果と突合済みの投稿文案（即投稿可能版）
> 依拠: `docs/X_INITIAL_CONTENT_PLAN.md`, 各ページOGP実装値

---

## 1. OGPメタタグ実装値 棚卸し一覧

### トップページ `/`（layout.tsx）
| 項目 | 設定値 |
|------|--------|
| og:title | `Poker SNS - ポーカーハンドを共有しよう` |
| og:description | `ポーカーハンドを共有・議論できるSNS。プレイを振り返り、戦略を磨こう。` |
| og:type | `website` |
| og:locale | `ja_JP` |
| og:site_name | `Poker SNS` |
| og:image | **未設定** |
| twitter:card | `summary_large_image` |
| twitter:title | `Poker SNS - ポーカーハンドを共有しよう` |
| twitter:description | `ポーカーハンドを共有・議論できるSNS。プレイを振り返り、戦略を磨こう。` |
| twitter:image | **未設定** |

### LP `/lp`（lp/page.tsx）
| 項目 | 設定値 |
|------|--------|
| og:title | `Poker SNS - 日本初のポーカー特化SNS` |
| og:description | `ポーカーハンドを構造化して投稿・共有。ハンドレビュー、GTO戦略の議論、プレイヤーコミュニティで上達を加速。` |
| og:type | `website` |
| og:url | `{SITE_URL}/lp` |
| og:locale | `ja_JP` |
| og:image | **未設定**（※ 別ブランチ `climpire/fa6af105` で `opengraph-image.tsx` 追加作業中） |
| twitter:card | `summary_large_image` |
| twitter:title | `Poker SNS - 日本初のポーカー特化SNS` |
| twitter:description | `ポーカーハンドを構造化して投稿・共有。ハンドレビュー・戦略議論で上達を加速。` |
| twitter:image | **未設定**（※ 別ブランチで `twitter-image.tsx` 追加作業中） |

### 投稿詳細 `/post/[id]`（post/[id]/page.tsx）
| 項目 | 設定値 |
|------|--------|
| og:title | `{author.name}(@{author.username})の投稿 - Poker SNS`（動的） |
| og:description | 投稿本文の先頭140文字（動的） |
| og:type | `article` |
| og:url | `{SITE_URL}/post/{id}` |
| og:image | 投稿画像がある場合は `{API_BASE}{post.imageUrl}`、なければ**未設定** |
| twitter:card | `summary_large_image` |
| twitter:image | 投稿画像がある場合のみ設定 |

### プロフィール `/profile/[username]`（profile/[username]/page.tsx）
| 項目 | 設定値 |
|------|--------|
| og:title | `{user.name}(@{user.username}) - Poker SNS`（動的） |
| og:description | ユーザーbioの先頭140文字、またはデフォルトテキスト（動的） |
| og:type | `profile` |
| og:url | `{SITE_URL}/profile/{username}` |
| og:image | **未設定**（※ アバター画像をog:imageに設定していない） |
| twitter:card | `summary_large_image` |
| twitter:image | **未設定** |

---

## 2. OGP課題サマリ

| # | 課題 | 重要度 | 影響 |
|---|------|--------|------|
| 1 | トップページ og:image 未設定 | **CRITICAL** | XカードにサムネイルなしでCTR低下 |
| 2 | LP og:image 未設定 | **CRITICAL** | 別ブランチで対応中（`climpire/fa6af105`） |
| 3 | プロフィール og:image 未設定 | MEDIUM | 共有時にサムネイルなし |
| 4 | 画像なし投稿のデフォルトog:image 未設定 | HIGH | 画像なし投稿の共有でサムネイルなし |

> **投稿文案への影響**: URL付き投稿（#01, #05, #08, #10）は、OGPカード表示がX上でのCTRに直結する。og:image対応完了後に投稿することを推奨。og:imageが未設定のまま投稿すると、Xカードに画像が表示されず訴求力が大幅に低下する。

---

## 3. 投稿文案 最終版（即投稿可能）

以下、OGP突合結果を踏まえ、URL含む投稿はOGPカード展開を前提とした文面に調整済み。

> **注意**: `pokersns.example.com` は本番URL確定後に差し替えること。
> UTMパラメータは全URL統一: `?utm_source=x&utm_medium=social&utm_campaign=launch`

---

### Post #01 — 固定ツイート / サービス紹介
**投稿タイミング**: 初回投稿時（固定ツイートに設定）
**OGP依存**: あり（LP og:image必須 → 別ブランチ対応待ち）
**文字数**: 109文字（URL除く）

```
日本初、ポーカー特化SNS「Poker SNS」

ハンドヒストリーを構造化して投稿
戦略議論・ハンドレビューに最適化
GTO勢もライブ勢も集まる場所

無料で今すぐ始める
https://pokersns.example.com/lp?utm_source=x&utm_medium=social&utm_campaign=launch

#ポーカー #poker #PokerSNS #テキサスホールデム
```

---

### Post #02 — ポーカーTips（UTGレンジ）
**投稿タイミング**: Day 1 / 7:00
**OGP依存**: なし（URLなし投稿）
**文字数**: 130文字

```
朝のポーカーTips

UTGからのオープンレンジ、広すぎていませんか?

6maxなら上位15%程度が目安。
AA-66, AKo-ATo, KQo, AKs-A2s, KQs-KTs, QJs-QTs

後ろのポジションが多いほど、タイトに。

#ポーカー #GTO #ポーカー戦略
```

---

### Post #03 — ハンドレビュー（投票型）
**投稿タイミング**: Day 1 / 12:00
**OGP依存**: なし
**文字数**: 118文字
**補足**: X投票機能で4択設定（Check / Bet 1/3 pot / Bet 2/3 pot / All-in）

```
このスポット、あなたならどうする?

NL200 6max
Hero: BTN A♠K♠
CO opens 2.5bb
Hero 3bet 8bb
CO calls

Flop: J♠ 9♠ 4♥
CO checks

あなたのアクションは?

#ポーカー #ハンドレビュー #poker
```

---

### Post #04 — ポーカー名言
**投稿タイミング**: Day 2 / 7:00
**OGP依存**: なし
**文字数**: 105文字

```
"Poker is a skill game pretending to be a chance game."
— James Altucher

短期的な結果に一喜一憂せず、正しい判断を積み重ねる。
それがポーカーの本質。

#ポーカー #poker #テキサスホールデム
```

---

### Post #05 — サービス機能訴求
**投稿タイミング**: Day 2 / 18:00
**OGP依存**: あり（トップページ og:image必須）
**文字数**: 124文字（URL除く）

```
ハンドレビューの投稿、テキストだけで伝わってますか?

Poker SNSなら
- プリフロップからリバーまで構造化して記録
- スート、ポジション、アクションを見やすく表示
- コメントで戦略議論

Twitterでは伝えきれないハンドの深みを。

#ポーカー #PokerSNS #ハンドレビュー
```

---

### Post #06 — 業界ニュース/トレンド
**投稿タイミング**: Day 3 / 18:00
**OGP依存**: なし
**文字数**: 118文字

```
2026年のポーカートーナメントシーズンが本格化

JOPT、WPT、各地のライブイベント...
今年のトーナメント遠征予定、もう立てましたか?

トーナメントレポートの共有は Poker SNS で。
仲間と振り返る場があると、上達も早い。

#ポーカー #JOPT #ポーカー大会 #poker
```

---

### Post #07 — ポーカーTips（初心者向け）
**投稿タイミング**: Day 3 / 7:00
**OGP依存**: なし
**文字数**: 135文字

```
ポーカー始めたばかりの人へ

まず覚えるべき3つのこと:
1. ポジションの重要性（後ろほど有利）
2. ハンドレンジの概念（全部のハンドでは参加しない）
3. ポットオッズの計算（コールするかの判断基準）

この3つだけでテーブルでの立ち回りが変わります。

#ポーカー #テキサスホールデム #poker
```

---

### Post #08 — ハンドレビュー（誘導型）
**投稿タイミング**: Day 4 / 21:00
**OGP依存**: あり（投稿詳細ページ。画像付き投稿ならog:imageあり）
**文字数**: 132文字

```
リバーで難しい判断を迫られたハンド

NL100 6max
Hero: SB K♥Q♥
vs BB

Board: K♠ 8♥ 3♦ 7♥ 2♠
Pot: 12bb

Heroがbet、BBがraise 3x。

ここでcallする? fold?

詳しい分析をPoker SNSに投稿しました。プロフィールのリンクから。

#ポーカー #ハンドレビュー #GTO
```

---

### Post #09 — コミュニティ形成（投票型）
**投稿タイミング**: Day 4 / 12:00
**OGP依存**: なし
**文字数**: 98文字
**補足**: X投票機能で4択設定

```
ポーカーの上達に一番効いたものは?

1. ソルバー(GTO Wizard, PIO等)での学習
2. 実戦でのハンド数を積む
3. 仲間とのハンドレビュー
4. 動画/記事でのインプット

リプで教えてください。

#ポーカー #poker #ポーカー戦略
```

---

### Post #10 — Premium訴求
**投稿タイミング**: Day 5 / 21:00
**OGP依存**: あり（LPまたはトップページのog:image必須）
**文字数**: 100文字（URL除く）

```
Poker SNS Premiumで、もっと深い戦略共有を。

- 1000文字までの長文投稿
- 広告非表示
- Premiumバッジ
- 優先サポート

本気でポーカーに向き合う人のためのプラン。

#ポーカー #PokerSNS #poker
```

---

## 4. 投稿優先順位（OGP対応状況に基づく）

### Phase 1 — 即時投稿可能（OGP依存なし: 6本）

| 順序 | Post # | カテゴリ | 投票機能 |
|------|--------|----------|----------|
| 1 | #02 | Tips（UTGレンジ） | 不要 |
| 2 | #03 | ハンドレビュー | 4択投票 |
| 3 | #04 | 名言 | 不要 |
| 4 | #07 | 初心者Tips | 不要 |
| 5 | #09 | コミュニティ | 4択投票 |
| 6 | #06 | 業界ニュース | 不要 |

### Phase 2 — og:image対応完了後に投稿（4本）

| 順序 | Post # | カテゴリ | 前提条件 |
|------|--------|----------|----------|
| 7 | #01 | 固定ツイート（サービス紹介） | LP og:image 設定完了 |
| 8 | #05 | 機能訴求 | トップページ og:image 設定完了 |
| 9 | #08 | ハンドレビュー誘導 | 投稿詳細ページに画像付き投稿を事前作成 |
| 10 | #10 | Premium訴求 | LP og:image 設定完了 |

---

## 5. Devチームへの申し送り事項

1. **og:image対応が最優先**: トップページ・LP・デフォルトフォールバックの3つを早急に設定してください
2. **本番URL確定次第通知を**: 投稿文案内の `pokersns.example.com` を差し替えます
3. **`climpire/fa6af105` ブランチのog:image実装**: LP用 `opengraph-image.tsx` / `twitter-image.tsx` のマージ状況を共有してください
4. **X Card Validatorでの事前検証**: og:image設定後、各ページURLをValidatorに通してキャッシュを更新してください

---

## 6. QAチームへの申し送り事項

1. 投稿前に `docs/QA_SNS_POST_PREFLIGHT_CHECKLIST.md` に基づく最終チェックを実施
2. 特にUTMパラメータの `utm_campaign=launch` が全URLで統一されているか確認
3. OGPカード展開テストはX Card Validator (https://cards-dev.twitter.com/validator) で実施

---

*Planning / 常闇 — 2026-03-07*
