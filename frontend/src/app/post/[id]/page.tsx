import type { Metadata } from "next";
import PostDetailClient from "./PostDetailClient";

const API_BASE = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/posts/${id}/meta`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return {
        title: "投稿 - Poker SNS",
        description: "ポーカーハンドを共有・議論できるSNS",
      };
    }

    const post = await res.json();
    const description = post.content
      ? post.content.slice(0, 140) + (post.content.length > 140 ? "..." : "")
      : "ポーカーハンドを共有・議論できるSNS";
    const title = `${post.author.name}(@${post.author.username})の投稿 - Poker SNS`;

    return {
      title,
      description,
      alternates: {
        canonical: `${SITE_URL}/post/${id}`,
      },
      openGraph: {
        title,
        description,
        type: "article",
        url: `${SITE_URL}/post/${id}`,
        siteName: "Poker SNS",
        publishedTime: post.createdAt,
        authors: [post.author.name],
        ...(post.imageUrl && {
          images: [{ url: `${API_BASE}${post.imageUrl}`, width: 1200, height: 630, alt: description }],
        }),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(post.imageUrl && { images: [`${API_BASE}${post.imageUrl}`] }),
      },
    };
  } catch {
    return {
      title: "投稿 - Poker SNS",
      description: "ポーカーハンドを共有・議論できるSNS",
    };
  }
}

async function PostJsonLd({ id }: { id: string }) {
  try {
    const res = await fetch(`${API_BASE}/posts/${id}/meta`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const post = await res.json();

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.content?.slice(0, 110) || "Poker SNS 投稿",
      author: {
        "@type": "Person",
        name: post.author.name,
        url: `${SITE_URL}/profile/${post.author.username}`,
      },
      datePublished: post.createdAt,
      url: `${SITE_URL}/post/${id}`,
      publisher: {
        "@type": "Organization",
        name: "Poker SNS",
        url: SITE_URL,
      },
      ...(post.imageUrl && { image: `${API_BASE}${post.imageUrl}` }),
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/LikeAction",
          userInteractionCount: post._count?.likes ?? 0,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/CommentAction",
          userInteractionCount: post._count?.replies ?? 0,
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

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <PostJsonLd id={id} />
      <PostDetailClient />
    </>
  );
}
