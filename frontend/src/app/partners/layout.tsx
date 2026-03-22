import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "パートナー - Poker SNS",
  description: "おすすめのポーカールーム、ツール、学習サービスをご紹介します。",
  openGraph: {
    title: "パートナー - Poker SNS",
    description: "おすすめのポーカールーム、ツール、学習サービス",
  },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
