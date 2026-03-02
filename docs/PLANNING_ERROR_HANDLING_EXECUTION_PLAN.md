# エラー即時対応 & 未着手タスク棚卸し 実行計画書

**作成**: 常闇 (Planning)
**日付**: 2026-03-02
**ステータス**: Phase1 着手中

---

## 1. 目的

CEOからの指示2点を運用フローとして確立する:

1. **エラー発生時に止まらず次のアクションへ進む仕組み**
2. **5分間隔で未着手タスクを棚卸しし、漏れなく完了まで追う仕組み**

---

## 2. サブタスク一覧（優先度順）

| # | サブタスク | 担当 | Phase | 工数 | 収益影響 |
|---|-----------|------|-------|------|---------|
| 1 | ExceptionFilter通知・リトライ連携 | 兎田(Dev) | 1 | 1日 | HIGH |
| 2 | 運用ランブック v1 作成 | 星街(Ops) | 1 | 半日 | HIGH |
| 3 | CI/CDエラー通知ワークフロー | 獅白(DevSecOps) | 1 | 半日 | HIGH |
| 4 | ExceptionFilterカバレッジ棚卸し | 雪花(QA) | 1 | 半日 | MEDIUM |
| 5 | エスカレーションルール策定 | 星街(Ops) | 1 | 半日 | MEDIUM |
| 6 | エラーバナーUIスペック | 宝鐘(Design) | 2 | 半日 | LOW |
| 7 | タスク進捗ダッシュボードモック | 宝鐘(Design) | 2 | 1日 | MEDIUM |
| 8 | エラー通知E2Eテストシナリオ | 雪花(QA) | 2 | 半日 | MEDIUM |
| 9 | 5分間隔cron負荷テスト | 雪花(QA) | 2 | 半日 | LOW |
| 10 | Docker/nginx 5分間隔ヘルスチェック | 獅白(DevSecOps) | 2 | 半日 | MEDIUM |

---

## 3. Phase1 詳細仕様（今週中完了）

### 3.1 ExceptionFilter通知・リトライ連携

**要件**:
- NestJSグローバル例外フィルターにSlack/Discord Webhook通知hookを追加
- 失敗タスクをリトライキュー（Bull Queue推奨）に積む処理
- リトライ上限: 3回、指数バックオフ（1s, 4s, 16s）
- リトライ全失敗時: Slack緊急チャンネルへエスカレーション

**技術方針**:
```
エラー発生 → ExceptionFilter捕捉
  → Slack Webhook POST (非同期、メイン処理をブロックしない)
  → リトライ対象判定 (5xx系のみ、4xx系はリトライしない)
  → Bull Queueにリトライジョブ登録
  → 3回失敗 → エスカレーション通知
```

**既存資産**: `docs/ops-monitoring-alerting.md` のヘルスチェックスクリプトと統合可能

### 3.2 運用ランブック v1

**要件**:
- エラーパターン分類（5種類）:
  1. DB接続エラー (PostgreSQL down/timeout)
  2. 外部API障害 (Stripe, OAuth provider)
  3. アプリ例外 (500 Internal Server Error)
  4. 認証/認可エラー (JWT expired, invalid token)
  5. インフラ障害 (Docker container crash, disk full)
- 各パターンに「検知→通知先→次アクション→エスカレーション条件」を記載

**テンプレート**:
```
パターン: DB接続エラー
検知: ExceptionFilter / healthcheck.sh
通知先: Slack #ops-alerts
次アクション:
  1. docker compose restart db
  2. pg_isready 確認
  3. 復旧しない場合 → バックアップからリストア (ops-backup-restore-incident.md参照)
エスカレーション: 5分以内に復旧しない場合 → 緊急チャンネル
```

### 3.3 CI/CDエラー通知ワークフロー

**要件**:
- `.github/workflows/ci-cd.yml` にSlack Webhook通知ステップ追加
- ビルド/デプロイ失敗時: `continue-on-error` + 後続リカバリジョブ
- 通知内容: ワークフロー名、失敗ステップ、コミットSHA、実行者

### 3.4 ExceptionFilterカバレッジ棚卸し

**要件**:
- バックエンド全エンドポイントの異常系レスポンス一覧化
- 未捕捉の例外パスを洗い出すテストケースマトリクス
- 対象モジュール: Auth, Posts, Replies, Users, Notifications, Search, Ads, Affiliates, Subscriptions

### 3.5 エスカレーションルール

**要件**:
- 3段階エスカレーション:
  - Level 1: 初回エラー → #ops-alerts 通知
  - Level 2: 3回連続未着手/未復旧 → #ops-urgent 通知 + メンション
  - Level 3: 15分以上未復旧 → CEO直接通知

---

## 4. Phase2 詳細仕様（来週）

### 4.1 5分間隔の未着手タスク棚卸し

**技術選定**: Node-cron (NestJSの `@nestjs/schedule` + `@Cron('*/5 * * * *')`)

**理由**:
- Bull Queueのリピータブルジョブも候補だが、棚卸しは単純なDB問い合わせなのでcronで十分
- NestJSに `@nestjs/schedule` が統合しやすい
- 負荷: 5分間隔のSELECTクエリ1本、DB負荷は無視できるレベル

**処理フロー**:
```
5分間隔cron起動
  → 未着手タスク一覧をDBから取得
  → 件数が閾値超え → Slack通知
  → 3回連続で同一タスクが未着手 → エスカレーション
```

### 4.2 UI/ダッシュボード

- エラーバナー: 赤(エラー) / #c9a84c(リトライ中) / 緑(完了)の3状態
- ダッシュボード: The Felt Tableテーマ準拠、#131a14サーフェス上に配置

### 4.3 テスト

- E2E: 意図的例外 → 通知到達 → リトライ → 最終ステータス検証
- 負荷: 5分間隔cronの重複実行防止テスト

---

## 5. 依存関係マップ

```
[#4 カバレッジ棚卸し] ──→ [#1 ExceptionFilter連携]
                                    ↓
[#3 CI/CD通知] ──→ [#2 ランブック] ──→ [#5 エスカレーション]
                                    ↓
                          [Phase2: #6-#10]
```

- #4(QA棚卸し)が#1(ExceptionFilter実装)の前提情報
- #2(ランブック)は#1, #3の完成後に通知先設定を反映
- Phase2はPhase1完了後に着手

---

## 6. 現在のステータス

| 担当 | アクション | 状態 |
|------|-----------|------|
| 兎田(Dev) | ExceptionFilter通知連携着手 | In Progress |
| 星街(Ops) | ランブック v1 作成着手 | In Progress |
| 獅白(DevSecOps) | CI/CD通知ワークフロー着手 | In Progress |
| 雪花(QA) | ExceptionFilterカバレッジ棚卸し着手 | In Progress |
| 宝鐘(Design) | エラーバナーUIスペック先行着手 | In Progress |
| 常闇(Planning) | 本実行計画書作成 | Complete |

---

## 7. 成功基準

- [ ] エラー発生から通知到達まで30秒以内
- [ ] リトライ処理が自動実行され、手動介入なしで復旧可能なケースをカバー
- [ ] 5分間隔で未着手タスクの棚卸しが自動実行される
- [ ] エスカレーションルールに基づき、適切なタイミングで上位通知される
- [ ] 本番環境のヘルスチェックが5分間隔で稼働し、異常検知できる
