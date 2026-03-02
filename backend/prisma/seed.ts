import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed affiliate partners
  const existing = await prisma.affiliatePartner.count();
  if (existing > 0) {
    console.log('Affiliate partners already seeded, skipping...');
    return;
  }

  await prisma.affiliatePartner.createMany({
    data: [
      {
        name: 'GGPoker',
        slug: 'ggpoker',
        description:
          '世界最大級のオンラインポーカールーム。豊富なトーナメントとキャッシュゲームが楽しめます。',
        category: 'POKER_ROOM',
        bonus: '初回入金100%ボーナス（最大$600）',
        affiliateUrl: 'https://example.com/ggpoker',
        sortOrder: 0,
        isActive: true,
        isFeatured: true,
      },
      {
        name: 'PokerStars',
        slug: 'pokerstars',
        description:
          '世界で最もプレイヤー数が多いオンラインポーカーサイト。',
        category: 'POKER_ROOM',
        bonus: '初回入金ボーナス$600',
        affiliateUrl: 'https://example.com/pokerstars',
        sortOrder: 1,
        isActive: true,
        isFeatured: true,
      },
      {
        name: 'GTO Wizard',
        slug: 'gto-wizard',
        description:
          'ブラウザベースのGTOトレーニングツール。ハンドごとの最適戦略を学べます。',
        category: 'TOOL',
        bonus: '7日間無料トライアル',
        affiliateUrl: 'https://example.com/gtowizard',
        sortOrder: 0,
        isActive: true,
        isFeatured: true,
      },
      {
        name: 'Run It Once',
        slug: 'run-it-once',
        description:
          'Phil Galfond監修のポーカー学習プラットフォーム。プロの戦略を動画で学べます。',
        category: 'LEARNING',
        bonus: '初月50%OFF',
        affiliateUrl: 'https://example.com/runitonce',
        sortOrder: 0,
        isActive: true,
        isFeatured: false,
      },
      {
        name: 'PokerTracker 4',
        slug: 'pokertracker4',
        description:
          'ハンド履歴の分析・統計ツール。自分のプレイを数値で振り返れます。',
        category: 'TOOL',
        bonus: '30日間無料トライアル',
        affiliateUrl: 'https://example.com/pokertracker4',
        sortOrder: 1,
        isActive: true,
        isFeatured: false,
      },
    ],
  });

  console.log('Seeded 5 affiliate partners');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
