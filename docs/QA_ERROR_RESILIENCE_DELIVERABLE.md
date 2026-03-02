# QA/QC Deliverable: エラー耐性・自動復旧パイプライン検証計画

**Author:** QA/QC (尾丸)
**Date:** 2026-03-02
**Round:** エラー発生時の停止防止 & 5分間隔タスク棚卸し
**Status:** Complete (テスト設計完了 / 実装後実行待ち)

---

## Executive Summary

本成果物は、CEO要件「エラー発生時に止まらず次のアクションへ進む」「5分おきの未着手タスク棚卸し」に対するQA/QC検証計画である。

現状分析の結果、以下の重大なギャップを特定:

| 項目 | 現状 | あるべき姿 | GAP深刻度 |
|------|------|-----------|----------|
| グローバルExceptionFilter | 未実装（NestJSデフォルト依存） | カスタムフィルタで通知・リトライ連携 | CRITICAL |
| 構造化ログ | `console.warn`のみ散在 | Winston/Pino等でJSON構造化ログ | HIGH |
| リトライキュー | 未実装（pg-boss設計済み） | pg-bossでジョブ永続化+DLQ | CRITICAL |
| 5分間隔タスク棚卸し | 未実装 | @nestjs/schedule cronジョブ | HIGH |
| Slack通知 | 外部スクリプト(health-check.sh)のみ | NestJS内部からWebhook通知 | HIGH |
| ジョブ2重実行防止 | 未実装 | DBロック or distributed lock | HIGH |

### 成果物構成

| # | Section | Test Cases | 対象 |
|---|---------|-----------|------|
| 1 | ExceptionFilter カバレッジギャップ分析 | 8項目 | 現状コード監査 |
| 2 | E2Eテストシナリオ: エラー通知→リトライ→再失敗 | 24ケース | 新規パイプライン検証 |
| 3 | ストレステスト: 5分間隔cron負荷・重複実行 | 16ケース | cron耐性検証 |
| 4 | 受入基準・ブロッキングイシュー | 12基準 | Gate判定 |

**合計: 60テスト項目**

---

## 1. ExceptionFilter カバレッジギャップ分析

### 1.1 現状のエラーハンドリング監査結果

現在のバックエンドコードを全件走査した結果:

| ファイル | エラー種別 | ハンドリング方式 | 問題点 |
|---------|-----------|--------------|--------|
| `auth.service.ts` | Prisma P2002 (unique constraint) | try-catch → BadRequestException | 通知なし、ログ不足 |
| `auth.service.ts` | Email送信失敗 | `console.warn()` → 処理続行 | トークン値マスクは修正済みだがログ構造化なし |
| `posts.service.ts` | 文字数制限超過 | BadRequestException | 正常（バリデーション） |
| `posts.service.ts` | ハッシュタグリンク重複 | `console.warn()` → 無視 | 軽微（設計意図通り） |
| `subscriptions.service.ts` | Webhook署名検証失敗 | BadRequestException(400) | 修正済み（以前は例外を飲んでいた） |
| `health.controller.ts` | DB接続失敗 | 未捕捉（500になる） | ヘルスチェック自体が落ちる |
| `main.ts` | 起動失敗 | 未捕捉 | プロセス終了のみ |
| `prisma.service.ts` | DB接続/切断 | ライフサイクルフック | 正常 |

### 1.2 CRITICAL ギャップ一覧

| GAP-ID | 内容 | リスク | 推奨対策 |
|--------|------|--------|---------|
| GAP-01 | カスタムExceptionFilterが存在しない | 未捕捉例外でスタックトレースがクライアントに露出、通知機構なし | `AllExceptionsFilter`を実装し`APP_FILTER`にグローバル登録 |
| GAP-02 | 構造化ログなし | エラー調査時にログがパースできない、時系列追跡困難 | Winston or Pinoの導入、リクエストIDによるトレーシング |
| GAP-03 | エラー発生時の自動通知なし | 障害に気づくのが遅れ「止まった状態」が長時間継続 | ExceptionFilter内でSlack Webhook呼び出し |
| GAP-04 | リトライ機構なし | 一時的障害（DB接続断、外部API timeout等）で即失敗確定 | pg-boss導入でリトライポリシー適用 |
| GAP-05 | ヘルスチェックの例外ハンドリング不足 | DB接続障害時にヘルスチェックが500を返すだけ | try-catchで `{ status: 'error', detail: '...' }` を返す |
| GAP-06 | プロセスレベルのunhandledRejection/uncaughtExceptionハンドラなし | 未捕捉Promiseリジェクションでプロセスが静かに死ぬ可能性 | `process.on('unhandledRejection/uncaughtException')` でログ+通知 |
| GAP-07 | ValidationPipeのエラーレスポンスが構造化されていない | フロントエンドでのエラーハンドリングが不安定 | `exceptionFactory`カスタマイズで統一エラーフォーマット |
| GAP-08 | CORS/Helmet等ミドルウェアの初期化エラーハンドリングなし | 設定ミスで起動失敗時の原因特定が困難 | bootstrap()にtry-catchとログ出力 |

---

## 2. E2Eテストシナリオ: エラー通知→リトライ→再失敗フロー

### 2.1 テスト環境要件

| 項目 | 要件 |
|------|------|
| Backend | NestJS開発サーバー (port 4000) |
| Database | PostgreSQL (docker-compose) |
| Mock | Jest + `nock` or `msw` でHTTPレベルの障害注入 |
| Queue | pg-boss（PostgreSQL同居） |
| 通知 | Slack Webhook Mock（`nock`でインターセプト） |
| ロガー | テスト用ログCollector（stdout capture） |

### 2.2 ExceptionFilter通知連携テスト

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| EF-01 | 未捕捉例外発生時のSlack通知 | 意図的に`throw new Error('unhandled')`を仕込んだエンドポイントをGET | ExceptionFilterが捕捉、500レスポンス返却、Slack Webhookに通知送信（エラーメッセージ・スタックトレース・リクエストパス含む） | CRITICAL |
| EF-02 | Prisma接続断時のエラーハンドリング | PostgreSQLコンテナを停止してAPIリクエスト送信 | ExceptionFilterが捕捉、503レスポンス、Slack通知「DB接続エラー」、スタックトレースは非公開 | CRITICAL |
| EF-03 | 高頻度エラー時の通知デバウンス | 1秒間に同一エラーを100回発生させる | Slack通知は最大1回/分に制限（通知洪水防止） | HIGH |
| EF-04 | エラーレスポンスにスタックトレース非露出 | 本番モード(`NODE_ENV=production`)で未捕捉例外 | レスポンスボディに`stack`プロパティが含まれないこと | CRITICAL |
| EF-05 | リクエストIDによるトレーシング | エラー発生リクエスト | ログとSlack通知に同一リクエストIDが含まれ、追跡可能 | HIGH |
| EF-06 | 特定例外の通知スキップ | ThrottlerException(429), NotFoundException(404) | 日常的なエラーはSlack通知しない（ログのみ） | MEDIUM |

### 2.3 リトライキュー統合テスト

| Test ID | Scenario | Input | Expected Behavior | Severity |
|---------|----------|-------|-------------------|----------|
| RQ-01 | 一時的DB障害→リトライ成功 | pg-bossジョブ実行中にDB接続を1回切断→即復旧 | 1回目失敗→リトライ→2回目成功、ジョブ状態`completed` | CRITICAL |
| RQ-02 | 3回連続失敗→DLQ移動 | 3回連続で例外を発生させるモックジョブ | retryCount=3到達後、DLQ(`dead-letter`)に移動、Slack CRITICAL通知 | CRITICAL |
| RQ-03 | DLQから手動再実行→成功 | DLQ内ジョブをAdmin API経由で再投入 | 新ジョブとして`created`→`active`→`completed`、DLQレコードは`archived` | HIGH |
| RQ-04 | 指数バックオフの時間検証 | 3回リトライが発生するジョブ | 1回目:60秒後, 2回目:~120秒後, 3回目:~240秒後（±10%の誤差許容） | MEDIUM |
| RQ-05 | リトライ中のジョブキャンセル | リトライ待機中のジョブを管理者がキャンセル | ジョブ状態が`cancelled`に遷移、以後のリトライ実行なし | MEDIUM |
| RQ-06 | ジョブペイロードにセンシティブ情報非含有 | pg-boss `data`カラムを直接参照 | トークン・パスワード等がジョブペイロードに平文保存されていないこと | CRITICAL |

### 2.4 エラー通知→リトライ→再失敗 E2Eフロー

| Test ID | Scenario | Full Flow | Verify Points | Severity |
|---------|----------|-----------|---------------|----------|
| E2E-01 | API障害→通知→リトライ成功 | (1)外部API mockが500返却 → (2)ExceptionFilter捕捉 → (3)Slack通知送信 → (4)pg-bossリトライ起動 → (5)2回目でmockが200返却 → (6)ジョブcompleted | 通知内容にジョブID含有、リトライ回数=1、最終status=completed | CRITICAL |
| E2E-02 | API障害→通知→3回失敗→DLQ→管理者通知 | (1)mockが常に500返却 → (2)3回リトライ全失敗 → (3)DLQ到達 → (4)Slack CRITICAL通知 | 通知が計4回（初回+リトライ3回分のサマリ）、DLQ通知にエラー詳細含有 | CRITICAL |
| E2E-03 | 認証エラー→即通知→リトライなし | (1)外部API mockが401返却 → (2)ExceptionFilter捕捉 → (3)Slack通知「認証エラー」 → (4)リトライスキップ → (5)即DLQ | 401/403はリトライ対象外、即DLQ移動、通知に「再認証必要」メッセージ | CRITICAL |
| E2E-04 | DB障害→ヘルスチェック異常→自動検知 | (1)DB接続断 → (2)ヘルスチェック異常検知 → (3)Slack通知 → (4)DB復旧 → (5)ヘルスチェック正常復帰 | ヘルスチェック異常時と復旧時の両方で通知 | HIGH |
| E2E-05 | 複数ジョブ同時失敗時の通知集約 | (1)5つのジョブが同時に失敗 → (2)Slack通知 | 個別通知ではなく集約通知（「5件のジョブが失敗」）が送信される | MEDIUM |
| E2E-06 | プロセス再起動後のジョブ復旧 | (1)pg-bossにpendingジョブ3件 → (2)NestJSプロセス再起動 → (3)ジョブ処理再開 | pg-bossのDB永続化により、再起動後もジョブがロストしないこと | CRITICAL |

### 2.5 テストデータFixtures

```typescript
// E2E Test: ExceptionFilter通知検証用モック
const mockSlackWebhook = nock('https://hooks.slack.com')
  .post('/services/T.../B.../...')
  .reply(200, 'ok');

// E2E Test: 外部API障害注入
const mockExternalApi500 = nock('https://api.external.com')
  .post('/endpoint')
  .times(3)
  .reply(500, { error: 'Internal Server Error' });

// E2E Test: 3回目で成功するモック
const mockExternalApiRecovery = nock('https://api.external.com')
  .post('/endpoint')
  .times(2)
  .reply(500, { error: 'Internal Server Error' })
  .post('/endpoint')
  .reply(200, { success: true });

// pg-boss ジョブテストデータ
const testJob = {
  name: 'sns-post-twitter',
  data: {
    postId: 'post-uuid-test-001',
    platform: 'twitter',
    content: 'テスト投稿 #poker',
    scheduledAt: '2026-03-02T10:00:00Z',
  },
  options: {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInMinutes: 30,
    deadLetter: 'sns-post-dead-letter',
  },
};
```

---

## 3. ストレステスト: 5分間隔cron負荷・重複実行

### 3.1 テスト前提

Planned会議での要件:
> 5分おきに未着手の作業がないか確認し、必ず完了まで行うこと

これを実現する5分間隔cronジョブ(`@Cron('*/5 * * * *')`)に対するストレステスト項目。

### 3.2 5分間隔cronの負荷テスト

| Test ID | Scenario | 条件 | Expected Behavior | Severity |
|---------|----------|------|-------------------|----------|
| LOAD-01 | 通常負荷: pendingジョブ10件 | 5分間隔で10件のpendingジョブを検出・処理 | 全件処理完了、処理時間 < 60秒、DB負荷軽微 | HIGH |
| LOAD-02 | 高負荷: pendingジョブ100件 | 5分間隔で100件のpendingジョブを検出 | バッチサイズ制限(10件/回)で10件処理、残90件は次回以降、メモリ使用量安定 | HIGH |
| LOAD-03 | 極端負荷: pendingジョブ1000件 | 棚卸しクエリで1000件の未着手を検出 | SELECTクエリのレスポンス時間 < 1秒、OOM発生なし | MEDIUM |
| LOAD-04 | 空負荷: pendingジョブ0件 | 5分間隔で0件の未着手を検出 | DBクエリのみ実行（軽量）、不要なAPI呼び出しなし、実行時間 < 100ms | LOW |
| LOAD-05 | 長時間連続実行 | 24時間連続で5分間隔cronを実行（288回） | メモリリークなし、DB接続プールの枯渇なし、ログファイル肥大化の上限制御 | HIGH |
| LOAD-06 | cron実行中のAPIリクエスト影響 | cron処理中に通常のAPIリクエストを並行送信 | APIレスポンスタイムが通常時の150%以内に収まること | MEDIUM |

### 3.3 重複実行防止テスト

| Test ID | Scenario | 条件 | Expected Behavior | Severity |
|---------|----------|------|-------------------|----------|
| DUP-01 | 前回のcron未完了時に次回が発火 | 処理時間 > 5分のジョブを注入 | 実行中フラグ(DBロック or in-memory flag)で2回目をスキップ | CRITICAL |
| DUP-02 | 水平スケーリング時の2重実行 | NestJSインスタンスを2つ起動 | pg-bossのジョブロックにより1インスタンスのみがジョブを取得 | CRITICAL |
| DUP-03 | プロセスクラッシュ後のロック解放 | cron実行中にプロセスをSIGKILL | ロックのTTL(例: 10分)経過後に自動解放、次回cronで正常実行再開 | HIGH |
| DUP-04 | 同一ジョブの重複キューイング | 同一postId+platformの組み合わせで2回投入 | ユニーク制約（@@unique([postId, platform])）でDB拒否 or upsert | HIGH |
| DUP-05 | タイムゾーン跨ぎでのcron実行 | UTC/JST切替タイミングでcron発火 | 日次カウンターのリセットタイミングが正確（JST 00:00基準） | MEDIUM |

### 3.4 cronジョブ異常系テスト

| Test ID | Scenario | 条件 | Expected Behavior | Severity |
|---------|----------|------|-------------------|----------|
| CRON-ERR-01 | cron内部の未捕捉例外 | ジョブ処理中に`throw new Error()` | NestJSプロセスは生存、エラーログ出力、次回5分後のcronは正常実行 | CRITICAL |
| CRON-ERR-02 | DB接続プール枯渇 | cron実行中にDB接続が全使用中 | 接続待ちでタイムアウト → エラーログ → 次回cronで回復 | HIGH |
| CRON-ERR-03 | cron処理のタイムアウト | 1件のジョブ処理が5分以上かかる | タイムアウト設定(例: 4分)で中断、ジョブを`retry_pending`に戻す | HIGH |
| CRON-ERR-04 | メモリ不足状態でのcron実行 | ヒープメモリ使用率90%超 | GC発生、処理続行可能。OOM Killerによる強制終了時はpm2/systemdで自動再起動 | MEDIUM |
| CRON-ERR-05 | 棚卸しクエリのデッドロック | 棚卸しSELECTと他トランザクションのUPDATEが競合 | `SELECT ... FOR UPDATE SKIP LOCKED`パターンでデッドロック回避 | HIGH |

---

## 4. ExceptionFilter実装検証チェックリスト

Development (兎田)チームがExceptionFilter通知・リトライ連携を実装した際のQAゲート:

### 4.1 機能検証項目

| # | チェック項目 | 検証方法 | Pass基準 |
|---|------------|---------|---------|
| 1 | `AllExceptionsFilter`がグローバル登録されている | `app.module.ts`の`APP_FILTER`確認 | `useClass: AllExceptionsFilter`が設定されている |
| 2 | 未捕捉例外がフィルタで捕捉される | テスト用エンドポイントで`throw new Error()` | 500レスポンス + 構造化ログ出力 |
| 3 | HttpExceptionが正しいステータスコードを返す | 各ステータスコード(400,401,403,404)テスト | NestJS標準HttpExceptionのステータスコードが維持される |
| 4 | Slack通知が正しく送信される | モックWebhookでリクエストを検証 | エラーメッセージ・パス・タイムスタンプ・リクエストIDが含まれる |
| 5 | 本番環境でスタックトレース非露出 | `NODE_ENV=production`でリクエスト | レスポンスの`message`に`stack`が含まれない |
| 6 | 通知のレート制限が機能する | 1秒間に100エラー発生 | Slack通知は1分に1回以下 |
| 7 | 404/429等の日常エラーが通知除外される | 存在しないURLへGET | ログ出力のみ、Slack通知なし |
| 8 | `process.on('unhandledRejection')`が設定されている | 意図的にrejectされたPromiseを放置 | プロセス生存 + ログ + 通知 |

### 4.2 ログフォーマット検証

```json
// 期待されるログ出力フォーマット
{
  "timestamp": "2026-03-02T10:30:00.000Z",
  "level": "error",
  "requestId": "req-uuid-xxx",
  "method": "POST",
  "path": "/posts",
  "statusCode": 500,
  "message": "Internal server error",
  "error": "TypeError: Cannot read property 'x' of undefined",
  "userId": "user-uuid-xxx",  // JWTから抽出（ログイン中の場合）
  "duration": 145  // ms
}
```

| Verify | 内容 |
|--------|------|
| ログにトークン/パスワードが含まれないこと | `password`, `token`, `secret`をgrepして確認 |
| ログのJSONパースが可能であること | 各行を`JSON.parse()`して検証 |
| タイムスタンプがISO 8601であること | フォーマット検証 |

---

## 5. 受入基準

### 5.1 Phase 1 Gate (必須 — ExceptionFilter+通知)

| # | 基準 | Priority | 状態 |
|---|------|----------|------|
| AC-01 | カスタムExceptionFilterがグローバル登録され、全未捕捉例外を捕捉する | P0 | Blocked (未実装) |
| AC-02 | エラー発生時に60秒以内にSlack通知が送信される | P0 | Blocked (未実装) |
| AC-03 | 本番環境でスタックトレースがクライアントに露出しない | P0 | Blocked (未実装) |
| AC-04 | `process.on('unhandledRejection')`でプロセス死亡を防止 | P0 | Blocked (未実装) |
| AC-05 | ログにセンシティブ情報（トークン、パスワード）が含まれない | P0 | 部分的Pass (既存console.warnでトークンマスク済み) |
| AC-06 | ヘルスチェックエンドポイントがDB障害時に適切なレスポンスを返す | P1 | Blocked (try-catch未実装) |

### 5.2 Phase 2 Gate (必須 — リトライ+5分間隔棚卸し)

| # | 基準 | Priority | 状態 |
|---|------|----------|------|
| AC-07 | pg-bossジョブの3回リトライ→DLQ遷移が正しく動作する | P0 | Blocked (pg-boss未導入) |
| AC-08 | 5分間隔cronが重複実行されない | P0 | Blocked (cron未実装) |
| AC-09 | cronジョブ内の未捕捉例外でプロセスが死なない | P0 | Blocked (cron未実装) |
| AC-10 | DLQ到達時にSlack CRITICAL通知が送信される | P0 | Blocked (DLQ未実装) |
| AC-11 | プロセス再起動後もpendingジョブがロストしない | P0 | Blocked (pg-boss未導入) |
| AC-12 | 24時間連続cron実行でメモリリークが発生しない | P1 | Blocked (cron未実装) |

---

## 6. ブロッキングイシュー（QA実行の前提条件）

| BLOCK-ID | 内容 | 担当 | Impact |
|----------|------|------|--------|
| BLOCK-QA-01 | カスタムExceptionFilterの実装 | Development (兎田) | Section 2.2全テスト実行不可 |
| BLOCK-QA-02 | pg-bossの導入とジョブハンドラ実装 | Development (兎田) | Section 2.3-2.4全テスト実行不可 |
| BLOCK-QA-03 | 5分間隔cronジョブの実装 | Development (兎田) | Section 3全テスト実行不可 |
| BLOCK-QA-04 | Slack Webhook通知サービスの実装 | Development (兎田) | 通知関連テスト全実行不可 |
| BLOCK-QA-05 | 構造化ロガーの導入 | Development (兎田) | Section 4.2ログフォーマット検証不可 |
| BLOCK-QA-06 | Admin API (ジョブ管理エンドポイント) | Development (兎田) | E2E-03手動再実行テスト不可 |

---

## 7. 他チームへの依存・連携

### Development (兎田)チームへ
- BLOCK-QA-01〜06の実装完了が全テスト実行の前提
- ExceptionFilter実装時はSection 4.1のチェックリストを参照し、QAゲートを意識した設計を推奨
- pg-bossジョブ設定はOpsチームの`ops-sns-autopost-job-scheduler.md` Section 2.4の仕様に準拠

### DevSecOps (獅白)チームへ
- EF-04（スタックトレース非露出）のCI検証自動化を連携依頼
- RQ-06（ジョブペイロードのセンシティブ情報チェック）のセキュリティレビュー連携
- Slack Webhook URLの`.env`管理方式のレビュー

### Operations (星街)チームへ
- LOAD-05（24時間連続cron実行）のモニタリング指標設計を連携
- DUP-05（タイムゾーン跨ぎ）のcronスケジュール設計レビュー
- 棚卸し結果の自動エスカレーションルール（3回連続未着手→緊急通知）のテストシナリオ反映待ち

---

## 8. テスト自動化計画

### 8.1 自動化優先度

| Category | 自動化可否 | ツール | 優先度 |
|----------|-----------|-------|--------|
| ExceptionFilter通知 (EF-*) | 自動化可 | Jest + nock + supertest | P0 |
| リトライキュー (RQ-*) | 自動化可 | Jest + pg-boss test helper | P0 |
| E2Eフロー (E2E-*) | 一部自動化 | Jest E2E + docker-compose | P1 |
| 負荷テスト (LOAD-*) | 自動化可 | k6 or Artillery | P2 |
| 重複実行 (DUP-*) | 自動化可 | Jest + 並行プロセス起動 | P1 |
| cronエラー (CRON-ERR-*) | 一部自動化 | Jest + DB障害注入 | P1 |

### 8.2 CI/CD統合

```yaml
# GitHub Actions: QA Gate for Error Resilience
- name: Run ExceptionFilter Tests
  run: npm run test -- --testPathPattern="exception-filter"

- name: Run Retry Queue Tests
  run: npm run test -- --testPathPattern="retry-queue"

- name: Run Cron Stress Tests
  run: npm run test -- --testPathPattern="cron-stress"
  timeout-minutes: 10
```

---

## 9. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ExceptionFilter実装遅延でQA開始不可 | Medium | High | テストコードを先行作成、実装完了と同時にCI実行可能にする |
| pg-boss導入がPostgres互換性問題で難航 | Low | High | ローカル検証環境で事前にpg-boss単体テストを実行 |
| 5分間隔cronの負荷がDB性能を圧迫 | Medium | Medium | LOAD-06でAPIレスポンス影響を計測、閾値超過時はcron間隔調整を推奨 |
| Slack Webhook通知の信頼性 | Low | Medium | Webhook失敗時のフォールバック（ログファイル書き出し）を検証 |
| テスト環境と本番環境の差異 | Medium | High | Docker Compose構成を本番と一致させ、Staging環境でのE2E実行を必須化 |
