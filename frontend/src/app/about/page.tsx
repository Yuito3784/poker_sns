import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "PokerTALK について | プレイヤーのEVをデザインするSNS",
  description:
    "PokerTALK は、ただハンドを投稿して終わりではなく、自分のポジションとEVを主体的にデザインしていくプレイヤーのためのSNSです。ポーカーとキャリアの両方で「テーブルを立てる側」に近づくための場所を目指しています。",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    title: "PokerTALK について | プレイヤーのEVをデザインするSNS",
    description:
      "「呼ばれる側」で終わらず、自分でチャンスを作る側へ。ポーカープレイヤーのためのSNS PokerTALK のコンセプト紹介。",
    type: "website",
    url: `${SITE_URL}/about`,
    siteName: "PokerTALK",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "PokerTALK について | プレイヤーのEVをデザインするSNS",
    description:
      "ポジション・情報・コミュニティ。3つの観点から、プレイヤーとしてのEVを自分で組み立てていくためのSNSです。",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0d1009] text-[#ddd6c8]">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-6 pb-24 pt-24 sm:pt-32">
        {/* Hero */}
        <section className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-4 py-1 text-xs font-semibold tracking-widest text-[#c9a84c] uppercase">
            About
            <span className="h-1.5 w-1.5 rounded-full bg-[#c9a84c]" />
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-[#f5efe2] sm:text-5xl">
            ポーカーとキャリアの
            <br className="hidden sm:block" />
            「EV設計」のためのSNS。
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#a79a86] sm:text-base">
            PokerTALK は、「強いハンドを引くかどうか」ではなく、
            どんなポジションでどんな選択を積み重ねるかにフォーカスしたSNSです。
            単なるプレイ記録ではなく、プレイヤーとしての立ち位置そのものをデザインしていくための場所を目指しています。
          </p>
        </section>

        {/* Concept: same skill, different EV */}
        <section className="grid gap-10 rounded-3xl border border-[#1f2a1e] bg-[#131a14] p-8 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:p-10">
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#f5efe2] sm:text-3xl">
              同じ実力でも、EVはポジションで変わる
            </h2>
            <p className="text-sm leading-relaxed text-[#c0b4a0]">
              世の中には、ほとんど同じスキル・同じクオリティなのに、報酬やチャンスの大きさがまったく違うプレイヤーがいます。
              それは、片方が優れていて、もう片方がダメだからとは限りません。
            </p>
            <p className="text-sm leading-relaxed text-[#c0b4a0]">
              違うのは「どのポジションで参加しているか」です。
              単なる一参加者としてイベントに混ざるのか、
              自分で企画を立てるのか、
              あるいはコミュニティのハブとして動いているのか。
              その違いが長期的なEVに大きく効いてきます。
            </p>
            <p className="text-sm leading-relaxed text-[#c0b4a0]">
              PokerTALK は、「実力」だけでなく「ポジション」と「情報」と「つながり」をセットで育てていくためのツールでありたいと考えています。
            </p>
          </div>
          <div className="space-y-3 rounded-2xl border border-[#2a3828] bg-[#0d1009] p-5 text-sm text-[#b0a48f]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">
              このページで話すこと
            </p>
            <ul className="space-y-2 text-xs leading-relaxed">
              <li>・なぜ「ただ打つだけ」だとEVに上限ができやすいのか</li>
              <li>・ポーカーの世界でいう「ポジション」と「テーブルを立てる側」</li>
              <li>・PokerTALK が支えたい3つのテーマ（思考・発信・コミュニティ）</li>
              <li>・このSNSをどう使うとEV設計に効いてくるのか</li>
            </ul>
          </div>
        </section>

        {/* 3 principles */}
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-[#f5efe2] sm:text-3xl">
            PokerTALK が大事にしている3つの視点
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2 rounded-2xl border border-[#1f2a1e] bg-[#131a14] p-6 text-xs leading-relaxed text-[#b0a48f]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#c9a84c]">
                01 POSITION
              </p>
              <p className="text-sm font-semibold text-[#f5efe2]">
                「どこに座るか」を意識する
              </p>
              <p>
                BTN と UTG で同じハンドを持っていても、取りうるラインはまったく変わります。
                キャリアも同じで、「誰かの企画に呼ばれる側」なのか、
                「自分で卓を立てる側」に一部でも足をかけているのかで、長期EVは大きく変わります。
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-[#1f2a1e] bg-[#131a14] p-6 text-xs leading-relaxed text-[#b0a48f]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#c9a84c]">
                02 THINKING
              </p>
              <p className="text-sm font-semibold text-[#f5efe2]">
                「なんとなく」から言語化へ
              </p>
              <p>
                その場の感覚だけでプレイしていると、上振れと下振れにメンタルを削られます。
                ハンドを文章にして残し、他のプレイヤーと議論することで、
                自分の思考プロセスを外から見直せるようになります。
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-[#1f2a1e] bg-[#131a14] p-6 text-xs leading-relaxed text-[#b0a48f]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#c9a84c]">
                03 COMMUNITY
              </p>
              <p className="text-sm font-semibold text-[#f5efe2]">
                一人分の勉強を、人数分に増幅する
              </p>
              <p>
                自分一人で拾える情報には限界があります。
                それぞれのプレイヤーがハンドや気づきを持ち寄り、コメントし合うことで、
                インプットと検証のサイクルをコミュニティ全体で回すことができます。
              </p>
            </div>
          </div>
        </section>

        {/* How PokerTALK maps to this */}
        <section className="space-y-6 rounded-3xl border border-[#1f2a1e] bg-[#080a08] p-8 sm:p-10">
          <h2 className="font-display text-2xl font-semibold text-[#f5efe2] sm:text-3xl">
            この考え方が、機能設計にどう反映されているか
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 text-xs leading-relaxed text-[#b0a48f]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#c9a84c]">
                ハンド投稿とタイムライン
              </p>
              <p className="text-sm font-semibold text-[#f5efe2]">
                思考を「資産」に変えていく設計
              </p>
              <p>
                ポーカーハンド専用の投稿フォーマットは、
                「そのときどう考えていたか」をストックしやすくするためのものです。
                単なる自慢ポストではなく、自分の意思決定ログとして積み上げられるように設計しています。
              </p>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-[#b0a48f]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#c9a84c]">
                フォロー・通知・検索
              </p>
              <p className="text-sm font-semibold text-[#f5efe2]">
                「誰と一緒に強くなるか」を選べる
              </p>
              <p>
                どのプレイヤーの思考プロセスに触れるかは、かなり重要な選択です。
                フォローや通知、検索を通じて、
                自分にとって良い影響をくれる人たちとつながりやすくすることを目指しています。
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 text-xs leading-relaxed text-[#b0a48f]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#c9a84c]">
                Premium / 将来の企画機能
              </p>
              <p className="text-sm font-semibold text-[#f5efe2]">
                「テーブルを立てる側」に近づくための土台
              </p>
              <p>
                広告非表示や文字数拡張などのPremiumは、
                自分の発信や企画をしやすくするための強化パックです。
                将来的には、イベントや勉強会など、
                プレイヤー自身が「場」を作りやすくなる機能も増やしていきたいと考えています。
              </p>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-[#b0a48f]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#c9a84c]">
                アフィリエイト・パートナー
              </p>
              <p className="text-sm font-semibold text-[#f5efe2]">
                ポーカー周辺のエコシステムをつなぐ
              </p>
              <p>
                学習コンテンツやツール、ポーカールームとの連携によって、
                「どこで・何を学び・どこで打つか」という選択肢を広げます。
                プレイヤーとサービス双方のEVが高くなる接続点を作っていきます。
              </p>
            </div>
          </div>
        </section>

        {/* Closing message */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold text-[#f5efe2] sm:text-3xl">
            「もらう」だけでなく、「取りにいく」プレイヤーへ
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[#c0b4a0]">
            どんなフィールドでも、「評価してもらう」「選んでもらう」だけに頼っていると、
            自分のEVの上限を他人に預けることになってしまいます。
          </p>
          <p className="max-w-3xl text-sm leading-relaxed text-[#c0b4a0]">
            ポーカーでもキャリアでも、
            自分の足で立って、自分のゲームの条件を自分で決めにいく。
            その感覚を育てるうえで、
            ハンドを共有し、議論し、発信し続けるためのベースキャンプとして、
            PokerTALK が使われたらうれしいなと思っています。
          </p>
          <div className="pt-4">
            <Link
              href="/lp"
              className="inline-flex items-center gap-2 rounded-xl bg-[#c9a84c] px-6 py-3 text-sm font-semibold text-[#0d1009] shadow-[0_4px_18px_rgba(201,168,76,0.25)] transition-colors hover:bg-[#d4b965]"
            >
              PokerTALK の機能を見る
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 7h8M7 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

