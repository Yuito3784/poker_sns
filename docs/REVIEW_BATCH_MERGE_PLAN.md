# Review Batch Merge Plan

> 60 worktree branches analyzed. This document provides the merge priority, duplicate elimination, and execution order.

## Executive Summary

| Category | Count | Action |
|----------|-------|--------|
| Production code (merge) | 6 | Merge in order |
| Docs-only (batch merge) | 40 | Batch merge |
| Duplicate/superseded (discard) | 9 | Delete branches |
| Empty (no changes) | 5 | Delete branches |
| **Total** | **60** | |

---

## TIER 1 - Production Code (Merge in Order)

These branches contain actual code changes. Merge sequentially to avoid conflicts.

### Step 1: `cece7d29` - CI/CD GHCR lowercase fix + standalone output
- **Changes:** `.github/workflows/ci-cd.yml`, `frontend/next.config.ts`
- **Why first:** Fixes CI/CD docker-build failure (GHCR rejects uppercase). Adds `output: 'standalone'` to Next.js for Docker production build.
- **Supersedes:** 2c6e7f89, 8ee6da76, 77b3c510, a84c05d1, 66ded6ba (partial), c0152f33 (partial), c642f8ba (partial), d4fbd5cb (partial)
- **Conflicts:** None with main

### Step 2: `9ce718bd` - Phase 5 Revenue Features
- **Changes:** 13 files - AI hand analysis module, stats dashboard, annual subscription plan
- **Files:** `backend/src/ai-analysis/*`, `backend/src/stats/*`, `backend/src/subscriptions/*`, `backend/prisma/schema.prisma`, `.env.example`
- **Why second:** Biggest revenue-impacting feature. No conflict with Step 1 (different files).
- **Conflicts:** None with main or Step 1

### Step 3: `e0f4ba83` - Error Notification Pipeline + Task Audit
- **Changes:** 8 files - Global exception filter, webhook notifier, task audit service
- **Files:** `backend/src/common/global-exception.filter.ts`, `backend/src/common/task-audit.service.ts`, `backend/src/common/webhook-notifier.service.ts`, `backend/src/app.module.ts`, `backend/src/main.ts`
- **Caution:** Both this and Step 2 modify `backend/src/app.module.ts` and `backend/package.json`. Merge Step 2 first, then rebase this.
- **Conflicts:** Possible minor conflict in `app.module.ts` imports (manual resolve needed)

### Step 4: `07a5b50e` - CI/CD Notifications + Auto-Recovery + Healthcheck
- **Changes:** 5 files - `ci-cd.yml` (build failure notification, Slack support), `notify-and-recover.yml`, `docker-compose.prod.yml`, `scripts/container-healthcheck.sh`
- **Caution:** Touches `ci-cd.yml` which was modified in Step 1. Different sections, but needs rebase after Step 1.
- **Conflicts:** Context conflict with Step 1 in ci-cd.yml (resolvable)

### Step 5: `b9e5c974` - Frontend Dark Theme Fix + Visual QA
- **Changes:** 3 files - `frontend/src/app/page.tsx` (Suspense fallback fix), docs
- **Conflicts:** None

### Step 6: `7125774c` - QA E2E Test Config Fix
- **Changes:** 2 files - `backend/test/jest-e2e.json`, docs
- **Conflicts:** None

---

## TIER 2 - Docs-Only Branches (Batch Merge)

All docs-only branches. No code conflicts possible. Can be merged in any order or batched.

### Planning Team
| Branch | File(s) | Description |
|--------|---------|-------------|
| `c5f7f252` | `docs/PLANNING_DELIVERABLE_ROUND1.md` | Round 1 deliverable |
| `7bc5fb3e` | `docs/PLANNING_REVENUE_KPI_BREAKDOWN.md` | Revenue KPI |
| `e0695c49` | `docs/MEDIA_KIT_v1.md`, `docs/PARTNER_KPI_TARGETS.md`, `docs/PLANNING_PHASE1_PROGRESS_TRACKER.md` | Media kit, KPI, tracker |
| `3b520454` | `docs/PLANNING_RELEASE_STATUS_REPORT.md` | Release status |
| `9a0eade6` | `docs/PLANNING_STALL_ANALYSIS_AND_RECOVERY.md` | Stall analysis |
| `3bfabe95` | `docs/NOTE_THEME_CANDIDATES_v2.md`, `docs/PLANNING_BLOCKER_RESOLUTION_FRAMEWORK.md` | Blocker framework |

### Operations Team
| Branch | File(s) | Description |
|--------|---------|-------------|
| `149e9daf` | `docs/OPS_ROUND1_SUPPLEMENT_INTEGRATION.md` | Supplement |
| `1b44b919` | `docs/ops-error-runbook.md`, `docs/ops-escalation-rules.md`, `scripts/escalation-check.sh` | Escalation system |
| `33b881ba` | `docs/ops-dashboard.md`, `docs/staging-deploy-runbook.md` | Ops dashboard |
| `93d680cd` | `docs/OPS_DELIVERABLE_STATUS_ROUND1.md`, `docs/OPS_EXECUTION_PLAN_ROUND1.md` | Execution plan |
| `45c1ce25` | `docs/ceo-decision-blocker.md`, `docs/decision-blockers.md`, etc. | CEO blocker tracking |
| `c20350b3` | `docs/ops-deliverable-vercel-release.md`, etc. | Vercel release ops |
| `4d56720a` | `docs/OPS_DELIVERABLE_NOTE_THEME_SHIFT.md`, etc. | Theme shift |
| `ea595ae3` | `docs/ROUND1_DETAILED_EXECUTION_PLAN.md`, `docs/ROUND1_INTEGRATED_DELIVERABLE.md` | Integrated deliverable |
| `3003b0f8` | `docs/PLANNING_ERROR_HANDLING_EXECUTION_PLAN.md` | Error handling plan |

### Development Team
| Branch | File(s) | Description |
|--------|---------|-------------|
| `69682544` | `docs/dev-status-report-round1.md` | Status report |
| `8a8e7e8a` | `docs/dev-deliverable-round1-release.md` | Release deliverable |
| `4776bce0` | `docs/dev-deliverable-phase5-review.md`, `docs/phase5-code-review.md` | Phase 5 review |
| `6e8bcc5d` | `docs/dev-infra-spec-for-blockers.md` | Infra spec |
| `6c6d9258` | `docs/STATUS_REPORT_ROUND1.md` | Status report |
| `4ecaa9a2` | `docs/PROGRESS_STATUS_ROUND1.md` | Progress status |

### QA/QC Team
| Branch | File(s) | Description |
|--------|---------|-------------|
| `74d9e47a` | `docs/qa-phase5-test-plan.md`, `docs/qa-round1-deliverable.md` | Test plan |
| `778e0bd4` | `docs/qa-smoke-test-release-round1.md` | Smoke test |
| `8701f75a` | `QA_QC_PRODUCTION_READINESS_REPORT.md` | Readiness report |
| `d4df9556` | `docs/QA_ERROR_RESILIENCE_DELIVERABLE.md` | Error resilience |
| `7523af45` | `docs/QA_PHASE1_COMPLETION_CRITERIA.md`, etc. | Phase 1 criteria |
| `94c99323` | `docs/qa-merge-verification-report.md` | Merge verification |

### DevSecOps Team
| Branch | File(s) | Description |
|--------|---------|-------------|
| `574c65d0` | `docs/devsecops-round1-report.md` | Round 1 report |
| `ae54e4b6` | `docs/devsecops-merge-verification-report.md` | Merge verification |
| `fec6906f` | `docs/devsecops-vercel-deployment-guide.md` | Vercel guide |
| `aa8425cd` | `.markdownlint.yml`, `docs/OPS_DELIVERABLE_DOCS_LINT_PIPELINE.md`, ci-cd.yml (minor) | Docs lint |

### Design Team
| Branch | File(s) | Description |
|--------|---------|-------------|
| `8b8ec3d2` | `docs/design/DESIGN_DELIVERABLE_R1.md`, HTML mockup | Design deliverable |

### Cross-Team / CEO
| Branch | File(s) | Description |
|--------|---------|-------------|
| `2012a8e4` | `docs/CEO_DECISION_DELIVERABLE_BLOCKER_VISIBILITY.md`, `docs/decision-blockers.md` | CEO blockers |
| `793efb08` | `docs/decision-blockers.md` | Decision blockers (DUPLICATE of 2012a8e4 - check content) |
| `8f62822a` | `docs/CEO_PRODUCTION_RELEASE_DECISION_SHEET.md` | CEO decision sheet |
| `726fbfd9` | `docs/CEO_DEPLOY_STATUS_REPORT.md`, etc. | Deploy status |
| `26b842dd` | `docs/CEO_DEPLOY_VERIFICATION_CHECKLIST.md`, etc. | Verification checklist |
| `aefee122` | `docs/OPS_REVIEW_CLASSIFICATION_AND_RESOLUTION.md` | Review classification |
| `0ff76323` | `ops/batch-review-close.sh`, etc. | Batch review ops |
| `fa09bc5f` | `docs/NOTE_ARTICLE_PIPELINE.md`, templates | Note article theme |
| `5ab58689` | `docs/OPS_DELIVERABLE_AI_THEME_THUMBNAILS.md`, SVGs | AI theme thumbnails |

---

## TIER 3 - Duplicate/Superseded Branches (DELETE)

These branches are fully superseded by `cece7d29` or other Tier 1 branches.

| Branch | Reason to Discard |
|--------|-------------------|
| `2c6e7f89` | GHCR fix only - superseded by `cece7d29` |
| `8ee6da76` | GHCR fix only - superseded by `cece7d29` |
| `77b3c510` | GHCR fix + doc - superseded by `cece7d29` + `574c65d0` |
| `a84c05d1` | GHCR fix + doc - superseded by `cece7d29` + `574c65d0` |
| `66ded6ba` | standalone + doc - code part superseded by `cece7d29`, doc by `8a8e7e8a` |
| `c0152f33` | standalone + doc - code part superseded by `cece7d29` |
| `c642f8ba` | standalone + doc - code part superseded by `cece7d29` |
| `d4fbd5cb` | standalone + deploy script - code part superseded by `cece7d29` |
| `793efb08` | decision-blockers.md - likely duplicate of `2012a8e4` |

---

## TIER 4 - Empty Branches (DELETE)

| Branch | Status |
|--------|--------|
| `11288b28` | No commits ahead of main |
| `a435abc3` | No commits ahead of main |
| `cef5d47e` | No commits ahead of main |
| `ef995376` | No commits ahead of main |
| `f7ac9681` | Current planning branch (this doc) |

---

## Merge Execution Script

```bash
# Phase 1: Tier 1 code branches (sequential)
git checkout main
git merge --no-ff climpire/cece7d29 -m "Fix CI/CD GHCR lowercase and add standalone output"
git merge --no-ff climpire/9ce718bd -m "Add Phase 5 revenue features: AI analysis, stats, annual plan"
# Note: e0f4ba83 may need manual conflict resolution in app.module.ts
git merge --no-ff climpire/e0f4ba83 -m "Add error notification pipeline and task audit system"
git merge --no-ff climpire/07a5b50e -m "Add CI/CD notifications, auto-recovery, and healthcheck"
git merge --no-ff climpire/b9e5c974 -m "Fix Suspense dark theme fallback"
git merge --no-ff climpire/7125774c -m "Fix E2E test config"

# Phase 2: Docs batch (can fast-merge all)
for branch in c5f7f252 7bc5fb3e e0695c49 3b520454 9a0eade6 3bfabe95 \
  149e9daf 1b44b919 33b881ba 93d680cd 45c1ce25 c20350b3 4d56720a ea595ae3 3003b0f8 \
  69682544 8a8e7e8a 4776bce0 6e8bcc5d 6c6d9258 4ecaa9a2 \
  74d9e47a 778e0bd4 8701f75a d4df9556 7523af45 94c99323 \
  574c65d0 ae54e4b6 fec6906f aa8425cd \
  8b8ec3d2 \
  2012a8e4 8f62822a 726fbfd9 26b842dd aefee122 0ff76323 fa09bc5f 5ab58689; do
  git merge --no-ff climpire/$branch -m "Merge docs: $(git log --oneline climpire/$branch -1 | cut -d' ' -f2-)" || {
    echo "CONFLICT in climpire/$branch - resolve manually"
    git merge --abort
  }
done

# Phase 3: Delete superseded branches
for branch in 2c6e7f89 8ee6da76 77b3c510 a84c05d1 66ded6ba c0152f33 c642f8ba d4fbd5cb 793efb08 \
  11288b28 a435abc3 cef5d47e ef995376; do
  git branch -D climpire/$branch
done
```

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `app.module.ts` conflict (Step 2+3) | High | Manual import merge - both add to imports array |
| `ci-cd.yml` context conflict (Step 1+4) | Medium | Different sections, rebase after Step 1 |
| `docs/decision-blockers.md` duplicate (793efb08 vs 2012a8e4) | High | Compare content, keep richer version |
| `package-lock.json` conflict (Step 2+3) | High | Regenerate after both merges: `npm install` |

## Expected Post-Merge State

- CI/CD: Docker builds pass (GHCR lowercase), notifications on failure
- Backend: AI analysis, stats, error pipeline, task audit all available
- Frontend: Docker production build works (standalone), dark theme Suspense fixed
- QA: E2E test config corrected
- Docs: ~40 deliverables consolidated under docs/
