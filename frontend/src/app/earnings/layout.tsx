import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "収益管理 - Poker SNS",
  description: "サロン・有料コンテンツの収益を確認できます。",
};

export default function EarningsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
