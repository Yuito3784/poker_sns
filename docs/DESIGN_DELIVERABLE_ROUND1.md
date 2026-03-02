# Design Team Deliverable - Round 1 Consolidated Report

> Design Team / 不知火 (Junior) + 宝鐘 (Lead) / 2026-03-02
> CEO方針: X・YouTube・Instagram Reels自動投稿でpoker_snsへの流入最大化

---

## Executive Summary

Design チームの本ラウンド成果物は以下の3本柱。

1. **SNS Multi-Platform Template Spec Sheet** — OGP(1200x630) / YouTube(1280x720) / Instagram Reels(1080x1920) の3サイズテンプレートデザイン仕様
2. **Cross-Platform Visibility Check Criteria** — 各SNSフィードでの視認性検証基準
3. **Security & Privacy UI Consolidated IA** — セキュリティ関連UI導線の現状マッピングと統合設計

---

## Deliverable 1: SNS Template Spec Sheet

**File**: `docs/DESIGN_SPEC_SNS_TEMPLATES.md`

### Summary

| Template | Size | Variants | Status |
|----------|------|----------|--------|
| OGP Card (A) | 1200x630 | A-1 Post, A-2 Profile, A-3 Default | A-1,A-3 DONE / A-2 TODO |
| YouTube Thumbnail (B) | 1280x720 | B-1 Hand, B-2 Strategy | SPEC READY |
| Instagram Reels Cover (C) | 1080x1920 | C-1 Hand, C-2 Tips | SPEC READY |

### Brand Consistency

全テンプレートで以下を厳守:
- Background: `linear-gradient(135deg, #0d1009, #131a14, #0d1009)`
- Gold accent: `#c9a84c` (primary) / `#9a7c35` (dim)
- Text: `#ddd6c8` (primary) / `#7a7260` (secondary)
- Logo: ♠ Poker SNS（全テンプレートに1箇所以上配置）
- Font: Playfair Display (display) + Noto Sans JP (body)
- Suit watermark: ♠♥♦♣ opacity 0.03

### YouTube / Instagram 固有仕様

| Platform | Safe Zone | 注意点 |
|----------|-----------|--------|
| YouTube | 右下 100x40px (再生時間バッジ) | 縮小表示(168x94px)でも判読可能なフォントサイズ |
| Instagram | 上部 60px + 下部 250px (UIオーバーレイ) | 1:1グリッドクロップでも中央コンテンツ維持 |

### Dev連携: 画像生成方式

| Template | 生成方式 | ライブラリ |
|----------|----------|-----------|
| OGP (A) | Next.js Edge Runtime | `next/og` ImageResponse (既存) |
| YouTube (B) | バックエンド生成 | `@napi-rs/canvas` or `sharp` + SVG |
| Instagram (C) | バックエンド生成 | 同上 |

---

## Deliverable 2: Visibility Check Criteria

**File**: `docs/DESIGN_SPEC_SNS_TEMPLATES.md` Section 4

### Platform-specific Check Matrix

| Platform | Card Size | Check Focus |
|----------|-----------|-------------|
| X (Twitter) | 1200x630 → summary_large_image | Dark mode対応、mobile(375px)での可読性 |
| YouTube | 1280x720 → 168x94px (sidebar) | 縮小時の判読性、再生時間バッジ回避 |
| Instagram | 1080x1920 → 320x568px (grid) | 1:1クロップ中央配置、bottom overlay回避 |
| LINE | 1200x630 → compact card | OGPカード同等 |
| Discord | 1200x630 → embed | Compact embed時の視認性 |

### WCAG Contrast Compliance

| Combination | Ratio | Level |
|-------------|-------|-------|
| #ddd6c8 on #0d1009 | 12.8:1 | AAA |
| #c9a84c on #0d1009 | 7.2:1 | AAA |
| #7a7260 on #0d1009 | 3.8:1 | AA Large |

---

## Deliverable 3: Security UI IA Design

**File**: `docs/DESIGN_SECURITY_UI_IA.md`

### Current State Issues

1. **分散問題**: セキュリティ機能が7箇所に分散（Settings, Profile, Auth pages, Legal pages）
2. **不在機能**: ブロック/ミュート一覧管理、OAuth連携表示、通報機能、セッション管理が未実装
3. **UI一貫性**: パスワードマスクトグルがAuthFormのみ実装（Settings, Reset Passwordにはなし）

### Proposed Architecture

```
/settings
├── [Account]    → Subscription
├── [Security]   → Password / OAuth / Sessions / Account Deletion
└── [Privacy]    → Blocked Users / Muted Users / Legal Links
```

### Implementation Phases

| Phase | Content | Priority |
|-------|---------|----------|
| 1 | Settings Tab UI + 既存機能の再配置 | P0 |
| 2 | Blocked/Muted Users List | P1 |
| 3 | OAuth Connections + Report Feature | P2 |
| 4 | Active Sessions Management | P3 |

---

## Priority Matrix: Design Team Subtasks (全チーム統合用)

兎田リーダー依頼の優先度付きサブタスク一覧。

### P0 (今週着手 — SNS自動投稿の前提条件)

| # | Task | Assignee | Dependency | Status |
|---|------|----------|------------|--------|
| D-1 | OGP Profile画像テンプレート (A-2) 実装仕様確定 | Design | Dev: GET /users/:username/meta endpoint | SPEC DONE |
| D-2 | YouTube Thumbnail テンプレート仕様書 | Design | -- | DONE |
| D-3 | Instagram Reels Cover テンプレート仕様書 | Design | -- | DONE |

### P1 (来週 — SNS自動投稿MVP連携)

| # | Task | Assignee | Dependency | Status |
|---|------|----------|------------|--------|
| D-4 | Settings Tab Navigation ワイヤーフレーム | Design | -- | DONE |
| D-5 | Security Tab / Privacy Tab ワイヤーフレーム | Design | -- | DONE |
| D-6 | Password Mask Toggle 統一仕様 | Design | -- | DONE |
| D-7 | Cross-platform visibility QAチェックリスト | Design → QA | QA: テスト計画 | DONE |

### P2 (再来週以降)

| # | Task | Assignee | Dependency | Status |
|---|------|----------|------------|--------|
| D-8 | Report Feature モーダル UI | Design | Dev: Reports module | SPEC DONE |
| D-9 | OAuth Connections カード UI | Design | Dev: OAuth status API | SPEC DONE |
| D-10 | Active Sessions UI | Design | Dev: Session tracking | SPEC DONE |

---

## Cross-Team Dependencies

### Design → Dev (桃鈴チーム)

| Spec | Needed From Dev | Priority |
|------|----------------|----------|
| Profile OG Image (A-2) | `GET /users/:username/meta` endpoint | P0 |
| YT Thumbnail generation | `@napi-rs/canvas` or `sharp` 導入 + テンプレートレンダラー | P1 |
| IG Reels Cover generation | 同上 | P1 |
| Blocked/Muted Users List | `GET /users/me/blocked`, `GET /users/me/muted` endpoints | P1 |
| Report Feature | `POST /reports` endpoint + Reports module | P2 |

### Design → QA (雪花チーム)

| Spec | QA Action | Priority |
|------|-----------|----------|
| Visibility Check Criteria | OGPカード展開E2E検証（X, YouTube, Instagram, LINE） | P1 |
| Contrast Ratio Table | WCAG準拠検証ツールでの自動チェック | P1 |
| Security UI IA | Tab Navigation + 各セクションのE2Eテスト | P2 |

### Design → DevSecOps (獅白チーム)

| Spec | DevSecOps Action | Priority |
|------|-----------------|----------|
| OG Image endpoints | CDNキャッシュ戦略 + レートリミット設定 | P1 |
| Thumbnail storage | `/uploads/thumbnails/` ディレクトリのアクセス制御 | P1 |

---

## File Index

| Document | Path | Content |
|----------|------|---------|
| SNS Template Spec | `docs/DESIGN_SPEC_SNS_TEMPLATES.md` | 3サイズテンプレート全仕様 + 視認性チェック |
| Security UI IA | `docs/DESIGN_SECURITY_UI_IA.md` | UI導線マッピング + 統合IA + ワイヤーフレーム |
| OGP/Share Spec (既存) | `docs/DESIGN_SPEC_OGP_SHARE.md` | OGP画像 + シェアボタン仕様 (更新不要) |
| This Document | `docs/DESIGN_DELIVERABLE_ROUND1.md` | 統合レポート + 優先度マトリクス |
