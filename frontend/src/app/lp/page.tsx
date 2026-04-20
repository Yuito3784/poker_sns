import type { Metadata } from "next";
import LandingClient from "./LandingClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "PokerTALK - テーブルの外でも、ポーカーを語ろう",
  description:
    "セッション帰りに今日のハンドを語る。ハンド共有・レビュー・議論ができるライブポーカープレイヤーのためのSNS。無料で今すぐ始めよう。",
  keywords: [
    "PokerTALK",
    "ポーカートーク",
    "ポーカー SNS",
    "ポーカー コミュニティ",
    "ハンドレビュー",
    "ポーカー ハンド 共有",
    "ライブポーカー",
    "テキサスホールデム",
    "ポーカー プレイヤー",
    "アミューズメントポーカー",
  ],
  alternates: {
    canonical: `${SITE_URL}/lp`,
  },
  openGraph: {
    title: "PokerTALK - テーブルの外でも、ポーカーを語ろう",
    description:
      "セッション帰りに今日のハンドを語る。ハンド共有・レビュー・議論ができるライブポーカープレイヤーのためのSNS。",
    type: "website",
    url: `${SITE_URL}/lp`,
    siteName: "PokerTALK",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "PokerTALK - テーブルの外でも、ポーカーを語ろう",
    description:
      "セッション帰りに今日のハンドを語る。ライブポーカープレイヤーのためのSNS。",
  },
};

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PokerTALK",
    url: SITE_URL,
    description:
      "セッション帰りに今日のハンドを語る。ハンド共有・レビュー・議論ができるライブポーカープレイヤーのためのSNS。",
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
