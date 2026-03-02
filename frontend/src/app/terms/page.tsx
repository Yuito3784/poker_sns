import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 - Poker SNS",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          ホームに戻る
        </Link>
        <h1 className="mb-8 text-2xl font-bold tracking-tight">利用規約</h1>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">第1条（適用）</h2>
            <p>本規約は、Poker SNS（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意の上、本サービスを利用するものとします。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">第2条（アカウント登録）</h2>
            <p>ユーザーは正確な情報を提供してアカウントを登録するものとします。アカウント情報の管理はユーザー自身の責任で行ってください。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">第3条（禁止事項）</h2>
            <p>以下の行為を禁止します。</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-neutral-600">
              <li>法令または公序良俗に反する行為</li>
              <li>他のユーザーへの嫌がらせ、誹謗中傷</li>
              <li>不正アクセス、サーバーへの過度な負荷をかける行為</li>
              <li>スパム投稿、bot による自動投稿</li>
              <li>著作権等の知的財産権を侵害する行為</li>
              <li>その他、運営が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">第4条（投稿コンテンツ）</h2>
            <p>ユーザーが投稿したコンテンツの著作権はユーザーに帰属します。ただし、本サービスの運営に必要な範囲で利用を許諾するものとします。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">第5条（サービスの変更・停止）</h2>
            <p>運営はユーザーへの事前通知なく、本サービスの内容を変更、または提供を停止することがあります。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">第6条（免責事項）</h2>
            <p>本サービスの利用により生じた損害について、運営は一切の責任を負いません。ポーカーに関する情報は教育目的であり、ギャンブルを推奨するものではありません。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">第7条（規約の変更）</h2>
            <p>運営は本規約を随時変更できるものとし、変更後の規約は本ページに掲載した時点で効力を生じます。</p>
          </section>
        </div>

        <p className="mt-12 text-xs text-neutral-400">最終更新日: 2026年2月16日</p>
      </div>
    </div>
  );
}
