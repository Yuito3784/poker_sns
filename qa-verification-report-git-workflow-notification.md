# QA/QC 検証レポート: git-workflow SKILL.md 全体周知

**担当:** QA/QC 尾丸
**日付:** 2026-03-05
**ステータス:** 検証完了 - 重大な問題あり

---

## 1. SKILL.md ファイル存在・パス検証

| チェック項目 | 結果 | 備考 |
|---|---|---|
| `.cursor/skills/git-workflow/SKILL.md` が存在するか | OK | メインリポジトリの作業ディレクトリに存在 (4281 bytes) |
| ファイル内容が有効か | OK | 全7セクション、ブランチ戦略・コミットルール・禁止事項を網羅 |
| パス `.cursor/skills/git-workflow/SKILL.md` が相対パスとして正しいか | OK | リポジトリルートからの相対パスとして正確 |
| **git tracked かどうか** | **NG - CRITICAL** | `.gitignore` で除外パターン解除済み (`!.cursor/skills/**`) だが、`git add` されていないため **未追跡** |

### CRITICAL: SKILL.md が git 未追跡

- `.gitignore` には `.cursor/*` で全体除外後、`!.cursor/skills/` と `!.cursor/skills/**` で再許可している
- しかし、実際には `git add` されておらず `Untracked files` のまま
- **影響:** git worktree、新規 clone、CI/CD 環境、他の開発者の環境では SKILL.md が存在しない
- **対応必須:** `git add .cursor/skills/git-workflow/SKILL.md` を実行し、git 管理下に置く必要がある

---

## 2. 既存ドキュメントとの整合性チェック

### MEMORY.md との整合性

| MEMORY.md の記述 | SKILL.md の内容 | 整合性 |
|---|---|---|
| `作業開始前に必ず .cursor/skills/git-workflow/SKILL.md を参照する` | セクション7で参照タイミングを明記 | OK - 一致 |
| `main 直接push禁止` | セクション6で明確に禁止 | OK - 一致 |
| `dev から feature/*/fix/* ブランチで作業` | セクション1-2で詳細定義 | OK - 一致 |
| `dev マージは CEO 承認後のみ` | セクション4-5で明記 | OK - 一致 |
| `Conventional Commits 形式` | セクション3で fix/feat/refactor/docs/chore を定義 | OK - 一致 |

**結論:** MEMORY.md と SKILL.md の間に矛盾なし。MEMORY.md は SKILL.md の要約として正確。

### CLAUDE.md との整合性

- 現在の CLAUDE.md (worktree) はプロジェクト概要のみ（自動生成の3行）
- git-workflow に関する記述なし
- **対応:** CLAUDE.md に SKILL.md 参照の指示を追記する必要あり（Development/Design 部門の成果物で対応予定）

---

## 3. 周知実効性の検証チェックリスト

CLAUDE.md 追記完了後に実施すべき検証ステップ:

- [ ] **V-01: ファイル存在確認** - SKILL.md が git 管理下にあり、worktree・clone で取得可能であること
- [ ] **V-02: パス解決確認** - CLAUDE.md に記載されたパスが実際のファイル位置と一致すること
- [ ] **V-03: 内容読み込み確認** - エージェントがテストタスク開始時に SKILL.md を参照する動作を行うこと
- [ ] **V-04: ルール適用確認** - テストタスクにおいて、SKILL.md のルール（dev からブランチを切る、Conventional Commits 形式等）が遵守されること
- [ ] **V-05: MEMORY.md 冗長化確認** - MEMORY.md にも同等の参照指示が記載されていること（コンテキスト圧縮対策）
- [ ] **V-06: CI/CD 整合性確認** - ブランチ保護ルール等が SKILL.md の規定と矛盾しないこと

---

## 4. 推奨アクション（優先度順）

| 優先度 | アクション | 担当部門 |
|---|---|---|
| **CRITICAL** | `git add .cursor/skills/git-workflow/SKILL.md` で git 管理下に追加 | Development |
| HIGH | CLAUDE.md に `## Git Workflow` セクションを追記（作業開始前の参照指示を含む） | Development / Design |
| HIGH | MEMORY.md の既存 Git Workflow セクションが最新であることを確認 | Operations |
| MEDIUM | 追記完了後に V-01 ~ V-06 の検証を実施 | QA/QC |
| LOW | CI/CD パイプライン設定との整合性チェック | DevSecOps |

---

## 5. 検証用テストシナリオ（追記完了後に実施）

**テストシナリオ: 軽微なタスクの実行による動作検証**

1. エージェントに「READMEにtypo修正をして」等の軽微なタスクを依頼
2. エージェントが作業開始時に SKILL.md を参照するかを確認
3. 以下のルールが遵守されるかを検証:
   - `dev` から `fix/*` ブランチを作成しているか
   - コミットメッセージが Conventional Commits 形式か
   - `main` に直接 push していないか
   - CEO 報告のフォーマットに従っているか

**期待結果:** エージェントが CLAUDE.md の指示に従い、作業開始前に SKILL.md を読み込み、そのルールに基づいて git 操作を行う。
