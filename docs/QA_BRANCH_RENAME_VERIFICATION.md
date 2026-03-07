# QA検証レポート: ブランチリネーム対応

**検証日:** 2026-03-05
**担当:** QA/QC 尾丸
**対象:** `climpire/` プレフィックスブランチの命名規則違反

---

## 検証項目と結果

### 1. ブランチ命名規則準拠チェック

**基準:** `.cursor/skills/git-workflow/SKILL.md` — 作業ブランチは `feature/*` または `fix/*` のみ許可

| # | 現在のブランチ名 | 推奨リネーム先 | 変更内容 | ステータス |
|---|---|---|---|---|
| 1 | `climpire/10d97a6d` | `chore/branch-naming-qa` | CLAUDE.md更新、git-workflow追加 | **違反** |
| 2 | `climpire/40e3703c` | `fix/dark-theme-remaining-pages` | 全ページダークテーマ統一 | **違反** |
| 3 | `climpire/55624ccc` | `chore/branch-rename-design` | Design成果物作成 | **違反** |
| 4 | `climpire/77f33030` | `docs/branch-rename-mapping` | ブランチリネーム対応表UI分類追加 | **違反** |
| 5 | `climpire/ae22cfbb` | `fix/dark-theme-pages` | 全画面ダークテーマ統一修正 | **違反** |
| 6 | `climpire/cca7a17c` | `chore/climpire-base` | climpireタスクマージ用ベース | **違反** |

**判定: NG — ローカルに `climpire/` プレフィックスのブランチが6本残存**

正規ブランチ:
- `fix/branch-naming-cleanup` — 命名規則準拠 OK
- `remotes/origin/fix/refresh-token-migration-and-task-audit` — 命名規則準拠 OK

---

### 2. リモート旧ブランチ削除確認

```
$ git branch -a --remote | grep climpire/
(出力なし)
```

**判定: OK — リモートに `climpire/` プレフィックスのブランチは存在しない**

---

### 3. CI/CD影響確認

`.github/workflows/` のCI設定を確認:

- **push トリガー:** `branches: [main]` のみ
- **pull_request トリガー:** `branches: [main]` のみ
- ブランチ名ベースのフィルタは `main` のみ対象

**判定: OK — ブランチリネームによるCI/CDへの影響なし**

リネーム後も `main` への PR 時にのみCIが発火するため、`fix/*` / `feature/*` へのリネームで動作に変更はない。

---

### 4. 未マージ状態確認

全6本の `climpire/*` ブランチは `main` に対して **UNMERGED** 状態。

リネーム時にコミット履歴が失われないよう、`git branch -m` によるローカルリネームを推奨。

---

## 総合判定

| 検証項目 | 結果 |
|---|---|
| ① 命名規則準拠 | **NG** — 6本が `climpire/` プレフィックスのまま |
| ② リモート旧ブランチ削除 | **OK** — リモートに残存なし |
| ③ CI/CD動作影響 | **OK** — 影響なし |
| ④ 未マージ確認 | 全6本 UNMERGED（リネーム時要注意） |

---

## 是正アクション（推奨）

1. **即時対応（CRITICAL）:** 各 `climpire/*` ブランチを `git branch -m <旧名> <新名>` でリネーム
2. **再発防止（HIGH）:** pre-push フックまたは GitHub ブランチ保護ルールで `climpire/*` パターンのpushを拒否
3. **検証（POST-RENAME）:** リネーム後に `git branch -a | grep climpire/` で残存ゼロを確認

---

## 根本原因分析

`climpire/` プレフィックスは、Claw Empire（climpire）ツールが自動的にworktree用ブランチを作成する際のデフォルト命名パターン。CLAUDE.mdおよびgit-workflow SKILLで定義された `feature/` / `fix/` 命名規則がツール側の自動命名に反映されていないことが原因。

**推奨対策:** climpireツールの設定またはフック機構で、ブランチ作成時に `feature/` / `fix/` プレフィックスを強制する仕組みの導入。
