# Dark Theme Staging Checklist & Operations Runbook

## Purpose
修正完了後のステージング確認用チェックリスト。全対象ページの目視確認完了を `dev` マージのゲート条件とする。

---

## 1. Staging Confirmation Checklist

> **Gate Rule**: 全項目 PASS でなければ `dev` マージ禁止

| # | Route | URL (localhost:3000) | 確認対象ファイル | Status |
|---|-------|---------------------|-----------------|--------|
| 1 | Home (Feed) | `/` | `app/page.tsx` | [ ] |
| 2 | Explore / Trends | `/explore` | `app/explore/page.tsx` | [ ] |
| 3 | Search | `/search` | `app/search/page.tsx` | [ ] |
| 4 | Bookmarks | `/bookmarks` | `app/bookmarks/page.tsx` | [ ] |
| 5 | Notifications | `/notifications` | `app/notifications/page.tsx` | [ ] |
| 6 | Settings | `/settings` | `app/settings/page.tsx` | [ ] |
| 7 | Post Detail | `/post/{id}` | `app/post/[id]/PostDetailClient.tsx` | [ ] |
| 8 | Profile | `/profile/{username}` | `app/profile/[username]/ProfileClient.tsx` | [ ] |
| 9 | Hashtag | `/hashtag/{tag}` | `app/hashtag/[tag]/HashtagClient.tsx` | [ ] |
| 10 | Partners | `/partners` | `app/partners/page.tsx` | [ ] |
| 11 | Landing Page | `/lp` | `app/lp/page.tsx` | [ ] |
| 12 | Terms | `/terms` | `app/terms/page.tsx` | [ ] |
| 13 | Privacy | `/privacy` | `app/privacy/page.tsx` | [ ] |
| 14 | Forgot Password | `/forgot-password` | `app/forgot-password/page.tsx` | [ ] |
| 15 | Reset Password | `/reset-password` | `app/reset-password/page.tsx` | [ ] |
| 16 | Verify Email | `/verify-email` | `app/verify-email/page.tsx` | [ ] |

### Verification Criteria (per page)
Each page must satisfy ALL of the following:

1. **Background**: Page background is `#0d1009` (near-black) — no white/gray flash
2. **Surface**: Card/panel areas use `#131a14` or `#192118`
3. **Borders**: Use `#1f2a1e` or `#2a3828` — no gray borders
4. **Text**: Primary text `#ddd6c8`, secondary `#7a7260` — no `text-gray-900` / `text-black`
5. **CTA Buttons**: Gold `#c9a84c` background with `#0d1009` text
6. **No inline styles**: Color changes via Tailwind utility classes only (CSP compliance)

---

## 2. Grep Validation Commands

修正前後で実行し、明色系クラスが除去されていることを確認する。

```bash
# Light background classes (should return 0 matches after fix)
grep -rn "bg-white\|bg-gray-50\|bg-gray-100" frontend/src/app/

# Light text classes (should return 0 matches after fix)
grep -rn "text-gray-900\|text-black" frontend/src/app/

# Inline style check (should not introduce new color inline styles)
grep -rn 'style=.*\(background\|color\)' frontend/src/app/
```

---

## 3. Dev Merge Gate Conditions

`dev` ブランチへのマージ前に以下を全て確認:

- [ ] 上記チェックリスト全16ページ PASS
- [ ] `npm run build` (frontend) 成功
- [ ] `npm run build` (backend) 成功
- [ ] grep validation: 明色系クラス残存 0 件
- [ ] grep validation: 新規 inline style 色指定 0 件
- [ ] WCAG AA contrast ratio: text `#ddd6c8` on `#0d1009` = 11.3:1 (PASS)

---

## 4. Hotfix Procedure (白背景取りこぼし発覚時)

本番反映後に白背景ページが発覚した場合の緊急対応手順:

### 4.1 Severity Assessment
| Level | Condition | Response Time |
|-------|-----------|---------------|
| P1 (Critical) | LP/Home等の主要導線ページ | 即座に対応 (< 1h) |
| P2 (High) | ログイン後の一般ページ | 当日中 |
| P3 (Medium) | 低トラフィックページ (terms, privacy等) | 翌営業日 |

### 4.2 Hotfix Flow
```
1. `git checkout dev`
2. `git pull origin dev`
3. `git checkout -b fix/dark-theme-hotfix-{page-name}`
4. Tailwind クラスのみで修正 (inline style 禁止)
5. grep validation 実行
6. 該当ページのみ目視確認
7. `npm run build` で frontend ビルド通過確認
8. PR 作成 → CEO 承認 → dev マージ
9. ステージング全ページ再確認 → main マージ → デプロイ
```

### 4.3 Root Cause Analysis
ホットフィックス完了後、以下を記録:
- 取りこぼし原因 (grep漏れ / 動的クラス / 条件分岐内等)
- 再発防止策 (grep パターン追加 / CI lint rule 等)

---

## 5. Future Prevention (CI Integration Proposal)

今後の再発防止として、CI パイプラインに以下の lint チェック追加を推奨:

```yaml
# .github/workflows/theme-lint.yml (proposal)
- name: Check for light theme classes
  run: |
    MATCHES=$(grep -rn "bg-white\|bg-gray-50\|bg-gray-100\|text-gray-900\|text-black" frontend/src/app/ || true)
    if [ -n "$MATCHES" ]; then
      echo "::error::Light theme classes detected:"
      echo "$MATCHES"
      exit 1
    fi
```

---

*Document created by Operations (白上) — 2026-03-05*
