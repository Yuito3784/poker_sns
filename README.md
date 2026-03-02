## Poker SNS プロジェクト

このリポジトリは、ポーカープレイヤー向けSNSのMVP実装用です。

- `backend`: NestJS + Prisma + PostgreSQL で構成されるAPIサーバ
- `frontend`: Next.js + TypeScript + Tailwind CSS で構成されるフロントエンド

### 他プロジェクトとの干渉について

- それぞれのディレクトリごとに `package.json` と `node_modules` を持つ、**プロジェクトローカルな依存関係管理**を行います。
- グローバルへの `npm install -g` などは行わず、このフォルダ配下のみで完結させます。
- そのため、他のNext.js / Node.js プロジェクトには干渉しません。

### 今後のセットアップ予定

1. `backend` ディレクトリに NestJS プロジェクトを作成
2. Prisma と PostgreSQL 接続設定、およびデータモデル (`User`, `Post`, `Follow`, `Like`, `Reply`, `Notification`) の定義
3. `frontend` ディレクトリに Next.js プロジェクトを作成
4. 認証・タイムライン・プロフィール・通知画面の実装



