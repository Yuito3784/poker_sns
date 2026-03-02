# Operations 成果物 - Vercel リリース対応

**担当:** Operations (星街/白上)
**日時:** 2026-03-02
**ラウンド:** Round 1 - CEO指示「GitからVercelでリリース→URL報告」

---

## 1. 成果物一覧

| # | 成果物 | パス | 説明 |
|---|--------|------|------|
| 1 | Vercel ヘルスチェックスクリプト | `scripts/vercel-health-check.sh` | デプロイ後の自動疎通確認 |
| 2 | デプロイ順序ゲート管理手順書 | `docs/ops-vercel-deploy-gate.md` | Phase 1/2 のゲート判定基準とフロー |
| 3 | 本成果物レポート | `docs/ops-deliverable-vercel-release.md` | 統合レポート |

---

## 2. ヘルスチェック自動化

### 概要
`scripts/vercel-health-check.sh` — Vercel URL に対して HTTP 200 確認を自動実行するスクリプト。

### 使用方法
```bash
# Phase 1: フロントエンド疎通のみ
./scripts/vercel-health-check.sh https://poker-sns.vercel.app

# Phase 2: バックエンドAPI込み
./scripts/vercel-health-check.sh https://poker-sns.vercel.app --with-api
```

### 確認対象
- `/` (トップページ) — HTTP 200 + レスポンスボディ100B以上
- `/lp` (ランディングページ) — HTTP 200 + レスポンスボディ100B以上
- `/login` (ログイン画面) — HTTP 200 + レスポンスボディ100B以上

### 既存スクリプトとの関係
- `scripts/health-check.sh` — Docker本番環境用 (cron 5分間隔, Discord通知)
- `scripts/vercel-health-check.sh` — Vercelデプロイ用 (手動/CI実行, 標準出力)

---

## 3. デプロイ順序ゲート管理

### フロー概要

```
Phase 1: Vercel Deploy → Gate1(HTTP200) → Gate2(ビジュアルQA) → Gate3(スモークテスト) → CEO報告
Phase 2: Backend Deploy → Gate4(API疎通) → CEO完全動作報告
```

### Gate判定の責任分担

| Gate | 担当 | 方法 |
|------|------|------|
| Gate 1: HTTP 200 | Operations | `vercel-health-check.sh` 自動実行 |
| Gate 2: ビジュアルQA | Design (宝鐘) | 3画面目視確認 |
| Gate 3: スモークテスト | QA/QC (雪花) | チェックシートに基づく検証 |
| Gate 4: API疎通 | DevSecOps (獅白) | API エンドポイント検証 |

### 15分制約への対応方針
- Phase 1(フロント単体デプロイ)を最優先で完了→URL確保
- バックエンドAPI接続はPhase 2として後続対応
- 15分超過時は各部門の障害ポイントをCEOへ集約報告

---

## 4. Vercel デプロイ時の環境変数チェックリスト

Development/DevSecOps チームへの申し送り事項。

| 変数名 | Phase | 必須 | 説明 |
|--------|-------|------|------|
| `NEXT_PUBLIC_API_URL` | Phase 2 | Yes | バックエンドAPIのベースURL |
| `NEXT_PUBLIC_STRIPE_KEY` | Phase 2 | Yes | Stripe公開キー (テストモード) |
| `NEXT_PUBLIC_APP_URL` | Phase 1 | No | フロントエンド自身のURL (OGP等) |

Phase 1 ではこれらが未設定でもビルド・静的ページ表示は可能であること。
(Development チームが `NEXT_PUBLIC_API_URL` 未設定時のフォールバック対応を実施予定)

---

## 5. 障害時エスカレーションフロー

```
障害検知 (Gate失敗)
    │
    ├─ ビルド失敗 → Development (兎田)
    ├─ 画面崩れ → Design (宝鐘)
    ├─ API接続エラー → DevSecOps (獅白)
    └─ 15分超過 → Operations がCEOへ状況集約報告
```

---

## 6. 次のアクション

| 優先度 | アクション | 担当 | 状態 |
|--------|-----------|------|------|
| P0 | Vercel にフロントエンドデプロイ | Development | 待ち |
| P0 | デプロイURL取得後 Gate 1 実行 | Operations | 待ち |
| P1 | Gate 2 ビジュアルQA 実行 | Design | URL待ち |
| P1 | Gate 3 スモークテスト 実行 | QA/QC | URL待ち |
| P2 | バックエンド公開URL確保 | DevSecOps | Phase 2 |
| P2 | 環境変数設定 + Gate 4 | DevSecOps | Phase 2 |
