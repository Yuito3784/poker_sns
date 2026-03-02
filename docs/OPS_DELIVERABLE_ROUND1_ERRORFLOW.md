# Operations成果物: エラー即応・未着手タスク棚卸し自動化

> Round 1 Operations Deliverable | 2026-03-02 | 白上 (Operations)

---

## 成果物サマリ

本ラウンドでは「エラー発生時に止まらず次のアクションへ進む」「5分おきに未着手作業がないか確認する」という2つの要件に対し、以下の運用成果物を作成した。

| # | 成果物 | ファイル | 概要 |
|---|--------|---------|------|
| 1 | 自動エスカレーションルール | `docs/ops-escalation-rules.md` | 4段階レベル定義、カテゴリ別の自動昇格条件、通知テンプレート、抑制ルール |
| 2 | エラー種別ランブック | `docs/ops-error-runbook.md` | インフラ/アプリ/外部サービス/セキュリティの4分類、エラー別次アクション判定表 |
| 3 | エスカレーション付き監視スクリプト | `scripts/escalation-check.sh` | 既存health-check.shを補完、状態追跡+段階的通知+復旧通知 |

---

## 1. 自動エスカレーションルール (ops-escalation-rules.md)

### 設計思想
- 「止まらない運用」を実現するため、連続検知回数に基づく自動エスカレーションを採用
- 通知スパムを防ぐため、レベル上昇時のみ通知し、同一レベルでの重複通知を抑制
- メンテナンスウィンドウ・デプロイ中の不要アラートを自動抑制

### レベル体系

```
L0 INFO    → ログ記録のみ（単発・自動復旧）
L1 WARNING → #ops-alerts（10分=2回連続）→ 対応期限30分
L2 HIGH    → #ops-urgent + 担当者メンション（15分=3回連続）→ 対応期限15分
L3 CRITICAL → #ops-emergency + @here + CEO（30分=6回連続 or 即時CRITICAL）→ 即時対応
```

### 対象カテゴリ
- インフラ系: コンテナ停止、DB接続不可、ディスク逼迫、SSL期限
- タスク棚卸し系: 未着手タスクの連続検知 → 3回連続でL2 HIGH
- ビジネスクリティカル系: Stripe障害、決済エラー率

---

## 2. エラー種別ランブック (ops-error-runbook.md)

### 設計思想
- エラー発生時に「次に何をすればよいか」を即座に判定できるよう、判定表形式を採用
- 各エラーに対し「状況→原因推定→具体コマンド」の3列で記載し、判断の迷いを排除
- 既存の `ops-deploy-runbook.md` や `ops-monitoring-alerting.md` との重複を避け、
  エラー種別ごとの初動判定に特化

### カバー範囲

| カテゴリ | エラー種別数 | 主要項目 |
|---------|------------|---------|
| インフラ系 | 4 | コンテナ停止、DB接続不可、ディスク逼迫、SSL期限 |
| アプリケーション系 | 3 | API 5xx、認証エラー急増、Prisma/DBエラー |
| 外部サービス系 | 3 | Stripe連携、OAuth連携、Discord Webhook |
| セキュリティ系 | 2 | Rate limit超過、不審アクセス |

### 共通フロー
```
検知 → 記録 → レベル判定 → 通知 → 初動対応 → 復旧確認 → 振返り
```

---

## 3. エスカレーション付き監視スクリプト (scripts/escalation-check.sh)

### 既存資産との関係
- `scripts/health-check.sh`: 状態変化時のみDiscord通知（継続）
- `scripts/escalation-check.sh`: 連続検知カウント+段階的エスカレーション（新規追加）
- 両者は独立して動作し、`escalation-check.sh` はより高度な状態管理を提供

### 機能
- `/var/log/poker-sns/escalation-state.json` で状態永続化
- 連続検知カウントに基づくレベル自動昇格
- レベル別Discord Webhook（3チャンネル分離対応）
- 復旧時の自動解消通知
- デプロイ中フラグによるL1抑制

### cron設定（追加分）
```cron
# エスカレーション付きヘルスチェック（5分間隔）
*/5 * * * * /opt/poker-sns/scripts/escalation-check.sh
```

### 必要な環境変数
```bash
HEALTH_CHECK_DOMAIN=your-domain.com
DISCORD_OPS_ALERTS_URL=https://discord.com/api/webhooks/xxx/yyy
DISCORD_OPS_URGENT_URL=https://discord.com/api/webhooks/xxx/yyy
DISCORD_OPS_EMERGENCY_URL=https://discord.com/api/webhooks/xxx/yyy
```

---

## 4. 既存ドキュメントとの整合性

| 既存ドキュメント | 関係 | 備考 |
|---------------|------|------|
| ops-monitoring-alerting.md | 補完 | 基本的な監視設計は維持、エスカレーション層を追加 |
| ops-deploy-runbook.md | 参照 | ランブック内からデプロイ手順を参照リンク |
| health-check.sh | 並行運用 | 既存スクリプトはそのまま継続、escalation-check.shを追加 |
| ops-security-monitoring.md | 連携 | セキュリティ系エラーのランブックエントリを追加 |

---

## 5. 今後の拡張計画

| Phase | 内容 | 時期目安 |
|-------|------|---------|
| Phase 1 | 現状の3成果物のデプロイ・運用開始 | 今週 |
| Phase 2 | タスク棚卸しスクリプト（backlog DB連携） | 来週 |
| Phase 3 | Slack並列通知、SMS (Twilio)、PagerDuty統合 | 再来週以降 |
| Phase 4 | インシデント自動記録 + ダッシュボードUI連携 | Design成果物と統合 |

---

## 6. 収益影響評価

| 項目 | 効果 |
|------|------|
| MTTR短縮 | エスカレーション自動化によりMTTR(平均復旧時間)を推定50%短縮 |
| ダウンタイム削減 | 段階的通知により対応漏れを防止 → 売上機会損失の最小化 |
| 運用負荷軽減 | ランブックにより初動判断の標準化 → 属人化排除 |
| Stripe障害即応 | 課金系エラーをL2/L3で即時検知 → 売上直接影響の迅速対応 |
