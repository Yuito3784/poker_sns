# QA/QC Deliverable: SNS Auto-Post Feature Test Strategy

**Author:** QA/QC (尾丸)
**Date:** 2026-03-02
**Round:** 1 - SNS Auto-Post MVP
**Status:** Complete (テスト設計完了 / 実行待ち)

---

## Executive Summary

SNS自動投稿機能のQA/QC成果物として、以下3つのテスト計画書を策定した。
既存の `QA_OGP_SHARE_TEST_PLAN.md`（姫森）および `qa-report.md` を基盤とし、
Planned会議で提起された2つの補完項目を網羅する。

### 成果物一覧

| # | Document | Test Cases | Coverage |
|---|----------|-----------|----------|
| 1 | `QA_SNS_AUTOPOST_ERROR_HANDLING_TEST.md` | 73件 | APIレート制限、認証トークン失効、リトライ挙動、cron異常系 |
| 2 | `QA_OGP_CARD_E2E_VERIFICATION.md` | 42件 | X/YouTube/Instagram各プラットフォームでのOGPカード展開E2E |
| 3 | `QA_OGP_SHARE_TEST_PLAN.md` (既存) | 47件 | OGPメタタグ、シェアボタン、エンコーディング、セキュリティ |

**合計: 162テストケース**

---

## 補完計画①: 異常系テストケース設計

### 対象: `QA_SNS_AUTOPOST_ERROR_HANDLING_TEST.md`

Planned会議での要件:
> ①各SNS自動投稿のAPIレート制限超過時・認証トークン失効時のエラーハンドリングとリトライ挙動の異常系テストケース設計

#### カバレッジマトリックス

| Category | X (Twitter) | YouTube | Instagram | 共通 | Total |
|----------|-------------|---------|-----------|------|-------|
| Rate Limit | 5 cases | 3 cases | 3 cases | - | 11 |
| Auth Token | 5 cases | 4 cases | 4 cases | - | 13 |
| Content/Media | 5 cases | 4 cases | 5 cases | - | 14 |
| Network/Infra | - | - | - | 5 cases | 5 |
| DB/Queue | - | - | - | 5 cases | 5 |
| Retry Policy | - | - | - | 5 cases | 5 |
| Cron/Scheduler | - | - | - | 5 cases | 5 |
| Security | - | - | - | 5 cases | 5 |
| Status Transition | - | - | - | 9 cases | 9 |
| **Subtotal** | **15** | **11** | **12** | **34** | **73** |

#### P0 (Must-Have) テストケース抜粋

| Test ID | Platform | Scenario | Why P0 |
|---------|----------|----------|--------|
| X-RL-01 | X | HTTP 429受信時のリトライスケジュール | 429無視でBAN→全機能停止リスク |
| X-AUTH-01 | X | Access token expired自動リフレッシュ | トークン失効で自動投稿が完全停止 |
| X-AUTH-02 | X | Refresh token失効時の管理者アラート | 気づかず放置→長期間投稿停止 |
| YT-AUTH-01 | YouTube | Google OAuth token expired | YouTube投稿完全停止 |
| IG-AUTH-01 | Instagram | Long-lived token expired (60日) | 60日後に投稿停止、事前検知必須 |
| NET-03 | 共通 | SSL証明書エラー時の投稿中断 | セキュリティリスク回避 |
| SEC-01 | 共通 | トークンがログに出力されないこと | 情報漏洩リスク |
| CRON-01 | 共通 | cronジョブ2重実行防止 | 重複投稿→アカウントスパム判定リスク |
| CRON-03 | 共通 | 未捕捉例外でプロセス不死 | プロセス死亡→全自動投稿停止 |

#### リトライポリシー設計基準（Dev・Opsチームへの推奨）

```
Retry Policy:
  max_retries: 3
  backoff: exponential (1min → 5min → 15min)
  on_max_retry_exceeded: status = "failed" + admin alert
  on_auth_failure: immediate alert, no blind retry
  on_rate_limit: respect platform reset header
  concurrency_lock: per-platform singleton
```

---

## 補完計画②: OGPカード展開E2E検証

### 対象: `QA_OGP_CARD_E2E_VERIFICATION.md`

Planned会議での要件:
> ②自動投稿されたコンテンツのリンク先（poker_snsの投稿詳細ページ）が正しくOGPカードとして展開されるかのE2E検証を、X・YouTube説明欄・Instagramプロフィールリンクそれぞれで実施

#### プラットフォーム別検証方式

| Platform | OGP Card表示 | 検証方式 | ツール |
|----------|-------------|---------|-------|
| X (Twitter) | summary_large_image Card | Card Validator + 実ツイート確認 | cards-dev.twitter.com |
| YouTube | 説明欄リンク（カードなし） | クリッカブルリンク + 遷移先OGP確認 | ブラウザDevTools |
| Instagram | プロフィールリンク経由 | In-App Browser遷移 + レイアウト確認 | 実機(iOS/Android) |

#### ブロッキングイシュー（E2E実行前に解決必須）

| ID | Issue | Impact | Owner | Priority |
|----|-------|--------|-------|----------|
| BLOCK-01 | `/posts/:id/meta`が`_count`未返却 → OG画像のstatsが常に0 | OG画像品質検証不可 | Dev | P1 |
| BLOCK-02 | `/lp`にOGPメタデータなし | LP経由マーケティング導線のCard検証不可 | Dev | P0 |
| BLOCK-03 | `/profile/[username]`にOGPメタデータなし | ユーザー紹介ツイートのCard検証不可 | Dev | P1 |

#### 自動化可能なチェック項目

OGPメタタグの自動検証スクリプト(`verify-ogp.sh`)を設計済み。
以下を自動チェック可能:
- `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card` の存在確認
- OG画像のHTTPステータス・サイズ・レスポンス時間
- CI/CD統合でデプロイごとの回帰テスト実行が可能

---

## 既存テスト資産との関係

```
qa-report.md (基盤レポート)
├── 既存テストカバレッジ状況
├── セキュリティ回帰テスト項目
└── 手動テストチェックリスト

QA_OGP_SHARE_TEST_PLAN.md (姫森, 既存)
├── OGPメタタグ検証: 9 platform x page tests
├── シェアボタン検証: 8 browser x device tests
├── エンコーディング: 17 edge cases
├── セキュリティ: 5 checks
└── パフォーマンス基準: 4 metrics

QA_SNS_AUTOPOST_ERROR_HANDLING_TEST.md (尾丸, 新規) ← 補完①
├── X API異常系: 15 cases
├── YouTube API異常系: 11 cases
├── Instagram API異常系: 12 cases
├── 共通異常系: 34 cases
└── ステータス遷移検証: 9 cases

QA_OGP_CARD_E2E_VERIFICATION.md (尾丸, 新規) ← 補完②
├── X OGPカード展開: 12 cases
├── YouTube説明欄リンク: 7 cases
├── Instagramリンク遷移: 8 cases
├── クロスプラットフォーム整合: 10 cases
└── パフォーマンス: 5 cases
```

---

## テスト実行フェーズ計画

| Phase | Timing | Scope | Prerequisite |
|-------|--------|-------|--------------|
| **Phase 1** | OGP実装完了直後 | メタタグ自動検証(X-VAL-*), パフォーマンス(PERF-*), URL正規化(CROSS-04/05) | BLOCK-01〜03解消 |
| **Phase 2** | 自動投稿MVP完成後 | X OGPカード展開(X-OGP-*), YouTube説明欄(YT-*), 異常系Unit Test(X-RL/AUTH/CNT-*) | 自動投稿モジュール実装済み |
| **Phase 3** | Instagram API連携後 | Instagram E2E(IG-*), In-App Browser互換(IG-BROWSER-*) | Meta App Review完了 |
| **Phase 4** | 本番デプロイ後 | エッジケース(X-EDGE-*), 負荷テスト(PERF-05), クロスプラットフォーム(CROSS-01〜03) | 本番環境+SSL |

---

## 他チームへの依存・連携事項

### Dev チームへ
- BLOCK-01〜03の早期解消をリクエスト（Phase 1ブロッカー）
- 自動投稿モジュールにリトライポリシー設計基準の反映を推奨
- SnsAutoPostのステータス遷移が`QA_SNS_AUTOPOST_ERROR_HANDLING_TEST.md` Section 9のState Machineと一致することを確認依頼

### DevSecOps チームへ
- SEC-01〜05の検証基準についてレビュー依頼（特にトークンマスキングとサニタイズ要件）
- OAuthトークン暗号化ストア実装後にSEC-02の具体的テスト手順を更新予定

### Design チームへ
- OG画像テンプレート3サイズの最終デザインスペック確定後、OGI-01〜08の期待値を更新予定
- ブランドカラー一貫性チェック(YT-OGP-03)の基準をDesign SPECから参照

### Ops チームへ
- CRON-01〜05のテスト実行にはジョブスケジューラ選定完了が前提
- 障害検知→Slack通知フローの設計完了後、アラート発火テスト(X-AUTH-02等)の通知先を確定

---

## Risk Assessment (QA観点)

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| OGP実装遅延でPhase 1開始不可 | Medium | High | メタタグ自動検証スクリプトを先行準備、実装完了と同時に実行可能な状態にする |
| Instagram App Reviewが長期化 | High | Medium | Phase 3を独立スケジュールとし、X/YouTubeのテスト完了を先行させる |
| 各SNS APIのモック精度不足 | Medium | Medium | 公式APIドキュメントのエラーレスポンス例をモックに忠実に再現する |
| 本番環境でのみ再現する問題 | Medium | High | Staging環境でのOGPクローラーテストを必須化（本番前Gate） |
| テストケース量(162件)に対する実行リソース不足 | Low | Medium | 自動化可能な項目(50件程度)をCI統合し、手動テストは優先度P0/P1に集中 |
