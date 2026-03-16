/**
 * ポーカー投稿のダミーデータを10件作成するスクリプト
 *
 * 実行方法（backend ディレクトリで）:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-poker-posts.ts
 * または
 *   npm run seed:poker-posts
 *
 * 事前に DB が起動しており、少なくとも1人ユーザーが存在している必要があります。
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DUMMY_HANDS = [
  {
    content: 'BTNでAKs、3bet potでフロップトップツー。このベットサイズどう思う？ #ポーカー #ハンドレビュー',
    tableType: 'CASH' as const,
    blinds: '0.5/1',
    tableSize: '6-max',
    heroStack: '100bb',
    heroPosition: 'BTN' as const,
    heroHand: 'As Ks',
    result: 'Won 45bb',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'MP' as const, actionType: 'RAISE' as const, amount: '2.5bb' },
          { position: 'CO' as const, actionType: 'FOLD' as const },
          { position: 'BTN' as const, actionType: 'RAISE' as const, amount: '8bb' },
          { position: 'SB' as const, actionType: 'FOLD' as const },
          { position: 'BB' as const, actionType: 'FOLD' as const },
          { position: 'MP' as const, actionType: 'CALL' as const, amount: '5.5bb' },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: 'Ah Kd 7c',
        potSize: '18.5bb',
        actions: [
          { position: 'MP' as const, actionType: 'CHECK' as const },
          { position: 'BTN' as const, actionType: 'BET' as const, amount: '12bb' },
          { position: 'MP' as const, actionType: 'CALL' as const, amount: '12bb' },
        ],
      },
      {
        street: 'TURN' as const,
        boardCards: '2s',
        potSize: '42.5bb',
        actions: [
          { position: 'MP' as const, actionType: 'CHECK' as const },
          { position: 'BTN' as const, actionType: 'BET' as const, amount: '28bb' },
          { position: 'MP' as const, actionType: 'FOLD' as const },
        ],
      },
    ],
  },
  {
    content: 'MTTのバブル付近、SBでJJ。BBのショートスタックにAll-inされた。コールすべきだった？ #MTT #ポーカー',
    tableType: 'MTT' as const,
    blinds: '500/1000',
    tableSize: '9-max',
    heroStack: '25bb',
    heroPosition: 'SB' as const,
    heroHand: 'Jh Jd',
    result: 'Lost - Eliminated', // トーナメント敗北でそのテーブルから抜けた状態
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'BTN' as const, actionType: 'FOLD' as const },
          { position: 'SB' as const, actionType: 'RAISE' as const, amount: '2.5bb' },
          { position: 'BB' as const, actionType: 'ALL_IN' as const, amount: '8bb' },
          { position: 'SB' as const, actionType: 'CALL' as const, amount: '5.5bb' },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: 'Qc 9s 3d',
        potSize: '16bb',
        actions: [],
      },
      {
        street: 'TURN' as const,
        boardCards: '2h',
        potSize: '16bb',
        actions: [],
      },
      {
        street: 'RIVER' as const,
        boardCards: 'Kd',
        potSize: '16bb',
        actions: [],
      },
    ],
  },
  {
    content: 'Zoom 50NL、COでQQ。3wayでフロップミドルセット。バリューベットのサイズ感教えて #Zoom #キャッシュ',
    tableType: 'ZOOM' as const,
    blinds: '0.25/0.5',
    tableSize: '6-max',
    heroStack: '120bb',
    heroPosition: 'CO' as const,
    heroHand: 'Qc Qd',
    result: 'Won 85bb',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'UTG' as const, actionType: 'FOLD' as const },
          { position: 'MP' as const, actionType: 'RAISE' as const, amount: '3bb' },
          { position: 'CO' as const, actionType: 'RAISE' as const, amount: '9bb' },
          { position: 'BTN' as const, actionType: 'CALL' as const, amount: '9bb' },
          { position: 'SB' as const, actionType: 'FOLD' as const },
          { position: 'BB' as const, actionType: 'CALL' as const, amount: '8.5bb' },
          { position: 'MP' as const, actionType: 'CALL' as const, amount: '6bb' },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: 'Qh 7s 2c',
        potSize: '36.5bb',
        actions: [
          { position: 'BB' as const, actionType: 'CHECK' as const },
          { position: 'MP' as const, actionType: 'BET' as const, amount: '18bb' },
          { position: 'CO' as const, actionType: 'RAISE' as const, amount: '55bb' },
          { position: 'BTN' as const, actionType: 'FOLD' as const },
          { position: 'BB' as const, actionType: 'FOLD' as const },
          { position: 'MP' as const, actionType: 'CALL' as const, amount: '37bb' },
        ],
      },
      {
        street: 'TURN' as const,
        boardCards: '4d',
        potSize: '146.5bb',
        actions: [
          { position: 'MP' as const, actionType: 'CHECK' as const },
          { position: 'CO' as const, actionType: 'BET' as const, amount: '56bb' },
          { position: 'MP' as const, actionType: 'ALL_IN' as const, amount: '56bb' },
          { position: 'CO' as const, actionType: 'CALL' as const, amount: '0bb' },
        ],
      },
    ],
  },
  {
    content: 'SNG 9人、BTNでA5s。BBとヘッズアップ。このブラフシェイプどう？ #SNG',
    tableType: 'SNG' as const,
    blinds: '50/100',
    tableSize: '9-max',
    heroStack: '35bb',
    heroPosition: 'BTN' as const,
    heroHand: 'As 5s',
    result: 'Won 8bb',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'BTN' as const, actionType: 'RAISE' as const, amount: '2.5bb' },
          { position: 'SB' as const, actionType: 'FOLD' as const },
          { position: 'BB' as const, actionType: 'CALL' as const, amount: '1.5bb' },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: 'Kd 9c 3s',
        potSize: '5.5bb',
        actions: [
          { position: 'BB' as const, actionType: 'CHECK' as const },
          { position: 'BTN' as const, actionType: 'BET' as const, amount: '3bb' },
          { position: 'BB' as const, actionType: 'FOLD' as const },
        ],
      },
    ],
  },
  {
    content: 'キャッシュ100NL、UTGでAA。4bet pot、フロップAハイ。オーバーベットした？ #ポーカー #GTO',
    tableType: 'CASH' as const,
    blinds: '0.5/1',
    tableSize: '6-max',
    heroStack: '150bb',
    heroPosition: 'UTG' as const,
    heroHand: 'Ad Ac',
    result: 'Won 120bb',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'UTG' as const, actionType: 'RAISE' as const, amount: '3bb' },
          { position: 'MP' as const, actionType: 'FOLD' as const },
          { position: 'CO' as const, actionType: 'RAISE' as const, amount: '10bb' },
          { position: 'BTN' as const, actionType: 'FOLD' as const },
          { position: 'SB' as const, actionType: 'FOLD' as const },
          { position: 'BB' as const, actionType: 'FOLD' as const },
          { position: 'UTG' as const, actionType: 'RAISE' as const, amount: '28bb' },
          { position: 'CO' as const, actionType: 'CALL' as const, amount: '18bb' },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: 'Ah 8s 2d',
        potSize: '57bb',
        actions: [
          { position: 'UTG' as const, actionType: 'BET' as const, amount: '35bb' },
          { position: 'CO' as const, actionType: 'CALL' as const, amount: '35bb' },
        ],
      },
      {
        street: 'TURN' as const,
        boardCards: '7c',
        potSize: '127bb',
        actions: [
          { position: 'UTG' as const, actionType: 'BET' as const, amount: '87bb' },
          { position: 'CO' as const, actionType: 'CALL' as const, amount: '87bb' },
        ],
      },
      {
        street: 'RIVER' as const,
        boardCards: '4h',
        potSize: '301bb',
        actions: [
          { position: 'UTG' as const, actionType: 'ALL_IN' as const, amount: '0bb' },
          { position: 'CO' as const, actionType: 'FOLD' as const },
        ],
      },
    ],
  },
  {
    content: 'MTT Day2、BBで72o。BTNのオープンにBB 3betしてブラフ。このスポットどう？ #MTT #ハンド',
    tableType: 'MTT' as const,
    blinds: '2000/4000',
    tableSize: '8-max',
    heroStack: '40bb',
    heroPosition: 'BB' as const,
    heroHand: '7d 2c',
    result: 'Won 12bb',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'BTN' as const, actionType: 'RAISE' as const, amount: '2.2bb' },
          { position: 'SB' as const, actionType: 'FOLD' as const },
          { position: 'BB' as const, actionType: 'RAISE' as const, amount: '7bb' },
          { position: 'BTN' as const, actionType: 'FOLD' as const },
        ],
      },
    ],
  },
  {
    content: 'フロップでストレートドロー、ターンでナッツ。リバーでベットされたら？ #ポーカー #ドロー',
    tableType: 'CASH' as const,
    blinds: '0.25/0.5',
    tableSize: '6-max',
    heroStack: '80bb',
    heroPosition: 'CO' as const,
    heroHand: '9s 8s',
    result: 'Won 42bb',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'UTG' as const, actionType: 'FOLD' as const },
          { position: 'MP' as const, actionType: 'FOLD' as const },
          { position: 'CO' as const, actionType: 'RAISE' as const, amount: '2.5bb' },
          { position: 'BTN' as const, actionType: 'CALL' as const, amount: '2.5bb' },
          { position: 'SB' as const, actionType: 'FOLD' as const },
          { position: 'BB' as const, actionType: 'CALL' as const, amount: '2bb' },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: 'Th 7c 2d',
        potSize: '7.5bb',
        actions: [
          { position: 'BB' as const, actionType: 'CHECK' as const },
          { position: 'CO' as const, actionType: 'BET' as const, amount: '5bb' },
          { position: 'BTN' as const, actionType: 'CALL' as const, amount: '5bb' },
          { position: 'BB' as const, actionType: 'FOLD' as const },
        ],
      },
      {
        street: 'TURN' as const,
        boardCards: '6s',
        potSize: '17.5bb',
        actions: [
          { position: 'CO' as const, actionType: 'BET' as const, amount: '14bb' },
          { position: 'BTN' as const, actionType: 'CALL' as const, amount: '14bb' },
        ],
      },
      {
        street: 'RIVER' as const,
        boardCards: '3h',
        potSize: '45.5bb',
        actions: [
          { position: 'CO' as const, actionType: 'BET' as const, amount: '25bb' },
          { position: 'BTN' as const, actionType: 'CALL' as const, amount: '25bb' },
        ],
      },
    ],
  },
  {
    content: 'バリューベット vs チェックバック。このリバーどう打つ？ #ハンドレビュー',
    tableType: 'CASH' as const,
    blinds: '1/2',
    tableSize: '9-max',
    heroStack: '200bb',
    heroPosition: 'MP' as const,
    heroHand: 'Kh Kd',
    result: 'Won 95bb',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'UTG' as const, actionType: 'FOLD' as const },
          { position: 'MP' as const, actionType: 'RAISE' as const, amount: '3bb' },
          { position: 'MP1' as const, actionType: 'FOLD' as const },
          { position: 'CO' as const, actionType: 'CALL' as const, amount: '3bb' },
          { position: 'BTN' as const, actionType: 'FOLD' as const },
          { position: 'SB' as const, actionType: 'CALL' as const, amount: '2.5bb' },
          { position: 'BB' as const, actionType: 'FOLD' as const },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: 'Kc 9s 4d',
        potSize: '10bb',
        actions: [
          { position: 'SB' as const, actionType: 'CHECK' as const },
          { position: 'MP' as const, actionType: 'BET' as const, amount: '7bb' },
          { position: 'CO' as const, actionType: 'CALL' as const, amount: '7bb' },
          { position: 'SB' as const, actionType: 'FOLD' as const },
        ],
      },
      {
        street: 'TURN' as const,
        boardCards: '2h',
        potSize: '24bb',
        actions: [
          { position: 'MP' as const, actionType: 'BET' as const, amount: '18bb' },
          { position: 'CO' as const, actionType: 'CALL' as const, amount: '18bb' },
        ],
      },
      {
        street: 'RIVER' as const,
        boardCards: 'Jc',
        potSize: '60bb',
        actions: [
          { position: 'MP' as const, actionType: 'BET' as const, amount: '35bb' },
          { position: 'CO' as const, actionType: 'CALL' as const, amount: '35bb' },
        ],
      },
    ],
  },
  {
    content: 'ZOOM 10NL、BBでフロップボトムツー。このチェックレイズアグレッションどう？',
    tableType: 'ZOOM' as const,
    blinds: '0.05/0.1',
    tableSize: '6-max',
    heroStack: '100bb',
    heroPosition: 'BB' as const,
    heroHand: '7h 6h',
    result: 'Won 22bb',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'CO' as const, actionType: 'RAISE' as const, amount: '2.5bb' },
          { position: 'BTN' as const, actionType: 'FOLD' as const },
          { position: 'SB' as const, actionType: 'FOLD' as const },
          { position: 'BB' as const, actionType: 'CALL' as const, amount: '2bb' },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: '7d 6c 2s',
        potSize: '5.5bb',
        actions: [
          { position: 'BB' as const, actionType: 'CHECK' as const },
          { position: 'CO' as const, actionType: 'BET' as const, amount: '3.5bb' },
          { position: 'BB' as const, actionType: 'RAISE' as const, amount: '12bb' },
          { position: 'CO' as const, actionType: 'CALL' as const, amount: '8.5bb' },
        ],
      },
      {
        street: 'TURN' as const,
        boardCards: 'Kh',
        potSize: '29.5bb',
        actions: [
          { position: 'BB' as const, actionType: 'BET' as const, amount: '20bb' },
          { position: 'CO' as const, actionType: 'FOLD' as const },
        ],
      },
    ],
  },
  {
    content: 'SNG ヘッズアップ、SBでKTo。このオールインコール正解？ #SNG #ヘッズアップ',
    tableType: 'SNG' as const,
    blinds: '75/150',
    tableSize: '2-max',
    heroStack: '15bb',
    heroPosition: 'SB' as const,
    heroHand: 'Kd Th',
    result: 'Won - Double up',
    streets: [
      {
        street: 'PREFLOP' as const,
        actions: [
          { position: 'SB' as const, actionType: 'RAISE' as const, amount: '2.5bb' },
          { position: 'BB' as const, actionType: 'ALL_IN' as const, amount: '15bb' },
          { position: 'SB' as const, actionType: 'CALL' as const, amount: '12.5bb' },
        ],
      },
      {
        street: 'FLOP' as const,
        boardCards: 'Kc 8s 3d',
        potSize: '30bb',
        actions: [],
      },
      {
        street: 'TURN' as const,
        boardCards: '2h',
        potSize: '30bb',
        actions: [],
      },
      {
        street: 'RIVER' as const,
        boardCards: '9c',
        potSize: '30bb',
        actions: [],
      },
    ],
  },
];

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true, username: true } });
  if (!user) {
    console.error('ユーザーが1人もいません。先にユーザーを作成してください。');
    process.exit(1);
  }

  console.log(`投稿者: ${user.username} (${user.id})`);
  console.log(`ポーカー投稿を ${DUMMY_HANDS.length} 件作成します...`);

  for (let i = 0; i < DUMMY_HANDS.length; i++) {
    const hand = DUMMY_HANDS[i];
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
                    amount: action.amount ?? null,
                    order: actionIndex,
                  })),
                },
              })),
            },
          },
        },
      },
    });
    console.log(`  ${i + 1}/${DUMMY_HANDS.length}: post ${post.id}`);
  }

  console.log(`完了: ポーカー投稿を ${DUMMY_HANDS.length} 件作成しました。`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
