import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUsers(query: string, userId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        avatarUrl: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
      take: 20,
    });

    if (users.length === 0) {
      return users.map((u) => ({ ...u, isFollowing: false }));
    }

    const ids = users.map((u) => u.id);
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: ids },
      },
      select: { followingId: true },
    });
    const followingIds = new Set(follows.map((f) => f.followingId));
    return users.map((u) => ({
      ...u,
      isFollowing: followingIds.has(u.id),
    }));
  }

  /** 指定ユーザーID一覧に対するフォロー状態を一括取得（検索結果のボタン表示用） */
  async getFollowingStatusBatch(userId: string, targetIds: string[]): Promise<Record<string, boolean>> {
    if (targetIds.length === 0) return {};
    const uniqueIds = [...new Set(targetIds)].slice(0, 50);
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: uniqueIds },
      },
      select: { followingId: true },
    });
    const set = new Set(follows.map((f) => f.followingId));
    return Object.fromEntries(uniqueIds.map((id) => [id, set.has(id)]));
  }

  async getTrendingHashtags(limit: number = 10) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trending = await this.prisma.postHashtag.groupBy({
      by: ['hashtagId'],
      where: {
        post: {
          createdAt: { gte: sevenDaysAgo },
        },
      },
      _count: { hashtagId: true },
      orderBy: { _count: { hashtagId: 'desc' } },
      take: limit,
    });

    if (trending.length === 0) return [];

    const hashtags = await this.prisma.hashtag.findMany({
      where: { id: { in: trending.map((t) => t.hashtagId) } },
      select: { id: true, name: true },
    });

    const hashtagMap = new Map(hashtags.map((h) => [h.id, h.name]));

    return trending.map((t) => ({
      name: hashtagMap.get(t.hashtagId) ?? '',
      count: t._count.hashtagId,
    })).filter((t) => t.name);
  }

  async searchPosts(query: string, userId: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        content: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, username: true, avatarUrl: true } },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
        likes: {
          where: { userId },
          select: { userId: true },
        },
      },
      take: 50,
    });

    return posts.map((post) => ({
      ...post,
      isLiked: post.likes.length > 0,
      likes: undefined,
    }));
  }
}


