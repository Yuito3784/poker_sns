# Vercel Deploy Smoke Test Checklist

**Version**: 1.0
**Date**: 2026-03-02
**Author**: QA/QC 雪花 (姫森)
**Target**: Vercelデプロイ後の即時検証用チェックシート

---

## Overview

Vercelフロントエンド単体デプロイ(Phase 1)後に実施するスモークテスト。
バックエンドAPI未接続状態でも判定可能な項目を最優先とする。

---

## Phase 1: フロントエンド単体デプロイ(API未接続)

### ST-1. HTTP応答確認

| # | テスト項目 | URL/操作 | 期待結果 | Pass/Fail | 備考 |
|---|-----------|---------|---------|-----------|------|
| ST-1-1 | トップページ 200 OK | `GET /` | HTTP 200, HTMLレンダリング | | |
| ST-1-2 | LP 200 OK | `GET /lp` | HTTP 200, LP コンテンツ表示 | | |
| ST-1-3 | ログインページ | `GET /login` (もしくは `/` のログインフォーム) | HTTP 200, ログインUI表示 | | Next.js App Routerのため `/` にログインUIが含まれる可能性あり |
| ST-1-4 | 利用規約 | `GET /terms` | HTTP 200, テキスト表示 | | |
| ST-1-5 | プライバシーポリシー | `GET /privacy` | HTTP 200, テキスト表示 | | |

### ST-2. コンソールエラー確認

| # | テスト項目 | 操作 | 期待結果 | Pass/Fail | 備考 |
|---|-----------|-----|---------|-----------|------|
| ST-2-1 | LP コンソールエラー | `/lp` をChrome DevToolsで開く | JSランタイムエラーなし(NEXT_PUBLIC_API_URL未設定の fetch失敗Warningは許容) | | |
| ST-2-2 | トップページ コンソール | `/` をChrome DevToolsで開く | `ERR_CONNECTION_REFUSED` 等のAPI関連エラーのみ(予想済み) | | API未接続のため fetch エラーは想定内 |
| ST-2-3 | Next.js Hydration | 各ページ | Hydration mismatch エラーなし | | |

### ST-3. API接続エラー影響チェック

| # | テスト項目 | 確認方法 | 期待結果 | Pass/Fail | 備考 |
|---|-----------|---------|---------|-----------|------|
| ST-3-1 | API_URL未設定時の挙動 | `NEXT_PUBLIC_API_URL` 未設定 or 空文字 | ページがクラッシュせずレンダリングされる | | フォールバック: `http://localhost:4000` |
| ST-3-2 | LP静的表示 | `/lp` ページ | APIコール不要のLP部分は正常に全コンテンツ表示 | | LPはメタデータ + クライアントコンポーネント |
| ST-3-3 | エラーバウンダリ | API 呼び出し失敗時 | 白画面にならず、エラー状態のUIが表示 or ローディング状態で停止 | | |

---

## Phase 2: バックエンドAPI接続後の追加検証

### ST-4. API疎通確認

| # | テスト項目 | 操作 | 期待結果 | Pass/Fail | 備考 |
|---|-----------|-----|---------|-----------|------|
| ST-4-1 | API ヘルスチェック | `curl {API_URL}/health` | 200 OK | | バックエンドデプロイ後 |
| ST-4-2 | CORS設定 | フロントからAPIへfetchリクエスト | CORS エラーなし | | Vercel URLが CORS allowlistに含まれること |
| ST-4-3 | ユーザー登録 | `/` からアカウント作成フォーム送信 | 201, ユーザー作成成功 | | |
| ST-4-4 | ログイン | ログインフォーム送信 | 200, トークン取得・フィード表示 | | |
| ST-4-5 | タイムライン取得 | ログイン後トップページ | 投稿一覧が表示 | | |

### ST-5. ページ別表示確認

| # | テスト項目 | URL | 期待結果 | Pass/Fail | 備考 |
|---|-----------|-----|---------|-----------|------|
| ST-5-1 | フィード | `/` (ログイン後) | 投稿一覧レンダリング | | |
| ST-5-2 | プロフィール | `/profile/{username}` | ユーザー情報表示 | | |
| ST-5-3 | 検索 | `/search` | 検索フォーム表示・結果返却 | | |
| ST-5-4 | パートナー | `/partners` | アフィリエイトパートナー一覧 | | |
| ST-5-5 | 設定 | `/settings` (ログイン後) | 設定画面表示 | | |

---

## 環境変数チェックリスト

Phase 1 デプロイ時にVercelで設定すべき環境変数:

| 変数名 | 必須/任意 | Phase 1 値 | 備考 |
|--------|----------|-----------|------|
| `NEXT_PUBLIC_API_URL` | 必須 | (バックエンドURL未定なら空 or ダミー) | 空の場合 `http://localhost:4000` にフォールバック |
| `NEXT_PUBLIC_SITE_URL` | 推奨 | VercelデプロイURL | OGP・canonical URL生成に使用 |
| `NEXT_PUBLIC_GA_ID` | 任意 | (未設定可) | GA4トラッキング |

---

## 判定基準

### Phase 1 合格ライン (CEO報告可能条件)
- ST-1 の全項目が Pass (HTTP 200 返却)
- ST-2-3 Hydration mismatchなし
- ST-3-1 ページがクラッシュしない
- ST-3-2 LP が完全に表示される

### Phase 2 合格ライン (フル機能動作確認)
- Phase 1 全項目 Pass
- ST-4 の全項目 Pass
- ST-5 の全項目 Pass

---

## 実行手順

1. Vercel デプロイ URL を取得
2. `curl -s -o /dev/null -w "%{http_code}" {URL}` で ST-1 を一括確認
3. Chrome DevTools (Console タブ) で ST-2 を確認
4. ST-3 を目視確認
5. 結果をこのチェックシートに記入し、Planning(桃鈴)に報告
6. Phase 1 合格なら CEO へ URL 即報告
