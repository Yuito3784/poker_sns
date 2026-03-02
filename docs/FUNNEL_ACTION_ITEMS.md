# 導線改善 — 実装アクション一覧（優先度付き）

> 常闇 (Planning) / 2026-03-02
> 参照: docs/FUNNEL_JOURNEY_MAP.md

---

## P0（今週中に着手すべき）

### ACTION-01: UTMパラメータ保持ロジック

**目的:** 外部SNSからの流入元を記録し、チャネル別ROASを計測可能にする

**フロントエンド変更:**
- `frontend/src/app/lp/page.tsx`: ページマウント時にURLからUTM抽出 → sessionStorage保存
- `frontend/src/app/components/AuthForm.tsx`: 登録API呼び出し時にsessionStorageからUTM取得 → bodyに含める
- OAuth経路: OAuth stateパラメータにUTM情報を含めるか、sessionStorageから復元

**バックエンド変更:**
- `prisma/schema.prisma`: Userモデルに追加
  - `referralSource String?` (x, note, youtube, google, direct)
  - `referralMedium String?` (social, article, video, search)
  - `referralCampaign String?`
- `backend/src/auth/auth.service.ts`: register() でreferral情報を保存
- `backend/src/auth/dto/register.dto.ts`: referralSource等をオプショナルで追加

**検証基準:** LP?utm_source=x経由で登録 → DBのUserレコードにreferralSource="x"が保存されること

---

### ACTION-02: /pricing ページ新設

**目的:** 課金検討ユーザーに専用の比較・意思決定ページを提供する

**新規ファイル:** `frontend/src/app/pricing/page.tsx`

**ページ構成:**
1. ヘッダー: 「あなたのポーカーを、次のレベルへ。」
2. 2カラム比較テーブル（Free vs Premium ¥980/月）
3. Premium CTA → Stripe checkout API呼び出し（要認証）
   - 未ログインユーザー → 「無料登録してからPremiumを開始」→ /lp or AuthForm
4. FAQ（解約方法、支払い方法、返金ポリシー）
5. 「まずは無料で始める」セカンダリCTA

**リンク設置箇所:**
- グローバルナビゲーション（ログイン済みFreeユーザーに表示）
- LP内のPremiumセクションCTA
- 設定ページのPremiumカード
- 文字数制限モーダル（ACTION-03）

**デザイン:** The Felt Table テーマ準拠。CTAボタンは `#c9a84c` 背景 + `#0d1009` テキスト。

---

### ACTION-03: 文字数制限ヒット時のPremium誘導モーダル

**目的:** 投稿時の自然なフラストレーションを課金動機に転換する

**変更ファイル:** `frontend/src/app/page.tsx`（投稿フォーム部分）

**仕様:**
- Freeユーザーが280文字に到達した時点でモーダルをオーバーレイ表示
- モーダル内容:
  - 「もっと詳しく書きたい？」
  - 「Premiumなら1,000文字まで投稿可能」
  - CTA: 「Premiumを見る」→ /pricing
  - セカンダリ: 「このまま投稿する」→ モーダルを閉じる
- 表示頻度制限: 1日1回まで（localStorageで制御）
- モーダル表示イベントをGA4に送信（ACTION-04実装後）

---

### ACTION-04: Google Analytics 4 導入

**目的:** ファネル全体の計測基盤を構築する

**変更ファイル:** `frontend/src/app/layout.tsx`

**設置内容:**
- GA4 gtag.jsスクリプトタグ追加
- 測定ID: 環境変数 `NEXT_PUBLIC_GA_MEASUREMENT_ID` から取得

**カスタムイベント定義:**
| イベント名 | トリガー | パラメータ |
|-----------|---------|-----------|
| `page_view` | 各ページ表示 | page_path, utm_source |
| `sign_up` | 登録完了 | method (email/x/google/line), utm_source |
| `login` | ログイン | method |
| `post_create` | 投稿作成 | is_poker_hand, char_count |
| `premium_modal_view` | 課金モーダル表示 | trigger (char_limit/ad_card) |
| `pricing_page_view` | /pricing 表示 | utm_source |
| `checkout_start` | Stripe checkout開始 | utm_source |
| `subscription_complete` | 課金完了 | utm_source, plan |
| `affiliate_click` | アフィリエイトクリック | partner_slug, referrer |

---

### ACTION-05: LP CTAリンクの改善

**目的:** LP内の全CTAが `/` へ遷移する現状を改善し、UTMを保持する

**変更ファイル:** `frontend/src/app/lp/page.tsx`

**変更内容:**
- 「無料アカウントを作成」CTA: `href="/"` → `href="/?register=true"` + UTM保持
- 「Premiumを試す」CTA: `href="/"` → `href="/pricing"` + UTM保持
- 「ログイン」リンク: `href="/"` は維持（既存ユーザーなので）
- 「パートナー申請」CTA: `mailto:` は維持

---

## P1（Phase 1完了後、2週間以内）

### ACTION-06: 広告カード下部「広告非表示にする」リンク

**変更ファイル:** `frontend/src/app/components/AdCard.tsx`
- Freeユーザー向けに広告カード下部にテキストリンク追加
- 「広告を非表示にする →」→ /pricing へ遷移
- Premium/canceledユーザーには表示しない（既存ロジックで広告自体が非表示）

### ACTION-07: オンボーディングフロー

**目的:** 登録直後のユーザーを活性化し、継続利用と課金への橋渡しをする

**新規ファイル:** `frontend/src/app/components/OnboardingFlow.tsx`

**フロー:**
1. 初回ログイン検知（User.createdAtが24時間以内 or フラグ）
2. ウェルカムモーダル: 「ポーカーSNSへようこそ」
3. プロフィール設定促進: アバター + 自己紹介
4. 最初の投稿チュートリアル: ポーカーハンドフォームの使い方
5. おすすめユーザー表示: フォロー促進
6. 完了後: 「Premiumで更に深く」バナー（dismissible）

### ACTION-08: OGP動的画像生成の拡充

**変更ファイル:** `frontend/src/app/post/[id]/opengraph-image.tsx`（既存の拡充）

**改善内容:**
- ポーカーハンド投稿: ハンド情報（ヒーローハンド、ブラインド、結果）をカード画像に描画
- ブランドロゴ + 「Poker SNSで議論中」テキスト入り
- XシェアURLに `?utm_source=x&utm_medium=share` 自動付与

### ACTION-09: X自動投稿bot

**参照:** `docs/SNS_AUTO_POST_TECHNICAL_SPEC.md`（既存仕様書）
- 話題のハンド投稿を1日3-5回X自動投稿
- OGP画像付きでCTR向上
- リンク先: `pokersns.jp/post/{id}?utm_source=x&utm_medium=bot`

---

## P2（1ヶ月以内）

### ACTION-10: 紹介コードシステム

**DBスキーマ追加:**
- `User.referralCode String @unique` — ユニークな8文字コード自動生成
- `User.referredBy String?` — 紹介者のreferralCode
- `Referral { id, referrerId, refereeId, rewardGranted, createdAt }`

**報酬設計:**
- 紹介者: Premium 1週間無料延長
- 被紹介者: Premium 1週間無料トライアル
- 上限: 月10件まで（不正防止）

### ACTION-11: メールドリップキャンペーン

**トリガーメール:**
| タイミング | 件名 | 内容 |
|-----------|------|------|
| 登録直後 | ようこそ！最初のハンドを投稿しよう | チュートリアル誘導 |
| 3日後（未投稿） | まだ投稿していませんか？ | 投稿のメリット訴求 |
| 7日後（Free） | Premiumで更に深く | Premium特典紹介 + 限定割引？ |
| 14日後（Free） | 〇〇さんの投稿が話題です | コミュニティ価値訴求 |
| 30日後（Free） | 最後のお知らせ | 最終課金誘導 |

### ACTION-12: アフィリエイトコンバージョン紐付け

**目的:** アフィリエイトパートナーに「紹介経由の登録数・課金数」を報告可能にする

**変更内容:**
- AffiliateClickにconversionType追加（click, register, subscribe）
- LP到着時のreferrerがアフィリエイトパートナーの場合、セッションに保存
- 登録・課金時にAffiliateClickレコードを追加作成

---

## 全体タイムライン

```
Week 1: ACTION-01〜05（計測基盤 + 最低限導線）
Week 2-3: ACTION-06〜09（課金最適化 + コンテンツ配信）
Week 4+: ACTION-10〜12（グロース施策）
```

**月100万円達成までの想定:**
- Month 1-2: 基盤構築、コンテンツ配信開始 → MRR ¥5-10万
- Month 3-4: 外部流入本格化、課金率改善 → MRR ¥20-30万
- Month 6+: バイラル + リテンション安定 → MRR ¥50万+
- Month 12: Premium 500人 + 広告 + アフィリエイト → MRR ¥100万

---

*各ACTIONの詳細仕様は担当者が着手時に確認し、不明点はこのドキュメントにコメントしてください。*
