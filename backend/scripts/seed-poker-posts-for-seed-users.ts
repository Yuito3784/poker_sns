import { PrismaClient } from '@prisma/client';
import { DUMMY_HANDS } from './seed-poker-posts';

const prisma = new PrismaClient();

const SEED_EMAILS = [
  'seed1@example.com',
  'seed2@example.com',
  'seed3@example.com',
  'seed4@example.com',
  'seed5@example.com',
  'seed6@example.com',
  'seed7@example.com',
  'seed8@example.com',
  'seed9@example.com',
  'seed10@example.com',
];

const HANDS_PER_USER = 5;

/** 勝ち・負け（BB Won表示）・Lost - Eliminated・Chop 等を混ぜた5パターン */
const VARIED_HANDS = [
  DUMMY_HANDS[0], // Won 45bb
  DUMMY_HANDS[1], // Lost heads-up → 表示は BB Won
  DUMMY_HANDS[2], // Won 85bb
  {
    content: 'キャッシュ6max、COでAK。リバーでフロップストレート同士でチョップ。このサイズどう？ #ポーカー #チョップ',
    tableType: 'CASH' as const,
    blinds: '0.5/1',
    tableSize: '6-max',
    heroStack: '100bb',
    heroPosition: 'CO' as const,
    heroHand: 'As Kh',
    result: 'Chop',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'UTG' as const, actionType: 'FOLD' as const },
          { position: 'MP' as const, actionType: 'RAISE' as const, amount: '3bb' },
          { position: 'CO' as const, actionType: 'RAISE' as const, amount: '9bb' },
          { position: 'BTN' as const, actionType: 'CALL' as const, amount: '9bb' },
          { position: 'SB' as const, actionType: 'FOLD' as const },
          { position: 'BB' as const, actionType: 'FOLD' as const },
          { position: 'MP' as const, actionType: 'CALL' as const, amount: '6bb' },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: 'Qh Js Th',
        potSize: '28bb',
        actions: [
          { position: 'MP' as const, actionType: 'CHECK' as const },
          { position: 'CO' as const, actionType: 'BET' as const, amount: '14bb' },
          { position: 'BTN' as const, actionType: 'CALL' as const, amount: '14bb' },
          { position: 'MP' as const, actionType: 'FOLD' as const },
        ],
      },
      {
        street: 'TURN' as const,
        boardCards: '2c',
        potSize: '56bb',
        actions: [
          { position: 'CO' as const, actionType: 'BET' as const, amount: '28bb' },
          { position: 'BTN' as const, actionType: 'CALL' as const, amount: '28bb' },
        ],
      },
      {
        street: 'RIVER' as const,
        boardCards: '9d',
        potSize: '112bb',
        actions: [
          { position: 'CO' as const, actionType: 'CHECK' as const },
          { position: 'BTN' as const, actionType: 'CHECK' as const },
        ],
      },
    ],
  },
  DUMMY_HANDS[3], // Won 8bb (SNG)
];

const HANDS_TO_USE = VARIED_HANDS;

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: SEED_EMAILS } },
    select: { id: true, email: true, username: true },
    orderBy: { email: 'asc' },
  });

  if (users.length === 0) {
    console.error('seed1@example.com ～ seed10@example.com のユーザーが存在しません。先に seed:users-posts を実行してください。');
    process.exit(1);
  }

  console.log(`シードユーザー ${users.length} 人に、ハンド投稿を ${HANDS_PER_USER} 件ずつ作成します（合計 ${users.length * HANDS_PER_USER} 件）...`);

  for (const user of users) {
    console.log(`\n${user.email} (${user.username}) ...`);
    for (let i = 0; i < HANDS_TO_USE.length; i++) {
      const hand = HANDS_TO_USE[i];
      const post = await prisma.post.create({
        data: {
          authorId: user.id,
          content: hand.content,
          isPokerHand: true,
          pokerHand: {
            create: {
              tableType: hand.tableType,
              blinds: hand.blinds,
              tableSize: hand.tableSize,
              heroStack: hand.heroStack,
              heroPosition: hand.heroPosition,
              heroHand: hand.heroHand,
              result: hand.result,
              streets: {
                create: hand.streets.map((street, index) => ({
                  street: street.street,
                  boardCards: (street as { boardCards?: string }).boardCards ?? null,
                  potSize: (street as { potSize?: string }).potSize ?? null,
                  order: index,
                  actions: {
                    create: street.actions.map((action, actionIndex) => ({
                      position: action.position,
                      actionType: action.actionType,
                      amount: (action as { amount?: string }).amount ?? null,
                      order: actionIndex,
                    })),
                  },
                })),
              },
            },
          },
        },
      });
      console.log(`  ${i + 1}/${HANDS_PER_USER}: post ${post.id}`);
    }
  }

  console.log(`\n完了: シードユーザー ${users.length} 人にハンド投稿を合計 ${users.length * HANDS_PER_USER} 件作成しました。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
