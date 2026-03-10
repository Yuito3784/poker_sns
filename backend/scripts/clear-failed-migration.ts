/**
 * 失敗したマイグレーションの記録を _prisma_migrations から削除する。
 * 実行: npx ts-node scripts/clear-failed-migration.ts
 * .env の DATABASE_URL が対象の DB を指していること。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const migrationName = process.argv[2] || '20260218000000_init';
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
    migrationName,
  );
  console.log(`Deleted ${result} row(s) for migration: ${migrationName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
