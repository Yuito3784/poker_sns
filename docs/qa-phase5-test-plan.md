# Phase 5 テスト計画書 (ドラフト v1.0)

**作成者:** 尾丸 (QA/QC)
**作成日:** 2026-03-02
**ステータス:** ドラフト (API仕様・デザインカンプ待ち)

---

## 0. 前提: CI/CDブロッカー状況

| ブロッカー | 影響範囲 | QA対応 |
|-----------|---------|--------|
| CI/CDブランチ (78ec569) main未マージ | ステージングE2Eテスト全停止 | マージ待ちの間にテスト計画策定を先行 |
| VPS/ドメイン未確定 | 本番環境テスト不可 | ローカル/Docker環境での検証に集中 |
| Phase 5コード未実装 | 結合テスト不可 | API仕様ベースでテストケース設計を完了させる |

**CI/CDマージ後の即時アクション:**
1. `backend-test` → `frontend-build` → `docker-build` の全ステージ通過確認
2. GHCRへのイメージpush成功確認 (backend:latest, frontend:latest)
3. デプロイジョブのヘルスチェック (`/api/health` 200応答)
4. Discord通知の発火確認

---

## 1. AI ハンド分析 API テスト計画

### 1.1 エンドポイント一覧

| Method | Path | Auth | テストケース数 |
|--------|------|------|--------------|
| POST | `/posts/:id/ai-analysis` | JWT + Premium | 18 |
| GET | `/posts/:id/ai-analysis` | JWT | 8 |
| GET | `/ai-analysis/usage` | JWT | 6 |

### 1.2 POST `/posts/:id/ai-analysis` テストケース

#### 正常系

| TC-ID | シナリオ | 前提条件 | 期待結果 |
|-------|---------|---------|---------|
| AI-001 | プレミアムユーザーがポーカーハンド投稿を分析 | Premium + isPokerHand=true + 月間回数内 | 200, analysis結果返却 |
| AI-002 | 分析結果に総合評価(A-F)が含まれる | AI-001の応答 | analysis内に grade フィールド |
| AI-003 | 分析結果にストリート別評価が含まれる | AI-001の応答 | PREFLOP/FLOP/TURN/RIVER別コメント |
| AI-004 | inputTokens/outputTokensが記録される | AI-001完了後 | AiAnalysisレコードにトークン数 > 0 |
| AI-005 | 同一投稿・同一ユーザーの再分析はキャッシュ返却 | AI-001完了後に再リクエスト | 既存分析結果を返却 (API非消費) |

#### 認証・認可

| TC-ID | シナリオ | 前提条件 | 期待結果 |
|-------|---------|---------|---------|
| AI-006 | 未認証ユーザー | Authorization なし | 401 Unauthorized |
| AI-007 | フリーユーザー | 非Premium | 403 Forbidden |
| AI-008 | メール未認証ユーザー | emailVerified=false | 403 Forbidden |

#### レート制限

| TC-ID | シナリオ | 前提条件 | 期待結果 |
|-------|---------|---------|---------|
| AI-009 | 月間5回制限超過 (Premium) | 当月5回分析済み | 429 or 403 + 残回数=0 |
| AI-010 | 日次3回制限超過 (Premium) | 当日3回分析済み | 429 or 403 |
| AI-011 | 無制限パックユーザー | hasUnlimited=true | 月間制限なし、日次10回まで |
| AI-012 | 無制限パックの日次10回超過 | 当日10回分析済み | 429 or 403 |
| AI-013 | 月初リセット確認 | 先月5回使用 → 翌月1日 | count=0にリセット |

#### 異常系

| TC-ID | シナリオ | 入力 | 期待結果 |
|-------|---------|------|---------|
| AI-014 | ポーカーハンドでない投稿 | isPokerHand=false の postId | 400 Bad Request |
| AI-015 | 存在しない投稿ID | 不正UUID | 404 Not Found |
| AI-016 | 不正なID形式 | `/posts/not-uuid/ai-analysis` | 400 Bad Request |
| AI-017 | Claude API タイムアウト | APIレスポンス > 30秒 | 504 or 適切なエラー |
| AI-018 | Claude API エラー (500) | APIが500返却 | 502 or 500 + ユーザーフレンドリーメッセージ |

### 1.3 GET `/posts/:id/ai-analysis` テストケース

| TC-ID | シナリオ | 期待結果 |
|-------|---------|---------|
| AI-GET-001 | 分析済み投稿の結果取得 | 200 + analysis JSON |
| AI-GET-002 | 未分析投稿 | 404 Not Found |
| AI-GET-003 | 他ユーザーの分析結果取得 | 200 (公開投稿の場合) |
| AI-GET-004 | 未認証でのアクセス | 401 Unauthorized |
| AI-GET-005 | 存在しない投稿ID | 404 Not Found |
| AI-GET-006 | 不正ID形式 | 400 Bad Request |
| AI-GET-007 | 削除された投稿の分析結果 | 404 (CASCADE削除確認) |
| AI-GET-008 | レスポンスにmodel名・トークン数含む | 200 + model, inputTokens, outputTokens |

### 1.4 GET `/ai-analysis/usage` テストケース

| TC-ID | シナリオ | 期待結果 |
|-------|---------|---------|
| AI-USE-001 | 当月使用量取得 | 200 + { count, limit, hasUnlimited } |
| AI-USE-002 | 未使用月 | 200 + { count: 0 } |
| AI-USE-003 | 無制限パックユーザー | 200 + { hasUnlimited: true } |
| AI-USE-004 | 未認証 | 401 |
| AI-USE-005 | フリーユーザー | 200 + { count: 0, limit: 0 } |
| AI-USE-006 | 月跨ぎ確認 | 先月データと今月データが分離 |

---

## 2. 年間プラン (Stripe) テスト計画

### 2.1 Checkout フロー

| TC-ID | シナリオ | 期待結果 |
|-------|---------|---------|
| SUB-Y-001 | 年間プラン選択 → Stripe Checkout | redirect URL に STRIPE_YEARLY_PRICE_ID |
| SUB-Y-002 | 月額プラン選択 → Stripe Checkout | redirect URL に STRIPE_PRICE_ID (既存) |
| SUB-Y-003 | Checkout成功後の subscriptionPlan 更新 | User.subscriptionPlan = "yearly" |
| SUB-Y-004 | 年間プランの subscriptionPeriodEnd | 現在+365日 |

### 2.2 Webhook 回帰テスト

| TC-ID | シナリオ | 期待結果 |
|-------|---------|---------|
| SUB-W-001 | invoice.paid (年間プラン) | subscriptionStatus='ACTIVE', plan='yearly' |
| SUB-W-002 | customer.subscription.deleted (年間プラン) | subscriptionStatus='CANCELED' |
| SUB-W-003 | customer.subscription.updated (月→年切替) | subscriptionPlan='yearly' 更新 |
| SUB-W-004 | 無効署名の webhook | 400 Bad Request (既存テスト回帰) |
| SUB-W-005 | 重複イベント処理 | 冪等性: 2回目は処理スキップ |

### 2.3 UI テスト (手動)

| TC-ID | シナリオ | 確認事項 |
|-------|---------|---------|
| SUB-UI-001 | 設定ページのプラン切替タブ | 月額/年間タブが表示、価格正確 |
| SUB-UI-002 | LP Premiumセクション | 年間プラン表示、割引率16.7%表示 |
| SUB-UI-003 | 年間プランの割引計算 | 月額換算 817円 / 年額 9,800円 |

---

## 3. 統計ダッシュボード API テスト計画

| TC-ID | Endpoint | シナリオ | 期待結果 |
|-------|----------|---------|---------|
| STAT-001 | GET /stats/overview | プレミアムユーザー取得 | 200 + 統計サマリ |
| STAT-002 | GET /stats/overview | フリーユーザー | 403 (Premium限定) |
| STAT-003 | GET /stats/winrate?period=30d | 期間指定 | 200 + 勝率推移データ |
| STAT-004 | GET /stats/winrate?period=invalid | 不正期間 | 400 Bad Request |
| STAT-005 | GET /stats/position | ポジション別成績 | 200 + Position別データ |
| STAT-006 | GET /stats/actions | ストリート別分析 | 200 + PREFLOP~RIVER別 |
| STAT-007 | GET /stats/profit?period=30d | 収支推移 | 200 + 累計収支データ |
| STAT-008 | GET /stats/* | 未認証 | 401 |
| STAT-009 | GET /stats/* | ハンド0件ユーザー | 200 + 空データ (エラーなし) |

---

## 4. セキュリティ修正 回帰確認チェックリスト (2026-03-02適用分)

CI/CDマージ後、ステージング環境で以下を即時実行する。

### 4.1 自動テスト回帰 (既存テストファイル)

| ファイル | テスト数 | 確認事項 |
|---------|---------|---------|
| `auth.security.spec.ts` | 7 | bcrypt rounds=12, OAuth session lifecycle |
| `subscriptions.webhook.spec.ts` | 4 | Stripe署名検証 |
| `security-headers.e2e-spec.ts` | 12 | Helmet CSP/HSTS/frameguard/noSniff |
| `nginx-headers.e2e-spec.ts` | - | nginx HSTS/X-Frame/Referrer-Policy |
| `rate-limit.e2e-spec.ts` | 5+ | auth endpoint throttle |

### 4.2 手動確認項目

| # | 確認事項 | 手順 | 合否 |
|---|---------|------|------|
| SEC-REG-001 | bcrypt rounds=12で新規登録可能 | POST /auth/register → ログイン成功 | [ ] |
| SEC-REG-002 | 旧パスワード(rounds=10)でログイン可能 | 既存アカウントでログイン | [ ] |
| SEC-REG-003 | JWT query param無効 | GET /users/me?token=xxx → 401 | [ ] |
| SEC-REG-004 | OAuth session消費は1回限り | session消費後に再アクセス → 400 | [ ] |
| SEC-REG-005 | OAuth session 5分TTL | 5分超過後アクセス → 400 | [ ] |
| SEC-REG-006 | PostgreSQL 5432ポート非公開 | docker-compose.prod.yml確認 | [ ] |
| SEC-REG-007 | console.warnにトークン値なし | ログ出力確認 | [ ] |
| SEC-REG-008 | verify-email throttle動作 | 6回連続 → 429 | [ ] |

---

## 5. CI/CDパイプライン通過確認テスト

CI/CDブランチのmainマージ後に実施。

| # | ステージ | 確認事項 | 合否 |
|---|---------|---------|------|
| CI-001 | backend-test | npm ci → prisma generate → test → build 全通過 | [ ] |
| CI-002 | frontend-build | npm ci → build (env変数注入) 通過 | [ ] |
| CI-003 | docker-build | backend/frontend イメージのビルド・push成功 | [ ] |
| CI-004 | docker-build | GHCRタグ: latest + SHA 両方存在 | [ ] |
| CI-005 | deploy | SSH接続 → docker compose pull/up 成功 | [ ] |
| CI-006 | deploy | ヘルスチェック /api/health → 200 (5回以内) | [ ] |
| CI-007 | deploy | Discord成功通知の発火 | [ ] |
| CI-008 | deploy (失敗時) | Discord失敗通知の発火 | [ ] |
| CI-009 | PR trigger | PRでbackend-test + frontend-build のみ実行 (docker-build/deploy スキップ) | [ ] |

---

## 6. Phase 5 追加テストインフラ要件

### 6.1 新規テストファイル (予定)

| ファイル | 対象 | 種別 |
|---------|------|------|
| `backend/src/ai-analysis/ai-analysis.service.spec.ts` | AI分析サービス | Unit |
| `backend/src/ai-analysis/ai-analysis.controller.spec.ts` | AI分析コントローラー | Unit |
| `backend/src/stats/stats.service.spec.ts` | 統計集計 | Unit |
| `backend/test/ai-analysis.e2e-spec.ts` | AI分析E2E | E2E |
| `backend/test/subscriptions-yearly.e2e-spec.ts` | 年間プランE2E | E2E |

### 6.2 モック要件

| 外部サービス | モック方法 | 注意事項 |
|-------------|----------|---------|
| Claude API (@anthropic-ai/sdk) | jest.mock + カスタムレスポンス | トークン数計算の正確性 |
| Stripe API | jest.mock (既存パターン踏襲) | 年間Price IDの分岐 |
| Stripe Webhook | constructEvent mock | 署名検証のモック |

### 6.3 テストデータ

```
- PokerHand付き投稿 (PREFLOP~RIVER全ストリート)
- Premiumユーザー (subscriptionStatus='ACTIVE')
- フリーユーザー
- 無制限パックユーザー (AiUsage.hasUnlimited=true)
- 月間使用量上限到達ユーザー (AiUsage.count=5)
```

---

## 7. テスト優先度マトリクス

| 優先度 | 対象 | テストケース数 | ブロッカー |
|--------|------|--------------|----------|
| P0 | CI/CDパイプライン通過確認 | 9 | mainマージ |
| P0 | セキュリティ修正回帰 | 8(手動) + 28(自動) | mainマージ |
| P1 | AI分析API (正常系+認可) | 18 | API実装完了 |
| P1 | Stripe年間プラン webhook | 5 | Stripe Price作成 |
| P2 | 統計ダッシュボードAPI | 9 | API実装完了 |
| P2 | UI手動テスト | 3 | デザインカンプ |

**総テストケース数: 80件**

---

*API仕様(兎田)・デザインカンプ(宝鐘)の確定後、テストケースを具体化し即実行に移行する。*
