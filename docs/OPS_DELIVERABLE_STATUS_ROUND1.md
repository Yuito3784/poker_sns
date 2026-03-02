# Operations 成果物: 進捗・ブロッカー状況報告 (Round 1)

> 担当: Operations (白上)
> 作成日: 2026-03-02
> 対象: CEO 確認依頼「今誰も動いていないようですが、何か進んでいますか。それとも何かブロッカーがありますか」

---

## 結論

**コードは完成しています。デプロイが止まっています。**

- 全機能 (Phase 1-5 + セキュリティ修正 + CI/CD) のコードは開発完了済み
- 9 本のブランチが main 未マージ → パイプライン未実行 → 本番デプロイ不可
- **現在の月間売上: ¥0** (本番未公開のため全収益チャネル停止)

---

## 1. Operations 視点の進捗報告

### 1.1 完了済み (コード・ドキュメント)

| カテゴリ | 成果物 | ステータス |
|---------|--------|-----------|
| CI/CD パイプライン | `.github/workflows/ci-cd.yml` (lint → test → docker-build → deploy) | 完成 (未マージ) |
| デプロイランブック | `ops-deploy-runbook.md` (手順・ロールバック・crontab) | 完成 |
| バックアップ設計 | `ops-backup-restore-incident.md` (日次 pg_dump + uploads) | 完成 |
| 監視・アラート | `ops-monitoring-alerting.md` (healthcheck 5分間隔 + disk + log) | 完成 |
| セキュリティ監視 | `ops-security-monitoring.md` (セキュリティスキャン 15分間隔) | 完成 |
| インフラ要件 | `ops-infra-requirements-checklist.md` (VPS比較・ネットワーク・SSL) | 完成 |
| SSL スクリプト | `setup-ssl.sh` + `ssl-renew.sh` | 完成 |
| 本番リリース準備 | `ops-production-readiness-round1.md` (Phase 0-3 チェックリスト) | 完成 |
| OGP キャッシュ | `ops-ogp-cache-strategy.md` | 完成 |
| SNS 自動投稿ジョブ | `ops-sns-autopost-job-scheduler.md` | 完成 |
| 分析・トラッキング | `ops-analytics-tracking.md` (UTM + GA4) | 完成 |

### 1.2 未着手 (ブロッカーにより実行不可)

| タスク | ブロッカー | 解消条件 |
|--------|-----------|---------|
| 本番 VPS プロビジョニング | VPS 未契約 | CEO 費用承認 |
| SSL 証明書取得 | ドメイン未決定 | CEO ドメイン決定 |
| crontab 本番設定 | サーバー未存在 | VPS 契約後 |
| UptimeRobot 設定 | 監視対象 URL なし | ドメイン確定後 |
| GitHub Secrets 登録 | サーバー情報なし | VPS 契約後 |
| CI/CD パイプライン実行 | main 未マージ | CEO マージ承認 |

---

## 2. ブロッカー詳細

### B-1: CI/CD ブランチの main マージ (最優先)

- **コミット**: 78ec569, da165cb (GHCR lowercase 修正)
- **影響**: マージしないと GitHub Actions の docker-build ジョブが通らない
- **波及**: QA の E2E テスト環境構築、DevSecOps のステージング検証、全部門がブロック
- **CEO アクション**: ブランチのマージを承認

### B-2: VPS / クラウド選定・契約

- **推奨**: ConoHa VPS 2GB プラン (¥1,848/月, 税込)
  - 3 vCPU, 2GB RAM, 100GB SSD, 転送量無制限, 東京 DC
- **代替**: AWS Lightsail 2GB ($12/月 ≒ ¥1,800)
- **月額コスト**: ¥1,848 ~ ¥3,600 (バックアップ含む)
- **CEO アクション**: VPS 契約実行

### B-3: ドメイン決定・取得

- **推奨**: pokersns.jp (¥1,500/年)
- **影響範囲**: SSL 証明書、nginx 設定、OGP メタタグ、SEO 全般、GitHub Secrets (NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SITE_URL)
- **CEO アクション**: ドメイン名決定 + 取得

---

## 3. ブロッカー解消後のデプロイタイムライン

```
CEO 承認 (Day 0)
  │
  ├─ Hour 0-1: CI/CD ブランチ → main マージ + パイプライン通過確認
  │
  ├─ Hour 1-2: Phase 5 + セキュリティ修正 ブランチ → main マージ
  │
  ├─ Hour 2-3: VPS 初期セットアップ (Docker, UFW, SSH)
  │
  ├─ Hour 3-4: .env 配置 + docker-compose 起動 + SSL 取得
  │
  ├─ Hour 4-5: DB スキーマ適用 + スモークテスト
  │
  └─ Hour 5-6: crontab 設定 + 外部監視設定 + 最終確認
        │
        └─ 本番公開完了 ✓
```

**所要時間: 約 6 時間 (ブロッカー解消から本番公開まで)**

---

## 4. 運用コスト試算

| 項目 | 月額 | 備考 |
|------|------|------|
| VPS (ConoHa 2GB) | ¥1,848 | 成長時: 4GB ¥3,608 |
| ドメイン (pokersns.jp) | ¥125 | ¥1,500/年 |
| SSL | ¥0 | Let's Encrypt |
| 外部監視 | ¥0 | UptimeRobot 無料枠 |
| メール送信 (SMTP) | ¥0-500 | 初期は無料枠で十分 |
| Claude API (AI 分析) | ~¥5,000 | Haiku 4.5, 月間使用量上限あり |
| **月額合計** | **¥2,000-7,500** | 売上目標 ¥1M の 0.8% 未満 |

---

## 5. CEO 意思決定シート

以下の 3 点を承認いただければ、Operations は当日中に本番環境を構築します:

| # | 決定事項 | 推奨選択 | 費用 | 緊急度 |
|---|---------|---------|------|--------|
| 1 | CI/CD ブランチ (78ec569) の main マージ | 承認 | ¥0 | 即時 |
| 2 | VPS 契約 | ConoHa VPS 2GB | ¥1,848/月 | 即時 |
| 3 | ドメイン取得 | pokersns.jp | ¥1,500/年 | 即時 |

**合計初期費用: ¥3,348 (VPS 1ヶ月 + ドメイン 1年)**
**月額ランニングコスト: ~¥2,000**

---

## 6. 補足: Operations が並行着手している作業

ブロッカー解消待ちの間に以下を進行中:

1. **Phase 5 運用影響分析** → `OPS_EXECUTION_PLAN_ROUND1.md` として完成
2. **GitHub Secrets 設定チェックリスト** → 同ドキュメントに含む
3. **ブランチマージ順序計画** → 9 本のブランチの安全なマージ順序を策定済み
4. **全 ops スクリプトのローカル検証準備** → docker-compose.yml 上で実行可能な状態

---

## 7. まとめ

| 質問 | 回答 |
|------|------|
| 何か進んでいますか? | 全部門のコード・ドキュメントは完成済み。デプロイ準備も完了。 |
| ブロッカーはありますか? | **3 点** (CI/CD マージ承認、VPS 契約、ドメイン取得) — すべて CEO の意思決定待ち |
| 何をすれば動き出しますか? | 上記 3 点を承認 → 当日中に本番公開可能 |
| 月額いくらかかりますか? | ~¥2,000/月 (売上目標の 0.2%) |
