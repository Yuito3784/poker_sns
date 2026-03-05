# Design Deliverable: Git Workflow Cheatsheet

**担当:** Design (百鬼)
**日付:** 2026-03-05
**対象タスク:** `climpire/` ブランチプレフィックス問題の再発防止 — 開発者向けビジュアルガイド

---

## 1. 概要

今回の `climpire/` プレフィックス問題を受け、全エージェント・開発者が git-workflow ルールを一目で把握できるチートシートのフォーマット・レイアウト設計を提供する。

> **注意:** 今回のブランチ命名修正は git 操作のみで完結するため、UI/UX への直接的な影響はない。本成果物は「再発防止のための視覚的ガイド」としての Design 貢献。

---

## 2. Git Workflow チートシート

### ブランチ構成図

```
  main ─────────────────────────────── 本番デプロイ専用
    │                                    直接push禁止
    │
  dev ──────────────────────────────── 統合ブランチ
    │                                    CEO承認後マージのみ
    ├── feature/add-stats
    ├── feature/ui-overhaul            作業ブランチ
    ├── fix/login-error                (ここで開発)
    └── fix/refresh-token
```

### 許可されるブランチ名

```
 OK   feature/*    新機能・UI変更・リファクタ
 OK   fix/*        バグ修正・既存挙動の修正
 OK   hotfix/*     緊急修正（本番障害時）
 OK   dev          統合ブランチ
 OK   main         本番ブランチ（読み取りのみ）

 NG   climpire/*   禁止
 NG   temp/*       禁止
 NG   wip/*        禁止
 NG   その他       pre-pushフックで拒否
```

### 作業フロー（4ステップ）

```
 STEP 1: ブランチ作成
 ─────────────────────────────────────
 $ git checkout dev
 $ git pull origin dev
 $ git checkout -b feature/<タスク名>
                    ~~~~~~~~~~~~~~~~~~
                    or fix/<タスク名>

 STEP 2: コミット（論理単位で分割）
 ─────────────────────────────────────
 $ git add <ファイル>
 $ git commit -m "feat(scope): 内容"
                   ~~~~~~~~~~~~~~~~
   種別: feat / fix / refactor / docs / chore

 STEP 3: Push + PR作成
 ─────────────────────────────────────
 $ git push -u origin feature/<名前>
 → PR作成（ベース: dev）
 → CEO向けレポート記載

 STEP 4: マージ（CEO承認後のみ）
 ─────────────────────────────────────
 CEO OK → dev にマージ
 dev → main は CEO 判断でリリース
```

### コミットメッセージ早見表

```
 種別         プレフィックス    使用例
 ──────────  ──────────────  ──────────────────────────
 新機能       feat(scope):    feat(auth): Google OAuth追加
 バグ修正     fix(scope):     fix(auth): トークン更新失敗を修正
 リファクタ   refactor(scope): refactor(api): エラー処理統一
 ドキュメント docs:            docs: API仕様書を更新
 ビルド/設定  chore:           chore: ESLint設定を追加
```

### 禁止事項チェックリスト

```
 [x] main への直接 push / commit
 [x] main への force push
 [x] dev 上での直接実装
 [x] CEO 承認なしの dev マージ
 [x] climpire/ プレフィックスのブランチ作成
 [x] CI/デプロイ設定の main 直接反映
```

---

## 3. レイアウト設計方針

| 要素 | 設計意図 |
|------|----------|
| ASCII ブランチ図 | ツリー構造で階層関係を直感的に表現 |
| OK/NG リスト | 許可・禁止を色分けイメージで即判断 |
| 4ステップフロー | 作業開始〜完了を順序立てて迷わない構成 |
| コミット早見表 | テーブル形式で種別→プレフィックス→例を対応 |
| 禁止チェックリスト | やってはいけないことを明示的にリスト化 |

### フォント・カラー推奨（将来的な Web/PDF 化時）

- 見出し: プロジェクトのゴールドカラー `#c9a84c`
- OK 表記: グリーン系 `#4ade80`
- NG 表記: レッド系 `#f87171`
- 背景: ダーク `#0d1009`（プロジェクトテーマ準拠）
- コードブロック: `#131a14` 背景 + `#ddd6c8` テキスト

---

## 4. 配置・参照ガイド

- **現在の正規ルール:** `.cursor/skills/git-workflow/SKILL.md`
- **本チートシート:** `docs/DESIGN_DELIVERABLE_GIT_WORKFLOW_CHEATSHEET.md`
- CLAUDE.md の指示に従い、エージェントは作業開始時に SKILL.md を必ず参照する
- 本チートシートは SKILL.md の視覚的サマリーとして補助的に利用

---

## 5. 今回のインシデントから得た教訓（Design 観点）

Climpire エージェントが SKILL.md を参照せず `climpire/` プレフィックスで独自にブランチを生成していた。

**Design として推奨する再発防止策:**
1. **視覚的チートシート**（本ドキュメント）を作成し、ルールの認知負荷を下げる
2. **pre-push フック**でブランチ名を機械的にバリデーション（Development 担当で実装済み）
3. 将来的に Web ベースのガイドページ化も検討可能（Design 側でレイアウト対応可）
