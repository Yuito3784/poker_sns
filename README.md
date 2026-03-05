## Poker SNS プロジェクト

このリポジトリは、ポーカープレイヤー向けSNSのMVP実装用です。

- `backend`: NestJS + Prisma + PostgreSQL で構成されるAPIサーバ
- `frontend`: Next.js + TypeScript + Tailwind CSS で構成されるフロントエンド

### 開発・デプロイのルール（CORS / URL）

- **開発時は常に dev の Preview URL だけを使う**（fix/* や feature/* の Vercel プレビューを API 連携に使わない）。
- **CORS_ORIGINS**（Railway）は **dev 用には dev 用フロント URL のみ**、本番用には本番ドメインのみを許可する。
- 環境別の「どの URL をどこで使うか」は **[docs/ENV_CONFIG_SUMMARY.md](docs/ENV_CONFIG_SUMMARY.md)** を参照。

### Git ワークフロー

- 作業は **`dev` から `feature/*` または `fix/*` を切り**、そのブランチでコミット・push。
- **PR は dev 向け**に作り、CEO 承認後に dev にマージ。`main` への直接 push は禁止。
- 詳細は [.cursor/skills/git-workflow/SKILL.md](.cursor/skills/git-workflow/SKILL.md) を参照。

### pre-push フックの有効化（推奨）

ブランチ命名規則（`feature/*` / `fix/*` / `dev` / `main`）を守るため、リポジトリ直下で一度だけ実行してください。

```bash
git config core.hooksPath .githooks
```

※ `.githooks/pre-push` が存在し、実行可能である必要があります。

### 他プロジェクトとの干渉について

- それぞれのディレクトリごとに `package.json` と `node_modules` を持つ、**プロジェクトローカルな依存関係管理**を行います。
- グローバルへの `npm install -g` などは行わず、このフォルダ配下のみで完結させます。
- そのため、他のNext.js / Node.js プロジェクトには干渉しません。

### 今後のセットアップ予定

1. `backend` ディレクトリに NestJS プロジェクトを作成
2. Prisma と PostgreSQL 接続設定、およびデータモデル (`User`, `Post`, `Follow`, `Like`, `Reply`, `Notification`) の定義
3. `frontend` ディレクトリに Next.js プロジェクトを作成
4. 認証・タイムライン・プロフィール・通知画面の実装



 # 何か1行追記
