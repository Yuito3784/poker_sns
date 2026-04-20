import type { Metadata } from "next";
import HashtagClient from "./HashtagClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type Props = {
  params: Promise<{ tag: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const title = `#${decodedTag} - PokerTALK`;
  const description = `#${decodedTag} のポーカー関連投稿一覧 | PokerTALK - ポーカーハンドを共有・議論できるSNS`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/hashtag/${encodeURIComponent(decodedTag)}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/hashtag/${encodeURIComponent(decodedTag)}`,
      siteName: "PokerTALK",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function HashtagPage() {
  return <HashtagClient />;
}
