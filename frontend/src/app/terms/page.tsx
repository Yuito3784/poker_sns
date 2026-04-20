import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 - PokerTALK",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0d1009] text-[#ddd6c8]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[#7a7260] hover:text-[#c9a84c]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          ホームに戻る
        </Link>
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-[#ddd6c8]">利用規約</h1>

        <div className="space-y-6 text-sm leading-relaxed text-[#9a8e7a]">
          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第1条（適用）</h2>
            <p>本規約は、PokerTALK（以下「本サービス」といいます）の利用に関する条件を、本サービスを運営する運営者（以下「運営者」といいます）とユーザーとの間で定めるものです。ユーザーは本規約に同意の上、本サービスを利用するものとします。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第2条（定義）</h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>「ユーザー」とは、本規約に同意の上、本サービスのアカウントを登録した個人をいいます。</li>
              <li>「プレミアム会員」とは、有料プラン（PokerTALK プレミアム）に加入したユーザーをいいます。</li>
              <li>「コンテンツ」とは、ユーザーが本サービスに投稿したテキスト、画像、ポーカーハンド情報その他のデータをいいます。</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第3条（アカウント登録）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>ユーザーは正確かつ最新の情報を提供してアカウントを登録するものとします。</li>
              <li>アカウント情報（メールアドレス、パスワード等）の管理はユーザー自身の責任で行うものとし、第三者への譲渡・貸与はできません。</li>
              <li>アカウント情報の不正使用により生じた損害について、運営者は責任を負いません。</li>
              <li>1人のユーザーが複数のアカウントを作成することは禁止します。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第4条（利用資格）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>本サービスは18歳以上の方のみ利用可能です。18歳未満の方は利用できません。</li>
              <li>未成年者（18歳以上20歳未満）が本サービスを利用する場合は、法定代理人の同意を得たものとみなします。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第5条（サービスの内容）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>本サービスは、ポーカーに関する情報共有・学習コンテンツおよびオンラインコミュニティを提供するSNSサービスです。</li>
              <li>本サービスは、実際の金銭を賭けるオンラインカジノや賭博行為を一切提供しておらず、現金や換金可能なポイント等の賞金も取り扱いません。</li>
              <li>本サービス上で共有されるポーカー戦略・ハンド分析等の情報は、教育・娯楽目的であり、ギャンブルへの参加を推奨するものではありません。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第6条（有料サービス）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>プレミアム会員は、月額料金を支払うことで、限定投稿の閲覧・作成、投稿文字数上限の拡張、広告非表示、プレミアムバッジの表示等の追加機能を利用できます。</li>
              <li>料金は、設定画面のサブスクリプションページに表示された金額（税込）とします。</li>
              <li>支払いはクレジットカード決済とし、決済処理はStripe, Inc.が提供する決済基盤を利用します。運営者がクレジットカード情報を直接保持することはありません。</li>
              <li>初回申し込み時に決済が行われ、以降は毎月自動更新されます。</li>
              <li>サブスクリプションはいつでも解約可能です。解約した場合、現在の課金期間の終了日まで引き続きプレミアム機能を利用できます。</li>
              <li>デジタルサービスの性質上、決済完了後の返金は原則としてお受けしておりません。ただし、運営者の責に帰すべき事由によりサービスを提供できなかった場合は、合理的な範囲で返金に応じます。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第7条（禁止事項）</h2>
            <p>ユーザーは以下の行為を行ってはなりません。</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>法令または公序良俗に反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>実際の金銭を賭けるギャンブルの勧誘、賭博行為の斡旋</li>
              <li>他のユーザーへの嫌がらせ、脅迫、誹謗中傷、差別的言動</li>
              <li>不正アクセス、サーバーへの過度な負荷をかける行為</li>
              <li>スパム投稿、botによる自動投稿、商業目的の無断広告</li>
              <li>著作権、商標権その他の知的財産権を侵害する行為</li>
              <li>他のユーザーの個人情報を本人の同意なく収集・公開する行為</li>
              <li>虚偽の情報を流布する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>反社会的勢力に対する利益供与その他の協力行為</li>
              <li>その他、運営者が不適切と合理的に判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第8条（投稿コンテンツ）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>ユーザーが投稿したコンテンツの著作権はユーザーに帰属します。</li>
              <li>ユーザーは、運営者に対し、投稿コンテンツを本サービスの提供・運営・改善・宣伝に必要な範囲で、無償かつ非独占的に利用（複製、翻案、公衆送信等を含む）することを許諾するものとします。</li>
              <li>ユーザーは、投稿コンテンツに関して第三者の権利を侵害していないことを保証するものとします。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第9条（アカウントの停止・削除）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>運営者は、ユーザーが本規約に違反した場合、または違反するおそれがあると合理的に判断した場合、事前の通知なくアカウントの停止または削除を行うことができます。</li>
              <li>ユーザーは、設定画面からいつでも自らアカウントを削除できます。</li>
              <li>アカウント削除後、投稿コンテンツ・フォロー関係・通知等の全データは完全に削除され、復元はできません。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第10条（サービスの変更・中断・終了）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>運営者は、事前の通知をもって、本サービスの内容の変更、一時的な中断、または終了を行うことができます。ただし、緊急の場合は事後の通知とすることがあります。</li>
              <li>本サービスの終了時に有効なプレミアム会員のサブスクリプションについては、残存期間に相当する料金を日割りで返金します。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第11条（免責事項・損害賠償の制限）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>運営者は、本サービスの内容の正確性、完全性、有用性等について保証しません。</li>
              <li>ユーザー間のトラブルについて、運営者は関与する義務を負いません。</li>
              <li>天災、通信障害その他運営者の責に帰さない事由により生じた損害について、運営者は責任を負いません。</li>
              <li>運営者の過失（重過失を除く）による損害賠償責任は、当該ユーザーが過去1か月間に支払った利用料金の額を上限とします。</li>
              <li>運営者の故意または重過失による損害については、前項の制限は適用されません。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第12条（反社会的勢力の排除）</h2>
            <p>ユーザーは、自らが暴力団、暴力団員、暴力団関係企業、総会屋、社会運動標ぼうゴロ、特殊知能暴力集団その他反社会的勢力に該当しないことを表明し、保証するものとします。該当することが判明した場合、運営者は直ちにアカウントを削除できるものとします。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第13条（規約の変更）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>運営者は、必要に応じて本規約を変更できるものとします。</li>
              <li>重要な変更を行う場合は、変更内容を本サービス上で事前に告知します。</li>
              <li>変更後に本サービスを継続利用した場合、変更後の規約に同意したものとみなします。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第14条（準拠法・管轄裁判所）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>本規約の解釈および適用は、日本法に準拠するものとします。</li>
              <li>本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">第15条（お問い合わせ）</h2>
            <p>本規約に関するお問い合わせは、下記メールアドレスまでご連絡ください。</p>
            <p className="mt-1 text-[#7a7260]">メールアドレス: support@pokertalk.jp</p>
          </section>
        </div>

        <p className="mt-12 text-xs text-[#4a5245]">制定日: 2026年2月16日 / 最終更新日: 2026年3月16日</p>
      </div>
    </div>
  );
}
