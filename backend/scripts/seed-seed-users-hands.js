// シードユーザー10人 + 各ユーザーにハンド系テキスト投稿5件ずつ追加するスクリプト

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PASSWORD = 'password123';

const DISPLAY_NAMES = [
  'たろう',
  '花子',
  'ボケ太郎',
  'みく',
  'けんじ',
  'さくら',
  'ポカ太郎',
  'ゆい',
  'そうた',
  'りん',
];

// 各ユーザーに紐付ける「ハンドに関する投稿」テンプレ 5件
const HAND_POSTS = [
  'BTNでAKsの3bet pot。フロップトップツーでどう打つ？',
  'SBでJJ、BBのショートからオールイン。このスポットどう思う？',
  'COでQQ、3wayポットでミドルセット。ターン・リバーのサイズ相談。',
  'BBで72oの3betブラフ。プリフロップの頻度これで良い？',
  'フロップでストレートドローからターンでナッツ。リバーでどこまでバリュー取りにいく？',
];

async function main() {
  for (let i = 1; i <= 10; i++) {
    const username = `seed_user_${i}`;
    const email = `seed${i}@example.com`;
    const name = DISPLAY_NAMES[i - 1] ?? `シード${i}`;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(PASSWORD, 10),
          name,
          username,
          bio: `${name}です。ポーカー好きです。`,
        },
      });
      console.log(`ユーザー作成: ${username} (${email})`);
    } else {
      console.log(`既存ユーザー再利用: ${username} (${email})`);
    }

    for (let j = 0; j < HAND_POSTS.length; j++) {
      const content = `${HAND_POSTS[j]} #ハンドレビュー #seed_${i}_hand_${j + 1}`;
      await prisma.post.create({
        data: {
          authorId: user.id,
          content,
          isPokerHand: false,
        },
      });
      console.log(`  投稿 ${j + 1}/5 作成 for ${username}`);
    }
  }

  console.log('完了: シードユーザー10人にハンド系投稿を5件ずつ追加しました。');
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

