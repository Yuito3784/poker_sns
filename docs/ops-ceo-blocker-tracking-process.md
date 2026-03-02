# CEO Blocker Tracking - Operations Process

> Owner: Operations (白上)
> Created: 2026-03-02
> Status: Active

---

## 1. Blocker Tracking Architecture

CEOが「自分が判断すべきブロッカー」を一目で確認・追跡できる仕組み。

```
docs/decision-blockers.md (マスターリスト)
        ↓ リンク
GitHub Issue #X (CEOアサイン済み)
        ↓ 通知
CEO GitHub通知 / メール
        ↓ コメントで判断記録
各チームが実行に移行
```

### 1.1 マスターリスト

- **場所**: `docs/decision-blockers.md`
- **内容**: 全ブロッカーの選択肢・推奨案・スペック要件・テスト影響・UI依存項目
- **更新者**: Planning (新ブロッカー追加時), Operations (ステータス更新)

### 1.2 GitHub Issue

- **ラベル**: `blocker`, `ceo-decision`
- **アサイニー**: CEO (Yuito3784)
- **本文**: `docs/decision-blockers.md` へのリンク + サマリー
- **運用**: CEOがIssueコメントで判断を記録 → Opsがマスターリストを更新

### 1.3 Issue Template

`.github/ISSUE_TEMPLATE/ceo-decision-blocker.md` に新規ブロッカー用テンプレートを配置済み。

---

## 2. 初回Issue作成手順

`gh` CLIまたはGitHub Webから以下のIssueを作成:

**Title**: `[BLOCKER] 本番リリース: CEO意思決定 4件 (VPS/ドメイン/SSL/外部サービス)`

**Labels**: `blocker`, `ceo-decision`

**Assignee**: `Yuito3784`

**Body**:

```markdown
## 本番リリースに必要なCEO意思決定

以下4件のブロッカーがCEOの判断を待っています。
全て解消されれば、約2時間で本番公開可能です。

**詳細**: [`docs/decision-blockers.md`](../docs/decision-blockers.md)

### ブロッカーサマリー

| # | 項目 | 緊急度 | 推奨案 | 月額 |
|---|------|--------|--------|------|
| 1 | VPS選定・契約 | 最優先 | ConoHa VPS 2GB | ~1,848 |
| 2 | ドメイン取得 | 最優先 | pokersns.jp | ~125/月 |
| 3 | SSL証明書方針 | 高 | Let's Encrypt (無料) | 0 |
| 4 | 外部サービス開設 | 中 | Stripe/Resend/OAuth | 従量/無料 |

**固定費合計: 約1,973円/月**

### 回答方法

このIssueにコメントで回答してください:

1. **VPS**: どのプランを契約しますか? (ConoHa 2GB推奨)
2. **ドメイン**: どのドメインを取得しますか? (pokersns.jp推奨)
3. **SSL**: Let's Encryptで問題ないですか?
4. **外部サービス**: Resend(SMTP)で問題ないですか?

判断いただき次第、各チームが即座にデプロイ作業に移ります。
```

---

## 3. ブロッカー解消フロー

```
1. CEOがIssueにコメントで判断を記録
2. Opsが通知を受け取り (GitHub notification)
3. docs/decision-blockers.md のチェックボックスを更新
4. 関連チームに判断結果を共有
5. 全ブロッカー解消時にIssueをClose
```

---

## 4. 新規ブロッカー追加手順

1. `docs/decision-blockers.md` に新セクション追加
2. `.github/ISSUE_TEMPLATE/ceo-decision-blocker.md` テンプレートでIssue作成
3. CEO (Yuito3784) をアサイン
4. `blocker` + `ceo-decision` ラベル付与

---

## 5. ステータス管理

| ステータス | 意味 | 表記 |
|-----------|------|------|
| CEO判断待ち | 未回答 | `- [ ]` |
| 判断済み | CEOが回答済み | `- [x]` |
| 実行中 | チームが判断に基づき作業中 | Issue comment |
| 完了 | 作業完了 | Issue Close |
