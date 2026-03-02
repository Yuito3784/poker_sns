# Operations Deliverable - CEO Blocker Tracking System

> Owner: Operations (白上)
> Date: 2026-03-02
> Round: Current (ブロッカー確認依頼対応)

---

## Summary

CEOからの依頼「ブロッカーとして登録されている、つまり私が決めなければいけないものはどこから確認できますか」に対し、以下の仕組みを構築しました。

---

## 成果物一覧

| # | 成果物 | パス | 内容 |
|---|--------|------|------|
| 1 | CEO意思決定ブロッカー一覧 | `docs/decision-blockers.md` | 4件のブロッカー詳細 (Planning作成, Ops統合) |
| 2 | ブロッカー追跡プロセス | `docs/ops-ceo-blocker-tracking-process.md` | Issue連携・ステータス管理・解消フロー |
| 3 | GitHub Issue Template | `.github/ISSUE_TEMPLATE/ceo-decision-blocker.md` | 新規ブロッカー用テンプレート |

---

## CEOへの案内

### ブロッカーの確認方法

**方法1: GitHubリポジトリから直接確認**
- URL: `https://github.com/Yuito3784/poker_sns/blob/main/docs/decision-blockers.md`
- ブラウザから全ブロッカーの詳細・選択肢・推奨案を閲覧可能

**方法2: GitHub Issueから確認** (推奨)
- リポジトリのIssueタブ → `blocker` ラベルでフィルタ
- 自分にアサインされたIssueを確認 → コメントで判断を記録
- 追跡性が確保され、判断履歴も残る

**方法3: GitHub通知**
- IssueにアサインされるとGitHub通知が届く
- メール通知設定でリアルタイム受信も可能

### 判断の回答方法

1. `docs/decision-blockers.md` を読んで各ブロッカーの選択肢を確認
2. GitHub Issueにコメントで判断を記録
3. または `docs/decision-blockers.md` を直接編集してチェックボックスを更新

---

## 現在のブロッカー状況 (4件)

| # | ブロッカー | 緊急度 | 推奨案 | 月額 | ステータス |
|---|-----------|--------|--------|------|-----------|
| 1 | VPS選定・契約 | 最優先 | ConoHa VPS 2GB | ~1,848 | CEO判断待ち |
| 2 | ドメイン取得 | 最優先 | pokersns.jp | ~125/月 | CEO判断待ち |
| 3 | SSL証明書方針 | 高 | Let's Encrypt | 0 | CEO判断待ち |
| 4 | 外部サービス開設 | 中 | Stripe/Resend/OAuth | 従量/無料 | CEO判断待ち |

**固定費合計: 約1,973円/月** で本番運用開始可能。

---

## 次のアクション

| 担当 | アクション | タイミング |
|------|-----------|-----------|
| Ops | GitHub Issue作成 (ブロッカー一覧リンク付き, CEOアサイン) | マージ後即時 |
| CEO | Issue確認 → 4件のブロッカーに判断回答 | 任意 |
| Ops | 判断結果を受けてマスターリスト更新 | CEO回答後 |
| 全チーム | 判断確定後、各担当作業を開始 | CEO回答後 |

---

## 補足: `gh` CLI未インストールのため

GitHub Issue作成はマージ後にWebブラウザまたは`gh` CLIインストール後に実施。
Issue作成用の本文テンプレートは `docs/ops-ceo-blocker-tracking-process.md` Section 2 に記載済み。
