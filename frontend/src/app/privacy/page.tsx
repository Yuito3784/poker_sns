import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー - PokerTALK",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0d1009] text-[#ddd6c8]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[#7a7260] hover:text-[#c9a84c]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          ホームに戻る
        </Link>
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-[#ddd6c8]">プライバシーポリシー</h1>

        <p className="mb-6 text-[#9a8e7a]">PokerTALK（以下「本サービス」）は、ユーザーの個人情報の保護を重要と考え、個人情報の保護に関する法律（個人情報保護法）を遵守し、以下のとおりプライバシーポリシーを定めます。</p>

        <div className="space-y-6 text-sm leading-relaxed text-[#9a8e7a]">
          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">1. 収集する情報</h2>
            <p>本サービスでは以下の情報を収集します。</p>
            <h3 className="mb-1 mt-3 text-sm font-semibold text-[#ddd6c8]">1-1. ユーザーが直接提供する情報</h3>
            <ul className="mt-1 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>アカウント情報（名前、ユーザー名、メールアドレス、パスワード）</li>
              <li>プロフィール情報（自己紹介、アバター画像）</li>
              <li>投稿コンテンツ（テキスト、画像、ポーカーハンド情報）</li>
            </ul>
            <h3 className="mb-1 mt-3 text-sm font-semibold text-[#ddd6c8]">1-2. 自動的に収集される情報</h3>
            <ul className="mt-1 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>利用状況（いいね、フォロー、ブックマーク、リポスト等のアクティビティ）</li>
              <li>アクセスログ（IPアドレス、ブラウザ情報、アクセス日時）</li>
              <li>Google Analyticsによるサイト利用状況の匿名データ</li>
            </ul>
            <h3 className="mb-1 mt-3 text-sm font-semibold text-[#ddd6c8]">1-3. 決済に関する情報</h3>
            <p className="text-[#7a7260]">プレミアム会員の決済処理はStripe, Inc.が提供する決済基盤を利用しています。クレジットカード番号等の決済情報は、Stripeが直接管理しており、運営者のサーバーに保存されることはありません。運営者は、Stripeから提供されるサブスクリプションの状態情報（有効/無効、期間等）のみを保持します。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">2. 情報の利用目的</h2>
            <p>収集した情報は以下の目的で利用します。</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>本サービスの提供・運営・維持</li>
              <li>アカウント認証、ログイン管理</li>
              <li>有料サービスの決済処理・サブスクリプション管理</li>
              <li>ユーザーサポート・お問い合わせ対応</li>
              <li>サービスの改善、新機能の開発・検討</li>
              <li>不正利用の検知・防止、セキュリティの確保</li>
              <li>利用規約に違反する行為への対応</li>
              <li>サービスに関する重要なお知らせの送信</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">3. 第三者への情報提供</h2>
            <p>運営者は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>法令に基づく場合（裁判所、警察等の公的機関からの法的な要請）</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
            </ul>
            <h3 className="mb-1 mt-3 text-sm font-semibold text-[#ddd6c8]">3-1. 業務委託先</h3>
            <p className="text-[#7a7260]">本サービスでは、以下の第三者サービスを利用しており、サービス提供に必要な範囲でこれらの事業者に情報が提供されます。各サービスにおける個人情報の取り扱いについては、各社のプライバシーポリシーをご確認ください。</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>Stripe, Inc. — 決済処理（<a href="https://stripe.com/jp/privacy" className="underline hover:text-[#c9a84c]" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>）</li>
              <li>Google LLC（Google Analytics） — アクセス解析（<a href="https://policies.google.com/privacy" className="underline hover:text-[#c9a84c]" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>）</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">4. 情報の安全管理</h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>パスワードはbcryptにより一方向ハッシュ化して保存しており、平文での保存は行いません。</li>
              <li>通信はSSL/TLSにより暗号化されています。</li>
              <li>認証にはJWT（JSON Web Token）を使用し、アクセストークン（有効期限15分）とリフレッシュトークン（有効期限30日）をブラウザのlocalStorageに保存します。</li>
              <li>不正アクセス防止のためのレート制限、CSRF対策、CSPヘッダー等のセキュリティ対策を実施しています。</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">5. Cookie・トラッキング</h2>
            <p>本サービスではCookieは使用していませんが、Google Analyticsがアクセス解析のためにCookieを使用する場合があります。Google Analyticsの無効化については、<a href="https://tools.google.com/dlpage/gaoptout" className="underline hover:text-[#c9a84c]" target="_blank" rel="noopener noreferrer">Google Analyticsオプトアウトアドオン</a>をご利用ください。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">6. 個人情報の開示・訂正・削除</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[#7a7260]">
              <li>ユーザーは、個人情報保護法に基づき、自己の個人情報の開示、訂正、追加、削除、利用停止を請求することができます。</li>
              <li>プロフィール情報（名前、ユーザー名、自己紹介、アバター）は設定画面からいつでも変更できます。</li>
              <li>アカウントの削除は設定画面から行えます。削除時に、投稿コンテンツ・フォロー関係・通知・いいね・ブックマーク等の全データが完全に削除され、復元はできません。</li>
              <li>上記以外の個人情報に関する請求は、下記お問い合わせ先までメールでご連絡ください。本人確認の上、合理的な期間内に対応いたします。</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">7. 情報の保存期間</h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>アカウント情報・投稿コンテンツ: アカウント削除時まで</li>
              <li>アクセスログ: 取得日から最大90日間</li>
              <li>決済関連の記録: 法令で定められた保存期間（最大7年間）</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">8. 未成年者の個人情報</h2>
            <p>本サービスは18歳以上の方を対象としています。18歳未満の方から故意に個人情報を収集することはありません。18歳未満の方が個人情報を提供していることが判明した場合、速やかに当該情報を削除します。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">9. ポリシーの変更</h2>
            <p>本ポリシーは、法令の改正やサービス内容の変更に伴い改定することがあります。重要な変更を行う場合は、本サービス上で事前に告知します。変更後のポリシーは本ページに掲載した時点で効力を生じます。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">10. お問い合わせ</h2>
            <p>個人情報の取り扱いに関するお問い合わせは、下記メールアドレスまでご連絡ください。</p>
            <p className="mt-1 text-[#7a7260]">メールアドレス: support@pokertalk.jp</p>
          </section>
        </div>

        <p className="mt-12 text-xs text-[#4a5245]">制定日: 2026年2月16日 / 最終更新日: 2026年3月16日</p>
      </div>
    </div>
  );
}
