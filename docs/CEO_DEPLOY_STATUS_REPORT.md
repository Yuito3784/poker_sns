# CEO Deploy Status Report

**報告者**: 常闇 (Planning) | **日時**: 2026-03-02

## 結論

**フロントエンド単体のVercelデプロイは即時実行可能です。**

ただし、以下の判断がCEOに必要です:

## CEO判断が必要な事項

### 1. Phase 1先行デプロイの承認

フロントエンドのみVercelにデプロイすると:
- LP(/lp)、ログイン画面、登録画面のUIは表示される
- API通信 (ログイン、投稿閲覧等) は動作しない (バックエンド未接続のため)

**質問**: UI表示のみの状態でまずURLを報告してよいですか？

### 2. バックエンドホスティング先

現在のアーキテクチャ (NestJS + PostgreSQL) はVercel単体では動作しません。
別途バックエンドホスティングが必要です。

| サービス | コスト | 即時性 | 推奨度 |
|----------|--------|--------|--------|
| **Railway** | $5/月〜 | 即時 | 推奨 |
| Render | 無料枠有 | 即時 | 可 |
| Fly.io | 無料枠有 | 即時 | 可 |

### 3. Vercelアカウント

デプロイ実行には以下のいずれかが必要:
- Vercel CLIでのログイン認証
- Vercelダッシュボードでのインポート (GitHub連携)

## 開発チームへの即時指示

Development(白銀/兎田) への指示:

1. **NEXT_PUBLIC_API_URL を空文字のままビルドが通ることをローカルで検証**
2. **turbopack.root 設定がVercelビルドで問題ないか確認、ダメなら削除**
3. **CEO承認後、即 `vercel --prod` を実行**

DevSecOps(獅白) への指示:

1. **環境変数3つのみ必要: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_GA_MEASUREMENT_ID**
2. **Phase 1ではAPI_URLは空文字でOK**

## タイムライン

| 時刻 | アクション | 担当 |
|------|-----------|------|
| +0分 | CEO判断待ち | CEO |
| +2分 | ローカルビルド検証 | Development |
| +5分 | Vercelデプロイ実行 | Development/DevSecOps |
| +7分 | URL取得・スモークテスト | QA/QC |
| +10分 | ビジュアルQA | Design |
| +12分 | CEO向けURL報告 | Planning |

## 15分制約への対応

Phase 1 (フロント単体) であれば15分以内にデプロイ完了可能。
バックエンドAPIも含めた完全動作は追加時間が必要 (バックエンドホスティング先選定・設定で+30分〜1時間)。
