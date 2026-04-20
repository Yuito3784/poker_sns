import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

const API_BASE = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  try {
    const res = await fetch(`${API_BASE}/users/${username}/meta`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return {
        title: `@${username} - PokerTALK`,
        description: "ポーカーハンドを共有・議論できるSNS",
      };
    }

    const user = await res.json();
    const title = `${user.name}(@${user.username}) - PokerTALK`;
    const description = user.bio
      ? user.bio.slice(0, 140) + (user.bio.length > 140 ? "..." : "")
      : `${user.name}のプロフィール - ${user._count?.posts ?? 0}件の投稿 | PokerTALK`;

    return {
      title,
      description,
      alternates: {
        canonical: `${SITE_URL}/profile/${username}`,
      },
      openGraph: {
        title,
        description,
        type: "profile",
        url: `${SITE_URL}/profile/${username}`,
        siteName: "PokerTALK",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return {
      title: `@${username} - PokerTALK`,
      description: "ポーカーハンドを共有・議論できるSNS",
    };
  }
}

async function ProfileJsonLd({ username }: { username: string }) {
  try {
    const res = await fetch(`${API_BASE}/users/${username}/meta`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const user = await res.json();

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: user.name,
      url: `${SITE_URL}/profile/${user.username}`,
      description: user.bio || undefined,
      ...(user.avatarUrl && { image: `${API_BASE}${user.avatarUrl}` }),
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/FollowAction",
          userInteractionCount: user._count?.followers ?? 0,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/WriteAction",
          userInteractionCount: user._count?.posts ?? 0,
        },
      ],
    };

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    );
  } catch {
    return null;
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  return (
    <>
      <ProfileJsonLd username={username} />
      <ProfileClient />
    </>
  );
}
