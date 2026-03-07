---
name: git-workflow
description: Enforces the poker_sns git workflow: main is production-only, dev is the integration branch, all work happens on feature/fix branches, changes are reported to the CEO before merge, and logically separate changes are committed separately.
---

# Git Workflow for poker_sns

**エージェント向け要約:** 作業は必ず `dev` から `feature/<名前>` または `fix/<名前>` を切り、そのブランチ上でコミット・push。`dev` へのマージは CEO 承認後。`main` への直接 push / 直接コミット / force push は禁止。

---

## 1. ブランチの役割

| ブランチ | 役割 | ルール |
|----------|------|--------|
| `main` | 本番デプロイ専用 | 直接コミット・直接 push・force push **禁止**。変更は必ず `dev` からの PR マージのみ。 |
| `dev` | 統合ブランチ（プレビュー・検証用） | PR 経由でのみ取り込む。`dev` 上で直接実装しない。 |
| `feature/*` / `fix/*` | 作業ブランチ | すべての実装・修正はここで行う。 |

- **`feature/*`**: 新機能・UI 変更・リファクタなど（例: `feature/add-stats`, `feature/ui-overhaul`）
- **`fix/*`**: バグ修正・既存挙動の修正（例: `fix/login-error`, `fix/refresh-token-migration`）

---

## 2. 作業開始時（必ず実行）

1. `git checkout dev`
2. `git pull origin dev`
3. `git checkout -b feature/<タスク名>` または `git checkout -b fix/<タスク名>`
4. **以降の編集・コミットはすべてこのブランチ上で行う。**

※ 既に別ブランチにいる場合は、上記 1–3 で `dev` の最新から新しいブランチを切る。

---

## 3. コミットのルール

- **論理的に別の作業はコミットを分ける。**
  - 例: バグ修正とリファクタが混在 → `fix: ...` と `refactor: ...` で別コミット。
- **コミットメッセージ**は「何をしたか・なぜか」が分かるようにする。推奨フォーマット:
  - `fix(スコープ): 内容` … バグ修正
  - `feat(スコープ): 内容` … 新機能
  - `refactor(スコープ): 内容` … リファクタ
  - `docs: 内容` … ドキュメントのみ
  - `chore: 内容` … ビルド・設定など
- 例: `fix(auth): RefreshToken 未存在時に TaskAudit をスキップ`

---

## 4. 作業完了時（CEO 報告まで）

1. **push**
   - `git push -u origin feature/<名前>` または `git push -u origin fix/<名前>`
2. **PR 作成**
   - ベース: `dev`、比較: 作業ブランチ
3. **CEO 向けレポート**（PR 本文または別レポートに以下を明記）
   - **概要**: 何を直したか / 追加したか（1〜2行）
   - **理由**: なぜその対応にしたか（簡潔に）
   - **影響範囲**: フロント / バックエンド / インフラ / DB など
   - **動作確認**: どの画面・どの API をどう試したか

**CEO が OK を出すまで、エージェントは `dev` にマージしない。**

---

## 5. CEO 承認後

- PR を `dev` にマージする（Squash / Merge はプロジェクト方針に従う）。
- 必要に応じて `dev` 上で動作確認。
- **`main` への反映（リリース）** は、別 PR（`dev` → `main`）で CEO が判断して行う。エージェントは `main` に直接 push しない。

---

## 6. 禁止事項（エージェントガード）

以下は **実行しない**。

- `git push origin main` / `git push --force origin main` / `main` への直接 push
- `main` ブランチ上でのコミット
- `dev` 上での直接実装（必ず feature / fix ブランチを切る）
- CEO 承認なしでの `dev` へのマージ（ユーザーが「マージして」と明示した場合は可）
- CI・デプロイ設定を `main` に直接反映する変更

---

## 7. この Skill を参照するタイミング

- **ブランチを切る・コミット・push・PR・マージ** など、git に触れるときはこのルールに従う。
- **CEO / ユーザーから「修正して」「追加して」と指示されたとき**  
  → `dev` の最新から feature / fix ブランチを切り、作業 → push → PR と CEO 報告まで行い、マージは承認後に実行する。
