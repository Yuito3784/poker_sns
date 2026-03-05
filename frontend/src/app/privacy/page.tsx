import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー - Poker SNS",
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

        <div className="space-y-6 text-sm leading-relaxed text-[#9a8e7a]">
          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">1. 収集する情報</h2>
            <p>本サービスでは以下の情報を収集します。</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>アカウント情報（名前、ユーザー名、メールアドレス）</li>
              <li>プロフィール情報（自己紹介、アバター画像）</li>
              <li>投稿コンテンツ（テキスト、画像、ポーカーハンド情報）</li>
              <li>利用状況（いいね、フォロー、ブックマーク等のアクティビティ）</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">2. 情報の利用目的</h2>
            <p>収集した情報は以下の目的で利用します。</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[#7a7260]">
              <li>本サービスの提供・運営</li>
              <li>ユーザーサポート</li>
              <li>サービスの改善・新機能開発</li>
              <li>不正利用の防止</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">3. 情報の第三者提供</h2>
            <p>法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">4. パスワードの保護</h2>
            <p>パスワードはbcryptにより暗号化して保存しており、平文での保存は行いません。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">5. Cookie・トークン</h2>
            <p>本サービスではJWTトークンをlocalStorageに保存して認証を行います。トークンは有効期限付きで自動的に更新されます。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">6. データの削除</h2>
            <p>ユーザーは設定ページからアカウントを削除できます。アカウント削除時に、投稿・フォロー関係・通知等の全データが完全に削除されます。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">7. ポリシーの変更</h2>
            <p>本ポリシーは予告なく変更されることがあります。変更後のポリシーは本ページに掲載した時点で効力を生じます。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-[#ddd6c8]">8. お問い合わせ</h2>
            <p>プライバシーに関するお問い合わせは、サービス内のお問い合わせ機能よりご連絡ください。</p>
          </section>
        </div>

        <p className="mt-12 text-xs text-[#4a5245]">最終更新日: 2026年2月16日</p>
      </div>
    </div>
  );
}
