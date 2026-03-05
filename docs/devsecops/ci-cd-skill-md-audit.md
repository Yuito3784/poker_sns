# DevSecOps成果物: CI/CD × SKILL.md 整合性監査レポート

**作成者:** 角巻 (DevSecOps Senior)
**日付:** 2026-03-05
**対象:** `.cursor/skills/git-workflow/SKILL.md` vs `.github/workflows/ci-cd.yml`

---

## 1. 監査サマリー

| 項目 | SKILL.md の定義 | CI/CD の現状 | 整合性 |
|------|----------------|-------------|--------|
| ブランチ戦略 | `main`=本番, `dev`=統合, `feature/*/fix/*`=作業 | CIトリガー: `main` のみ | **不整合** |
| PRベースブランチ | `dev` が第一ターゲット | PR checks: `main` のみ | **不整合** |
| main直接push禁止 | 明記 | CI側でのガードなし | **補強推奨** |
| Docker build/deploy | main push時のみ | main push時のみ | 整合 |
| コミットメッセージ規約 | Conventional Commits | CI側チェックなし | 補強推奨 |

---

## 2. 検出事項

### CRITICAL: `dev` ブランチへのPRにCIが実行されない

**現状:** `ci-cd.yml` のトリガーが `push: [main]` / `pull_request: [main]` のみ。
**問題:** SKILL.md では作業ブランチ → `dev` へのPRが標準フローだが、この PR に対して backend-test / frontend-build が実行されない。テスト未通過のコードが `dev` にマージされるリスクがある。

**推奨対応:**
```yaml
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]
```

### MEDIUM: main直接push防止のCI側ガードがない

**現状:** SKILL.md で禁止されているが、GitHub Branch Protection Rules が設定されているかはリポジトリ設定依存。CI側での追加ガードはない。
**推奨:** GitHub Branch Protection で `main` および `dev` に対して「Require pull request before merging」「Require status checks」を有効にする（CI外の設定だがDevSecOpsとして推奨）。

### LOW: Conventional Commits のCIチェック未実装

**現状:** SKILL.md で `fix(scope):`, `feat(scope):` 等のフォーマットを推奨しているが、CI での自動チェックはない。
**推奨:** 将来的に `commitlint` の追加を検討（現時点ではwarning報告のみ、コード修正不要）。

---

## 3. SKILL.md ファイルの存在・パス検証

- **パス:** `.cursor/skills/git-workflow/SKILL.md` — **存在確認済み**
- **main/devブランチ両方に存在するか:** worktreeでの確認では存在。デプロイ先ブランチへの反映はマージフロー依存のため、CLAUDE.mdへの周知追記が全ブランチにマージされた時点で整合する。

---

## 4. CLAUDE.md / MEMORY.md との整合性確認

| 項目 | SKILL.md | CLAUDE.md / MEMORY.md | 整合性 |
|------|----------|----------------------|--------|
| `dev` からブランチを切る | 明記 | MEMORY.md に記載あり | 整合 |
| `main` 直接push禁止 | 明記 | MEMORY.md に記載あり | 整合 |
| Conventional Commits | 明記 | MEMORY.md に記載あり | 整合 |
| CEO承認後マージ | 明記 | MEMORY.md に記載あり | 整合 |
| 作業開始前にSKILL.md参照 | セクション7に明記 | MEMORY.md に記載あり | 整合 |

**矛盾点: なし。** 既存のCLAUDE.md/MEMORY.mdの記述はSKILL.mdと一致している。

---

## 5. DevSecOps推奨アクション（優先度順）

1. **[CRITICAL]** `ci-cd.yml` のトリガーに `dev` ブランチを追加（ただし本ラウンドのスコープはCLAUDE.md周知のため、コード変更は別タスクとして起票推奨）
2. **[MEDIUM]** GitHub Branch Protection Rules の確認・設定（リポジトリ管理画面で対応）
3. **[LOW]** commitlint 導入検討（将来タスク）

---

## 6. 「CLAUDE.mdへの周知追記」に対するDevSecOps承認

SKILL.mdの内容と既存CI/CD設定の間に**ブロッカーとなる矛盾はない**。
CLAUDE.mdへの「作業開始前にSKILL.md参照」の追記は、DevSecOps観点から**承認**する。

上記CRITICAL項目（devブランチへのCIトリガー追加）は別途対応タスクとして起票を推奨する。
