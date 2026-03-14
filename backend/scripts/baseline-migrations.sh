#!/bin/sh
# DB に既にスキーマがあるが _prisma_migrations に履歴がない場合に、
# 全マイグレーションを「適用済み」として記録し、migrate deploy が通るようにする。
#
# 【推奨】Docker で backend が動く場合、コンテナ内で実行する:
#   docker compose run --rm backend sh -c 'cd /app && for m in 20260124140302_init 20260125070843_add_poker_hand 20260125072258_add_structured_actions 20260216000000_add_ad_model 20260216000001_seed_sample_ad 20260218000000_init 20260304000000_add_missing_after_old_init 20260307100000_add_ai_analysis 20260314000000_add_subscription_plan; do npx prisma@5.22.0 migrate resolve --applied "$m"; done'
# （プロジェクトルートで実行。backend の Dockerfile で WORKDIR /app かつ prisma がコピーされていること）
#
# またはホストから DB に直接つなげる場合: backend ディレクトリで ./scripts/baseline-migrations.sh

set -e
cd "$(dirname "$0")/.."
echo "Using DATABASE_URL from .env or environment..."
for name in 20260124140302_init \
  20260125070843_add_poker_hand \
  20260125072258_add_structured_actions \
  20260216000000_add_ad_model \
  20260216000001_seed_sample_ad \
  20260218000000_init \
  20260304000000_add_missing_after_old_init \
  20260307100000_add_ai_analysis \
  20260314000000_add_subscription_plan; do
  echo "Resolving as applied: $name"
  npx prisma@5.22.0 migrate resolve --applied "$name"
done
echo "Done. You can now restart the backend (e.g. docker compose up -d backend)."
