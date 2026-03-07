# Design: UI統一ブランチ比較レポート

**作成日**: 2026-03-05
**担当**: Design (宝鐘)
**対象ブランチ**: `climpire/55624ccc` vs `climpire/ae22cfbb`

---

## 1. 概要

両ブランチは同じ目的（全画面ダークテーマ統一 - 白背景ページの修正）で、同じ6ファイルを変更しています。

| 項目 | `climpire/55624ccc` | `climpire/ae22cfbb` |
|------|---------------------|---------------------|
| コミット | `903c048` | `917d760` |
| コミット日時 | 2026-03-05 13:58:58 | 2026-03-05 13:53:49 |
| コミットメッセージ | `fix(ui): 全画面ダークテーマ統一 - 白背景ページをThe Felt Tableデザイントークンに準拠` | `fix(ui): 全画面ダークテーマ統一 - 白背景ページを修正` |
| 変更ファイル数 | 6 | 6 |
| merge-base | `35b3d83` (古い) | `86ad6d4` (新しい) |
| devとのコンフリクト | あり (forgot-password) | あり (forgot-password) |

---

## 2. 変更ファイル一覧（共通）

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/app/forgot-password/page.tsx` | ボーダー色修正 |
| `frontend/src/app/post/[id]/PostDetailClient.tsx` | アイコン色・ボーダー色の調整 |
| `frontend/src/app/privacy/page.tsx` | ダークテーマ適用 |
| `frontend/src/app/reset-password/page.tsx` | ボーダー色・Suspense fallback修正 |
| `frontend/src/app/terms/page.tsx` | ダークテーマ適用 |
| `frontend/src/app/verify-email/page.tsx` | ボーダー色・成功/エラーUI改善 |

---

## 3. ブランチ間の差分詳細 (ae22cfbb の追加変更点)

`ae22cfbb` は `55624ccc` の変更を全て含んだ上で、以下の**追加改善**を行っています:

### 3.1 カラートークン改善

| 箇所 | 55624ccc | ae22cfbb | MEMORY.md仕様 | 判定 |
|------|----------|----------|---------------|------|
| カードボーダー | `#2a3828` | `#1f2a1e` | Border: `#1f2a1e` | ae22cfbb が仕様準拠 |
| フォローhover border | `red-900` | `red-800` | (仕様外) | ae22cfbb がより自然 |
| いいねアイコン | `red-500` | `red-400` | (仕様外) | ae22cfbb がダーク背景で好適 |
| 返信アイコン | `teal-600` | `teal-400` | (仕様外) | ae22cfbb がダーク背景で好適 |
| リポストアイコン | `emerald-600` | `emerald-400` | (仕様外) | ae22cfbb がダーク背景で好適 |
| いいねactive/hover | `red-500` | `red-400` | (仕様外) | ae22cfbb 統一 |
| リポストactive/hover | `emerald-500` | `emerald-400` | (仕様外) | ae22cfbb 統一 |
| ブックマークactive/hover | `blue-500` | `blue-400` | (仕様外) | ae22cfbb 統一 |
| 引用hover | `blue-500` | `blue-400` | (仕様外) | ae22cfbb 統一 |
| エラーボーダー | `red-900/50` | `red-900/40` | (仕様外) | 微差 |
| textarea text色 | (未指定) | `#ddd6c8` | Text primary: `#ddd6c8` | ae22cfbb が仕様準拠 |
| placeholder色 | `#7a7260` | `#4a5245` | Text muted: `#4a5245` | ae22cfbb が仕様準拠 |
| 空返信テキスト | `#7a7260` | `#4a5245` | Text muted: `#4a5245` | ae22cfbb が仕様準拠 |
| 削除確認ダイアログborder | `#2a3828` | `#1f2a1e` | Border: `#1f2a1e` | ae22cfbb が仕様準拠 |
| 認証成功アイコン bg | `#1a2f1c` | `emerald-900/40` | (仕様外) | ae22cfbb がTailwind標準 |
| 認証成功アイコン色 | `#c9a84c` (Gold) | `emerald-400` | (仕様外) | ae22cfbb がセマンティック |
| 認証成功テキスト | `#c9a84c` (Gold) | `emerald-400` | (仕様外) | ae22cfbb がセマンティック |
| エラーアイコン bg | `red-900/30` | `red-900/40` | (仕様外) | 微差 |
| Suspense fallback | className方式 | inline style | (仕様外) | ae22cfbb がSSR安全 |

### 3.2 仕様準拠サマリ

- **MEMORY.md「The Felt Table」仕様に直接準拠する修正**: ae22cfbb = **5箇所** / 55624ccc = **0箇所**
  - Border `#1f2a1e` 使用: ae22cfbb のみ正しい（55624cccは `#2a3828` = Border medium）
  - Text primary `#ddd6c8` の明示指定: ae22cfbb のみ
  - Text muted `#4a5245` の適用: ae22cfbb のみ

- **ダーク背景での視認性改善** (500→400): ae22cfbb = **8箇所** / 55624ccc = **0箇所**
  - Tailwind 400系は暗い背景でのコントラスト比が高く、アクセシビリティ向上

- **セマンティックカラー改善**: ae22cfbb = **2箇所** / 55624ccc = **0箇所**
  - 認証成功 = emerald（成功の意味）、Gold はブランドCTAに限定

---

## 4. 判定結果

### 推奨: `climpire/ae22cfbb` をマージすべき

**理由:**

1. **仕様準拠度が高い**: MEMORY.mdのデザイントークン（Border `#1f2a1e`, Text primary `#ddd6c8`, Text muted `#4a5245`）に正しく準拠
2. **より多くの改善を含む**: 55624cccの変更を全てカバーした上で、カラーの400系統一・セマンティックカラー適用など追加改善あり
3. **新しいmerge-base**: devのより新しい状態から分岐しているため、コンフリクトが少ない可能性
4. **アクセシビリティ向上**: 500→400のカラー変更はダーク背景でのコントラスト比改善に寄与

### 55624ccc の扱い

`climpire/55624ccc` は `ae22cfbb` の**サブセット**（部分集合）であるため、ae22cfbbマージ後に**削除可能**です。

### コンフリクト対応

両ブランチともdevとのマージ時に `forgot-password/page.tsx` でコンフリクトが発生します。ae22cfbbのボーダー色 `#1f2a1e` を採用する方向で解決してください。

---

## 5. 未マージだった理由の推定

両ブランチとも「Active Worktree変更中」ステータスのまま残存しています。推定原因:
- climpireタスク管理システムのworktreeが正常にクローズされなかった
- 同一目的のブランチが2本作成された（UUIDが異なるため別タスクとして扱われた）
- マージ承認フローが実行されないままworktreeが放置された

**対処**: ae22cfbbをdevにマージ後、両worktreeをクリーンアップしてください。
