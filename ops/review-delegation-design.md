# レビュー権限委譲・承認フロー自動化 設計書

**作成日**: 2026-03-02
**担当**: Operations (白上)
**ステータス**: 設計ドラフト

---

## 1. 目的

CEOが全レビューを確認するボトルネックを解消し、各チームリーダーに権限を委譲することで、PRレビューの滞留を防止する。

## 2. 現状の課題

```
[PR作成] → [レビュー待ち] → [CEO確認待ち] → [マージ]
                                  ↑
                           ボトルネック（100件以上滞留）
```

## 3. 目標フロー

```
[PR作成]
    ↓
[CODEOWNERS自動アサイン]
    ↓
┌─────────────────────────────────────────┐
│ カテゴリ判定（パスベース + ブランチ名）  │
├─────────┬──────────┬──────────┬─────────┤
│ code    │ design   │ infra    │security │
│ 兎田    │ 宝鐘     │ 獅白     │獅白→CEO │
└────┬────┴────┬─────┴────┬─────┴────┬────┘
     ↓         ↓          ↓          ↓
[チームリーダー承認]             [CEOエスカレーション]
     ↓                               ↓
[CIパス確認]                    [CEO承認]
     ↓                               ↓
[自動マージ or 手動マージ]      [マージ]
     ↓
[Discord通知]
```

## 4. 実装計画

### 4.1 CODEOWNERS ファイル作成

```
# .github/CODEOWNERS
# 各パスに対する自動レビュアーアサイン

# Backend全般
/backend/                           @usada-dev-lead

# Frontend全般
/frontend/                          @usada-dev-lead

# 認証・セキュリティ関連
/backend/src/auth/                  @shishiro-devsecops
/backend/src/guards/                @shishiro-devsecops

# インフラ・CI/CD
/.github/                           @shishiro-devsecops
/docker-compose*.yml                @shishiro-devsecops
/nginx/                             @shishiro-devsecops
/scripts/                           @shirogane-ops

# デザイン・UI
/frontend/src/app/**/*.css          @houshou-design
/frontend/src/components/           @houshou-design

# 運用
/ops/                               @shirogane-ops
```

### 4.2 ブランチ保護ルール更新

GitHub Settings → Branches → Branch protection rules:

| 設定項目 | 値 |
|----------|-----|
| Branch name pattern | `main` |
| Require pull request reviews | ON |
| Required number of reviews | 1 |
| Require review from CODEOWNERS | ON |
| Require status checks to pass | ON |
| Required checks | `backend-test`, `frontend-build` |
| Restrict who can push | ON (maintainers only) |

### 4.3 CI/CDパイプラインへの反映

既存の `.github/workflows/ci-cd.yml` に以下を追加:

#### (a) PR自動ラベル付け

```yaml
# .github/workflows/pr-labeler.yml
name: PR Auto-Labeler

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/labeler@v5
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

対応する `.github/labeler.yml`:

```yaml
security:
  - changed-files:
    - any-glob-to-any-file:
      - 'backend/src/auth/**'
      - 'backend/src/guards/**'
      - '**/helmet*'

infrastructure:
  - changed-files:
    - any-glob-to-any-file:
      - '.github/**'
      - 'docker-compose*.yml'
      - 'nginx/**'
      - 'scripts/**'

design:
  - changed-files:
    - any-glob-to-any-file:
      - 'frontend/src/app/**/*.css'
      - 'frontend/src/components/**'

backend:
  - changed-files:
    - any-glob-to-any-file:
      - 'backend/**'

frontend:
  - changed-files:
    - any-glob-to-any-file:
      - 'frontend/**'
```

#### (b) セキュリティPR自動通知

```yaml
# .github/workflows/security-notify.yml
name: Security PR Notification

on:
  pull_request:
    types: [opened, labeled]
    paths:
      - 'backend/src/auth/**'
      - 'backend/src/guards/**'

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Notify CEO via Discord
        run: |
          curl -s -H "Content-Type: application/json" \
            -d '{
              "embeds": [{
                "title": "Security PR Requires CEO Review",
                "description": "PR #${{ github.event.pull_request.number }}: ${{ github.event.pull_request.title }}",
                "url": "${{ github.event.pull_request.html_url }}",
                "color": 15158332,
                "fields": [
                  {"name": "Author", "value": "${{ github.event.pull_request.user.login }}", "inline": true},
                  {"name": "Files Changed", "value": "${{ github.event.pull_request.changed_files }}", "inline": true}
                ]
              }]
            }' \
            "${{ secrets.DISCORD_WEBHOOK_URL }}"
```

### 4.4 PR滞留アラート（週次）

```yaml
# .github/workflows/stale-pr-alert.yml
name: Stale PR Alert

on:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜 9:00 UTC (18:00 JST)

jobs:
  alert:
    runs-on: ubuntu-latest
    steps:
      - name: Check stale PRs
        uses: actions/github-script@v7
        with:
          script: |
            const prs = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
              sort: 'updated',
              direction: 'asc',
              per_page: 100
            });

            const stale = prs.data.filter(pr => {
              const updated = new Date(pr.updated_at);
              const now = new Date();
              const diffDays = (now - updated) / (1000 * 60 * 60 * 24);
              return diffDays > 7;
            });

            if (stale.length >= 10) {
              const list = stale.slice(0, 20).map(pr =>
                `- #${pr.number}: ${pr.title} (${Math.floor((new Date() - new Date(pr.updated_at)) / 86400000)}日前)`
              ).join('\n');

              await fetch(process.env.DISCORD_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  embeds: [{
                    title: `PR滞留アラート: ${stale.length}件が7日以上未更新`,
                    description: list,
                    color: 15105570
                  }]
                })
              });
            }
        env:
          DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

## 5. 導入スケジュール

| フェーズ | 内容 | 所要時間 |
|----------|------|----------|
| Phase 1 | CODEOWNERS作成 + ブランチ保護ルール設定 | 即日 |
| Phase 2 | PR Auto-Labeler導入 | 即日 |
| Phase 3 | セキュリティPR通知ワークフロー追加 | 即日 |
| Phase 4 | 既存100件の一括消化（バッチスクリプト実行） | 1日 |
| Phase 5 | 滞留アラート設定 + 運用開始 | 1日 |

## 6. CEO確認事項

以下についてCEOの承認が必要:

1. **権限委譲の範囲**: セキュリティ以外のPRはチームリーダー判断でマージしてよいか
2. **CEOエスカレーション基準**: セキュリティ + 売上影響ありのみで十分か
3. **マージ戦略**: squash merge統一でよいか
4. **CODEOWNERS**: 上記のパス→承認者マッピングで問題ないか
