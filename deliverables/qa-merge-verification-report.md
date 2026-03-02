# QA/QC メインマージ検証レポート

**担当**: 姫森 (QA/QC)
**日付**: 2026-03-02
**対象**: mainブランチ HEAD `879440e`

---

## 1. ビルド検証結果

| 項目 | 結果 | 備考 |
|------|------|------|
| Backend `npm run build` | PASS | Prisma Client v5.20.0 生成 + NestJS ビルド成功 |
| Frontend `npm run build` | PASS | Next.js 16.1.4 (Turbopack) / 21ページ静的生成完了 / TypeScript エラーなし |
| Prisma schema validation | PASS | `prisma validate` 正常完了 (スキーマ構文エラーなし) |

### 注意事項
- Prisma CLI v5.20.0 → v7.4.2 のメジャーアップデートが利用可能 (対応不要・情報のみ)
- DB接続が必要な `prisma db push --accept-data-loss` のdry-runはローカルDB未起動のため実行不可。スキーマ構文検証(`prisma validate`)で代替確認済み

---

## 2. 認証フロー コードレビュー

### 2.1 JWT戦略 (`jwt.strategy.ts`)
- **PASS**: `ExtractJwt.fromAuthHeaderAsBearerToken()` のみ使用。クエリパラム抽出は削除済み
- **PASS**: `JWT_SECRET` 未設定時にサーバー起動段階でエラーを投げる安全設計
- **PASS**: `ignoreExpiration: false` で期限切れトークンを拒否

### 2.2 認証サービス (`auth.service.ts`)
- **PASS**: bcrypt ラウンド数 12 (register / changePassword / resetPassword の3箇所)
- **PASS**: OAuth セッション方式 - `storeOAuthSession()` / `consumeOAuthSession()` でワンタイム消費 + 5分TTL
- **PASS**: リフレッシュトークンローテーション (旧トークン削除 → 新トークン発行)
- **PASS**: パスワードリセット時に全リフレッシュトークン無効化
- **PASS**: `forgotPassword` はメール存在有無を漏洩しない統一レスポンス
- **PASS**: X OAuth PKCE実装 (S256 code_challenge) + 10分TTLステートストア

### 2.3 認証コントローラー (`auth.controller.ts`)
- **PASS**: 全エンドポイントに `@Throttle` レート制限あり
- **PASS**: `verify-email` にスロットル適用済み
- **PASS**: OAuth コールバックはセッションID経由のリダイレクト (トークンをURLに含めない)

### 2.4 フロントエンド認証 (`api.ts` / `AuthContext.tsx`)
- **PASS**: `fetchWithAuth` にプロアクティブ期限チェック + 401フォールバックの二段構え
- **PASS**: リフレッシュ競合防止 (`isRefreshing` + `refreshPromise` でシングルフライト)
- **PASS**: ネットワークエラー時はトークンクリアしない (一時的障害への耐性)
- **PASS**: `AuthContext` と `fetchWithAuth` の双方向同期 (`registerAuthClearHandler` / `registerAuthRefreshHandler`)

---

## 3. セキュリティ修正適用状況 (2026-03-02対応分)

| 修正項目 | 状態 |
|----------|------|
| bcrypt 12ラウンド | 適用済み (3箇所確認) |
| JWT query param抽出削除 | 適用済み |
| OAuth一時セッション方式 | 適用済み (base64 URL渡し廃止) |
| console.warnからトークン値削除 | 適用済み |
| Throttle on verify-email | 適用済み |

---

## 4. 残存リスク・推奨事項 (WARNING / 修正不要)

| レベル | 項目 | 詳細 |
|--------|------|------|
| LOW | OAuth in-memory store | `oauthSessions` / `xStateStore` はインメモリMap。サーバー再起動で消失する。スケールアウト時はRedis等への移行を推奨 |
| LOW | Prisma バージョン差 | lock file上 v5.20.0、最新 v7.4.2。セキュリティパッチ含む可能性あるが、破壊的変更を含むメジャーアップデートのため計画的対応を推奨 |
| INFO | Docker環境未検証 | Docker Compose でのコンテナビルド・セキュリティヘッダー確認はDevSecOps側タスク |

---

## 5. 総合判定

**PASS** - mainブランチ `879440e` のビルド・スキーマ・認証フローはすべて正常。マージ完了済みのコードベースに品質上の問題は検出されず。デプロイ準備可能。
