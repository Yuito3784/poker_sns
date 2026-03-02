# QA/QC Deliverable: Vercel Deploy Quality Assurance

**Date**: 2026-03-02
**Author**: QA/QC 雪花 (姫森)
**Round**: Vercelデプロイ対応ラウンド
**Status**: Ready for Execution (デプロイURL待ち)

---

## 成果物一覧

| # | 成果物 | ファイル | 用途 |
|---|--------|--------|------|
| 1 | スモークテストチェックシート | `docs/QA_VERCEL_SMOKE_TEST_CHECKLIST.md` | デプロイ後の即時検証用 |
| 2 | Phase 1 完了判定基準書 | `docs/QA_PHASE1_COMPLETION_CRITERIA.md` | CEO報告可否の判定基準 |
| 3 | 本統合成果物 | `docs/QA_VERCEL_DEPLOY_DELIVERABLE.md` | QA/QC全体の成果物まとめ |

---

## QA/QC 観点からのリスク評価

### デプロイブロッカー分析

| リスク | 重大度 | 発生条件 | QA対応策 |
|--------|--------|---------|---------|
| フロントエンドビルド失敗 | Critical | `next build` が環境変数不足でエラー | ST-1 で即時検出。Devへエスカレーション |
| Hydration Mismatch | High | SSR/CSR 不整合 | ST-2-3 で検出。再現手順をDevに報告 |
| API未接続での白画面 | High | error boundary 未実装 | ST-3-1, ST-3-3 で検出 |
| ダークテーマ未適用 | Medium | CSS/Tailwind ビルド漏れ | V-1 で Design と共同検出 |
| モバイル表示崩れ | Medium | レスポンシブ設定漏れ | V-3 で Design と共同検出 |

### `NEXT_PUBLIC_API_URL` 未設定時の影響調査

フロントエンドコード `frontend/src/lib/api.ts:1` のフォールバック:
```typescript
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
```

**影響**:
- Vercel上では `http://localhost:4000` への接続は当然失敗する
- fetch 呼び出し時に `TypeError: Failed to fetch` が Console に出力される
- LP (`/lp`) は API 呼び出しを含まないため影響なし (静的メタデータ + クライアントコンポーネント)
- フィード (`/`) はタイムライン取得 API が失敗するが、ページ自体はレンダリングされるべき

**推奨**: Development チームに対し、API接続失敗時のフォールバックUI (空フィード表示、「接続できません」メッセージ等) の実装状況を確認すること。

---

## テスト実行計画

### Phase 1 実行タイムライン (URL取得後)

| 時刻 (相対) | アクション | 担当 | 所要時間 |
|-------------|-----------|------|---------|
| +0 min | URL受領・curlでHTTP応答チェック (ST-1) | QA/QC | 2 min |
| +2 min | Console エラーチェック (ST-2) | QA/QC | 3 min |
| +2 min | ビジュアルQA開始 (V-1〜V-4) | Design | 5 min (並行) |
| +5 min | API影響チェック (ST-3) | QA/QC | 3 min |
| +8 min | 結果集約・判定 | QA/QC + Design | 2 min |
| +10 min | CEO報告 (Pass時) or 修正指示 (Fail時) | Planning | - |

**合計: URL取得から10分以内にCEO報告可能**

### Phase 2 実行タイムライン (バックエンド接続後)

| アクション | 所要時間 |
|-----------|---------|
| API疎通確認 (ST-4) | 5 min |
| ページ別表示確認 (ST-5) | 10 min |
| 既存スモークテスト P0 項目 (参照: `docs/qa-smoke-test-checklist.md`) | 45 min |

---

## 部門間連携事項

### Development (兎田) への依頼
1. `next build` がVercel環境で通ることの確認 (ローカルで `NEXT_PUBLIC_API_URL=""` でビルドテスト)
2. API接続失敗時にページがクラッシュしないことの確認

### Design (宝鐘) への依頼
1. デプロイURL取得後、ビジュアルQAチェックリスト (V-1〜V-4) の実施
2. スクリーンショット付き結果報告

### DevSecOps (獅白) への依頼
1. Phase 2 でのCORS設定 (Vercel URLをallowlistに追加)
2. バックエンドデプロイ時のセキュリティヘッダー確認

### Ops (星街) への依頼
1. デプロイ後のヘルスチェック自動化スクリプト準備
2. Phase 2 でのモニタリング設定

---

## 現在のステータスと次のアクション

**現在**: デプロイURL待ち (Development / DevSecOps のVercelデプロイ完了待ち)

**URL取得後の即時アクション**:
1. ST-1 (HTTP応答) を curl で実行
2. ST-2 (Consoleエラー) を Chrome DevTools で確認
3. ST-3 (API影響) を目視確認
4. Design からの V-1〜V-4 結果を受領
5. Phase 1 判定基準に照らして合否判定
6. Planning (桃鈴) に結果報告 → CEO報告へ
