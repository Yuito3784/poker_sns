# 自動エスカレーションルール策定

> Operations成果物 | 作成: 2026-03-02 | 担当: 白上 (Operations)

## 1. 目的

5分間隔のヘルスチェック・タスク棚卸しにおいて、異常やタスク未着手が継続した場合に段階的にエスカレーションを行い、対応遅延によるサービス影響を最小化する。

---

## 2. エスカレーションレベル定義

| Level | 条件 | 通知先 | 通知手段 | 対応期限 |
|-------|------|--------|----------|----------|
| L0 INFO | 単発の警告（自動復旧） | ops-log チャンネル | Discord embed (gray) | 記録のみ |
| L1 WARNING | 同一アラートが2回連続（10分） | #ops-alerts チャンネル | Discord embed (yellow) | 30分以内 |
| L2 HIGH | 同一アラートが3回連続（15分） | #ops-urgent チャンネル + 担当者メンション | Discord embed (orange) + メール | 15分以内 |
| L3 CRITICAL | 同一アラートが6回連続（30分）またはCRITICALアラート即時 | #ops-emergency + 全Ops メンション + CEO | Discord embed (red) + メール + SMS(設定時) | 即時対応 |

---

## 3. エスカレーション対象カテゴリ

### 3.1 インフラ系アラート

| アラート種別 | 初回レベル | 自動エスカレーション |
|-------------|-----------|-------------------|
| コンテナ停止 (backend/frontend/nginx) | L2 HIGH | → 15分後 L3 |
| DB接続不可 | L3 CRITICAL | 即時 |
| API /health 非200応答 | L1 WARNING | → 10分後 L2 → 15分後 L3 |
| ディスク使用率 80%超 | L1 WARNING | → 30分後 L2 |
| ディスク使用率 90%超 | L2 HIGH | → 15分後 L3 |
| SSL証明書残14日未満 | L1 WARNING | → 7日未更新で L2 |
| SSL証明書残3日未満 | L3 CRITICAL | 即時 |

### 3.2 タスク棚卸し系（未着手タスク検知）

| 条件 | エスカレーションレベル | アクション |
|------|---------------------|-----------|
| 1回検知（5分） | L0 INFO | ログ記録のみ |
| 2回連続検知（10分） | L1 WARNING | #ops-alerts へ通知 |
| 3回連続検知（15分） | L2 HIGH | #ops-urgent へ通知 + 担当者メンション |
| 6回連続検知（30分） | L3 CRITICAL | 全体通知 + タスク再アサイン検討 |

### 3.3 ビジネスクリティカル系

| アラート種別 | 初回レベル | 備考 |
|-------------|-----------|------|
| Stripe Webhook署名失敗 | L2 HIGH | 課金に直結 |
| 決済処理エラー率 >5% | L3 CRITICAL | 売上直接影響 |
| 新規登録率が前日比50%以下 | L1 WARNING | 日次レポートで検知 |

---

## 4. エスカレーション状態管理

### 4.1 状態ファイル仕様

```
/var/log/poker-sns/escalation-state.json
```

```json
{
  "alerts": {
    "backend_container_down": {
      "first_seen": "2026-03-02T10:00:00Z",
      "consecutive_count": 3,
      "current_level": "L2",
      "last_notified_level": "L1",
      "last_notified_at": "2026-03-02T10:10:00Z"
    }
  }
}
```

### 4.2 状態遷移ルール

1. アラート初回検知 → `consecutive_count = 1`, レベル判定
2. 次のチェック（5分後）で同一アラート継続 → `consecutive_count++`, レベル再判定
3. アラート解消 → `consecutive_count = 0`, 状態クリア + 復旧通知送信
4. `last_notified_level` より上位レベルに到達した場合のみ追加通知を送信（通知スパム防止）

---

## 5. 通知テンプレート

### L1 WARNING
```
[WARNING] Poker SNS - {alert_type}
状態: {description}
検知: {consecutive_count}回連続 ({duration}分)
次のエスカレーション: {next_level} (あと{remaining}分)
対応期限: 30分以内
```

### L2 HIGH
```
[HIGH] Poker SNS - {alert_type} @{assignee}
状態: {description}
検知: {consecutive_count}回連続 ({duration}分)
次のエスカレーション: L3 CRITICAL (あと{remaining}分)
対応期限: 15分以内
ランブック: docs/ops-error-runbook.md#{section}
```

### L3 CRITICAL
```
[CRITICAL] Poker SNS - {alert_type} @here
状態: {description}
検知: {consecutive_count}回連続 ({duration}分)
影響: {impact_description}
即時対応が必要です
ランブック: docs/ops-error-runbook.md#{section}
```

### 復旧通知
```
[RESOLVED] Poker SNS - {alert_type}
復旧時刻: {resolved_at}
ダウンタイム: {downtime_duration}
最高レベル: {max_level_reached}
```

---

## 6. エスカレーション抑制ルール

| ルール | 説明 |
|--------|------|
| メンテナンスウィンドウ | 毎週月曜 02:00-04:00 はL1/L2を抑制（L3のみ通知） |
| デプロイ中フラグ | `/tmp/poker_sns_deploying` ファイル存在時はL1を抑制 |
| 通知クールダウン | 同一アラート・同一レベルは10分以内に再通知しない |
| フラッピング検知 | 5分以内にUP/DOWN繰返し3回以上 → L1固定（フラッピング状態として記録） |

---

## 7. 実装計画

### Phase 1（既存health-check.sh拡張）
- 状態ファイル（escalation-state.json）の読み書きロジック追加
- `consecutive_count` によるレベル判定ロジック
- Discord Webhook の embed カラー分け（既存通知の拡張）

### Phase 2（棚卸しcron追加）
- 5分間隔のタスク棚卸しスクリプト新設
- 棚卸し結果のエスカレーション状態管理統合

### Phase 3（高度な通知）
- Slack Webhook 並列送信対応
- SMS通知（Twilio等）のL3連携
- PagerDuty / Opsgenie 統合（将来）

---

## 8. 担当者アサインマトリクス

| 時間帯 | 一次対応 | 二次対応（L3） |
|--------|---------|---------------|
| 平日 09:00-18:00 | Opsチーム | CEO |
| 平日 18:00-09:00 | オンコール担当 | CEO |
| 休日 | オンコール担当 | CEO |

> オンコールローテーションは運用開始後に人員に応じて策定
