# Operations 成果物: 動画コンテンツ 公開スケジュール管理・KPI モニタリング体制

**作成日**: 2026-03-02
**担当**: Operations (白上)
**対象タスク**: V-10 公開スケジュール管理表・承認フロー / V-11 KPI週次モニタリング体制
**ステータス**: Active

---

## 目次

1. [公開スケジュール管理表](#1-公開スケジュール管理表)
2. [公開前承認フロー](#2-公開前承認フロー)
3. [KPI週次モニタリング体制](#3-kpi週次モニタリング体制)
4. [KPIダッシュボード設計](#4-kpiダッシュボード設計)
5. [週次レポートテンプレート](#5-週次レポートテンプレート)
6. [月次レビュー基準](#6-月次レビュー基準)
7. [異常検知・エスカレーション](#7-異常検知エスカレーション)
8. [運用カレンダーテンプレート](#8-運用カレンダーテンプレート)

---

## 1. 公開スケジュール管理表

### 1.1 曜日・時間帯・プラットフォーム別スケジュール

週5本ペース（月20本）を安定運用するための基本スケジュール。

| 曜日 | YouTube Shorts 公開時間 | Instagram Reels 公開時間 | 動画No. | 備考 |
|------|------------------------|-------------------------|---------|------|
| 月曜 | 18:00 JST | 19:00 JST | #{week_num}-1 | 週初め、エンゲージメント安定帯 |
| 火曜 | 18:00 JST | 19:00 JST | #{week_num}-2 | |
| 水曜 | 12:00 JST | 12:30 JST | #{week_num}-3 | 昼帯テスト枠（A/Bテスト用） |
| 木曜 | 18:00 JST | 19:00 JST | #{week_num}-4 | |
| 金曜 | 20:00 JST | 20:30 JST | #{week_num}-5 | 週末前、夜帯でリーチ拡大 |

**時間帯選定根拠**:
- 18:00-20:00 JST: ポーカープレイヤー層（20-40代）の帰宅後・夕食前後のアクティブ時間帯
- 12:00 JST（水曜のみ）: 昼休みのスキマ時間狙い。A/Bテストとして効果測定
- YouTube → Instagram の1時間差: 同時公開による自己カニバリゼーション回避

**プラットフォーム間公開ルール**:
- YouTube Shorts を先行公開（YouTube のアルゴリズムが新規コンテンツを優先するため）
- Instagram Reels は YouTube 公開の1時間後（同一素材の再利用時）
- 説明文・ハッシュタグはプラットフォームごとに最適化（テンプレート準拠）

### 1.2 制作・公開タイムライン（1本あたり）

| 工程 | 担当 | 期日 (D = 公開日) | 所要時間目安 |
|------|------|------------------|-------------|
| ハンド選定・構成台本 | Planning/制作 | D-4 | 30分 |
| 動画制作（撮影・編集） | Ops/制作 | D-3 | 60-90分 |
| 説明文・ハッシュタグ・UTMリンク作成 | Ops/制作 | D-3 | 15分 |
| Design確認 | Design | D-2 | 30分/本 |
| QA確認 | QA/QC | D-1.5 | 20分/本 |
| 最終承認 | Planning | D-1 | 10分/本 |
| YouTube アップロード + 公開予約 | Ops | D-0.5 | 10分/本 |
| Instagram アップロード + 公開予約 | Ops | D-0.5 | 10分/本 |
| 公開確認 | Ops | D-0 | 5分/本 |

### 1.3 週間バッチ制作スケジュール

効率化のため、週5本を2バッチで制作する。

| 日 | バッチ | 工程 |
|----|--------|------|
| 前週金曜 | -- | 翌週のハンド5本分を選定・構成台本作成 |
| 月曜 | Batch A (月-水分 3本) | 動画制作 |
| 火曜 | Batch A | Design確認 → QA確認 |
| 水曜 | Batch B (木-金分 2本) | 動画制作、Batch A 修正反映・最終承認 |
| 木曜 | Batch B | Design確認 → QA確認、Batch A 公開運用 |
| 金曜 | -- | Batch B 最終承認・公開運用、翌週ハンド選定 |

---

## 2. 公開前承認フロー

### 2.1 4ステップ承認プロセス

```
[制作完了]
    │
    ▼
[Step 1: Design確認] ── FAIL → 制作へ差し戻し（修正指示付き）
    │ PASS
    ▼
[Step 2: QA確認] ── FAIL → 制作へ差し戻し（QAチェックリスト不合格項目付き）
    │ PASS / CONDITIONAL PASS
    ▼
[Step 3: 最終承認] ── REJECT → 該当ステップへ差し戻し
    │ APPROVE
    ▼
[Step 4: 公開予約・公開]
```

### 2.2 各ステップの責任と判定基準

| ステップ | 担当 | 判定基準 | 成果物 |
|---------|------|---------|--------|
| Design確認 | Design (宝鐘) | テンプレートUI仕様書準拠（カラー・フォント・レイアウト・安全領域） | Design承認印 (Slack :white_check_mark:) |
| QA確認 | QA/QC (姫森) | QA_VIDEO_CONTENT_CHECKLIST.md 全項目 PASS | QA記録シート記入 |
| 最終承認 | Planning (桃鈴) | コンテンツ品質・スケジュール整合性・ブランド一貫性 | 公開GOサイン (Slack :rocket:) |
| 公開 | Ops (白上) | 公開予約時刻の正確性・UTMリンク最終疎通 | 公開完了報告 (Slack :mega:) |

### 2.3 承認管理チャネル

| Slackチャネル | 用途 |
|--------------|------|
| `#video-production` | 制作進捗・Design/QAフィードバック・承認通知 |
| `#video-publish-log` | 公開完了ログ（動画URL・UTMリンク・公開時刻記録） |

### 2.4 承認ステータス管理（スプレッドシート or Notion）

各動画の承認状況を以下のカラムで管理:

```
| 動画No. | ハンド概要 | 制作完了 | Design | QA | 最終承認 | YT公開 | IG公開 | ステータス |
|---------|----------|---------|--------|-----|---------|--------|--------|----------|
| #W01-1  | AKo UTG  | 3/3     | 3/4 OK | 3/4 OK | 3/5 GO | 3/6 18:00 | 3/6 19:00 | Published |
| #W01-2  | QJs BTN  | 3/3     | 3/4 NG | --  | --      | --     | --     | Design差戻 |
```

### 2.5 緊急差し替え・公開中止フロー

| 状況 | 判断者 | アクション |
|------|--------|----------|
| 公開予約済みだがQA再FAILが判明 | QA → Planning | 公開予約を解除。代替動画をストックから差し替え |
| アフィリエイトリンク先に障害発生 | Ops → Planning | 説明文からリンクを一時削除して公開、または延期 |
| ポーカー戦略の誤りが公開後に判明 | Planning | 即座に非公開化。修正版を制作し差し替え公開 |
| プラットフォーム障害（YouTube/Instagram停止） | Ops | 障害復旧まで公開延期。翌日にダブル公開で対応 |

### 2.6 ストック動画の運用

安定運用のため、常に2本以上の承認済みストック動画を保持する。

- **ストック目標**: 承認済み・未公開の動画を常時2本以上
- **ストック補充タイミング**: 週末に翌週分+ストック補充分を制作
- **ストック使用条件**: 制作遅延・品質不合格による欠本時に使用
- **ストック管理**: 承認ステータス管理表に「Stock」フラグを付与

---

## 3. KPI週次モニタリング体制

### 3.1 KPI定義・目標値

| カテゴリ | KPI | データソース | 月間目標 | 週間目標 (参考) |
|---------|-----|------------|---------|---------------|
| **リーチ** | YouTube 月間再生数 | YouTube Studio API | 10,000+ | 2,500+ |
| **リーチ** | Instagram 月間リーチ | Instagram Insights API | 10,000+ | 2,500+ |
| **エンゲージメント** | YouTube 平均視聴維持率 | YouTube Studio API | 50%+ | -- |
| **エンゲージメント** | YouTube いいね率 | YouTube Studio API | 5%+ (いいね/再生) | -- |
| **エンゲージメント** | Instagram エンゲージメント率 | Instagram Insights API | 3%+ (いいね+コメント/リーチ) | -- |
| **コンバージョン** | UTMリンク経由 /lp 訪問数 | GA4 / サーバーログ | 500+ | 125+ |
| **コンバージョン** | UTM経由 新規登録数 | GA4 + DB | 50+ | 12+ |
| **コンバージョン** | CTR (クリック/インプレッション) | YouTube/Instagram Analytics | 2%+ | -- |
| **運用** | 公開本数 | 公開ログ | 20本 | 5本 |
| **運用** | 承認一発通過率 | 承認ステータス表 | 80%+ | -- |
| **収益** | アフィリエイトリンク経由売上 | アフィリエイトパートナーダッシュボード | 追跡開始 | -- |

### 3.2 データ収集方法

#### YouTube Studio API (YouTube Data API v3)

```
# 必要スコープ
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/yt-analytics.readonly

# 週次取得エンドポイント
GET /youtube/v3/channels?part=statistics&mine=true
GET /youtubeAnalytics/v2/reports?dimensions=video&metrics=views,likes,averageViewDuration,subscribersGained
  &startDate={week_start}&endDate={week_end}
  &filters=video=={video_ids}
```

**取得指標**:
- views (再生数)
- likes (いいね数)
- averageViewDuration (平均視聴時間)
- averageViewPercentage (平均視聴維持率)
- subscribersGained (チャンネル登録増加数)
- impressions (インプレッション数)
- impressionClickThroughRate (CTR)

#### Instagram Insights API (Graph API)

```
# 必要スコープ
instagram_basic, instagram_manage_insights

# メディア別インサイト
GET /{media_id}/insights?metric=reach,impressions,likes,comments,saved,shares
  &period=lifetime

# アカウント全体インサイト
GET /{ig_user_id}/insights?metric=reach,impressions,follower_count
  &period=week
  &since={week_start}&until={week_end}
```

**取得指標**:
- reach (リーチ数)
- impressions (インプレッション数)
- likes (いいね数)
- comments (コメント数)
- saved (保存数)
- shares (シェア数)

#### GA4 / サーバーログ (UTMトラッキング)

```
# GA4 Data API
POST /v1beta/{property}/runReport
  dimensions: [utm_source, utm_medium, utm_campaign, utm_content]
  metrics: [sessions, newUsers, conversions]
  dateRanges: [{startDate: week_start, endDate: week_end}]

# サーバーログ（バックアップ）
# /lp ページアクセスログからUTMパラメータ別の訪問数を集計
grep "GET /lp" access.log | grep "utm_source=" | ...
```

### 3.3 週次レポート生成フロー

```
毎週月曜 09:00 JST
    │
    ▼
[自動] YouTube Studio API → 前週の動画別・チャンネル全体指標取得
    │
    ▼
[自動] Instagram Insights API → 前週のReels別・アカウント全体指標取得
    │
    ▼
[自動] GA4 / サーバーログ → UTM別の/lp訪問数・新規登録数取得
    │
    ▼
[自動] スプレッドシート / CSVに集計結果を出力
    │
    ▼
[自動] Slack #video-kpi に週次サマリ通知
    │
    ▼
[手動] Ops担当が前週対比・トレンド分析コメントを追記
    │
    ▼
[手動] 月曜のチーム定例で共有・改善アクション決定
```

---

## 4. KPIダッシュボード設計

### 4.1 ダッシュボード構成

Phase 1ではスプレッドシート（Google Sheets）で運用し、Phase 2でカスタムダッシュボード検討。

**Sheet 1: Weekly Overview**

```
| 週 | YT再生 | YT再生(累計) | IG リーチ | IGリーチ(累計) | /lp訪問 | 新規登録 | 公開本数 |
|----|--------|-------------|----------|--------------|---------|---------|---------|
| W1 | 450    | 450         | 380      | 380          | 45      | 5       | 5       |
| W2 | 620    | 1,070       | 510      | 890          | 68      | 8       | 5       |
| ...| ...    | ...         | ...      | ...          | ...     | ...     | ...     |
```

**Sheet 2: Video Performance**

```
| 動画No. | ハンド | YT再生 | YT維持率 | YTいいね | IG再生 | IGリーチ | IGいいね | UTMクリック |
|---------|-------|--------|---------|---------|--------|---------|---------|------------|
| #W01-1  | AKo UTG | 120 | 55%    | 8       | 95     | 180     | 12      | 6          |
| ...     | ...   | ...    | ...     | ...     | ...    | ...     | ...     | ...        |
```

**Sheet 3: Funnel Conversion**

```
| 週 | YTインプレッション | YTクリック | CTR  | /lp訪問 | 登録開始 | 登録完了 | 登録率 |
|----|------------------|----------|------|---------|---------|---------|--------|
| W1 | 5,000            | 120      | 2.4% | 45      | 12      | 5       | 41.7%  |
```

### 4.2 自動データ取り込みスクリプト

Phase 1 ではシンプルなシェルスクリプトで API 呼び出し → CSV 出力:

```bash
#!/bin/bash
# /opt/poker-sns/scripts/video-kpi-weekly-report.sh
# 毎週月曜 08:30 JST に cron 実行

set -euo pipefail

WEEK_START=$(date -d 'last monday' +%Y-%m-%d)
WEEK_END=$(date -d 'last sunday' +%Y-%m-%d)
OUTPUT_DIR="/opt/poker-sns/reports/video-kpi"
SLACK_WEBHOOK="${SLACK_WEBHOOK_OPS}"

mkdir -p "$OUTPUT_DIR"

# --- YouTube Data API ---
YT_REPORT=$(curl -s -H "Authorization: Bearer ${YOUTUBE_ACCESS_TOKEN}" \
  "https://youtubeanalytics.googleapis.com/v2/reports?\
ids=channel==MINE&\
startDate=${WEEK_START}&endDate=${WEEK_END}&\
metrics=views,likes,averageViewDuration,subscribersGained,impressions,impressionClickThroughRate&\
dimensions=video&sort=-views")

echo "$YT_REPORT" | jq -r '.rows[] | @csv' > "$OUTPUT_DIR/yt_${WEEK_START}.csv"

# --- Instagram Insights API ---
# Reels の media_id リストは公開ログから取得
REELS_IDS=$(cat /opt/poker-sns/reports/publish-log/ig_reels_${WEEK_START}.txt 2>/dev/null || echo "")

if [ -n "$REELS_IDS" ]; then
  for MEDIA_ID in $REELS_IDS; do
    curl -s "https://graph.facebook.com/v19.0/${MEDIA_ID}/insights?\
metric=reach,impressions,likes,comments,saved,shares&\
period=lifetime&access_token=${INSTAGRAM_ACCESS_TOKEN}" \
    >> "$OUTPUT_DIR/ig_${WEEK_START}.json"
  done
fi

# --- GA4 UTM Report ---
# ga4-export.py (Python script using google-analytics-data library)
python3 /opt/poker-sns/scripts/ga4-utm-export.py \
  --start "$WEEK_START" --end "$WEEK_END" \
  --output "$OUTPUT_DIR/ga4_${WEEK_START}.csv"

# --- Slack Summary ---
YT_TOTAL_VIEWS=$(echo "$YT_REPORT" | jq '[.rows[][0]] | add // 0')
# ... (集計ロジック省略)

curl -s -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"[Weekly Video KPI] ${WEEK_START} ~ ${WEEK_END}\n\
YouTube Views: ${YT_TOTAL_VIEWS:-N/A}\n\
Instagram Reach: (see report)\n\
Report: ${OUTPUT_DIR}/\"}"
```

crontab追加:

```cron
# 毎週月曜 08:30 JST: 動画KPI週次レポート生成
30 8 * * 1 /opt/poker-sns/scripts/video-kpi-weekly-report.sh >> /var/log/poker-sns/video-kpi.log 2>&1
```

---

## 5. 週次レポートテンプレート

### 5.1 Slack通知テンプレート

```
[Weekly Video KPI Report] {WEEK_START} - {WEEK_END}

=== Reach ===
YouTube Shorts: {yt_views} views (目標: 2,500/週 | 達成率: {yt_pct}%)
  前週比: {yt_wow}% | 月累計: {yt_mtd} / 10,000
Instagram Reels: {ig_reach} reach (目標: 2,500/週 | 達成率: {ig_pct}%)
  前週比: {ig_wow}% | 月累計: {ig_mtd} / 10,000

=== Engagement ===
YouTube 平均視聴維持率: {yt_retention}% (目標: 50%)
YouTube いいね率: {yt_like_rate}%
Instagram エンゲージメント率: {ig_engagement}%

=== Conversion ===
/lp 訪問数 (UTM経由): {lp_visits} (目標: 125/週)
新規登録数 (UTM経由): {new_users} (目標: 12/週)
CTR: YouTube {yt_ctr}% | Instagram {ig_ctr}%

=== Operations ===
公開本数: {published}/{planned} (承認一発通過: {first_pass_rate}%)
ストック残: {stock_count}本

=== Top Performers ===
1. #{top1_id} {top1_hand} — {top1_views} views
2. #{top2_id} {top2_hand} — {top2_views} views
3. #{top3_id} {top3_hand} — {top3_views} views

=== Action Items ===
- {action_1}
- {action_2}
```

### 5.2 詳細レポートドキュメントテンプレート

```markdown
# 動画KPI週次レポート: {WEEK_START} - {WEEK_END}

## サマリ
- 公開本数: {n}/5本
- YouTube再生数: {n} (目標2,500の{n}%)
- Instagramリーチ: {n} (目標2,500の{n}%)
- /lp UTM訪問: {n}
- 新規登録: {n}

## 動画別パフォーマンス
(Sheet 2の該当週データ)

## トレンド分析
- 前週比で改善/悪化した指標
- 特に反応が良かったハンドの特徴
- 公開時間帯の効果比較

## 改善アクション (次週)
1. ...
2. ...

## 課題・エスカレーション
- ...
```

---

## 6. 月次レビュー基準

### 6.1 月次KPIレビュー会議

**開催**: 毎月第1月曜 10:00 JST (チーム定例内)
**参加**: Planning, Ops, Design, QA

| 議題 | 内容 | 判断基準 |
|------|------|---------|
| 目標達成度 | 月間KPI vs 目標値 | GREEN: 80%+達成 / YELLOW: 50-79% / RED: 50%未満 |
| コンテンツ分析 | Top/Bottom 5動画の特徴分析 | 再生数・維持率・エンゲージメント率 |
| 公開時間帯最適化 | 曜日・時間帯別パフォーマンス | A/Bテスト結果に基づく調整提案 |
| 運用効率 | 制作時間・承認一発通過率・ストック状況 | 目標: 1本あたり制作2時間以内、一発通過80%+ |
| 次月目標設定 | KPI目標の上方/下方修正 | 前月実績 x 1.1 (10%成長) をベースライン |

### 6.2 目標未達時のアクションフレームワーク

| 状況 | レベル | アクション |
|------|--------|----------|
| YouTube再生 目標50%未満 | RED | サムネイル・タイトルのA/Bテスト強化、ハッシュタグ戦略見直し |
| Instagram リーチ目標50%未満 | RED | 投稿時間帯変更、Reelsカバー画像最適化、ハッシュタグ数調整 |
| CTR 1%未満 | RED | CTA配置・文言の見直し、説明文のリンク位置変更 |
| 新規登録 目標50%未満 | RED | /lpのコンバージョン率確認 (Dev連携)、CTAメッセージ変更 |
| 承認一発通過率 60%未満 | YELLOW | テンプレート・制作ガイドラインの見直し (Design連携) |

---

## 7. 異常検知・エスカレーション

### 7.1 自動アラート条件

| アラート | 条件 | 通知先 | 重要度 |
|---------|------|--------|--------|
| 再生数急落 | 前週比 -50% | #video-kpi | WARNING |
| エンゲージメント急落 | 前週比 -40% | #video-kpi | WARNING |
| 公開遅延 | 予定時刻から2時間以上遅延 | #video-production | HIGH |
| QA連続FAIL | 3本連続FAIL | #video-production + Planning | HIGH |
| ストック枯渇 | 承認済みストック 0本 | #video-production | HIGH |
| API障害 | YouTube/Instagram API 連続3回エラー | #poker-sns-alerts | CRITICAL |
| UTMリンク断 | /lp が 200以外を返す | #poker-sns-alerts | CRITICAL |

### 7.2 エスカレーションマトリクス

| レベル | 対応者 | 対応時間目標 |
|--------|--------|-------------|
| INFO | Ops (白上) | 翌営業日 |
| WARNING | Ops → Planning (桃鈴) | 24時間以内 |
| HIGH | Planning → 関連チーム | 4時間以内 |
| CRITICAL | Planning + DevSecOps + Dev | 1時間以内 |

---

## 8. 運用カレンダーテンプレート

### 8.1 月間運用カレンダー

```
2026年3月 動画コンテンツ運用カレンダー

Week 1 (3/2-3/6):
  月 3/2: [制作] #W01-1,2,3  [公開] --
  火 3/3: [確認] #W01-1,2,3 Design+QA
  水 3/4: [制作] #W01-4,5  [公開] #W01-1 (YT 18:00, IG 19:00)
  木 3/5: [確認] #W01-4,5  [公開] #W01-2 (YT 18:00, IG 19:00)
  金 3/6: [承認] #W01-4,5  [公開] #W01-3 (YT 12:00, IG 12:30)
                           [翌週選定] W02ハンド5本

Week 2 (3/9-3/13):
  月 3/9:  [公開] #W01-4 (YT 18:00, IG 19:00)
           [制作] #W02-1,2,3
  火 3/10: [公開] #W01-5 (YT 20:00, IG 20:30)
           [確認] #W02-1,2,3
  水 3/11: [KPI] W01週次レポート生成・共有
           [制作] #W02-4,5
  ...
```

### 8.2 公開ログテンプレート

毎回の公開時に `#video-publish-log` に投稿:

```
[Published] #{video_no} | {hand_summary}
  YouTube: {yt_url} | 公開: {yt_time} JST
  Instagram: {ig_url} | 公開: {ig_time} JST
  UTM:
    YT: /lp?utm_source=youtube&utm_medium=video&utm_campaign=hand_review&utm_content=shorts_{date}_{seq}
    IG: /lp?utm_source=instagram&utm_medium=video&utm_campaign=hand_review&utm_content=reels_{date}_{seq}
  承認: Design {design_approver} / QA {qa_approver} / Final {final_approver}
```

---

## 9. 他チームへの依存・連携事項

| 依存先 | 内容 | ステータス |
|--------|------|----------|
| Dev | YouTube Data API / Instagram Insights API のOAuth認証フロー実装 | V-11依存 |
| Dev | GA4 Data API 連携スクリプト (ga4-utm-export.py) | V-11依存 |
| Design | テンプレートUI仕様書 (V-01) 完了後にスケジュール確定 | V-10前提 |
| QA | 公開前チェックリスト (V-09) 完了後にQAステップ組み込み | V-10前提 |
| Planning | チャンネル名・週次定例のスケジュール承認 | V-10前提 |
| DevSecOps | API トークン安全管理、/lp監視 | V-11連携 |

---

## 10. クロスリファレンス

| 関連ドキュメント | パス |
|----------------|------|
| 依存関係マップ・優先順位表 | `docs/VIDEO_CONTENT_DEPENDENCY_MAP.md` |
| 動画公開前QAチェックリスト | `docs/QA_VIDEO_CONTENT_CHECKLIST.md` |
| テンプレートUI仕様書 | `docs/DESIGN_VIDEO_TEMPLATE_UI_SPEC.md` |
| チャンネル・プロフィール画像仕様 | `docs/DESIGN_CHANNEL_PROFILE_ASSETS_SPEC.md` |
| SNS自動投稿ジョブスケジューラ | `docs/ops-sns-autopost-job-scheduler.md` |
| UTM仕様 | `docs/NOTE_UTM_SPEC.md` |
| GA4セットアップガイド | `docs/GA4_SETUP_GUIDE.md` |
| アナリティクストラッキング | `docs/ops-analytics-tracking.md` |
