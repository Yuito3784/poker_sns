import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 - PokerTALK",
};

export default function TokushohoPage() {
  const businessName = process.env.NEXT_PUBLIC_TOKUSHOHO_BUSINESS_NAME ?? "PokerTALK";
  const operatorName = process.env.NEXT_PUBLIC_TOKUSHOHO_OPERATOR_NAME ?? "大原 唯人";
  const address =
    process.env.NEXT_PUBLIC_TOKUSHOHO_ADDRESS ??
    "〒107-0062 東京都港区南青山3丁目1番36号青山丸竹ビル6F";
  const phone =
    process.env.NEXT_PUBLIC_TOKUSHOHO_PHONE ??
    "050-1724-9110";
  const contactHours = process.env.NEXT_PUBLIC_TOKUSHOHO_CONTACT_HOURS ?? "平日 10:00〜18:00";
  const supportEmail = process.env.NEXT_PUBLIC_TOKUSHOHO_SUPPORT_EMAIL ?? "support@pokertalk.jp";
  const salesUrl = process.env.NEXT_PUBLIC_TOKUSHOHO_SALES_URL ?? "https://pokertalk.jp/lp";

  return (
    <div className="min-h-screen bg-[#0d1009] text-[#ddd6c8]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#7a7260] hover:text-[#c9a84c]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          ホームに戻る
        </Link>
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-[#ddd6c8]">
          特定商取引法に基づく表記
        </h1>

        <div className="space-y-6 text-sm leading-relaxed text-[#9a8e7a]">
          <table className="w-full border-collapse">
            <tbody>
              <Row label="販売事業者" value={`${operatorName}（屋号：${businessName}）`} />
              <Row label="運営統括責任者" value={operatorName} />
              <Row label="所在地" value={address} />
              <Row label="電話番号" value={phone} />
              <Row label="お問い合わせ受付時間" value={contactHours} />
              <Row label="メールアドレス" value={supportEmail} />
              <Row label="販売URL" value={salesUrl} />
              <Row
                label="販売価格"
                value="プレミアムプラン: 月額980円（税込）。詳細は設定画面のサブスクリプションページをご確認ください。"
              />
              <Row
                label="商品代金以外の必要料金"
                value="なし。ただし、インターネット接続に必要な通信料金はお客様のご負担となります。"
              />
              <Row
                label="支払方法"
                value="クレジットカード決済（Visa / Mastercard / American Express / JCB）。決済処理はStripe, Inc.が提供する決済基盤を利用しています。"
              />
              <Row
                label="支払時期"
                value="初回申し込み時に決済が行われ、以降は毎月同日に自動更新されます。"
              />
              <Row
                label="役務の提供時期"
                value="決済完了後、直ちにプレミアム機能をご利用いただけます。"
              />
              <Row
                label="返品・キャンセルについて"
                value="＜お客様都合の解約＞ デジタルサービスの性質上、課金期間途中の返金はお受けしておりません。サブスクリプションはいつでも解約可能です。解約した場合、現在の課金期間の終了日まで引き続きプレミアム機能をご利用いただけます。次回更新日以降の課金は発生しません。＜当社起因の不具合・誤課金＞ 二重課金等の誤請求が判明した場合は、確認後に返金または調整対応を行います。サービスが提供できない重大な障害が当社の責により継続した場合は、状況に応じて返金または代替対応を行います。いずれの場合も上記メールアドレスまでご連絡ください。"
              />
              <Row
                label="中途解約について"
                value="マイページの設定画面からいつでも解約手続きが可能です。解約手数料はかかりません。"
              />
              <Row
                label="動作環境"
                value="PC・スマートフォンのWebブラウザ（Chrome / Safari / Firefox / Edge の最新版を推奨）。インターネット接続環境が必要です。"
              />
            </tbody>
          </table>

          <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold text-[#ddd6c8]">
              提供サービスについて
            </h2>
            <div
              className="rounded-lg p-4"
              style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
            >
              <h3 className="mb-1 font-semibold text-[#ddd6c8]">
                PokerTALK プレミアム（月額980円・税込）
              </h3>
              <p className="mb-2">
                月額サブスクリプションサービスです。以下の機能が利用可能になります。
              </p>
              <ul className="list-inside list-disc space-y-1 text-[#7a7260]">
                <li>プレミアム限定投稿の閲覧・作成</li>
                <li>投稿文字数上限の拡張（280文字 → 1,000文字）</li>
                <li>広告非表示</li>
                <li>プレミアムバッジの表示</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#ddd6c8]">
              サービスの性質について
            </h2>
            <p>
              当サービスはポーカーに関する情報共有・学習コンテンツおよびオンラインコミュニティを提供するSNSサービスです。
              実際の金銭を賭けるオンラインカジノや賭博行為は一切提供しておらず、現金や換金可能なポイント等の賞金も取り扱っておりません。
              ユーザーは戦略・知識の共有やコミュニティ内の交流を目的としてサービスを利用します。
            </p>
          </section>
        </div>

        <p className="mt-12 text-xs text-[#4a5245]">
          最終更新日: 2026年3月23日
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: "1px solid #1f2a1e" }}>
      <th
        className="whitespace-nowrap px-3 py-3 text-left align-top text-sm font-semibold"
        style={{ color: "#ddd6c8", width: "35%" }}
      >
        {label}
      </th>
      <td className="px-3 py-3 text-sm" style={{ color: "#9a8e7a" }}>
        {value}
      </td>
    </tr>
  );
}
