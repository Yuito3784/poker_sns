# QA/QC Report: Claw Empire ブランチ命名規則検証

**担当:** 尾丸 (QA/QC)
**日付:** 2026-03-05
**ステータス:** 不適合 (FAIL)

---

## 1. 検証対象

`.climpire.json` の `branchPrefix` 設定が Claw Empire のブランチ生成に正しく反映されるかの検証。

## 2. 期待動作

| 項目 | 期待値 |
|------|--------|
| `.climpire.json` の `branchPrefix` | `"feature"` |
| 生成されるブランチ名 | `feature/<タスクID>` |
| git-workflow SKILL.md との整合性 | `feature/*` / `fix/*` 規則に準拠 |

## 3. 実測結果

| 項目 | 実測値 | 判定 |
|------|--------|------|
| `.climpire.json` の `branchPrefix` | `"feature"` (設定済み) | OK |
| 実際に生成されたブランチ名 | `climpire/<ハッシュ>` (9本) | **NG** |
| git-workflow SKILL.md との整合性 | 不適合 (`climpire/` は許容されていない) | **NG** |

### 3.1 生成されたブランチ一覧 (全9本)

```
climpire/11866eb2
climpire/1547099d
climpire/4518c563
climpire/4aacf7af
climpire/94e2d892
climpire/9926b341
climpire/ba0be40d
climpire/c47b4d4e
climpire/d06b3edc
```

全ブランチが `climpire/` プレフィックスで生成されており、`.climpire.json` の `branchPrefix: "feature"` 設定は**完全に無視**されている。

## 4. 根本原因

Development チームの調査結果より:
- Claw Empire 本体のソースコードでブランチ名が `climpire/<taskId>` としてハードコードされている
- `.climpire.json` の `branchPrefix` プロパティは Claw Empire のブランチ生成ロジックで参照されていない
- エージェントプラットフォーム側の変更なしにはこの動作を修正できない

## 5. テストケース (修正後の検証用)

修正が適用された際に実行すべき検証シナリオ:

### TC-001: ブランチ名プレフィックス検証
- **前提条件:** `.climpire.json` に `"branchPrefix": "feature"` が設定されている
- **操作:** Claw Empire から新規タスクを作成しブランチを生成
- **期待結果:** ブランチ名が `feature/<タスクID>` 形式で作成される
- **現状:** FAIL (climpire/ プレフィックスで生成)

### TC-002: fix プレフィックス検証
- **前提条件:** `.climpire.json` に `"branchPrefix": "fix"` を設定
- **操作:** Claw Empire から新規バグ修正タスクを作成
- **期待結果:** ブランチ名が `fix/<タスクID>` 形式で作成される
- **現状:** 未検証 (TC-001が FAIL のため)

### TC-003: git-workflow 整合性検証
- **前提条件:** TC-001 が PASS
- **操作:** 生成されたブランチ名が SKILL.md の許容パターンに合致するか確認
- **期待結果:** `feature/*` または `fix/*` パターンに一致
- **現状:** FAIL

### TC-004: 既存 climpire/ ブランチとの競合確認
- **前提条件:** ブランチプレフィックス修正後
- **操作:** 既存 `climpire/*` ブランチが残存する状態で新規ブランチを生成
- **期待結果:** 新旧ブランチが競合せず共存可能
- **現状:** 未検証

## 6. 推奨対応 (QA/QC観点)

### 即時対応可能 (ワークアラウンド)
1. **git-workflow SKILL.md に `climpire/*` プレフィックスを許容パターンとして追加する**
   - リスク: 低。Claw Empire 経由のブランチのみ影響
   - 効果: 即座に整合性エラーを解消

### 中長期対応 (本質的修正)
2. **Claw Empire に Feature Request を提出**
   - `branchPrefix` / `branchNameTemplate` の設定反映を要求
3. **Claw Empire のフォークを作成して独自修正**
   - リスク: メンテナンスコスト増

## 7. 結論

`.climpire.json` の `branchPrefix` 設定は Claw Empire のブランチ生成に**反映されていない**ことを確認。全9本のブランチが `climpire/` プレフィックスで作成されており、git-workflow SKILL.md の `feature/*` / `fix/*` 規則と不整合。

**QA/QC としての推奨:** 即時ワークアラウンドとして SKILL.md に `climpire/*` を許容パターンに追加し、並行して Claw Empire への Feature Request を提出する二段構えの対応を推奨。
