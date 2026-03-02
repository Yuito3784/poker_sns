# QA/QC Round 1 成果物

**作成者:** 尾丸 (QA/QC)
**作成日:** 2026-03-02
**対象ラウンド:** CEO確認「今誰も動いていないようですが、何か進んでいますか。それとも何かブロッカーがありますか」

---

## 1. QA部門 現状報告

### 1.1 ブロッカー

| # | ブロッカー | 影響 | 回避策 |
|---|----------|------|--------|
| B-1 | CI/CD修正 (78ec569) main未マージ | ステージングE2E全停止、docker-buildジョブ不通 | テスト計画を先行策定 |
| B-2 | VPS/ドメイン未確定 | 本番環境テスト不可 | ローカルDocker環境で検証 |
| B-3 | Phase 5 コード未実装 | 結合テスト不可 | 仕様ベースでテストケース設計完了 |

### 1.2 進捗サマリ

| 項目 | 状況 |
|------|------|
| 既存テストファイル | 5ファイル (backend unit 2, E2E 3) |
| セキュリティテスト (3/2適用分) | 回帰チェックリスト策定済、マージ後即実行可能 |
| Phase 5 テスト計画 | ドラフト完了 (80ケース設計済) |
| フロントエンドテスト基盤 | 未構築 (テストライブラリ未導入) |

---

## 2. 補完計画の反映状況

### 補完項目1: CI/CDパイプライン全ステージ通過確認テスト

**対応:** `docs/qa-phase5-test-plan.md` セクション5 に9項目のCI/CDテストチェックリストを策定。
- backend-test / frontend-build / docker-build / deploy の4ステージ全カバー
- PR時の条件分岐 (docker-build/deploy スキップ) も検証項目に含む
- Discord通知 (成功/失敗) の発火確認を含む

**ブロッカー:** mainマージ待ち。マージ後に即時実行する。

### 補完項目2: Phase 5新機能テスト計画策定

**対応:** `docs/qa-phase5-test-plan.md` にドラフト完成。

| 機能 | テストケース数 | カバー範囲 |
|------|--------------|----------|
| AI ハンド分析 API | 32 | 正常系5, 認証3, レート制限5, 異常系5, GET 8, Usage 6 |
| 年間プラン (Stripe) | 8 + 3(手動) | Checkout 4, Webhook 5, UI 3 |
| 統計ダッシュボード | 9 | 6エンドポイント, 認可, 空データ |
| CI/CDパイプライン | 9 | 4ステージ + 通知 |
| セキュリティ回帰 | 8(手動) + 28(自動) | 6修正領域 |

**依存:** 兎田(Dev)のAPI仕様確定、宝鐘(Design)のデザインカンプ確定後にテストケースを具体化。

### 補完項目3: セキュリティ修正の回帰確認チェックリスト

**対応:** `docs/qa-phase5-test-plan.md` セクション4 に8項目の手動確認リスト + 既存自動テスト28件の回帰確認手順を策定。

**カバー範囲:**
- bcrypt rounds=12 (新規登録 + 旧パスワード互換)
- JWT query param無効化
- OAuth session (1回限り消費 + 5分TTL)
- PostgreSQL 5432ポート非公開
- console.warnトークン値除去
- verify-email throttle

---

## 3. 既知の品質課題 (既存コードベース)

既存の `docs/qa-report.md` と `docs/qa-security-test-coverage-report.md` で報告済みの課題を要約。

### CRITICAL

| # | 課題 | ファイル |
|---|------|---------|
| 1 | auth.service.spec.ts の bcrypt rounds が旧値(10)のまま | auth.service.spec.ts:57 |
| 2 | auth.service.spec.ts のレスポンス形状が旧仕様 | auth.service.spec.ts |
| 3 | OAuth/Refresh Token/Email検証のテストカバレッジ 0% | auth module |
| 4 | Stripe決済フローのテストカバレッジ 0% | subscriptions module |

### HIGH

| # | 課題 |
|---|------|
| 5 | @Query/@Param バリデーション未適用エンドポイント 38件 (58%) |
| 6 | フロントエンド テスト基盤なし (Jest/Testing Library未導入) |
| 7 | OAuthセッション消費時のデータ損失バグ (delete→check 順序) |

---

## 4. 推奨アクション (CEOへ)

| 優先度 | アクション | 担当 | 前提 |
|--------|----------|------|------|
| P0 | CI/CDブランチのmainマージ承認 | CEO | - |
| P0 | マージ後: CI/CDパイプライン通過確認 (QAチェックリスト9項目) | QA | B-1解消 |
| P0 | マージ後: セキュリティ修正回帰テスト実行 | QA | B-1解消 |
| P1 | Phase 5 API仕様確定 → テストケース具体化 | Dev→QA | 実装開始 |
| P1 | auth.service.spec.ts の破損テスト修正 | Dev | - |
| P2 | フロントエンドテスト基盤構築 | Dev+QA | 本番公開前 |

---

## 5. 成果物一覧

| ファイル | 内容 |
|---------|------|
| `docs/qa-phase5-test-plan.md` (新規) | Phase 5テスト計画書ドラフト (80ケース) |
| `docs/qa-round1-deliverable.md` (本文書) | Round 1 QA/QC統合成果物 |
| `docs/qa-report.md` (既存) | 既存コードベースQAレポート |
| `docs/qa-security-test-coverage-report.md` (既存) | セキュリティテスト網羅性レポート |

---

*CI/CDマージが最優先ブロッカー。マージ完了次第、パイプライン通過確認とセキュリティ回帰テストを即時実行する。*
