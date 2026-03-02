# QA/QC セキュリティテスト網羅性レポート

**作成者:** 雪花 (QA/QC)
**作成日:** 2026-03-02
**対象:** poker_sns backend / frontend

---

## 1. エグゼクティブサマリー

| 指標 | 値 |
|---|---|
| 総エンドポイント数 | 65 |
| DTO (@Body) バリデーション適用済み | 13 (20%) |
| @Query/@Param バリデーション未適用 | 38 (58%) |
| 入力パラメータなし (安全) | 14 (22%) |
| 既存テストファイル数 | 3 (backend のみ) |
| テストカバレッジ対象モジュール | 2/10 (Auth, Posts の一部) |
| フロントエンドテスト | 0件 |

**総合評価: @Body DTOは高品質だが、@Query/@Paramバリデーションとテストカバレッジに重大なギャップあり**

---

## 2. グローバルバリデーション設定

**ファイル:** `backend/src/main.ts`

```
ValidationPipe: whitelist=true, forbidNonWhitelisted=true, transform=true
SanitizeInputPipe: カスタム入力サニタイズ
```

**評価:** グローバルパイプは適切に設定済み。ただしDTO未定義のパラメータには効果なし。

---

## 3. エンドポイント別 DTO適用状況・テストケース一覧

### 3.1 Auth Controller (`/auth/*`)

| # | Method | Route | DTO | バリデーション状態 | 重要度 |
|---|---|---|---|---|---|
| 1 | POST | `/auth/register` | RegisterDto | VALIDATED | - |
| 2 | POST | `/auth/login` | LoginDto | VALIDATED | - |
| 3 | POST | `/auth/refresh` | RefreshTokenDto | VALIDATED | - |
| 4 | POST | `/auth/logout` | なし | Guard のみ | LOW |
| 5 | POST | `/auth/change-password` | ChangePasswordDto | VALIDATED | - |
| 6 | POST | `/auth/verify-email` | VerifyEmailDto | VALIDATED | - |
| 7 | POST | `/auth/resend-verification` | なし | Guard のみ | LOW |
| 8 | POST | `/auth/forgot-password` | ForgotPasswordDto | VALIDATED | - |
| 9 | POST | `/auth/reset-password` | ResetPasswordDto | VALIDATED | - |
| 10 | GET | `/auth/google` | なし | Passport Guard | LOW |
| 11 | GET | `/auth/google/callback` | なし | Passport Guard | MEDIUM |
| 12 | GET | `/auth/line` | なし | パラメータなし | LOW |
| 13 | GET | `/auth/line/callback` | なし | @Query('code') 未検証 | HIGH |
| 14 | POST | `/auth/magic-link` | MagicLinkDto | VALIDATED | - |
| 15 | GET | `/auth/magic-link/verify` | なし | @Query('token') 未検証 | HIGH |
| 16 | GET | `/auth/x` | なし | パラメータなし | LOW |
| 17 | GET | `/auth/x/callback` | なし | @Query('code','state') 未検証 | HIGH |
| 18 | POST | `/auth/x/complete` | CompleteXRegistrationDto | VALIDATED | - |
| 19 | GET | `/auth/oauth-session` | なし | @Query('id') 手動チェックのみ | MEDIUM |

**異常値・境界値テストケース (Auth):**

| TC-ID | エンドポイント | テストシナリオ | 入力値 | 期待結果 |
|---|---|---|---|---|
| AUTH-001 | POST /auth/register | 空文字列email | `{ email: "", password: "valid123", ... }` | 400 Bad Request |
| AUTH-002 | POST /auth/register | SQLインジェクション in username | `{ username: "admin'; DROP TABLE--" }` | 400 Bad Request |
| AUTH-003 | POST /auth/register | XSS in displayName | `{ displayName: "<script>alert(1)</script>" }` | サニタイズ or 400 |
| AUTH-004 | POST /auth/register | パスワード境界値 (最小長-1) | password: 短い文字列 | 400 Bad Request |
| AUTH-005 | POST /auth/register | 余分なフィールド | `{ email: "...", isAdmin: true }` | forbidNonWhitelisted で 400 |
| AUTH-006 | POST /auth/login | 存在しないメール | `{ email: "noexist@test.com" }` | 401 Unauthorized |
| AUTH-007 | POST /auth/login | 空パスワード | `{ email: "valid@test.com", password: "" }` | 400 Bad Request |
| AUTH-008 | GET /auth/line/callback | 不正な code 値 | `?code=<script>alert(1)</script>` | 安全に処理 |
| AUTH-009 | GET /auth/line/callback | 空の code パラメータ | `?code=` | 400 or 安全なエラー |
| AUTH-010 | GET /auth/magic-link/verify | 改竄 token | `?token=tampered_value` | 400 Bad Request |
| AUTH-011 | GET /auth/magic-link/verify | 極端に長い token | `?token=` + 10000文字 | 安全に処理 |
| AUTH-012 | GET /auth/x/callback | state 不一致 | 正規code + 改竄state | 400 Bad Request |
| AUTH-013 | GET /auth/oauth-session | 存在しない session ID | `?id=nonexistent` | 400 Bad Request |
| AUTH-014 | GET /auth/oauth-session | 空の session ID | `?id=` | 400 Bad Request |
| AUTH-015 | POST /auth/refresh | 期限切れ refreshToken | 有効期限切れトークン | 401 Unauthorized |
| AUTH-016 | POST /auth/change-password | 現在のパスワードと同じ新パスワード | same password | 適切なエラー |

### 3.2 Posts Controller (`/posts/*`)

| # | Method | Route | DTO | バリデーション状態 | 重要度 |
|---|---|---|---|---|---|
| 1 | POST | `/posts` | CreatePostDto | VALIDATED | - |
| 2 | POST | `/posts/upload-image` | なし | FileInterceptor のみ | MEDIUM |
| 3 | POST | `/posts/poker-hand` | CreatePokerHandDto | VALIDATED | - |
| 4 | GET | `/posts/timeline` | なし | cursor/limit 未検証 | HIGH |
| 5 | GET | `/posts/hashtag/:tag` | なし | tag/cursor/limit 未検証 | HIGH |
| 6 | GET | `/posts/trending` | なし | period/cursor/limit 未検証 | HIGH |
| 7 | GET | `/posts/user/:userId/likes` | なし | userId/cursor/limit 未検証 | MEDIUM |
| 8 | GET | `/posts/user/:userId` | なし | userId/cursor/limit 未検証 | MEDIUM |
| 9 | DELETE | `/posts/:id` | なし | id 未検証 | MEDIUM |
| 10 | GET | `/posts/:id/meta` | なし | id 未検証 | LOW |
| 11 | GET | `/posts/:id` | なし | id 未検証 | LOW |
| 12 | POST | `/posts/:id/repost` | なし | id 未検証 | MEDIUM |
| 13 | POST | `/posts/:id/bookmark` | なし | id 未検証 | MEDIUM |
| 14 | POST | `/posts/:id/pin` | なし | id 未検証 | MEDIUM |
| 15 | POST | `/posts/unpin` | なし | Guard のみ | LOW |
| 16 | GET | `/posts/user/:userId/bookmarks` | なし | userId/cursor/limit 未検証 | MEDIUM |
| 17 | POST | `/posts/:id/like` | なし | id 未検証 | MEDIUM |

**異常値・境界値テストケース (Posts):**

| TC-ID | エンドポイント | テストシナリオ | 入力値 | 期待結果 |
|---|---|---|---|---|
| POST-001 | POST /posts | 空コンテンツ | `{ content: "" }` | 400 Bad Request |
| POST-002 | POST /posts | MaxLength超過 | content: 1001文字 (or premium 5001文字) | 400 Bad Request |
| POST-003 | POST /posts | XSS in content | `{ content: "<img onerror=alert(1)>" }` | サニタイズ済み |
| POST-004 | POST /posts | 不正な imageUrl | `{ imageUrl: "javascript:alert(1)" }` | 400 Bad Request |
| POST-005 | GET /posts/timeline | 負の limit | `?limit=-1` | 400 or デフォルト値 |
| POST-006 | GET /posts/timeline | 巨大 limit (DoS) | `?limit=999999` | 上限値に制限 |
| POST-007 | GET /posts/timeline | 不正な cursor | `?cursor=<script>` | 安全に処理 |
| POST-008 | GET /posts/hashtag/:tag | XSS in tag | `/posts/hashtag/<script>alert(1)</script>` | サニタイズ or 404 |
| POST-009 | GET /posts/hashtag/:tag | SQLi in tag | `/posts/hashtag/' OR 1=1--` | 安全に処理 (Prisma) |
| POST-010 | DELETE /posts/:id | 他ユーザーの投稿削除 | 他人の post id | 403 Forbidden |
| POST-011 | DELETE /posts/:id | 不正な id 形式 | `/posts/not-a-uuid` | 400 or 404 |
| POST-012 | POST /posts/:id/like | 自分の投稿にいいね | 自分の post id | 仕様確認必要 |
| POST-013 | POST /posts/upload-image | 非画像ファイル | .exe / .html ファイル | 400 Bad Request |
| POST-014 | POST /posts/upload-image | 巨大ファイル | 100MB+ | サイズ制限で拒否 |
| POST-015 | POST /posts/upload-image | MIMEスプーフィング | image/png header + .exe 内容 | 400 Bad Request |

### 3.3 Users Controller (`/users/*`)

| # | Method | Route | DTO | バリデーション状態 | 重要度 |
|---|---|---|---|---|---|
| 1 | GET | `/users/:username` | なし | username 未検証 | MEDIUM |
| 2 | POST | `/users/:username/follow` | なし | username 未検証 | MEDIUM |
| 3 | GET | `/users/:username/followers` | なし | username/take/skip 未検証 | MEDIUM |
| 4 | GET | `/users/:username/following-list` | なし | username/take/skip 未検証 | MEDIUM |
| 5 | GET | `/users/:username/following` | なし | username 未検証 | LOW |
| 6 | PATCH | `/users/me` | UpdateProfileDto | VALIDATED | - |
| 7 | DELETE | `/users/me` | なし | Guard のみ | LOW |
| 8 | PATCH | `/users/me/avatar` | なし | FileInterceptor のみ | MEDIUM |
| 9 | POST | `/users/:username/block` | なし | username 未検証 | MEDIUM |
| 10 | POST | `/users/:username/mute` | なし | username 未検証 | MEDIUM |
| 11 | GET | `/users/:username/block-mute-status` | なし | username 未検証 | LOW |

**異常値・境界値テストケース (Users):**

| TC-ID | エンドポイント | テストシナリオ | 入力値 | 期待結果 |
|---|---|---|---|---|
| USER-001 | GET /users/:username | 存在しないユーザー | `/users/nonexistent` | 404 Not Found |
| USER-002 | GET /users/:username | XSS in username | `/users/<script>` | 安全に処理 |
| USER-003 | GET /users/:username | パストラバーサル | `/users/../../etc/passwd` | 安全に処理 |
| USER-004 | POST /users/:username/follow | 自分をフォロー | 自分の username | 400 or 適切なエラー |
| USER-005 | POST /users/:username/block | ブロック済みユーザーを再ブロック | 既ブロック username | 冪等性チェック |
| USER-006 | GET /users/:username/followers | 負の take/skip | `?take=-1&skip=-1` | 400 or デフォルト値 |
| USER-007 | GET /users/:username/followers | 巨大な take | `?take=999999` | 上限値に制限 |
| USER-008 | PATCH /users/me | XSS in bio | `{ bio: "<script>alert(1)</script>" }` | サニタイズ済み |
| USER-009 | PATCH /users/me | 不正な avatarUrl | `{ avatarUrl: "javascript:void(0)" }` | 400 or 無視 |
| USER-010 | PATCH /users/me/avatar | 非画像ファイル | .js ファイル | 400 Bad Request |

### 3.4 Replies Controller (`/posts/:postId/replies`)

| TC-ID | エンドポイント | テストシナリオ | 入力値 | 期待結果 |
|---|---|---|---|---|
| REPLY-001 | POST /posts/:postId/replies | 空コンテンツ | `{ content: "" }` | 400 Bad Request |
| REPLY-002 | POST /posts/:postId/replies | MaxLength 超過 | content: 1001文字 | 400 Bad Request |
| REPLY-003 | POST /posts/:postId/replies | 存在しない postId | 不正な UUID | 404 Not Found |
| REPLY-004 | GET /posts/:postId/replies | 不正な cursor 形式 | `?cursor=invalid` | 安全に処理 |

### 3.5 残りのコントローラー

| モジュール | エンドポイント数 | DTO 有 | DTO 無 | テストケース必要数 |
|---|---|---|---|---|
| Ads | 1 | 0 | 1 | 3 |
| Affiliates | 3 | 0 | 3 | 6 |
| Notifications | 4 | 0 | 1 (他は入力なし) | 2 |
| Search | 2 | 0 | 2 | 5 |
| Subscriptions | 6 | 0 | 0 (全て Guard/Webhook) | 3 |

**追加テストケース:**

| TC-ID | エンドポイント | テストシナリオ | 入力値 | 期待結果 |
|---|---|---|---|---|
| ADS-001 | GET /ads/feed | 負の offset/limit | `?offset=-1&limit=-1` | デフォルト値適用 |
| ADS-002 | GET /ads/feed | 巨大な limit | `?limit=99999` | 上限制限 |
| SRCH-001 | GET /search/users | XSS in query | `?q=<script>alert(1)</script>` | サニタイズ済み |
| SRCH-002 | GET /search/posts | 空クエリ | `?q=` | 400 or 空結果 |
| SRCH-003 | GET /search/users | 極長クエリ (DoS) | `?q=` + 10000文字 | 長さ制限 |
| AFF-001 | GET /affiliates/:slug/redirect | オープンリダイレクト | 不正な slug | 404 or 安全なエラー |
| NOTIF-001 | PATCH /notifications/:id/read | 他ユーザーの通知 | 他人の notification id | 403 Forbidden |
| SUB-001 | POST /subscriptions/webhook | 署名なし | Stripe-Signature ヘッダーなし | 400 Bad Request |
| SUB-002 | POST /subscriptions/webhook | 改竄された署名 | 不正な署名値 | 400 Bad Request |

---

## 4. OAuthセッション テストケース

### 4.1 実装概要

| 項目 | 現状 |
|---|---|
| ストレージ | in-memory Map (シングルトン) |
| TTL | 5分 (300,000ms) |
| セッションID生成 | crypto.randomBytes(16).toString('hex') — 128bit |
| 消費方式 | 単一使用 (delete → validate) |
| クリーンアップ | 遅延型 (storeOAuthSession時のみ) |
| Rate Limit | 10 req/60sec (oauth-session エンドポイント) |
| テストカバレッジ | 0% |

### 4.2 テストケース一覧

#### TTL切れシナリオ

| TC-ID | シナリオ | 手順 | 期待結果 | 重要度 |
|---|---|---|---|---|
| OAUTH-TTL-001 | 有効期限内の消費 | 1. storeOAuthSession() → sessionId<br>2. 即座に consumeOAuthSession(sessionId) | セッションデータ返却、Map から削除 | CRITICAL |
| OAUTH-TTL-002 | 有効期限切れ後の消費 | 1. storeOAuthSession() → sessionId<br>2. 5分以上待機<br>3. consumeOAuthSession(sessionId) | BadRequestException「セッションが無効または期限切れです」 | CRITICAL |
| OAUTH-TTL-003 | 期限ギリギリ (境界値) | 1. storeOAuthSession()<br>2. 4分59秒後に消費 | 成功 | HIGH |
| OAUTH-TTL-004 | 期限直後 (境界値) | 1. storeOAuthSession()<br>2. 5分01秒後に消費 | BadRequestException | HIGH |
| OAUTH-TTL-005 | 遅延クリーンアップ動作確認 | 1. storeOAuthSession() → session A (expired後)<br>2. storeOAuthSession() → session B<br>3. Map サイズ確認 | session A が Map から削除済み | MEDIUM |
| OAUTH-TTL-006 | クリーンアップなしのメモリ蓄積 | 1. 100件の storeOAuthSession()<br>2. 全て期限切れまで待機<br>3. 新規 store なし<br>4. Map サイズ確認 | 100件が残存 (メモリリーク確認) | MEDIUM |

#### 競合アクセスシナリオ

| TC-ID | シナリオ | 手順 | 期待結果 | 重要度 |
|---|---|---|---|---|
| OAUTH-RACE-001 | 同一セッションID二重消費 | 1. storeOAuthSession() → sessionId<br>2. 並列で2回 consumeOAuthSession(sessionId) | 1回目: 成功、2回目: BadRequestException | CRITICAL |
| OAUTH-RACE-002 | 高並列消費リクエスト | 1. storeOAuthSession() → sessionId<br>2. 10並列リクエストで GET /auth/oauth-session?id=sessionId | 1回のみ成功、残り9回は 400 | HIGH |
| OAUTH-RACE-003 | 消費失敗時のデータ損失 | 1. storeOAuthSession() (期限切れデータ)<br>2. consumeOAuthSession() (delete実行後にexpiry check失敗)<br>3. 同じIDで再度 consume 試行 | データ永久消失を確認 (現行の脆弱性) | HIGH |

#### リプレイ攻撃シナリオ

| TC-ID | シナリオ | 手順 | 期待結果 | 重要度 |
|---|---|---|---|---|
| OAUTH-REPLAY-001 | 消費済みセッションの再利用 | 1. storeOAuthSession() → sessionId<br>2. consumeOAuthSession(sessionId) → 成功<br>3. consumeOAuthSession(sessionId) → 再試行 | 2回目で BadRequestException | CRITICAL |
| OAUTH-REPLAY-002 | セッションID推測攻撃 | 1. ランダムな32文字hex値で GET /auth/oauth-session?id=<guessed> | BadRequestException、Rate Limit 適用 | HIGH |
| OAUTH-REPLAY-003 | ブルートフォース セッションID | 1. 11回連続で不正IDでリクエスト (Rate Limit: 10/60s) | 11回目で 429 Too Many Requests | HIGH |
| OAUTH-REPLAY-004 | URLからのセッションID漏洩 | 1. OAuthコールバック → リダイレクト /?oauthSession=xxx<br>2. フロントエンドが URL を replaceState で即座にクリーン<br>3. ブラウザ履歴に sessionId が残らないことを確認 | URL 履歴にセッションIDなし | MEDIUM |
| OAUTH-REPLAY-005 | Referer ヘッダー経由の漏洩 | 1. /?oauthSession=xxx ページから外部リンクをクリック<br>2. Referer ヘッダーを確認 | セッションIDが Referer に含まれないこと | MEDIUM |

#### X OAuth PKCE テストケース

| TC-ID | シナリオ | 手順 | 期待結果 | 重要度 |
|---|---|---|---|---|
| XPKCE-001 | State不一致 | 1. GET /auth/x → state値取得<br>2. callback時に異なる state を送信 | BadRequestException | CRITICAL |
| XPKCE-002 | State TTL切れ | 1. GET /auth/x → state値取得<br>2. 10分以上後に callback | BadRequestException | HIGH |
| XPKCE-003 | code_verifier 再利用 | 1. GET /auth/x → PKCE state<br>2. callback で消費<br>3. 同じ state で再度 callback | BadRequestException | CRITICAL |

---

## 5. 既存テストカバレッジ分析

### 5.1 テストファイル一覧

| ファイル | カバー範囲 | テスト数 | 最終更新状態 |
|---|---|---|---|
| `backend/src/auth/auth.service.spec.ts` | register, login | ~5 | bcrypt rounds が旧値 (10→12 未反映) |
| `backend/src/posts/posts.service.spec.ts` | create, delete, like, repost, bookmark, pin | ~8 | 不明 |
| `backend/test/app.e2e-spec.ts` | 404ルーティングのみ | 1 | 最小限 |

### 5.2 テスト未カバーモジュール

| モジュール | テストカバレッジ | 優先度 |
|---|---|---|
| Auth (OAuth フロー) | 0% | P0 |
| Auth (パスワードリセット/メール検証) | 0% | P0 |
| Users | 0% | P1 |
| Replies | 0% | P1 |
| Notifications | 0% | P2 |
| Search | 0% | P1 |
| Ads | 0% | P2 |
| Affiliates | 0% | P2 |
| Subscriptions (Stripe) | 0% | P1 |
| Frontend (全体) | 0% | P2 |

---

## 6. class-validator 未適用エンドポイント 洗い出し結果

### P0 (即時対応推奨 — 攻撃リスク高)

| エンドポイント | 問題 | 推奨 DTO |
|---|---|---|
| GET /auth/line/callback | code パラメータ未検証 | OAuthCallbackDto (IsString, MaxLength) |
| GET /auth/x/callback | code, state 未検証 | XOAuthCallbackDto |
| GET /auth/magic-link/verify | token 未検証 | TokenQueryDto (IsString, MaxLength) |
| GET /posts/timeline | cursor, limit 未検証 | PaginationDto (IsOptional, IsString, IsInt, Min, Max) |
| GET /posts/hashtag/:tag | tag, cursor, limit 未検証 | HashtagParamDto + PaginationDto |
| GET /posts/trending | period, cursor, limit 未検証 | TrendingQueryDto + PaginationDto |
| GET /search/users | q 未検証 | SearchQueryDto (IsString, MinLength, MaxLength) |
| GET /search/posts | q 未検証 | SearchQueryDto |

### P1 (次スプリント対応 — 中リスク)

| エンドポイント | 問題 | 推奨対応 |
|---|---|---|
| GET /posts/user/:userId/* | userId 未検証 | ParseUUIDPipe 適用 |
| DELETE /posts/:id | id 未検証 | ParseUUIDPipe 適用 |
| POST /posts/:id/* (like/repost/bookmark/pin) | id 未検証 | ParseUUIDPipe 適用 |
| GET /users/:username/* | username 未検証 | UsernameParamDto (Matches, MaxLength) |
| POST /users/:username/* (follow/block/mute) | username 未検証 | UsernameParamDto |
| GET /ads/feed | offset, limit 未検証 | PaginationDto |
| GET /affiliates/* | slug, category 未検証 | AffiliateQueryDto |
| PATCH /notifications/:id/read | id 未検証 | ParseUUIDPipe 適用 |

---

## 7. 検出されたセキュリティ懸念事項 (WARNING)

以下はコード変更不要の警告レポートです。Development/DevSecOps チームへの引き継ぎ事項として記録します。

### MEDIUM: OAuthセッション消費時のデータ損失

**ファイル:** `backend/src/auth/auth.service.ts` consumeOAuthSession()
**問題:** セッション削除が有効期限チェックの前に実行される。期限切れセッションの場合、削除後にエラーが返るため、データが不必要に消失する。
**推奨:** 有効期限チェック → 削除の順序に変更。

### MEDIUM: OAuthセッション in-memory 制限

**問題:** in-memory Map はプロセス再起動でデータ消失、マルチインスタンス環境で共有不可。
**推奨:** 本番スケール時に Redis 等への移行 (桃鈴さん指摘と同一)。

### LOW: 遅延型クリーンアップのメモリリスク

**問題:** storeOAuthSession() 呼出時のみ期限切れセッションを削除。長期間新規OAuthフローがない場合、期限切れセッションがメモリに残留。
**推奨:** バックグラウンドジョブ (setInterval 2分間隔) での定期クリーンアップ追加。

### LOW: 既存テストの bcrypt rounds 不整合

**ファイル:** `backend/src/auth/auth.service.spec.ts`
**問題:** テスト内で bcrypt rounds=10 を想定しているが、セキュリティ修正で rounds=12 に変更済み。テスト実行時に失敗する可能性あり。
**推奨:** テスト内の bcrypt mock を rounds=12 に更新。

---

## 8. 推奨テスト実装ロードマップ

### Phase 1 (P0 — 今週)
1. auth.service.spec.ts の bcrypt rounds 修正
2. OAuth セッションライフサイクルの単体テスト追加
3. P0 エンドポイントの異常値入力 e2e テスト

### Phase 2 (P1 — 来週)
1. Query/Param DTO 作成後のバリデーションテスト
2. Users, Search, Subscriptions モジュールの単体テスト
3. ファイルアップロードのセキュリティテスト

### Phase 3 (P2 — 再来週以降)
1. フロントエンド テスト基盤構築
2. Ads, Affiliates, Notifications のテスト
3. 統合テスト / E2E テスト拡充

---

*このレポートは poker_sns backend の全ソースコードを走査し作成しました。テストケース総数: 72件*
