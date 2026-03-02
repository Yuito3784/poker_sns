# Design Deliverable: 動画コンテンツ制作 【動画 #15】

**Date**: 2026-03-02
**担当**: Design (不知火)
**Status**: Completed
**Task**: 3-4-4 ~ 3-4-8 動画コンテンツ制作のDesign成果物

---

## Deliverable Summary

### 成果物一覧

| # | Deliverable | Document | Status |
|---|-------------|----------|--------|
| 1 | 動画テンプレートUI仕様書 (3-4-4) | `docs/DESIGN_VIDEO_TEMPLATE_UI_SPEC.md` | DONE |
| 2 | チャンネル・プロフィールアセット仕様書 (3-4-7, 3-4-8) | `docs/DESIGN_CHANNEL_PROFILE_ASSETS_SPEC.md` | DONE |
| 3 | SNSテンプレート仕様書 (既存・参照) | `docs/DESIGN_SPEC_SNS_TEMPLATES.md` | DONE (prior) |

---

## 1. 動画テンプレートUI仕様書 — Summary

**File**: `docs/DESIGN_VIDEO_TEMPLATE_UI_SPEC.md`

CEOタスク 3-4-4「ポーカーハンド解説動画のテンプレート確立」の完全なUI仕様書。

### Covered Sections

| Video Section | Duration | Key Design Elements |
|---------------|----------|---------------------|
| **Intro (タイトルカード)** | 0:00-0:05 | Series tag, main title, episode tag, animated suit watermarks |
| **Street Play (ローワーサード)** | 0:05-0:45 | Street indicator pill, position pill, lower third gradient overlay, board card visualization, street progress dots |
| **Outro (エンドカードCTA)** | 0:45-1:00 | Best play verdict, Poker SNS logo, gold CTA button, subscribe prompt |

### Key Design Decisions

1. **Canvas**: 1080x1920 (9:16) for YouTube Shorts / Instagram Reels dual use
2. **Theme**: Full "The Felt Table" テーマ踏襲 — #0d1009 background, #c9a84c gold, #ddd6c8 text
3. **Typography**: Playfair Display (display) / Noto Sans JP (body) / Geist Mono (technical)
4. **Safe Zones**: Top 60px (status bar) + Bottom 250px (platform UI) excluded from content
5. **Animation**: Detailed timeline for all transitions (intro reveal, street changes, outro CTA pulse)
6. **Audio**: BGM -18dB, SFX -10~-14dB, Voice -6dB specifications
7. **Variants**: 3 episode types (Standard Hand Review 80%, Quick Spot Check 15%, Bad Beat 5%)
8. **Card Colors**: Spade/Club = #ddd6c8 (ivory), Heart/Diamond = #c9a84c (gold) for brand-consistent contrast

### QA Integration

Pre-publish checklist included covering: resolution, gold color accuracy, safe zone compliance, CTA visibility, font consistency, logo presence, UTM link, thumbnail/cover matching.

---

## 2. チャンネル・プロフィールアセット仕様書 — Summary

**File**: `docs/DESIGN_CHANNEL_PROFILE_ASSETS_SPEC.md`

CEOタスク 3-4-7 / 3-4-8 のチャンネルアセット仕様。

### YouTube Assets (3-4-7)

| Asset | Size | Design |
|-------|------|--------|
| **Banner** | 2560x1440 | Mobile safe zone (1546x423) に brand name + tagline + feature chips。Gold corners + suit watermarks |
| **Icon** | 800x800 | Gold spade + "P" letter mark。Circle crop対応。36px miniまで視認性確保 |
| **Channel Name** | text | "Poker SNS" 推奨 (ブランド直結、SEO最適) |
| **Channel Description** | text | サービス概要 + コンテンツ種別 + ハッシュタグ |
| **Video Description Template** | text | UTMパラメータ付きリンク (`utm_source=youtube&utm_medium=video&utm_campaign=hand_review`) + アフィリエイトリンク枠 |

### Instagram Assets (3-4-8)

| Asset | Size | Design |
|-------|------|--------|
| **Profile Image** | 320x320 | YouTube icon と同一デザインを320pxにスケール |
| **Bio** | text | 150文字以内。ブランド名 + tagline + CTA link |
| **Highlights Covers** (x5) | 1080x1080 | HANDS / TIPS / GTO / NEWS / ABOUT — each with suit icon + label |

### Brand Consistency

Cross-platform brand consistency matrix を定義。YouTube / Instagram / Web App の全チャンネルで以下を統一:
- Gold: #c9a84c
- Background: #0d1009
- Icon: Spade + "P"
- Fonts: Playfair Display / Noto Sans JP / Geist Mono

---

## 3. 補完計画の反映状況

### Design観点の3点補足 (宝鐘リーダー指示) — 対応状況

| 補足項目 | 対応 | 仕様書 |
|----------|------|--------|
| タイトルカード・ローワーサード・エンドカードCTAのデザイン仕様 | DONE | `DESIGN_VIDEO_TEMPLATE_UI_SPEC.md` Sections 1-3 |
| YouTubeバナー(2560x1440)・アイコン | DONE | `DESIGN_CHANNEL_PROFILE_ASSETS_SPEC.md` Section 1 |
| Instagramプロフィール画像 | DONE | `DESIGN_CHANNEL_PROFILE_ASSETS_SPEC.md` Section 2 |

### Planning整理の6件追加要件 — Design関連の対応

| 追加要件 | Design対応 |
|----------|-----------|
| テンプレートUI仕様書 | DONE — 全3セクション + animation timeline + audio spec |
| YouTubeバナー・アイコン制作 | DONE — 仕様書完成。制作ツールでの実制作は次フェーズ |
| QA: 動画公開前チェックリスト (Design部分) | DONE — `DESIGN_VIDEO_TEMPLATE_UI_SPEC.md` Section 9 に統合 |

---

## 4. 他部門連携事項

### Dev チームへ

- Video description template にUTMパラメータ仕様を記載済み: `?utm_source=youtube&utm_medium=video&utm_campaign=hand_review`
- /lp ページでのUTMパラメータ受け取り・トラッキング実装を依頼

### QA チームへ

- 動画公開前チェックリストのDesign項目を `DESIGN_VIDEO_TEMPLATE_UI_SPEC.md` Section 9 に定義済み
- QAチームの包括チェックリストに統合をお願いします

### DevSecOps チームへ

- UTMパラメータのサニタイズ処理確認を依頼（`utm_source`, `utm_medium`, `utm_campaign` のバリデーション）
- 動画説明文に設置するアフィリエイトリンクURLの安全性確認

### Ops チームへ

- 公開スケジュール管理表に必要なDesign観点:
  - サムネイル画像は `DESIGN_SPEC_SNS_TEMPLATES.md` のB-1 / C-1テンプレートを使用
  - 各動画のエピソード番号・ハンド情報は動画説明テンプレートに埋め込み

---

## 5. Next Steps (次フェーズ)

| Task | Priority | Dependency |
|------|----------|------------|
| Figma/Canva でバナー・アイコンの実制作 | P0 | チャンネル名CEO承認後 |
| Instagram Highlights カバー画像の実制作 | P1 | アカウント開設後 |
| 動画テンプレートの After Effects / Premiere Pro プリセット化 | P1 | テンプレート仕様CEO承認後 |
| 初回ハンドレビュー動画のデザイン監修 | P0 | 制作開始時 |
