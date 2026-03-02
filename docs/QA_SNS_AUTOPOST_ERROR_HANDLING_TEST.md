# QA/QC Test Plan: SNS Auto-Post Error Handling & Retry Behavior

**Document Version:** 1.0
**Author:** QA/QC (尾丸)
**Date:** 2026-03-02
**Status:** Ready for execution post-implementation
**Depends on:** `SNS_AUTO_POST_TECHNICAL_SPEC.md` (Dev), `security-dev-deliverable.md` (DevSecOps)

---

## 1. Scope

SNS自動投稿機能（X / YouTube / Instagram）における以下の異常系テストケースを定義する:

- APIレート制限超過時のエラーハンドリングとリトライ挙動
- 認証トークン失効・リフレッシュ失敗時の挙動
- ネットワーク障害・タイムアウト時の挙動
- コンテンツ変換失敗時の挙動
- 各プラットフォーム固有のエラーレスポンス処理

---

## 2. Test Environment Requirements

| Item | Requirement |
|------|-------------|
| Backend | NestJS開発サーバー (port 4000) |
| Database | PostgreSQL (docker-compose) |
| Mock Server | 各SNS APIのモックエンドポイント（Jest + nock or msw） |
| Queue | BullMQ + Redis（または@nestjs/schedule cronジョブ） |
| Monitoring | ログ出力先確認（console or structured logger） |

---

## 3. X (Twitter) API v2 Error Handling Tests

### 3.1 Rate Limit Exceeded (HTTP 429)

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| X-RL-01 | Tweet投稿でHTTP 429受信 | `POST /2/tweets` → 429 + `x-rate-limit-reset` header | SnsAutoPostレコードのstatusを`retry_pending`に更新、`x-rate-limit-reset`タイムスタンプまで待機後リトライ | HIGH |
| X-RL-02 | 月間制限1,500件到達 | 1,500件投稿済み状態で新規投稿試行 | 投稿をスキップし`status=rate_limited`、管理者への警告ログ出力、当月の残投稿をすべて`deferred`ステータスに変更 | HIGH |
| X-RL-03 | 日次リクエスト上限付近（80%到達） | 日次カウンターが閾値超過 | 警告ログ出力（Slack通知連携想定）、投稿間隔を自動拡大（15分→60分） | MEDIUM |
| X-RL-04 | `x-rate-limit-reset`ヘッダー欠落 | 429レスポンスにreset header無し | デフォルトのバックオフ時間（15分）を適用してリトライスケジュール | MEDIUM |
| X-RL-05 | 連続429レスポンス（3回以上） | 3回連続429 | 指数バックオフ（15min→30min→60min）、最大リトライ回数超過後`status=failed`、エラーログ出力 | HIGH |

### 3.2 Authentication Token Errors

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| X-AUTH-01 | Access token expired (HTTP 401) | `POST /2/tweets` → 401 Unauthorized | SnsCredentialのrefreshTokenでトークンリフレッシュ実行、新トークンでリトライ | CRITICAL |
| X-AUTH-02 | Refresh tokenも失効 | リフレッシュAPI → 401 | `SnsCredential.status=invalid`に更新、管理者に「X再認証必要」アラート、pending投稿を`auth_required`ステータスに変更 | CRITICAL |
| X-AUTH-03 | OAuth scope不足 | `POST /2/tweets` → 403 Forbidden (insufficient scope) | エラーログに必要スコープ(`tweet.write`)を記録、`status=auth_required` | HIGH |
| X-AUTH-04 | アプリケーションBAN/停止 | X APIが403 + `SUSPENDED`エラーコード | 全X投稿を即時停止、管理者緊急アラート | CRITICAL |
| X-AUTH-05 | トークンリフレッシュ中の並行投稿リクエスト | 複数のcronジョブが同時にリフレッシュ試行 | 1つのリフレッシュのみ実行（ロック機構）、他は待機してリフレッシュ済みトークンを使用 | HIGH |

### 3.3 Content/Media Errors

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| X-CNT-01 | テキスト280文字超過 | 変換後コンテンツが280文字超 | 自動truncation + URL付与で280文字以内に収める、truncation後もURLが正しいことを検証 | MEDIUM |
| X-CNT-02 | メディアアップロード失敗 | 画像ファイル破損 or サイズ超過 | テキストのみで投稿を試行（画像なしフォールバック）、エラーログに画像エラー詳細を記録 | MEDIUM |
| X-CNT-03 | メディアアップロードタイムアウト | `upload.twitter.com` → timeout (30s) | リトライ1回、再度失敗ならテキストのみフォールバック | MEDIUM |
| X-CNT-04 | 重複投稿検知 | 同一テキストの連続投稿 | X APIが`DUPLICATE_CONTENT`エラー → `status=duplicate`、リトライしない | LOW |
| X-CNT-05 | 禁止コンテンツ含有 | X APIが`CONTENT_POLICY_VIOLATION` | `status=rejected`、管理者通知、元投稿のフラグ付け | MEDIUM |

---

## 4. YouTube Data API v3 Error Handling Tests

### 4.1 Quota Exceeded

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| YT-RL-01 | 日次クォータ(10,000 units)超過 | `videos.insert` → 403 `quotaExceeded` | 当日の残投稿を翌日0:00 PTにリスケジュール、管理者通知 | HIGH |
| YT-RL-02 | アップロード数上限到達 | 6回目のvideo upload試行 | 残クォータ計算で事前検知、投稿をキューに保留 | MEDIUM |
| YT-RL-03 | クォータ残量80%到達 | 日次使用量トラッキング | 警告ログ出力、残りアップロード可能数を管理画面に表示 | LOW |

### 4.2 Authentication/Authorization Errors

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| YT-AUTH-01 | Google OAuth token expired | `videos.insert` → 401 | Google refresh tokenでリフレッシュ、リトライ | CRITICAL |
| YT-AUTH-02 | Refresh token revoked | リフレッシュ → `invalid_grant` | `SnsCredential.status=invalid`、管理者に「Google再認証必要」アラート | CRITICAL |
| YT-AUTH-03 | YouTube channel未リンク | `videos.insert` → 403 `channelNotFound` | エラーログに「YouTubeチャンネル設定必要」、`status=config_error` | HIGH |
| YT-AUTH-04 | YouTube APIサービス無効 | 403 `youtubeSignupRequired` | 管理者に「YouTube API有効化必要」アラート | HIGH |

### 4.3 Upload Errors

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| YT-UPL-01 | Resumable upload中断 | ネットワーク切断 | アップロード再開（resumable upload protocol活用）、3回失敗で`status=failed` | HIGH |
| YT-UPL-02 | 動画フォーマット不正 | 非対応フォーマット送信 | `status=format_error`、管理者通知 | MEDIUM |
| YT-UPL-03 | サムネイル生成失敗 | OG画像取得タイムアウト | デフォルトブランドサムネイルで代替 | LOW |
| YT-UPL-04 | 動画サイズ超過 | ファイルサイズ > 256GB | 事前サイズチェックで拒否、`status=size_error` | LOW |

---

## 5. Instagram Graph API Error Handling Tests

### 5.1 Rate Limit / Publish Limit

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| IG-RL-01 | 24時間投稿上限(25件)到達 | 26件目の`POST /{ig-user-id}/media` | `OAuthException` code 4 → 24時間後にリスケジュール、管理者通知 | HIGH |
| IG-RL-02 | API呼び出しレート制限 | 短時間での大量リクエスト → 429 | 指数バックオフ（1min→5min→15min）でリトライ | MEDIUM |
| IG-RL-03 | コンテナ作成後のpublish失敗 | `POST /{ig-user-id}/media` 成功後、`media_publish`で429 | コンテナIDを保持し、レート制限解除後にpublishのみリトライ（再作成しない） | HIGH |

### 5.2 Authentication Errors

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| IG-AUTH-01 | Long-lived token expired (60日) | API呼び出し → `OAuthException` code 190 | トークンリフレッシュ実行、リトライ | CRITICAL |
| IG-AUTH-02 | Facebook Pageリンク解除 | `OAuthException` code 200 | `status=config_error`、管理者に「Facebook Page再接続必要」アラート | CRITICAL |
| IG-AUTH-03 | Instagram Businessアカウント切替 | アカウントタイプ変更 | API権限喪失検知、管理者アラート | HIGH |
| IG-AUTH-04 | Meta App Review取消し | permission revoked | 全IG投稿停止、管理者緊急アラート | CRITICAL |

### 5.3 Content Errors

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| IG-CNT-01 | Reels動画90秒超過 | 動画長 > 90s | 事前チェックで拒否 or 自動トリミング、`status=trimmed` | MEDIUM |
| IG-CNT-02 | キャプション2,200文字超過 | 長文投稿の変換 | 2,200文字でtruncation + 「...続きはPoker SNSで」 | MEDIUM |
| IG-CNT-03 | ハッシュタグ30個超過 | 変換後に31個以上のハッシュタグ | 優先度順で30個に制限（#poker #pokersns を必須保持） | LOW |
| IG-CNT-04 | 画像URL期限切れ | image_url → 404 | ローカルファイルから再アップロード試行、失敗なら`status=media_error` | MEDIUM |
| IG-CNT-05 | コンテナ作成のステータスチェック | `POST media` → container ID、ステータスが`IN_PROGRESS`のまま | ポーリング（5秒間隔、最大30回）、タイムアウトで`status=timeout` | MEDIUM |

---

## 6. Cross-Platform Common Error Tests

### 6.1 Network / Infrastructure Errors

| Test ID | Scenario | Expected Behavior | Severity |
|---------|----------|-------------------|----------|
| NET-01 | 各SNS APIへの接続タイムアウト（30秒） | `status=retry_pending`、指数バックオフでリトライ（最大3回） | HIGH |
| NET-02 | DNS解決失敗 | `status=retry_pending`、5分後リトライ | MEDIUM |
| NET-03 | SSL/TLS証明書エラー | 投稿中断、`status=failed`、セキュリティアラート出力 | CRITICAL |
| NET-04 | レスポンスボディ不正（JSON parse error） | エラーログに生レスポンスを記録（トークン値はマスク）、`status=failed` | MEDIUM |
| NET-05 | HTTP 500/502/503 (サーバーエラー) | リトライ（最大3回、指数バックオフ）、全失敗で`status=failed` | HIGH |

### 6.2 Database / Queue Errors

| Test ID | Scenario | Expected Behavior | Severity |
|---------|----------|-------------------|----------|
| DB-01 | SnsAutoPostレコード書き込み失敗 | トランザクションロールバック、cronジョブは次回実行で再検知 | HIGH |
| DB-02 | SnsCredentialレコード読み取り失敗 | 該当プラットフォームの投稿をスキップ、他プラットフォームは続行 | HIGH |
| DB-03 | 同一投稿の重複キューイング | `@@index([postId, platform])`のユニーク制約で防止、重複挿入時はスキップ | MEDIUM |
| DB-04 | BullMQジョブ処理中のワーカークラッシュ | ジョブが未完了のまま残留 → デッドレターキューに移動、管理者通知 | HIGH |
| DB-05 | Redisダウン（BullMQ使用時） | cronジョブがフォールバックで直接処理 or エラーログ + 次回再試行 | HIGH |

### 6.3 Retry Policy Verification

| Test ID | Scenario | Expected Behavior | Severity |
|---------|----------|-------------------|----------|
| RETRY-01 | リトライ回数上限（3回）到達 | `status=failed`に確定、管理者に失敗レポート | HIGH |
| RETRY-02 | 指数バックオフの待機時間検証 | 1回目:1min, 2回目:5min, 3回目:15min（プラットフォーム別に調整可） | MEDIUM |
| RETRY-03 | リトライ中の手動キャンセル | 管理者が`status=cancelled`に変更 → リトライ停止 | MEDIUM |
| RETRY-04 | 部分成功（X成功、YouTube失敗） | 各プラットフォームごとに独立したstatusを持ち、失敗分のみリトライ | HIGH |
| RETRY-05 | リトライ成功後のステータス遷移 | `retry_pending` → リトライ実行 → `posted`、リトライ回数をログに記録 | MEDIUM |

---

## 7. Cron Job / Scheduler Error Tests

| Test ID | Scenario | Expected Behavior | Severity |
|---------|----------|-------------------|----------|
| CRON-01 | Trending Post Detection cronが2重実行 | ロック機構（DBロック or distributed lock）で1つだけ実行 | HIGH |
| CRON-02 | Post Processing cronが前回未完了のまま次回発火 | 実行中フラグを確認、前回分完了まで新規処理をスキップ | HIGH |
| CRON-03 | cronジョブ内で未捕捉例外 | プロセスは生存、エラーログ出力、次回のcron実行には影響なし | CRITICAL |
| CRON-04 | 投稿対象が0件 | 正常終了（空ループ）、不要なAPI呼び出しなし | LOW |
| CRON-05 | 大量投稿(100件以上)がpending | バッチサイズ制限（10件/回）で処理、残りは次回cronで処理 | MEDIUM |

---

## 8. Security-Specific Error Tests

| Test ID | Scenario | Expected Behavior | Severity |
|---------|----------|-------------------|----------|
| SEC-01 | SnsCredentialのtokenがログに出力されないこと | エラーログ内のトークン値がマスク（`***`）されていることを確認 | CRITICAL |
| SEC-02 | 暗号化ストアからのトークン読み出し失敗 | 復号エラー時は`status=auth_required`、平文フォールバックしない | CRITICAL |
| SEC-03 | 自動投稿API（管理者エンドポイント）の認証チェック | 非管理者ユーザーからの`POST /sns-auto-post/*` → 403 | CRITICAL |
| SEC-04 | 投稿内容にXSS/インジェクションペイロード含有 | サニタイズ後のコンテンツのみSNS APIに送信 | HIGH |
| SEC-05 | OAuthリダイレクトURL改ざん | 許可リスト外のredirect_uriを拒否 | HIGH |

---

## 9. Status Transition State Machine

```
                    ┌──────────┐
                    │ pending  │
                    └────┬─────┘
                         │ cron pickup
                    ┌────▼─────┐
              ┌─────┤processing├─────┐
              │     └──────────┘     │
         success                   error
              │                      │
        ┌─────▼──┐          ┌───────▼────────┐
        │ posted │          │ retry_pending  │
        └────────┘          └───────┬────────┘
                                    │
                          ┌─────────┴─────────┐
                     retry < max          retry >= max
                          │                    │
                    ┌─────▼─────┐        ┌─────▼──┐
                    │processing │        │ failed │
                    └───────────┘        └────────┘

  Special statuses:
  - rate_limited  : プラットフォーム制限到達
  - auth_required : 再認証が必要
  - config_error  : 設定不備（チャンネル未リンク等）
  - duplicate     : 重複投稿検知
  - rejected      : コンテンツポリシー違反
  - cancelled     : 管理者による手動キャンセル
```

### Status Transition Tests

| Test ID | From | Event | To | Verify |
|---------|------|-------|----|--------|
| ST-01 | pending | cron pickup | processing | `processing`時にタイムスタンプ記録 |
| ST-02 | processing | API success | posted | `postedAt`とplatformPostId記録 |
| ST-03 | processing | API 429 | retry_pending | retryCountインクリメント |
| ST-04 | processing | API 401 + refresh success | processing | 同一ジョブ内でリトライ |
| ST-05 | processing | API 401 + refresh fail | auth_required | 管理者通知発火 |
| ST-06 | retry_pending | cron re-pickup | processing | バックオフ時間経過後のみ |
| ST-07 | retry_pending | retryCount >= 3 | failed | 最終エラーメッセージ保存 |
| ST-08 | failed | 管理者手動リトライ | pending | retryCountリセット |
| ST-09 | any | 管理者キャンセル | cancelled | 以後のcronで無視される |

---

## 10. Test Data Fixtures

```typescript
// Mock: X API 429 Response
const mockTwitter429 = {
  status: 429,
  headers: {
    'x-rate-limit-limit': '300',
    'x-rate-limit-remaining': '0',
    'x-rate-limit-reset': Math.floor(Date.now() / 1000) + 900, // 15min later
  },
  body: {
    title: 'Too Many Requests',
    detail: 'Rate limit exceeded',
    type: 'about:blank',
    status: 429,
  },
};

// Mock: X API 401 Response
const mockTwitter401 = {
  status: 401,
  body: {
    title: 'Unauthorized',
    detail: 'Invalid or expired token',
    type: 'about:blank',
    status: 401,
  },
};

// Mock: YouTube quotaExceeded Response
const mockYouTubeQuotaExceeded = {
  status: 403,
  body: {
    error: {
      code: 403,
      message: 'The request cannot be completed because you have exceeded your quota.',
      errors: [{ reason: 'quotaExceeded', domain: 'youtube.quota' }],
    },
  },
};

// Mock: Instagram OAuthException
const mockInstagramAuthError = {
  status: 400,
  body: {
    error: {
      message: 'Error validating access token: Session has expired.',
      type: 'OAuthException',
      code: 190,
      fbtrace_id: 'AbcDefGhIjKlMn',
    },
  },
};

// Mock: SnsAutoPost DB Record
const mockPendingPost = {
  id: 'uuid-test-001',
  postId: 'post-uuid-001',
  platform: 'twitter',
  platformPostId: null,
  status: 'pending',
  error: null,
  retryCount: 0,
  scheduledAt: new Date('2026-03-02T10:00:00Z'),
  postedAt: null,
};
```

---

## 11. Acceptance Criteria Summary

| Category | Criteria | Priority |
|----------|----------|----------|
| Rate Limit | 429レスポンス受信時にクラッシュせず適切にリトライスケジュールされること | P0 |
| Rate Limit | 月間/日次制限の事前検知で不要なAPI呼び出しを防止すること | P1 |
| Auth Token | トークン失効時に自動リフレッシュが1回実行されること | P0 |
| Auth Token | リフレッシュ失敗時に管理者アラートが発火すること | P0 |
| Auth Token | トークン値がログに平文で出力されないこと | P0 |
| Retry | 指数バックオフが正しく適用されること | P1 |
| Retry | 最大リトライ回数超過で`failed`に遷移すること | P0 |
| Retry | 部分成功時に失敗分のみリトライされること | P1 |
| Cron | 2重実行防止ロックが機能すること | P0 |
| Cron | 未捕捉例外でプロセスが死なないこと | P0 |
| Content | 文字数制限超過時に適切なtruncationが行われること | P2 |
| Content | メディアアップロード失敗時のフォールバックが動作すること | P2 |
