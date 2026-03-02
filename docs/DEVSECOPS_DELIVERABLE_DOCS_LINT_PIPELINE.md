# DevSecOps成果物: docs/ Markdownリント & 命名規則パイプライン

## 概要

note記事テンプレートの品質管理とCI/CD統合を目的とした、ドキュメントリントパイプラインの設計・実装。

---

## 1. CI/CDエラー調査結果

### Copilot API `model_not_supported` エラー

| 項目 | 結果 |
|------|------|
| 発生箇所 | Climpireオーケストレーション層（プロジェクトCI/CD外） |
| `.github/workflows/ci-cd.yml`内のAIモデル参照 | **なし** |
| 環境変数にAIモデル指定 | **なし** |
| プロジェクトCI/CDへの影響 | **なし** — 修正不要 |

**結論**: `model_not_supported` エラーはプロジェクトのCI/CDパイプラインではなく、外部オーケストレーション層で発生。プロジェクト側での対応は不要。

---

## 2. 実装内容

### 2.1 Markdownlint設定 (`.markdownlint.yml`)

ルートに `.markdownlint.yml` を新規作成。日本語note記事テンプレートに適した設定:

| ルール | 設定 | 理由 |
|--------|------|------|
| MD013 (行の長さ) | 300文字 | 日本語コンテンツは1文字2バイトで長くなりやすい |
| MD025 (トップレベル見出し複数) | 無効 | テンプレート内にプレースホルダー見出しが複数存在 |
| MD026 (見出し末尾の句読点) | `.,;:` のみ | 日本語の `？` `！` は許容 |
| MD033 (インラインHTML) | 無効 | SVGバッジやカスタム要素を使用 |
| MD024 (重複見出し) | siblings_only | 異なるセクション内の同名見出しは許容 |
| MD036 (強調を見出し代わりに使用) | 無効 | 日本語記事テンプレートで使用 |

### 2.2 CI/CDパイプライン拡張 (`docs-lint` ジョブ)

`.github/workflows/ci-cd.yml` に `docs-lint` ジョブを追加:

```yaml
docs-lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Lint Markdown files in docs/
      uses: DavidAnson/markdownlint-cli2-action@v19
      with:
        globs: "docs/**/*.md"
    - name: Check docs file naming convention
      run: |
        INVALID=$(find docs/ -name '*.md' ... | grep -vE '...' || true)
        if [ -n "$INVALID" ]; then
          echo "::warning::Non-standard file names found"
          echo "$INVALID"
        fi
```

**特徴**:
- `push`/`pull_request` 両方で実行（既存トリガーを継承）
- `backend-test`/`frontend-build` と**並行実行**（依存関係なし）
- 命名規則違反は `::warning` として報告（ブロッキングではない）

### 2.3 ファイル命名規則

| ディレクトリ | パターン | 例 |
|-------------|----------|-----|
| `docs/` (ルート) | `UPPER_SNAKE_CASE.md` | `NOTE_ARTICLE_PIPELINE.md` |
| `docs/note-templates/` | `kebab-case.md` | `article-structure-template.md` |
| `docs/note-thumbnails/` | 任意（SVG等） | `thumbnail-ai-productivity.svg` |
| `docs/design/` | 任意 | デザインチーム管理 |
| `docs/devsecops/` | 任意 | DevSecOpsチーム管理 |

---

## 3. mainマージ前チェックリスト

- [x] `.markdownlint.yml` がルートに配置されている
- [x] `docs-lint` CIジョブが `ci-cd.yml` に追加されている
- [x] 既存の `docs/*.md` がlint設定に適合する（寛容な設定で対応済み）
- [ ] `docs/note-templates/` 配下のMDファイルがkebab-case命名に従っている（他ブランチでの作成時に確認）
- [ ] PRでCIが全ジョブgreen通過すること

---

## 4. 他チームへの連携事項

| 連携先 | 内容 |
|--------|------|
| Dev (兎田) | `docs/note-templates/` 新規ファイルはkebab-case.mdで作成すること |
| Design (宝鐘) | `docs/note-thumbnails/` は命名制約なし |
| QA (雪花) | `NOTE_QA_GATE_CHECKLIST.md` のlint通過を確認済み |
| Ops (星街) | CIジョブ追加によるパイプライン実行時間への影響は軽微（+15秒程度） |
| Planning (桃鈴) | `docs/` ルートのMDファイルはUPPER_SNAKE_CASE.mdを継続 |

---

## 5. 変更ファイル一覧

| ファイル | 変更種別 | 説明 |
|----------|----------|------|
| `.markdownlint.yml` | 新規 | Markdownリント設定 |
| `.github/workflows/ci-cd.yml` | 修正 | `docs-lint` ジョブ追加 |
| `docs/DEVSECOPS_DELIVERABLE_DOCS_LINT_PIPELINE.md` | 新規 | 本成果物ドキュメント |
