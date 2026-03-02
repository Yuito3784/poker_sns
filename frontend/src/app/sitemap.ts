import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/lp`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/partners`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const res = await fetch(`${API_BASE}/posts/sitemap-data`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return staticRoutes;

    const data = await res.json();

    const postRoutes: MetadataRoute.Sitemap = (data.trendingPosts ?? []).map(
      (post: { id: string; updatedAt: string }) => ({
        url: `${SITE_URL}/post/${post.id}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: "daily" as const,
        priority: 0.7,
      })
    );

    const userRoutes: MetadataRoute.Sitemap = (data.activeUsers ?? []).map(
      (user: { username: string; updatedAt: string }) => ({
        url: `${SITE_URL}/profile/${user.username}`,
        lastModified: new Date(user.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })
    );

    const hashtagRoutes: MetadataRoute.Sitemap = (data.activeHashtags ?? []).map(
      (ht: { hashtag: string }) => ({
        url: `${SITE_URL}/hashtag/${encodeURIComponent(ht.hashtag)}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.5,
      })
    );

    return [...staticRoutes, ...postRoutes, ...userRoutes, ...hashtagRoutes];
  } catch {
    return staticRoutes;
  }
}
