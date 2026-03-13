/**
 * ユーザー10人と、それぞれ10投稿ずつを追加するシードスクリプト
 *
 * 実行方法（backend ディレクトリで）:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-users-and-posts.ts
 * または
 *   npm run seed:users-posts
 *
 * 事前に DB が起動している必要があります。
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'password123';
const USERS_COUNT = 10;
const POSTS_PER_USER = 10;

const USER_NAMES = [
  'たろう', '花子', 'ポケ太郎', 'みく', 'けんじ',
  'さくら', 'だいき', 'ゆい', 'そうた', 'りん',
];

const SAMPLE_CONTENTS = [
  '今日のセッションはプラスで終われた。また明日も頑張ろう。',
  'バッドビート喰らった…でも tilt せずに切り上げた。',
  'MTTでファイナルテーブル！また次も狙う。',
  '3bet pot のフロップ後のプレイ、まだまだ勉強が足りない。',
  'ポーカー仲間が増えて嬉しい。みんなでハンドレビューしたい。',
  'GTO の勉強を始めた。少しずつ理解が深まってきた。',
  '今日はバンクロール更新。小さな一歩。',
  'ハンドヒストリーを振り返る時間、大事だな。',
  '新しいポーカー本を買った。週末に読む。',
  'オンラインの環境整えた。集中してプレイできる。',
  '負けのセッションから学ぶこと。メモを取る習慣をつけよう。',
  'BB でのディフェンス、もう少し広げていいかも。',
  '仲間とハンドの議論。一人で考えるよりずっとためになる。',
  '来月はライブにも行ってみたい。',
  'ポットオッズの計算、だいぶ速くなってきた。',
  '今日は早めに切り上げ。休息も戦略のうち。',
  'フォロー中の人の投稿、参考になる。',
  'ハンドレビュー機能、便利で助かる。',
  'また明日からセッション頑張る。',
];

function* cycle<T>(arr: T[]): Generator<T> {
  let i = 0;
  while (true) {
    yield arr[i % arr.length];
    i++;
  }
}

async function main() {
  const hash = await bcrypt.hash(SEED_PASSWORD, 12);
  const contentGen = cycle(SAMPLE_CONTENTS);

  for (let u = 0; u < USERS_COUNT; u++) {
    const name = USER_NAMES[u];
    const username = `seed_user_${u + 1}`;
    const email = `seed${u + 1}@example.com`;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.log(`ユーザー ${username} は既に存在するためスキップ`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name,
        username,
        bio: `${name}です。ポーカー好きです。`,
        emailVerified: true,
      },
    });
    console.log(`ユーザー作成: ${username} (${user.id})`);

    for (let p = 0; p < POSTS_PER_USER; p++) {
      const content = contentGen.next().value ?? SAMPLE_CONTENTS[0];
      await prisma.post.create({
        data: {
          authorId: user.id,
          content,
        },
      });
    }
    console.log(`  → 投稿を ${POSTS_PER_USER} 件作成`);
  }

  console.log(`\n完了: ユーザー最大 ${USERS_COUNT} 人、各 ${POSTS_PER_USER} 投稿を追加しました。`);
  console.log(`ログイン例: email: seed1@example.com / password: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
