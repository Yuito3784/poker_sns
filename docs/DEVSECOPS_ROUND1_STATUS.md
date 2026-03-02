# DevSecOps Round 1 Status Report
**Date**: 2026-03-02 | **Author**: 角巻 (DevSecOps)

---

## 1. Blocker: CI/CD Pipeline (78ec569) — main未マージ

### 問題
`github.repository` が `Yuito3784/poker_sns`（大文字Y）を返すが、GHCRはすべて小文字のイメージ名を要求。docker-buildジョブがpushステップで15秒以内に失敗。

### 修正内容
```yaml
# Before (broken)
env:
  IMAGE_PREFIX: ${{ github.repository }}

# After (fixed)
- name: Set lowercase image prefix
  run: echo "IMAGE_PREFIX=${GITHUB_REPOSITORY,,}" >> "$GITHUB_ENV"
```

### ステータス
| 項目 | 状態 |
|------|------|
| コード修正 | 完了 (78ec569, 本ブランチにも適用済) |
| mainマージ | **CEO承認待ち** |
| パイプライン通過確認 | マージ後に実施 |

### マージ後の検証チェックリスト
- [ ] `backend-test` ジョブ: npm ci → prisma generate → test → build 通過
- [ ] `frontend-build` ジョブ: npm ci → build 通過
- [ ] `docker-build` ジョブ: GHCR push成功 (`ghcr.io/yuito3784/poker_sns/{backend,frontend}:latest`)
- [ ] `deploy` ジョブ: SSH接続 → compose pull → compose up → health check 200
- [ ] Discord通知: 成功webhook受信確認

---

## 2. GitHub Secrets 棚卸し

CI/CDパイプラインとデプロイに必要なGitHub Secretsの完全リスト。

### 必須 (CI/CD動作に直接必要)
| Secret | 用途 | 設定済？ |
|--------|------|---------|
| `GITHUB_TOKEN` | GHCR認証 (自動提供) | 自動 |
| `DEPLOY_HOST` | 本番サーバーIP/ホスト名 | **未設定 (VPS未契約)** |
| `DEPLOY_USER` | SSH接続ユーザー | **未設定** |
| `DEPLOY_SSH_KEY` | SSH秘密鍵 | **未設定** |
| `DISCORD_WEBHOOK_URL` | デプロイ通知 | **未設定** |

### 必須 (ビルド時注入)
| Secret | 用途 | 設定済？ |
|--------|------|---------|
| `NEXT_PUBLIC_API_URL` | フロントエンドAPI接続先 | **未設定 (ドメイン未定)** |
| `NEXT_PUBLIC_SITE_URL` | フロントエンドサイトURL | **未設定 (ドメイン未定)** |

### 本番環境変数 (.env on VPS)
| 変数 | 用途 | 優先度 |
|------|------|--------|
| `DB_PASSWORD` | PostgreSQL認証 | CRITICAL |
| `JWT_SECRET` | JWT署名 (64バイトhex) | CRITICAL |
| `STRIPE_SECRET_KEY` | Stripe API | CRITICAL |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook検証 | CRITICAL |
| `TOKEN_ENCRYPTION_KEY` | SNS自動投稿トークン暗号化 | HIGH |
| `SMTP_*` (6項目) | メール送信 | HIGH |
| `GOOGLE_CLIENT_*` | Google OAuth | MEDIUM |
| `LINE_CLIENT_*` | LINE OAuth | MEDIUM |
| `X_CLIENT_*` | X OAuth | MEDIUM |
| `STRIPE_PRICE_ID` | サブスクリプション価格 | HIGH |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4トラッキング | LOW |

---

## 3. Phase 5 追加に伴うインフラ変更計画

### 3-1. AIハンド分析API — コンテナ構成

Phase 5でAIハンド分析APIが追加される。バックエンドコンテナ内で外部AI APIを呼び出す構成のため、新規コンテナは不要。

```
[Client] → [Nginx] → [Backend (NestJS)]
                           ↓
                     [AI Provider API]
                     (Claude / OpenAI)
                           ↓
                     [PostgreSQL]
                     (AiAnalysis, AiUsage tables)
```

**必要な追加Secrets:**
| Secret | 用途 | 注入方法 |
|--------|------|---------|
| `AI_API_KEY` | Claude/OpenAI APIキー | GitHub Secrets → .env on VPS |
| `STRIPE_YEARLY_PRICE_ID` | 年間プラン価格ID | GitHub Secrets → .env on VPS |

**docker-compose.prod.yml 変更:** 不要（バックエンドコンテナ内で処理）

**セキュリティ考慮:**
- AI APIキーはバックエンド環境変数としてのみ注入、フロントエンドに露出させない
- `AiUsage` テーブルでレート制限を実装（Free: 3回/月, Premium: 30回/月）
- APIレスポンスのサニタイズ（AI出力にXSSペイロードが含まれる可能性）

### 3-2. リソース制限の見直し

AIハンド分析はAPIコール + レスポンス解析で一時的にメモリ使用量が増加する。

| サービス | 現在 | Phase 5推奨 |
|---------|------|------------|
| Backend | 512MB / 1.0 CPU | **768MB** / 1.0 CPU |
| Frontend | 512MB / 1.0 CPU | 512MB / 1.0 CPU (変更なし) |
| DB | 1GB / 2.0 CPU | 1GB / 2.0 CPU (変更なし) |
| Nginx | 256MB / 0.5 CPU | 256MB / 0.5 CPU (変更なし) |

---

## 4. CI/CDパイプライン改善提案 (Phase 5以降)

### 4-1. コンテナスキャン追加 (推奨)
```yaml
- name: Scan backend image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/backend:${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: 1
```

### 4-2. ステージング自動デプロイ (将来)
PRマージ時にステージング環境へ自動デプロイし、E2Eテストを実行する構成。
```
PR → lint+test → docker-build → staging-deploy → e2e-test → manual-approve → prod-deploy
```

### 4-3. Dependabot設定 (推奨)
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /backend
    schedule: { interval: weekly }
  - package-ecosystem: npm
    directory: /frontend
    schedule: { interval: weekly }
  - package-ecosystem: docker
    directory: /backend
    schedule: { interval: monthly }
```

---

## 5. セキュリティ監査サマリー (既存レポート参照)

詳細は `docs/devsecops-audit-2026-03-02.md` を参照。

### CRITICAL (即時対応推奨)
| 対象 | 問題 | 対応 |
|------|------|------|
| multer <=2.0.2 | DoSリソース枯渇 | `npm audit fix --force` (nestjs/testing互換性確認要) |
| next 15.6-16.1.4 | Image Optimizer DoS, PPRメモリ枯渇 | `npm audit fix --force` → next@16.1.6 |
| postgres:16-alpine | CVE-2026-2006 バッファオーバーラン | 16.12-alpine以降にピン留め |
| node:20-alpine | CVE-2025-59465 HTTP/2クラッシュ | 20.20-alpine以降にピン留め |

### 3月2日適用済みセキュリティ修正 (回帰テスト対象)
- bcrypt rounds 10→12
- JWT query param抽出削除
- OAuth base64 URL渡し→サーバーサイドセッション方式
- Helmet CSP/HSTS/frameguard/noSniff
- nginx HSTS/X-Content-Type-Options/X-Frame-Options/Referrer-Policy
- Stripe webhook署名検証400返却
- verify-email @Throttle追加

---

## 6. デプロイ即時実行チェックリスト (CEO承認後)

```
Step 1: CI/CDブランチをmainにマージ
Step 2: Phase 5ブランチをmainにマージ
Step 3: GitHub Actions パイプライン全ステージ通過確認
Step 4: VPS契約 + setup-server.sh 実行
Step 5: GitHub Secrets 全項目設定
Step 6: ドメイン設定 + setup-ssl.sh 実行
Step 7: 本番 .env 作成 (全シークレット注入)
Step 8: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
Step 9: prisma db push --accept-data-loss
Step 10: スモークテスト実行 (docs/ops-deploy-smoke-test-runbook.md)
Step 11: Discord/ヘルスチェック cron 有効化
Step 12: バックアップ cron 有効化
```

---

## 7. CEO意思決定待ち事項

| # | 内容 | DevSecOpsへの影響 | 推奨 |
|---|------|-------------------|------|
| B-1 | CI/CDブランチのmainマージ承認 | パイプライン全停止 | **即時マージ** |
| B-2 | VPS/クラウド選定・費用承認 | デプロイ先なし | ConoHa VPS 4GB (¥3,091/月) or AWS Lightsail |
| B-3 | ドメイン決定・購入 | SSL証明書・CORS設定不可 | .com ドメイン取得 |
| B-4 | AI APIプロバイダー選定 (Phase 5) | APIキーSecret管理 | Claude API (コスト効率優) |
