import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サロン - Poker SNS",
  description: "ポーカーサロンに参加して、限定コンテンツやコミュニティに参加しましょう。",
  openGraph: {
    title: "サロン - Poker SNS",
    description: "ポーカーサロンに参加して、限定コンテンツやコミュニティに参加しましょう",
  },
};

export default function SalonsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
