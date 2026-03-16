import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed affiliate partners
  const existing = await prisma.affiliatePartner.count();
  if (existing === 0) {
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

  // Add 10 more affiliate partners if only initial 5 exist
  if (existing === 0 || existing === 5) {
    await prisma.affiliatePartner.createMany({
      skipDuplicates: true,
      data: [
        {
          name: '888poker',
          slug: '888poker',
          description: '世界的に有名なオンラインポーカールーム。初心者にも優しいUI。',
          category: 'POKER_ROOM',
          bonus: '初回入金100%ボーナス($888)',
          affiliateUrl: 'https://example.com/888poker',
          sortOrder: 2,
          isActive: true,
          isFeatured: false,
        },
        {
          name: 'PartyPoker',
          slug: 'partypoker',
          description: '老舗オンラインポーカーサイト。豊富なプロモーション。',
          category: 'POKER_ROOM',
          bonus: '入金ボーナス最大$600',
          affiliateUrl: 'https://example.com/partypoker',
          sortOrder: 3,
          isActive: true,
          isFeatured: false,
        },
        {
          name: 'Natural8',
          slug: 'natural8',
          description: 'アジア圏で人気のオンラインポーカールーム。GGNetworkと提携。',
          category: 'POKER_ROOM',
          bonus: '初回入金200%ボーナス',
          affiliateUrl: 'https://example.com/natural8',
          sortOrder: 4,
          isActive: true,
          isFeatured: false,
        },
        {
          name: 'ClubGG',
          slug: 'clubgg',
          description: 'GGPoker公式のクラブ型ポーカーアプリ。友達と対戦可能。',
          category: 'POKER_ROOM',
          bonus: '無料ダウンロード',
          affiliateUrl: 'https://example.com/clubgg',
          sortOrder: 5,
          isActive: true,
          isFeatured: false,
        },
        {
          name: "Hold'em Manager 3",
          slug: 'holdem-manager-3',
          description: '高機能ポーカーHUD・統計分析ツール。リアルタイムデータ表示。',
          category: 'TOOL',
          bonus: '30日間無料トライアル',
          affiliateUrl: 'https://example.com/holdem-manager-3',
          sortOrder: 2,
          isActive: true,
          isFeatured: false,
        },
        {
          name: 'Equilab',
          slug: 'equilab',
          description: '無料のポーカーエクイティ計算ツール。ハンドレンジ分析に最適。',
          category: 'TOOL',
          bonus: '無料',
          affiliateUrl: 'https://example.com/equilab',
          sortOrder: 3,
          isActive: true,
          isFeatured: false,
        },
        {
          name: 'ICMIZER',
          slug: 'icmizer',
          description: 'トーナメント特化のICM計算ツール。プッシュ/フォールド分析。',
          category: 'TOOL',
          bonus: '7日間無料トライアル',
          affiliateUrl: 'https://example.com/icmizer',
          sortOrder: 4,
          isActive: true,
          isFeatured: false,
        },
        {
          name: 'Upswing Poker',
          slug: 'upswing-poker',
          description: 'Doug Polk監修のポーカー学習サイト。体系的なコース。',
          category: 'LEARNING',
          bonus: '初月30%OFF',
          affiliateUrl: 'https://example.com/upswing-poker',
          sortOrder: 1,
          isActive: true,
          isFeatured: false,
        },
        {
          name: 'Jonathan Little',
          slug: 'jonathan-little',
          description: 'プロポーカープレイヤーによる無料・有料の学習コンテンツ。',
          category: 'LEARNING',
          bonus: '無料コンテンツあり',
          affiliateUrl: 'https://example.com/jonathan-little',
          sortOrder: 2,
          isActive: true,
          isFeatured: false,
        },
        {
          name: 'Poker Chips Direct',
          slug: 'poker-chips-direct',
          description: '高品質ポーカーチップ・グッズの専門店。カスタムオーダー対応。',
          category: 'GOODS',
          bonus: '初回注文10%OFF',
          affiliateUrl: 'https://example.com/poker-chips-direct',
          sortOrder: 0,
          isActive: true,
          isFeatured: false,
        },
      ],
    });
    console.log('Seeded 10 additional affiliate partners');
  }

  // Seed ads
  const adCount = await prisma.ad.count();
  if (adCount === 0) {
    await prisma.ad.createMany({
      data: [
        {
          title: 'WSOP 2026 メインイベント',
          description: '世界最大のポーカートーナメント。今年のメインイベントに参加しよう。',
          linkUrl: 'https://example.com/wsop2026',
          imageUrl: null,
          sortOrder: 0,
          isActive: true,
          startAt: new Date(),
          endAt: null,
        },
        {
          title: 'GGPoker 新規登録キャンペーン',
          description: '今なら新規登録で$100ボーナス。世界中のプレイヤーと対戦しよう。',
          linkUrl: 'https://example.com/ggpoker-campaign',
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
          startAt: new Date(),
          endAt: null,
        },
        {
          title: 'Upswing Poker コース50%OFF',
          description: 'プロの戦略を学べるコースが期間限定50%OFF。スキルアップのチャンス。',
          linkUrl: 'https://example.com/upswing-sale',
          imageUrl: null,
          sortOrder: 2,
          isActive: true,
          startAt: new Date(),
          endAt: null,
        },
        {
          title: 'PokerTracker 4 年間ライセンス',
          description: '年間ライセンスが特別価格。ハンド分析で勝率を上げよう。',
          linkUrl: 'https://example.com/pt4-annual',
          imageUrl: null,
          sortOrder: 3,
          isActive: true,
          startAt: new Date(),
          endAt: null,
        },
        {
          title: 'オンラインポーカーリーグ 参加者募集中',
          description: '毎週開催のオンラインリーグ。ランキング上位には豪華賞品。',
          linkUrl: 'https://example.com/poker-league',
          imageUrl: null,
          sortOrder: 4,
          isActive: true,
          startAt: new Date(),
          endAt: null,
        },
        {
          title: 'カスタムポーカーチップセット特価',
          description: 'プロ仕様のポーカーチップセットが特別価格。ホームゲームに最適。',
          linkUrl: 'https://example.com/custom-chips',
          imageUrl: null,
          sortOrder: 5,
          isActive: true,
          startAt: new Date(),
          endAt: null,
        },
      ],
    });
    console.log('Seeded 6 ads');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
