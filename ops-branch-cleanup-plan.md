# Operations: Branch Cleanup & Merge Execution Plan
**Date**: 2026-03-05
**Author**: Operations (白上)
**Status**: Ready for execution

---

## 1. Current State Summary

| Worktree ID | Commits Ahead | Dirty | Purpose | Action |
|---|---|---|---|---|
| `273d93bb` | 67 | 2 files | 5 revenue features (tipping, paid-content, salon, tournament, coaching) | **MERGE (3rd)** |
| `8f3890d5` | 67 | 0 | CI/security gate workflow | **MERGE (4th)** |
| `4aacf7af` | 54 | 0 | Dark theme fix (duplicate) | **DELETE** |
| `9926b341` | 54 | 0 | Dark theme fix (duplicate) | **DELETE** |
| `ba0be40d` | 54 | 0 | Dark theme fix (duplicate) | **DELETE** |
| `3b86536d` | 70 | 0 | Current ops session | Auto-cleanup |
| `40f205f9` | 70 | 0 | Unknown / stale | Investigate |
| `49c36a3a` | 67 | 0 | Unknown / stale | Investigate |
| `58780204` | 67 | 0 | Unknown / stale | Investigate |
| `94e2d892` | 54 | 0 | Unknown / stale | Investigate |
| `9a80e373` | 67 | 0 | Unknown / stale | Investigate |
| `a1d40d1c` | 70 | 0 | Unknown / stale | Investigate |
| `c8e298be` | 73 | 0 | Unknown / stale | Investigate |
| `deea94fa` | 67 | 0 | Unknown / stale | Investigate |

**Total worktrees**: 14 (excluding main)
**CEO-approved deletions**: 3 (4aacf7af, 9926b341, ba0be40d)
**Additional stale candidates**: 7 (all clean, no unique changes likely)

---

## 2. Phase 1: Delete Duplicate Branches (CEO-approved)

The 3 duplicate branches all contain dark-theme fixes that overlap with each other:
- `4aacf7af`: `fix(ui): トレンド・ハッシュタグページの背景色をダークテーマに統一`
- `9926b341`: `fix(ui): 全画面ダークテーマ統一 - 白背景ページ修正`
- `ba0be40d`: `fix(ui): unify dark theme across explore, hashtag, partners pages`

All 3 have the same base (54 commits ahead) and 0 dirty files.

### Execution Commands
```bash
cd /Users/yuito/Desktop/poker_sns

# Step 1: Remove worktrees
git worktree remove .climpire-worktrees/4aacf7af --force
git worktree remove .climpire-worktrees/9926b341 --force
git worktree remove .climpire-worktrees/ba0be40d --force

# Step 2: Delete branches
git branch -D climpire/4aacf7af
git branch -D climpire/9926b341
git branch -D climpire/ba0be40d

# Step 3: Verify
git worktree list
git branch | grep climpire
```

---

## 3. Phase 2: Merge Execution Order (CEO-specified)

Per CEO instructions, merge in this order:

### 3rd: `climpire/273d93bb` (5 Revenue Features)
- **Scope**: schema.prisma extension + 5 backend modules + 6 frontend pages
- **Risk**: Largest changeset, most likely to have conflicts
- **Pre-merge check**: `273d93bb` has 2 dirty files - must commit or stash first

### 4th: `climpire/8f3890d5` (CI/Security Gate)
- **Scope**: `.github/workflows` only, no code changes
- **Risk**: Low, no code overlap expected

### Post-Merge Verification Checklist
1. `prisma db push --accept-data-loss` - Schema reflects new revenue models
2. `npm run build` (backend + frontend) - Both compile without errors
3. Stripe Webhook signature verification - Implementation level review
4. Felt Table theme compliance - Visual spot-check on new pages

---

## 4. Branch Naming Issue

**Root cause**: Claw Empire agent system auto-generates branches as `climpire/<random-id>`.
**Fix needed**: Agent branch creation logic must read `.cursor/skills/git-workflow/SKILL.md` naming convention (`feature/*`, `fix/*`).
**Owner**: Development team (not Ops scope)

---

## 5. Recommendation: Additional Cleanup

Beyond the 3 CEO-approved deletions, there are 7 additional worktrees with no dirty files that appear to be stale agent sessions. Recommend CEO approval to also clean:
- `40f205f9`, `49c36a3a`, `58780204`, `94e2d892`, `9a80e373`, `a1d40d1c`, `c8e298be`, `deea94fa`

This would reduce the 14 worktrees down to just the 2 merge targets + current session.
