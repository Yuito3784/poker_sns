import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "トレンド - Poker SNS",
  description: "ポーカーコミュニティで話題の投稿をチェック。24時間・7日間のトレンドを表示します。",
  openGraph: {
    title: "トレンド - Poker SNS",
    description: "ポーカーコミュニティで話題の投稿をチェック",
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
