/**
 * 本番環境用: ユーザー10人 + ハンド投稿3件ずつ（計30件）を作成
 *
 * 実行方法（backend ディレクトリで）:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-production-users.ts
 *
 * 注意: DATABASE_URL が本番DBを指していることを確認してください。
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── ユーザー10人 ──────────────────────────────────────
const USERS = [
  {
    email: 'takeshi.yamada@example.com',
    name: '山田 健',
    username: 'takeshi_grinder',
    bio: 'NLH Cash専門。200NLレギュラー。GTOとエクスプロイトのバランスを追求中。',
  },
  {
    email: 'mika.tanaka@example.com',
    name: '田中 美佳',
    username: 'mika_mtt',
    bio: 'MTTプレイヤー。WSOP 2025 Day3進出。トーナメント戦略についてよく投稿します。',
  },
  {
    email: 'ryota.suzuki@example.com',
    name: '鈴木 亮太',
    username: 'ryota_zoom',
    bio: 'Zoom専門。マイクロからミドルまで。ボリュームで勝負するタイプ。',
  },
  {
    email: 'yuki.sato@example.com',
    name: '佐藤 悠希',
    username: 'yuki_solver',
    bio: 'ソルバー研究が趣味。GTO Wizardのデータを元にしたハンド分析を共有してます。',
  },
  {
    email: 'kenta.ito@example.com',
    name: '伊藤 健太',
    username: 'kenta_live',
    bio: 'ライブポーカーメイン。都内のアミューズメント中心に活動。リーディング重視。',
  },
  {
    email: 'haruka.watanabe@example.com',
    name: '渡辺 はるか',
    username: 'haruka_plo',
    bio: 'PLOにハマり中。NLHの経験を活かしてPLOのキャッシュで修行中。',
  },
  {
    email: 'daiki.nakamura@example.com',
    name: '中村 大輝',
    username: 'daiki_hh',
    bio: 'ハンドヒストリーの分析が大好き。HM3でデータベース10万ハンド超え。',
  },
  {
    email: 'aoi.kobayashi@example.com',
    name: '小林 葵',
    username: 'aoi_beginner',
    bio: 'ポーカー始めて1年。まだまだ勉強中ですがハンドレビューで成長したい！',
  },
  {
    email: 'shota.yoshida@example.com',
    name: '吉田 翔太',
    username: 'shota_highstakes',
    bio: '500NL〜1kNLメイン。メンタルゲームとバンクロール管理を大事にしてます。',
  },
  {
    email: 'rina.matsumoto@example.com',
    name: '松本 里奈',
    username: 'rina_sng',
    bio: 'SNG/Spin & Go専門。ICMとプッシュフォールドの鬼。短期決戦が好き。',
  },
];

// ── ハンド30件（各ユーザー3件ずつ） ──────────────────

type HandData = {
  content: string;
  tableType: 'CASH' | 'MTT' | 'SNG' | 'ZOOM';
  blinds: string;
  tableSize: string;
  heroStack: string;
  heroPosition: 'UTG' | 'UTG1' | 'UTG2' | 'MP' | 'MP1' | 'MP2' | 'CO' | 'BTN' | 'SB' | 'BB';
  heroHand?: string;
  result?: string;
  createdAt: Date;
  streets: {
    street: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER';
    boardCards?: string;
    potSize?: string;
    actions: {
      position: 'UTG' | 'UTG1' | 'UTG2' | 'MP' | 'MP1' | 'MP2' | 'CO' | 'BTN' | 'SB' | 'BB';
      actionType: 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALL_IN';
      amount?: string;
    }[];
  }[];
};

const HANDS: HandData[][] = [
  // ── User 0: takeshi_grinder (Cash 200NL専門) ──
  [
    {
      content: 'COでTT、BTNに3betされてフラットコール。フロップローボードでドンクベットされた。どう対応する？ #キャッシュ #ハンドレビュー',
      tableType: 'CASH',
      blinds: '1/2',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'CO',
      heroHand: 'Td Tc',
      result: 'Lost 32bb',
      createdAt: new Date('2026-03-10T14:23:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'RAISE', amount: '8bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'FOLD' },
            { position: 'CO', actionType: 'CALL', amount: '5.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: '5s 4h 2c',
          potSize: '17.5bb',
          actions: [
            { position: 'CO', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '8bb' },
            { position: 'CO', actionType: 'CALL', amount: '8bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '9d',
          potSize: '33.5bb',
          actions: [
            { position: 'CO', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '24bb' },
            { position: 'CO', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'BBでA4sをディフェンス。フロップでナッツフラドロ+ガットショット。チェックレイズすべきだったか？ #ポーカー',
      tableType: 'CASH',
      blinds: '1/2',
      tableSize: '6-max',
      heroStack: '110bb',
      heroPosition: 'BB',
      heroHand: 'Ah 4h',
      result: 'Won 68bb',
      createdAt: new Date('2026-03-15T09:45:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '1.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Kh 9h 5c',
          potSize: '5.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'MP', actionType: 'BET', amount: '3.5bb' },
            { position: 'BB', actionType: 'CALL', amount: '3.5bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '3h',
          potSize: '12.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'MP', actionType: 'BET', amount: '9bb' },
            { position: 'BB', actionType: 'RAISE', amount: '28bb' },
            { position: 'MP', actionType: 'CALL', amount: '19bb' },
          ],
        },
        {
          street: 'RIVER',
          boardCards: '2d',
          potSize: '68.5bb',
          actions: [
            { position: 'BB', actionType: 'BET', amount: '55bb' },
            { position: 'MP', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'UTGオープンでAQo。マルチウェイになってフロップAハイ。薄いバリューどこまで取れる？ #GTO #200NL',
      tableType: 'CASH',
      blinds: '1/2',
      tableSize: '6-max',
      heroStack: '130bb',
      heroPosition: 'UTG',
      heroHand: 'As Qc',
      result: 'Won 42bb',
      createdAt: new Date('2026-03-22T20:10:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'RAISE', amount: '3bb' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'CALL', amount: '3bb' },
            { position: 'BTN', actionType: 'CALL', amount: '3bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Ad 8c 3s',
          potSize: '10.5bb',
          actions: [
            { position: 'UTG', actionType: 'BET', amount: '5bb' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'CALL', amount: '5bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '6h',
          potSize: '20.5bb',
          actions: [
            { position: 'UTG', actionType: 'BET', amount: '14bb' },
            { position: 'BTN', actionType: 'CALL', amount: '14bb' },
          ],
        },
        {
          street: 'RIVER',
          boardCards: 'Jd',
          potSize: '48.5bb',
          actions: [
            { position: 'UTG', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'CHECK' },
          ],
        },
      ],
    },
  ],

  // ── User 1: mika_mtt (MTTプレイヤー) ──
  [
    {
      content: 'FT付近、BBでAJo。UTGのミニレイズにどう対応するか。ICM考慮でフラットが正解？ #MTT #ファイナルテーブル',
      tableType: 'MTT',
      blinds: '3000/6000',
      tableSize: '9-max',
      heroStack: '30bb',
      heroPosition: 'BB',
      heroHand: 'Ac Jh',
      result: 'Won 18bb',
      createdAt: new Date('2026-03-08T22:30:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'RAISE', amount: '2bb' },
            { position: 'UTG1', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '1bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Jc 7d 2s',
          potSize: '5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'UTG', actionType: 'BET', amount: '2.5bb' },
            { position: 'BB', actionType: 'RAISE', amount: '7bb' },
            { position: 'UTG', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'ディープスタック序盤、BTNでKQs。SBの4betにコールするかフォールドか。スタックが深い分難しい。 #MTT #ディープ',
      tableType: 'MTT',
      blinds: '100/200',
      tableSize: '9-max',
      heroStack: '150bb',
      heroPosition: 'BTN',
      heroHand: 'Kd Qd',
      result: 'Lost 38bb',
      createdAt: new Date('2026-03-14T18:20:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'UTG1', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'RAISE', amount: '7.5bb' },
            { position: 'SB', actionType: 'RAISE', amount: '22bb' },
            { position: 'BB', actionType: 'FOLD' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'CALL', amount: '14.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Qh 8s 3c',
          potSize: '47bb',
          actions: [
            { position: 'SB', actionType: 'BET', amount: '16bb' },
            { position: 'BTN', actionType: 'CALL', amount: '16bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: 'Ac',
          potSize: '79bb',
          actions: [
            { position: 'SB', actionType: 'ALL_IN', amount: '112bb' },
            { position: 'BTN', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'バブルのSB vs BB。ショートスタックで56sをオールイン。このプッシュレンジ広すぎ？ #MTT #バブル',
      tableType: 'MTT',
      blinds: '1500/3000',
      tableSize: '8-max',
      heroStack: '12bb',
      heroPosition: 'SB',
      heroHand: '5h 6h',
      result: 'Won 4.5bb',
      createdAt: new Date('2026-03-25T15:55:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'ALL_IN', amount: '12bb' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
      ],
    },
  ],

  // ── User 2: ryota_zoom (Zoom専門) ──
  [
    {
      content: 'Zoom 25NL、SBでA9oをスクイーズ。コーラーが2人いる時のサイジング悩む。 #Zoom #スクイーズ',
      tableType: 'ZOOM',
      blinds: '0.1/0.25',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'SB',
      heroHand: 'Ad 9c',
      result: 'Won 15bb',
      createdAt: new Date('2026-03-05T11:30:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'CO', actionType: 'CALL', amount: '2.5bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'RAISE', amount: '12bb' },
            { position: 'BB', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'Zoom 50NL、BTNスチール失敗。BBにフロートされてターンでブラフキャッチ。こういう相手どう対応する？ #Zoom',
      tableType: 'ZOOM',
      blinds: '0.25/0.5',
      tableSize: '6-max',
      heroStack: '95bb',
      heroPosition: 'BTN',
      heroHand: 'Ks Jd',
      result: 'Lost 22bb',
      createdAt: new Date('2026-03-18T08:15:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '1.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Qd 8h 3c',
          potSize: '5.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '3bb' },
            { position: 'BB', actionType: 'CALL', amount: '3bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '4s',
          potSize: '11.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '8bb' },
            { position: 'BB', actionType: 'RAISE', amount: '22bb' },
            { position: 'BTN', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'Zoom 100NL久しぶりに打ってみた。MPで88、フロップオーバーペアだけどウェットボード。慎重にいくべき？ #Zoom #100NL',
      tableType: 'ZOOM',
      blinds: '0.5/1',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'MP',
      heroHand: '8d 8s',
      result: 'Won 28bb',
      createdAt: new Date('2026-03-27T16:40:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'CALL', amount: '2.5bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: '7c 5d 4h',
          potSize: '6bb',
          actions: [
            { position: 'MP', actionType: 'BET', amount: '4bb' },
            { position: 'BTN', actionType: 'CALL', amount: '4bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: 'Jc',
          potSize: '14bb',
          actions: [
            { position: 'MP', actionType: 'BET', amount: '10bb' },
            { position: 'BTN', actionType: 'CALL', amount: '10bb' },
          ],
        },
        {
          street: 'RIVER',
          boardCards: '2s',
          potSize: '34bb',
          actions: [
            { position: 'MP', actionType: 'BET', amount: '22bb' },
            { position: 'BTN', actionType: 'FOLD' },
          ],
        },
      ],
    },
  ],

  // ── User 3: yuki_solver (ソルバー研究) ──
  [
    {
      content: 'ソルバー分析: SRP BBでのチェックレイズ頻度。このボードテクスチャだとBBは結構レイズするのが最適解。 #GTO #ソルバー',
      tableType: 'CASH',
      blinds: '0.5/1',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'BB',
      heroHand: 'Jd Ts',
      result: 'Won 35bb',
      createdAt: new Date('2026-03-07T13:00:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '1.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Js 9c 4d',
          potSize: '5.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'CO', actionType: 'BET', amount: '2.5bb' },
            { position: 'BB', actionType: 'RAISE', amount: '9bb' },
            { position: 'CO', actionType: 'CALL', amount: '6.5bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '2h',
          potSize: '23.5bb',
          actions: [
            { position: 'BB', actionType: 'BET', amount: '16bb' },
            { position: 'CO', actionType: 'CALL', amount: '16bb' },
          ],
        },
        {
          street: 'RIVER',
          boardCards: '7s',
          potSize: '55.5bb',
          actions: [
            { position: 'BB', actionType: 'BET', amount: '35bb' },
            { position: 'CO', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'ノードロック検証: BTN vs BB 3betポットでのフロップCbet頻度。Kハイボードだとほぼ100%ベットが正解。 #GTO #ノードロック',
      tableType: 'CASH',
      blinds: '0.5/1',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'BTN',
      heroHand: 'Ac Kh',
      result: 'Won 22bb',
      createdAt: new Date('2026-03-16T21:30:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'RAISE', amount: '10bb' },
            { position: 'BTN', actionType: 'CALL', amount: '7.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Kc 6d 2h',
          potSize: '20.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '7bb' },
            { position: 'BB', actionType: 'CALL', amount: '7bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '9s',
          potSize: '34.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '24bb' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'ソルバーだとここはチェックバックが推奨。でもライブだと相手のレンジ偏ってるからベットの方がEV高い気がする。 #ソルバー #エクスプロイト',
      tableType: 'CASH',
      blinds: '1/2',
      tableSize: '6-max',
      heroStack: '150bb',
      heroPosition: 'CO',
      heroHand: 'Ah Th',
      result: 'Lost 15bb',
      createdAt: new Date('2026-03-24T10:45:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'CALL', amount: '2bb' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Ts 7h 6d',
          potSize: '6bb',
          actions: [
            { position: 'SB', actionType: 'CHECK' },
            { position: 'CO', actionType: 'BET', amount: '4bb' },
            { position: 'SB', actionType: 'CALL', amount: '4bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '5s',
          potSize: '14bb',
          actions: [
            { position: 'SB', actionType: 'CHECK' },
            { position: 'CO', actionType: 'BET', amount: '10bb' },
            { position: 'SB', actionType: 'RAISE', amount: '30bb' },
            { position: 'CO', actionType: 'FOLD' },
          ],
        },
      ],
    },
  ],

  // ── User 4: kenta_live (ライブポーカー) ──
  [
    {
      content: 'ライブ1/3、UTGでQQをオープン。フロップKハイで相手がドンクベット。ライブだとこれ強いこと多いよね。 #ライブ #リーディング',
      tableType: 'CASH',
      blinds: '1/3',
      tableSize: '9-max',
      heroStack: '100bb',
      heroPosition: 'UTG',
      heroHand: 'Qh Qs',
      result: 'Lost 12bb',
      createdAt: new Date('2026-03-03T19:00:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'RAISE', amount: '4bb' },
            { position: 'UTG1', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'MP1', actionType: 'CALL', amount: '4bb' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Kd 9c 5h',
          potSize: '10bb',
          actions: [
            { position: 'UTG', actionType: 'BET', amount: '6bb' },
            { position: 'MP1', actionType: 'RAISE', amount: '18bb' },
            { position: 'UTG', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'ライブならではの判断。相手が長考してからベットしてきた。普段はブラフが多いこのタイミング。今回は？ #ライブ #テル',
      tableType: 'CASH',
      blinds: '1/3',
      tableSize: '9-max',
      heroStack: '120bb',
      heroPosition: 'BTN',
      heroHand: 'Ad Kd',
      result: 'Won 55bb',
      createdAt: new Date('2026-03-12T21:15:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'UTG1', actionType: 'FOLD' },
            { position: 'MP', actionType: 'RAISE', amount: '4bb' },
            { position: 'MP1', actionType: 'FOLD' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'RAISE', amount: '12bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'FOLD' },
            { position: 'MP', actionType: 'CALL', amount: '8bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Ac 7s 3d',
          potSize: '26bb',
          actions: [
            { position: 'MP', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '14bb' },
            { position: 'MP', actionType: 'CALL', amount: '14bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '2c',
          potSize: '54bb',
          actions: [
            { position: 'MP', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '38bb' },
            { position: 'MP', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'アミューズメントの2/5テーブル。BBで97sをディフェンス、フロップでストレート完成。スロープレイか即ベットか。 #ライブ #アミューズメント',
      tableType: 'CASH',
      blinds: '2/5',
      tableSize: '9-max',
      heroStack: '80bb',
      heroPosition: 'BB',
      heroHand: '9h 7h',
      result: 'Won 92bb',
      createdAt: new Date('2026-03-21T23:30:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'UTG1', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'MP1', actionType: 'RAISE', amount: '3bb' },
            { position: 'CO', actionType: 'CALL', amount: '3bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '2bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Ts 8d 6c',
          potSize: '9.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'MP1', actionType: 'BET', amount: '6bb' },
            { position: 'CO', actionType: 'CALL', amount: '6bb' },
            { position: 'BB', actionType: 'RAISE', amount: '20bb' },
            { position: 'MP1', actionType: 'FOLD' },
            { position: 'CO', actionType: 'CALL', amount: '14bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '4s',
          potSize: '49.5bb',
          actions: [
            { position: 'BB', actionType: 'BET', amount: '35bb' },
            { position: 'CO', actionType: 'CALL', amount: '35bb' },
          ],
        },
        {
          street: 'RIVER',
          boardCards: 'Qc',
          potSize: '119.5bb',
          actions: [
            { position: 'BB', actionType: 'ALL_IN', amount: '22bb' },
            { position: 'CO', actionType: 'CALL', amount: '22bb' },
          ],
        },
      ],
    },
  ],

  // ── User 5: haruka_plo (PLO挑戦中だけどNLHも投稿) ──
  [
    {
      content: 'NLHに戻って息抜き。BTNでAJs、BBのチェックレイズにどう返す？PLOの感覚が残ってて広くコールしすぎかも。 #NLH #PLO転向',
      tableType: 'CASH',
      blinds: '0.5/1',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'BTN',
      heroHand: 'As Jc',
      result: 'Lost 45bb',
      createdAt: new Date('2026-03-06T17:20:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '1.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Js 8c 7d',
          potSize: '5.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '3.5bb' },
            { position: 'BB', actionType: 'RAISE', amount: '12bb' },
            { position: 'BTN', actionType: 'CALL', amount: '8.5bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: 'Th',
          potSize: '29.5bb',
          actions: [
            { position: 'BB', actionType: 'BET', amount: '22bb' },
            { position: 'BTN', actionType: 'CALL', amount: '22bb' },
          ],
        },
        {
          street: 'RIVER',
          boardCards: '3c',
          potSize: '73.5bb',
          actions: [
            { position: 'BB', actionType: 'ALL_IN', amount: '63bb' },
            { position: 'BTN', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'MTTに参加してみた。COでATs、ミドルステージ。このスポットは3betオールインでいい？ #MTT #ミドルステージ',
      tableType: 'MTT',
      blinds: '400/800',
      tableSize: '9-max',
      heroStack: '20bb',
      heroPosition: 'CO',
      heroHand: 'Ac Ts',
      result: 'Won 6.5bb',
      createdAt: new Date('2026-03-17T14:00:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'UTG1', actionType: 'FOLD' },
            { position: 'MP', actionType: 'RAISE', amount: '2.2bb' },
            { position: 'CO', actionType: 'ALL_IN', amount: '20bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'SNG 6人テーブル。BBでK8oをディフェンス。フロップでミドルペア、ターンでツーペア完成！ #SNG',
      tableType: 'SNG',
      blinds: '25/50',
      tableSize: '6-max',
      heroStack: '50bb',
      heroPosition: 'BB',
      heroHand: 'Kc 8d',
      result: 'Won 38bb',
      createdAt: new Date('2026-03-26T12:30:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '1.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Kd 8s 3h',
          potSize: '5.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'CO', actionType: 'BET', amount: '3bb' },
            { position: 'BB', actionType: 'CALL', amount: '3bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '8h',
          potSize: '11.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'CO', actionType: 'BET', amount: '8bb' },
            { position: 'BB', actionType: 'RAISE', amount: '24bb' },
            { position: 'CO', actionType: 'CALL', amount: '16bb' },
          ],
        },
        {
          street: 'RIVER',
          boardCards: '5c',
          potSize: '59.5bb',
          actions: [
            { position: 'BB', actionType: 'ALL_IN', amount: '20.5bb' },
            { position: 'CO', actionType: 'CALL', amount: '20.5bb' },
          ],
        },
      ],
    },
  ],

  // ── User 6: daiki_hh (ハンドヒストリー分析) ──
  [
    {
      content: 'HM3のデータ分析から。BTN vs BBのSRPでBBのドンクベット頻度が高い相手への対応。この手はフロート正解だった。 #HM3 #データ分析',
      tableType: 'CASH',
      blinds: '0.25/0.5',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'BTN',
      heroHand: 'Qh Jh',
      result: 'Won 30bb',
      createdAt: new Date('2026-03-04T10:00:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '1.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Td 8c 4s',
          potSize: '5.5bb',
          actions: [
            { position: 'BB', actionType: 'BET', amount: '4bb' },
            { position: 'BTN', actionType: 'CALL', amount: '4bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '9s',
          potSize: '13.5bb',
          actions: [
            { position: 'BB', actionType: 'BET', amount: '9bb' },
            { position: 'BTN', actionType: 'RAISE', amount: '26bb' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: '10万ハンドのデータでSBからの3bet頻度を分析。7%以上3betしてる相手にはこのアジャスト。 #データ分析 #リーク修正',
      tableType: 'CASH',
      blinds: '0.5/1',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'CO',
      heroHand: 'Ts 9s',
      result: 'Won 48bb',
      createdAt: new Date('2026-03-13T15:30:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'RAISE', amount: '10bb' },
            { position: 'BB', actionType: 'FOLD' },
            { position: 'CO', actionType: 'CALL', amount: '7.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Tc 8h 7d',
          potSize: '21bb',
          actions: [
            { position: 'SB', actionType: 'BET', amount: '10bb' },
            { position: 'CO', actionType: 'CALL', amount: '10bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '6c',
          potSize: '41bb',
          actions: [
            { position: 'SB', actionType: 'BET', amount: '28bb' },
            { position: 'CO', actionType: 'RAISE', amount: '80bb' },
            { position: 'SB', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'リークファインダーで見つけた自分の弱点: BBでのフォールド率が高すぎ。この手をディフェンスしてみた結果。 #リーク #BBディフェンス',
      tableType: 'CASH',
      blinds: '0.25/0.5',
      tableSize: '6-max',
      heroStack: '105bb',
      heroPosition: 'BB',
      heroHand: '6s 5s',
      result: 'Lost 10bb',
      createdAt: new Date('2026-03-20T07:45:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '1.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Ah 9c 4d',
          potSize: '5.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'CO', actionType: 'BET', amount: '2.5bb' },
            { position: 'BB', actionType: 'CALL', amount: '2.5bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '7h',
          potSize: '10.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'CO', actionType: 'BET', amount: '7.5bb' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
      ],
    },
  ],

  // ── User 7: aoi_beginner (初心者) ──
  [
    {
      content: 'まだ始めたばかりで自信ないですが...BTNでAKoを持ってフロップでペアヒット。ベットサイズこれで合ってますか？ #初心者 #ハンドレビュー',
      tableType: 'CASH',
      blinds: '0.05/0.1',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'BTN',
      heroHand: 'Ac Kd',
      result: 'Won 18bb',
      createdAt: new Date('2026-03-09T16:00:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'RAISE', amount: '3bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '2bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Kh 6s 2d',
          potSize: '6.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '4bb' },
            { position: 'BB', actionType: 'CALL', amount: '4bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '3c',
          potSize: '14.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '10bb' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'フラッシュドローを持ってたけどリバーで完成せず。ブラフすべきだった？まだブラフのタイミングがわからない... #初心者 #ドロー',
      tableType: 'CASH',
      blinds: '0.05/0.1',
      tableSize: '6-max',
      heroStack: '90bb',
      heroPosition: 'CO',
      heroHand: '8d 7d',
      result: 'Lost 15bb',
      createdAt: new Date('2026-03-19T11:20:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'CALL', amount: '1.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Ad 5d 2c',
          potSize: '5.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'CO', actionType: 'BET', amount: '3bb' },
            { position: 'BB', actionType: 'CALL', amount: '3bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: 'Jd',
          potSize: '11.5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'CO', actionType: 'BET', amount: '8bb' },
            { position: 'BB', actionType: 'CALL', amount: '8bb' },
          ],
        },
        {
          street: 'RIVER',
          boardCards: 'Ks',
          potSize: '27.5bb',
          actions: [
            { position: 'BB', actionType: 'BET', amount: '18bb' },
            { position: 'CO', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'やっとSNGで優勝できた！最後のハンドはBBでA2oだったけどコールしてよかった。 #初心者 #SNG #優勝',
      tableType: 'SNG',
      blinds: '100/200',
      tableSize: '2-max',
      heroStack: '18bb',
      heroPosition: 'BB',
      heroHand: 'Ah 2c',
      result: 'Won - 1st Place',
      createdAt: new Date('2026-03-28T20:45:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'SB', actionType: 'ALL_IN', amount: '12bb' },
            { position: 'BB', actionType: 'CALL', amount: '11bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Ac 9d 4s',
          potSize: '24bb',
          actions: [],
        },
        {
          street: 'TURN',
          boardCards: '6h',
          potSize: '24bb',
          actions: [],
        },
        {
          street: 'RIVER',
          boardCards: '3c',
          potSize: '24bb',
          actions: [],
        },
      ],
    },
  ],

  // ── User 8: shota_highstakes (ハイステークス) ──
  [
    {
      content: '500NL、MPでJJ。BTNの3betにコール。フロップローボードでスロープレイ成功。 #ハイステ #500NL',
      tableType: 'CASH',
      blinds: '2.5/5',
      tableSize: '6-max',
      heroStack: '100bb',
      heroPosition: 'MP',
      heroHand: 'Jh Jc',
      result: 'Won 78bb',
      createdAt: new Date('2026-03-02T23:00:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'CO', actionType: 'FOLD' },
            { position: 'BTN', actionType: 'RAISE', amount: '9bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'FOLD' },
            { position: 'MP', actionType: 'CALL', amount: '6.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: '5c 4d 2h',
          potSize: '19.5bb',
          actions: [
            { position: 'MP', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '10bb' },
            { position: 'MP', actionType: 'CALL', amount: '10bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '8s',
          potSize: '39.5bb',
          actions: [
            { position: 'MP', actionType: 'CHECK' },
            { position: 'BTN', actionType: 'BET', amount: '28bb' },
            { position: 'MP', actionType: 'RAISE', amount: '91bb' },
            { position: 'BTN', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: '1kNLセッション。SBで77、BTNの3betオールインをBBがコール。サイドポット争い。 #1kNL #マルチウェイ',
      tableType: 'CASH',
      blinds: '5/10',
      tableSize: '6-max',
      heroStack: '60bb',
      heroPosition: 'SB',
      heroHand: '7c 7s',
      result: 'Lost 60bb',
      createdAt: new Date('2026-03-11T02:30:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'RAISE', amount: '10bb' },
            { position: 'BB', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '25bb' },
            { position: 'SB', actionType: 'ALL_IN', amount: '60bb' },
            { position: 'CO', actionType: 'CALL', amount: '35bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Qs Jd 9c',
          potSize: '121bb',
          actions: [],
        },
        {
          street: 'TURN',
          boardCards: 'Kh',
          potSize: '121bb',
          actions: [],
        },
        {
          street: 'RIVER',
          boardCards: '3d',
          potSize: '121bb',
          actions: [],
        },
      ],
    },
    {
      content: 'メンタルリセット後の500NLセッション。COでAQs、冷静にプレイできた。バンクロール管理の大切さを実感。 #メンタル #バンクロール',
      tableType: 'CASH',
      blinds: '2.5/5',
      tableSize: '6-max',
      heroStack: '120bb',
      heroPosition: 'CO',
      heroHand: 'Ah Qh',
      result: 'Won 35bb',
      createdAt: new Date('2026-03-23T19:15:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'MP', actionType: 'FOLD' },
            { position: 'CO', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BTN', actionType: 'CALL', amount: '2.5bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Qd 7c 3s',
          potSize: '6bb',
          actions: [
            { position: 'CO', actionType: 'BET', amount: '3bb' },
            { position: 'BTN', actionType: 'CALL', amount: '3bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: '5h',
          potSize: '12bb',
          actions: [
            { position: 'CO', actionType: 'BET', amount: '9bb' },
            { position: 'BTN', actionType: 'CALL', amount: '9bb' },
          ],
        },
        {
          street: 'RIVER',
          boardCards: 'Td',
          potSize: '30bb',
          actions: [
            { position: 'CO', actionType: 'BET', amount: '20bb' },
            { position: 'BTN', actionType: 'FOLD' },
          ],
        },
      ],
    },
  ],

  // ── User 9: rina_sng (SNG/Spin専門) ──
  [
    {
      content: 'Spin & Go $5。BTNでQ9sオープン、BBオールイン。ICM的にコール？スタック差考慮。 #SpinAndGo #ICM',
      tableType: 'SNG',
      blinds: '15/30',
      tableSize: '3-max',
      heroStack: '40bb',
      heroPosition: 'BTN',
      heroHand: 'Qd 9d',
      result: 'Won 25bb',
      createdAt: new Date('2026-03-01T13:45:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'BTN', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'ALL_IN', amount: '25bb' },
            { position: 'BTN', actionType: 'CALL', amount: '22.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: 'Qc 6h 2d',
          potSize: '50.5bb',
          actions: [],
        },
        {
          street: 'TURN',
          boardCards: '4s',
          potSize: '50.5bb',
          actions: [],
        },
        {
          street: 'RIVER',
          boardCards: 'Jh',
          potSize: '50.5bb',
          actions: [],
        },
      ],
    },
    {
      content: 'SNG 9人、4人残り。COでA3o、プッシュフォールド。チップリーダーのBBに当たるのが嫌だけど打つしかない。 #SNG #プッシュフォールド',
      tableType: 'SNG',
      blinds: '200/400',
      tableSize: '9-max',
      heroStack: '8bb',
      heroPosition: 'CO',
      heroHand: 'As 3c',
      result: 'Won 3bb',
      createdAt: new Date('2026-03-16T09:10:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'UTG', actionType: 'FOLD' },
            { position: 'CO', actionType: 'ALL_IN', amount: '8bb' },
            { position: 'BTN', actionType: 'FOLD' },
            { position: 'SB', actionType: 'FOLD' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
      ],
    },
    {
      content: 'SNG HU最終戦。SBで63oだけどミニレイズしてフロップでヒット。HUはワイドレンジで戦うのが大事。 #SNG #ヘッズアップ',
      tableType: 'SNG',
      blinds: '150/300',
      tableSize: '2-max',
      heroStack: '22bb',
      heroPosition: 'SB',
      heroHand: '6d 3d',
      result: 'Won 12bb',
      createdAt: new Date('2026-03-29T08:00:00Z'),
      streets: [
        {
          street: 'PREFLOP',
          actions: [
            { position: 'SB', actionType: 'RAISE', amount: '2.5bb' },
            { position: 'BB', actionType: 'CALL', amount: '1.5bb' },
          ],
        },
        {
          street: 'FLOP',
          boardCards: '6s 4c 2h',
          potSize: '5bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'SB', actionType: 'BET', amount: '3bb' },
            { position: 'BB', actionType: 'CALL', amount: '3bb' },
          ],
        },
        {
          street: 'TURN',
          boardCards: 'Ks',
          potSize: '11bb',
          actions: [
            { position: 'BB', actionType: 'CHECK' },
            { position: 'SB', actionType: 'BET', amount: '7bb' },
            { position: 'BB', actionType: 'FOLD' },
          ],
        },
      ],
    },
  ],
];

async function main() {
  console.log('=== 本番データ投入: ユーザー10人 + ハンド投稿30件 ===\n');

  const createdUserIds: string[] = [];

  // ── 1. ユーザー作成 ──
  for (const userData of USERS) {
    // 既存チェック
    const existing = await prisma.user.findUnique({ where: { email: userData.email } });
    if (existing) {
      console.log(`  SKIP (existing): ${userData.username}`);
      createdUserIds.push(existing.id);
      continue;
    }

    const passwordHash = await bcrypt.hash('DummyP@ss2026!', 12);
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        name: userData.name,
        username: userData.username,
        bio: userData.bio,
        emailVerified: true,
      },
    });
    console.log(`  CREATED: ${user.username} (${user.id})`);
    createdUserIds.push(user.id);
  }

  console.log(`\nユーザー ${createdUserIds.length} 人準備完了。\n`);

  // ── 2. ハンド投稿作成 ──
  let totalPosts = 0;
  for (let userIdx = 0; userIdx < HANDS.length; userIdx++) {
    const userId = createdUserIds[userIdx];
    const userHands = HANDS[userIdx];
    console.log(`[${USERS[userIdx].username}] ${userHands.length} 件作成中...`);

    for (const hand of userHands) {
      const post = await prisma.post.create({
        data: {
          authorId: userId,
          content: hand.content,
          isPokerHand: true,
          createdAt: hand.createdAt,
          pokerHand: {
            create: {
              tableType: hand.tableType,
              blinds: hand.blinds,
              tableSize: hand.tableSize,
              heroStack: hand.heroStack,
              heroPosition: hand.heroPosition,
              heroHand: hand.heroHand ?? null,
              result: hand.result ?? null,
              streets: {
                create: hand.streets.map((street, index) => ({
                  street: street.street,
                  boardCards: street.boardCards ?? null,
                  potSize: street.potSize ?? null,
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
      totalPosts++;
      console.log(`  -> post ${post.id} (${hand.createdAt.toISOString().slice(0, 10)})`);
    }
  }

  console.log(`\n=== 完了: ${totalPosts} 件のハンド投稿を作成しました ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
