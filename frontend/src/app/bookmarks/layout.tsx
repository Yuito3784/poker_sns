import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ブックマーク - Poker SNS",
  description: "ブックマークに保存した投稿の一覧です。",
};

export default function BookmarksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
