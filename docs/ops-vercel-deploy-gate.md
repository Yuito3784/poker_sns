# Vercel デプロイ順序ゲート管理手順書

## 概要

CEOリリース指示に基づく二段階デプロイ方式のゲート管理。
各ステップの完了条件を明確にし、CEO報告までのフローを制御する。

---

## デプロイフロー

```
[Phase 1] Frontend Vercel Deploy
        │
        ▼
   Gate 1: HTTP 200 確認 ──FAIL──▶ 障害対応 → 再デプロイ
        │ PASS
        ▼
   Gate 2: ビジュアルQA (3画面)
        │  LP(/lp), Login(/login), Feed(/)
        │  確認観点: ダークテーマ配色, CTAボタン, モバイル表示
        │ PASS
        ▼
   Gate 3: スモークテスト
        │  200 OK, コンソールエラー無し, レンダリング正常
        │ PASS
        ▼
   ★ CEO へ URL 報告
        │
        ▼
[Phase 2] Backend API 接続 (後続対応)
        │  Railway/Render 等にデプロイ
        │  NEXT_PUBLIC_API_URL 設定
        │  CORS/Helmet 設定確認
        ▼
   Gate 4: API疎通 + 認証フロー確認
        │ PASS
        ▼
   ★ CEO へ完全動作報告
```

---

## Gate 判定基準

### Gate 1: ヘルスチェック (自動)

| 項目 | コマンド | 合格条件 |
|------|----------|----------|
| Top Page | `curl -sL -o /dev/null -w "%{http_code}" $URL/` | HTTP 200 |
| LP | `curl -sL -o /dev/null -w "%{http_code}" $URL/lp` | HTTP 200 |
| Login | `curl -sL -o /dev/null -w "%{http_code}" $URL/login` | HTTP 200 |

**自動化:** `scripts/vercel-health-check.sh <URL>` で一括実行可能。

### Gate 2: ビジュアルQA (手動 / Design担当)

| 画面 | 確認項目 |
|------|----------|
| LP (/lp) | 背景 #0d1009, ゴールド #c9a84c, CTA ボタン視認性 |
| Login (/login) | フォーム表示, 入力フィールド配色 |
| Feed (/) | カードレイアウト, レスポンシブ (375px幅) |

### Gate 3: スモークテスト (QA/QC担当)

| 項目 | 方法 | 合格条件 |
|------|------|----------|
| ページ表示 | ブラウザアクセス | 白画面・エラー画面でない |
| コンソール | DevTools Console | Critical/Error レベルのエラー無し |
| API接続エラー | DevTools Network | NEXT_PUBLIC_API_URL 未設定は想定内 (Phase 2で対応) |

### Gate 4: API疎通 (Phase 2)

| 項目 | エンドポイント | 合格条件 |
|------|---------------|----------|
| Health | GET /api/health | `{"status":"ok"}` |
| Auth | POST /api/auth/login | 正常レスポンス or 401 |
| CORS | Preflight OPTIONS | Access-Control 付き 200 |

---

## 障害時エスカレーション

| 状況 | 対応 |
|------|------|
| ビルド失敗 | Development (兎田) へ連絡、ビルドログ共有 |
| 200 OK だが画面崩れ | Design (宝鐘) へスクリーンショット共有 |
| API接続エラー (Phase 2) | DevSecOps (獅白) へ環境変数・CORS設定確認依頼 |
| 15分超過 | 各部門の障害報告をCEOへ集約して報告 |

---

## CEO報告テンプレート

### Phase 1 完了時

```
[Vercel Deploy Report - Phase 1]
URL: <Vercel URL>
Status: Frontend deployed
Checks passed:
  - Top Page: HTTP 200
  - LP (/lp): HTTP 200
  - Login (/login): HTTP 200
  - Visual QA: PASS
  - Smoke Test: PASS
Note: Backend API is not yet connected (Phase 2).
      Static pages and UI are fully functional.
```

### Phase 2 完了時

```
[Vercel Deploy Report - Phase 2]
URL: <Vercel URL>
Backend API: <API URL>
Status: Full-stack operational
Additional checks passed:
  - API Health: OK
  - Auth Flow: OK
  - CORS: OK
```
