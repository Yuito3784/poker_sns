import type { Metadata } from "next";
import LandingClient from "./LandingClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Poker SNS - 日本初のポーカー特化SNS | ハンドレビュー・戦略共有コミュニティ",
  description:
    "ポーカーハンドを構造化して投稿・共有できる日本初の専用SNS。ハンドレビュー、GTO戦略の議論、プレイヤーコミュニティで上達を加速。無料で今すぐ始めよう。",
  keywords: [
    "ポーカー SNS",
    "ポーカー コミュニティ",
    "ハンドレビュー",
    "ポーカー ハンド 共有",
    "GTO 勉強",
    "ポーカー 戦略",
    "テキサスホールデム",
    "ポーカー 上達",
    "ポーカー プレイヤー",
    "オンラインポーカー",
  ],
  alternates: {
    canonical: `${SITE_URL}/lp`,
  },
  openGraph: {
    title: "Poker SNS - 日本初のポーカー特化SNS",
    description:
      "ポーカーハンドを構造化して投稿・共有。ハンドレビュー、GTO戦略の議論、プレイヤーコミュニティで上達を加速。",
    type: "website",
    url: `${SITE_URL}/lp`,
    siteName: "Poker SNS",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poker SNS - 日本初のポーカー特化SNS",
    description:
      "ポーカーハンドを構造化して投稿・共有。ハンドレビュー・戦略議論で上達を加速。",
  },
};

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Poker SNS",
    url: SITE_URL,
    description:
      "ポーカーハンドを構造化して投稿・共有できる日本初の専用SNS。ハンドレビュー、GTO戦略の議論、プレイヤーコミュニティで上達を加速。",
    applicationCategory: "SocialNetworkingApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
      description: "無料プラン",
    },
    inLanguage: "ja",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
