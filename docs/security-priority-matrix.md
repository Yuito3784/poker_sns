# Security Priority Matrix — poker_sns
**作成日:** 2026-03-02
**作成者:** 常闇 (Planning)
**分類基準:** 攻撃リスク深刻度 × 実装コスト の4象限

---

## P0 — 今週着手（高リスク・低〜中コスト）

| # | 施策 | 担当 | 現状 | 対応内容 | 工数目安 |
|---|------|------|------|----------|----------|
| 1 | Rate Limiting 棚卸し・適用拡大 | DevSecOps (獅白) + Dev (桃鈴) | グローバル60req/minあり。明示的@Throttleは73エンドポイント中10件のみ（Auth系のみ）。Posts/Users/Subscriptions/Replies/Notifications全てグローバル依存 | 書き込み系・金融系エンドポイントに明示的@Throttle追加。推奨値: 投稿作成5/min, いいね30/min, Stripe系5/min, プロフィール更新5/min | 4h |
| 2 | DTO未適用エンドポイント修正 | Dev (桃鈴) | 3箇所がinline type（verify-email, magic-link, x/complete）。GlobalValidationPipeあるがwhitelistが効かない | VerifyEmailDto, SendMagicLinkDto, CompleteXRegistrationDto 作成。class-validator適用 | 2h |
| 3 | .env ファイル管理確認 | DevSecOps (獅白) | backend/.envにJWT_SECRET等が存在。.gitignoreに記載あるがコミット前確認必須 | git historyに.envが含まれていないことを確認。含まれていればBFG等で履歴削除+シークレットローテーション | 1h |
| 4 | 依存パッケージセキュリティ監査 | DevSecOps (獅白) | npm audit未設定、Dependabot未有効化 | `npm audit --audit-level=moderate` をCI/CDに追加。GitHub Dependabot有効化 | 2h |

---

## P1 — 来週着手（中リスク・中コスト）

| # | 施策 | 担当 | 現状 | 対応内容 | 工数目安 |
|---|------|------|------|----------|----------|
| 5 | OAuthセッション永続化 | Dev (桃鈴) | in-memory Map（5分TTL）。サーバ再起動でセッション消失。スケールアウト不可 | Redis導入またはDB一時テーブル方式に移行 | 4h |
| 6 | 画像アップロード強化 | Dev (桃鈴) | MIMEタイプ検証✓、5MBサイズ制限✓、UUID命名✓。Magic bytes検証なし、EXIFメタデータ残存 | sharp等でEXIF除去。magic-bytes検証追加。ユーザー単位アップロードRate Limit | 3h |
| 7 | CORS設定強化 | Dev (桃鈴) | origin制御あり。methods/headers未制限 | allowedMethods, allowedHeaders, maxAge 明示設定 | 1h |
| 8 | DB接続SSL化 | DevSecOps (獅白) | DATABASE_URLにsslmode未指定 | 本番DATABASE_URLに`?sslmode=require`追加 | 1h |
| 9 | セキュリティUI導線統合 | Design (宝鐘) | パスワード変更・ブロック・ミュート・通報がバラバラに配置 | 設定画面内「セキュリティとプライバシー」セクションに集約。IA設計→ワイヤーフレーム | 4h |

---

## P2 — 再来週以降（中〜低リスク・高コスト）

| # | 施策 | 担当 | 現状 | 対応内容 | 工数目安 |
|---|------|------|------|----------|----------|
| 10 | モニタリング・アラート基盤 | Ops (星街) | ログ構造化未整備。異常検知なし | nginxアクセスログ構造化、NestJSログ整備、アラート閾値設定 | 8h |
| 11 | バックアップ・リストア手順書 | Ops (星街) | 手順未文書化 | PostgreSQLバックアップスケジュール、リストア手順、インシデント対応フロー策定 | 4h |
| 12 | CSP nonce方式移行 | Dev (桃鈴) | styleSrcに'unsafe-inline'使用中（Tailwind CSS必要） | nonce-based CSP + Tailwind対応。大規模変更のためP2 | 8h |
| 13 | テストスイート整備 | QA/QC (雪花) | セキュリティ関連テスト未整備 | JWT認証・Throttle・Helmet CSP・Stripe署名検証の動作確認E2Eテスト | 8h |
| 14 | パスワード入力マスクトグルUI統一 | Design (宝鐘) | 統一デザイン仕様なし | 全パスワード入力フィールドにマスク表示トグル。仕様策定→実装 | 2h |

---

## 棚卸し結果サマリ

### Rate Limiting カバレッジ（現状）

| コントローラ | 総EP数 | 明示@Throttle | カバレッジ |
|-------------|--------|--------------|-----------|
| Auth | 19 | 10 | 53% |
| Posts | 17 | 0 | 0% |
| Replies | 2 | 0 | 0% |
| Users | 11 | 0 | 0% |
| Notifications | 4 | 0 | 0% |
| Search | 2 | 0 | 0% |
| Ads | 1 | 0 | 0% |
| Affiliates | 3 | 0 | 0% |
| Subscriptions | 6 | 0 | 0% |
| Health | 1 | @SkipThrottle | N/A |
| **合計** | **66** | **10** | **15%** |

> **Note:** グローバルThrottlerGuard（60req/60s）は全EPに適用済み。上記は明示的に個別制限を設けているEP数。

### DTO Validation カバレッジ（現状）

| 状態 | EP数 | 詳細 |
|------|------|------|
| DTO + class-validator適用済み | 8 | register, login, refresh, changePassword, forgotPassword, resetPassword, createPost, createReply等 |
| inline型（DTO未使用） | 3 | verify-email, magic-link, x/complete |
| Body入力なし（Param/Queryのみ） | 55 | 問題なし |

### インフラセキュリティ（現状）

| 項目 | 状態 |
|------|------|
| Helmet (CSP/HSTS/frameguard/noSniff) | ✅ 適用済み |
| CORS制御 | ✅ origin制御あり（methods未制限） |
| 入力サニタイズ (SanitizeInputPipe) | ✅ 全文字列HTML除去 |
| bcrypt rounds | ✅ 12 (3箇所統一) |
| JWT Bearer抽出のみ | ✅ Query param抽出削除済み |
| Stripe webhook署名検証 | ✅ 400返却修正済み |
| Docker PostgreSQL外部ポート | ✅ 削除済み |
| nginx HSTS/セキュリティヘッダ | ✅ 本番構成適用済み |
| SSL/TLS (TLS 1.2+1.3) | ✅ Let's Encrypt統合 |
| ファイルアップロード制限 | ✅ MIME検証+5MB+UUID |

---

## 次のアクション

1. **各チームリーダー**: P0施策の着手確認を本日中に返答
2. **桃鈴 (Dev)**: P0-1 Rate Limiting実装 + P0-2 DTO追加を今週完了目標
3. **獅白 (DevSecOps)**: P0-3 .env確認 + P0-4 npm audit設定を今週完了目標
4. **雪花 (QA/QC)**: P0完了後、P2-13テストスイート設計を先行着手
5. **宝鐘 (Design)**: P1-9 セキュリティUI統合のIA設計を来週着手
6. **星街 (Ops)**: P2-10 モニタリング設計を再来週着手
