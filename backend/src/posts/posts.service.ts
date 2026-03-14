import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreatePokerHandDto } from './dto/create-poker-hand.dto';
import { NotificationsService } from '../notifications/notifications.service';

const FREE_CHAR_LIMIT = 280;
const PREMIUM_CHAR_LIMIT = 1000;

const authorSelect = {
  select: { id: true, name: true, username: true, avatarUrl: true, subscriptionStatus: true },
} as const;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getCharLimit(userId: string): Promise<number> {
    const isPremium = await this.isPremiumUser(userId);
    return isPremium ? PREMIUM_CHAR_LIMIT : FREE_CHAR_LIMIT;
  }

  private async isPremiumUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });
    return user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'canceled';
  }

  async create(userId: string, dto: CreatePostDto) {
    const charLimit = await this.getCharLimit(userId);
    if (dto.content.length > charLimit) {
      throw new BadRequestException(`投稿は${charLimit}文字以内で入力してください`);
    }

    if (dto.isPremiumOnly) {
      // Only active subscribers can create premium-only posts (canceled = grace period, no new premium content)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionStatus: true },
      });
      if (user?.subscriptionStatus !== 'active') {
        throw new ForbiddenException('プレミアム限定投稿はアクティブなプレミアム会員のみ作成できます');
      }
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        content: dto.content,
        imageUrl: dto.imageUrl,
        parentPostId: dto.parentPostId,
        isPremiumOnly: dto.isPremiumOnly ?? false,
      },
      include: {
        author: authorSelect,
        pokerHand: {
          include: {
            streets: {
              orderBy: { order: 'asc' },
              include: {
                actions: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });
    if (dto.parentPostId) {
      const parent = await this.prisma.post.findUnique({ where: { id: dto.parentPostId }, select: { authorId: true } });
      if (parent && parent.authorId !== userId) {
        await this.notificationsService.createNotification(parent.authorId, userId, 'REPOST', dto.parentPostId);
      }
    }
    await this.createMentionNotifications(userId, dto.content, post.id);
    await this.extractAndLinkHashtags(post.id, dto.content);
    return post;
  }

  private async createMentionNotifications(authorId: string, content: string, postId: string) {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = [...content.matchAll(mentionRegex)];
    const usernames = [...new Set(matches.map((m) => m[1]))];
    if (usernames.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { id: true },
    });

    for (const user of users) {
      if (user.id !== authorId) {
        await this.notificationsService.createNotification(user.id, authorId, 'MENTION', postId);
      }
    }
  }

  async createPokerHand(userId: string, dto: CreatePokerHandDto) {
    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        content: dto.content || '',
        isPokerHand: true,
        pokerHand: {
          create: {
            tableType: dto.tableType,
            blinds: dto.blinds,
            tableSize: dto.tableSize,
            heroStack: dto.heroStack,
            heroPosition: dto.heroPosition,
            heroHand: dto.heroHand,
            result: dto.result,
            streets: {
              create: dto.streets.map((street, index) => ({
                street: street.street,
                boardCards: street.boardCards,
                potSize: street.potSize,
                order: index,
                actions: {
                  create: street.actions.map((action, actionIndex) => ({
                    position: action.position,
                    actionType: action.actionType,
                    amount: action.amount,
                    order: actionIndex,
                  })),
                },
              })),
            },
          },
        },
      },
      include: {
        author: authorSelect,
        pokerHand: {
          include: {
            streets: {
              orderBy: { order: 'asc' },
              include: {
                actions: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });
    await this.createMentionNotifications(userId, dto.content || '', post.id);
    await this.extractAndLinkHashtags(post.id, dto.content || '');
    return post;
  }

  private async extractAndLinkHashtags(postId: string, content: string) {
    const hashtagRegex = /#([a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+)/g;
    const matches = [...content.matchAll(hashtagRegex)];
    const tags = [...new Set(matches.map((m) => m[1].toLowerCase()))];
    if (tags.length === 0) return;

    for (const tagName of tags) {
      const hashtag = await this.prisma.hashtag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName },
      });
      await this.prisma.postHashtag.create({
        data: { postId, hashtagId: hashtag.id },
      }).catch(() => { /* ignore duplicate */ });
    }
  }

  async getByHashtag(tag: string, userId: string | null, take = 20, skip = 0) {
    const hashtag = await this.prisma.hashtag.findUnique({ where: { name: tag.toLowerCase() } });
    if (!hashtag) return [];

    const excludedIds = userId ? await this.getExcludedUserIds(userId) : [];
    const isPremium = userId ? await this.isPremiumUser(userId) : false;

    const postFilter: Record<string, unknown> = {};
    if (excludedIds.length > 0) postFilter.authorId = { notIn: excludedIds };
    if (!isPremium) postFilter.isPremiumOnly = false;

    const postHashtags = await this.prisma.postHashtag.findMany({
      where: {
        hashtagId: hashtag.id,
        ...(Object.keys(postFilter).length > 0 && { post: postFilter }),
      },
      orderBy: { post: { createdAt: 'desc' } },
      take,
      skip,
      include: {
        post: {
          include: {
            author: authorSelect,
            parentPost: { include: { author: authorSelect } },
            pokerHand: {
              include: {
                streets: {
                  orderBy: { order: 'asc' },
                  include: { actions: { orderBy: { order: 'asc' } } },
                },
              },
            },
            _count: { select: { likes: true, replies: true, reposts: true } },
            ...(userId && {
              likes: { where: { userId }, select: { userId: true } },
              reposts: { where: { userId }, select: { userId: true } },
              bookmarks: { where: { userId }, select: { userId: true } },
            }),
          },
        },
      },
    });

    return postHashtags.map((ph) => ({
      ...ph.post,
      isLiked: ((ph.post as any).likes?.length ?? 0) > 0,
      isReposted: ((ph.post as any).reposts?.length ?? 0) > 0,
      isBookmarked: ((ph.post as any).bookmarks?.length ?? 0) > 0,
      likes: undefined,
      reposts: undefined,
      bookmarks: undefined,
    }));
  }

  async getByUserId(userId: string, currentUserId: string | null, take = 50, skip = 0) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pinnedPostId: true },
    });
    const isPremium = currentUserId ? await this.isPremiumUser(currentUserId) : false;
    const posts = await this.prisma.post.findMany({
      where: { authorId: userId, ...(!isPremium && { isPremiumOnly: false }) },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        author: authorSelect,
        parentPost: { include: { author: authorSelect } },
        pokerHand: {
          include: {
            streets: {
              orderBy: { order: 'asc' },
              include: { actions: { orderBy: { order: 'asc' } } },
            },
          },
        },
        _count: { select: { likes: true, replies: true, reposts: true } },
        ...(currentUserId && {
          likes: { where: { userId: currentUserId }, select: { userId: true } },
          reposts: { where: { userId: currentUserId }, select: { userId: true } },
          bookmarks: { where: { userId: currentUserId }, select: { userId: true } },
        }),
      },
    });
    const mapped = posts.map((post) => ({
      ...post,
      isLiked: ((post as any).likes?.length ?? 0) > 0,
      isReposted: ((post as any).reposts?.length ?? 0) > 0,
      isBookmarked: ((post as any).bookmarks?.length ?? 0) > 0,
      isPinned: user?.pinnedPostId === post.id,
      likes: undefined,
      reposts: undefined,
      bookmarks: undefined,
    }));
    if (user?.pinnedPostId) {
      const pinned = mapped.find((p) => p.id === user.pinnedPostId);
      const rest = mapped.filter((p) => p.id !== user.pinnedPostId);
      return pinned ? [pinned, ...rest] : mapped;
    }
    return mapped;
  }

  async getLikedByUserId(userId: string, currentUserId: string, take = 50, skip = 0) {
    const isPremium = await this.isPremiumUser(currentUserId);
    const likes = await this.prisma.like.findMany({
      where: { userId, ...(!isPremium && { post: { isPremiumOnly: false } }) },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        post: {
          include: {
            author: authorSelect,
            pokerHand: {
              include: {
                streets: {
                  orderBy: { order: 'asc' },
                  include: {
                    actions: { orderBy: { order: 'asc' } },
                  },
                },
              },
            },
            _count: { select: { likes: true, replies: true } },
            likes: {
              where: { userId: currentUserId },
              select: { userId: true },
            },
          },
        },
      },
    });
    return likes
      .filter((l) => l.post)
      .map((l) => ({
        ...l.post,
        isLiked: true,
        likes: undefined,
      }));
  }

  async getById(postId: string, currentUserId: string | null) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: authorSelect,
        parentPost: {
          include: {
            author: authorSelect,
            pokerHand: {
              include: {
                streets: { orderBy: { order: 'asc' }, include: { actions: { orderBy: { order: 'asc' } } } },
              },
            },
          },
        },
        pokerHand: {
          include: {
            streets: {
              orderBy: { order: 'asc' },
              include: {
                actions: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
            reposts: true,
          },
        },
        ...(currentUserId && {
          likes: {
            where: { userId: currentUserId },
            select: { userId: true },
          },
          reposts: {
            where: { userId: currentUserId },
            select: { userId: true },
          },
          bookmarks: {
            where: { userId: currentUserId },
            select: { userId: true },
          },
        }),
      },
    });

    if (!post) {
      return null;
    }

    if (post.isPremiumOnly) {
      const isPremium = currentUserId ? await this.isPremiumUser(currentUserId) : false;
      if (!isPremium) {
        throw new ForbiddenException('この投稿はプレミアム会員限定です');
      }
    }

    return {
      ...post,
      isLiked: ((post as any).likes?.length ?? 0) > 0,
      isReposted: ((post as any).reposts?.length ?? 0) > 0,
      isBookmarked: ((post as any).bookmarks?.length ?? 0) > 0,
      likes: undefined,
      reposts: undefined,
      bookmarks: undefined,
    };
  }

  private async getExcludedUserIds(userId: string): Promise<string[]> {
    const [blocks, mutes] = await Promise.all([
      this.prisma.block.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
        select: { blockerId: true, blockedId: true },
      }),
      this.prisma.mute.findMany({
        where: { muterId: userId },
        select: { mutedId: true },
      }),
    ]);
    const ids = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId !== userId) ids.add(b.blockerId);
      if (b.blockedId !== userId) ids.add(b.blockedId);
    }
    for (const m of mutes) ids.add(m.mutedId);
    return [...ids];
  }

  async getTimelineForUser(userId: string, cursor?: string, take = 20, premiumOnly = false) {
    if (premiumOnly) {
      const premium = await this.isPremiumUser(userId);
      if (!premium) {
        throw new ForbiddenException('プレミアム限定タイムラインはプレミアム会員のみ閲覧できます');
      }
    }

    const [following, excludedIds, isPremium] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      this.getExcludedUserIds(userId),
      premiumOnly ? Promise.resolve(true) : this.isPremiumUser(userId),
    ]);

    const excludedSet = new Set(excludedIds);
    const ids = [userId, ...following.map((f: { followingId: string }) => f.followingId)].filter((id) => !excludedSet.has(id));
    const followingIds = new Set(following.map((f: { followingId: string }) => f.followingId));

    const cursorObj = cursor
      ? { id: cursor }
      : undefined;

    const premiumFilter = premiumOnly
      ? { isPremiumOnly: true }
      : isPremium
        ? {}
        : { isPremiumOnly: false };

    const raw = await this.prisma.post.findMany({
      take: take + 1,
      skip: cursor ? 1 : 0,
      cursor: cursorObj,
      where: {
        authorId: { in: ids },
        ...premiumFilter,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: authorSelect,
        parentPost: {
          include: {
            author: authorSelect,
          },
        },
        pokerHand: {
          include: {
            streets: {
              orderBy: { order: 'asc' },
              include: {
                actions: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
            reposts: true,
          },
        },
        likes: {
          where: { userId },
          select: { userId: true },
        },
        reposts: {
          where: { userId },
          select: { userId: true },
        },
        bookmarks: {
          where: { userId },
          select: { userId: true },
        },
      },
    });

    const hasMore = raw.length > take;
    const posts = raw.slice(0, take);

    const result = posts.map((post) => ({
      ...post,
      isLiked: post.likes.length > 0,
      isReposted: post.reposts.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      isFollowingAuthor: post.authorId !== userId && followingIds.has(post.authorId),
      likes: undefined,
      reposts: undefined,
      bookmarks: undefined,
    }));

    return { posts: result, hasMore };
  }

  async delete(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });
  }

  async toggleLike(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, isPremiumOnly: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.isPremiumOnly) {
      const isPremium = await this.isPremiumUser(userId);
      if (!isPremium) {
        throw new ForbiddenException('この投稿はプレミアム会員限定です');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.like.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingLike) {
        await tx.like.delete({
          where: { userId_postId: { userId, postId } },
        });
        return { liked: false };
      } else {
        await tx.like.create({ data: { userId, postId } });
        await this.notificationsService.createNotification(
          post.authorId, userId, 'LIKE', postId,
        );
        return { liked: true };
      }
    });
  }

  async toggleRepost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, isPremiumOnly: true } });
    if (!post) throw new NotFoundException('Post not found');

    if (post.isPremiumOnly) {
      const isPremium = await this.isPremiumUser(userId);
      if (!isPremium) {
        throw new ForbiddenException('この投稿はプレミアム会員限定です');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.repost.findUnique({
        where: { userId_postId: { userId, postId } },
      });
      if (existing) {
        await tx.repost.delete({ where: { userId_postId: { userId, postId } } });
        return { reposted: false };
      }
      await tx.repost.create({ data: { userId, postId } });
      if (post.authorId !== userId) {
        await this.notificationsService.createNotification(post.authorId, userId, 'REPOST', postId);
      }
      return { reposted: true };
    });
  }

  async toggleBookmark(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true, isPremiumOnly: true } });
    if (!post) throw new NotFoundException('Post not found');

    if (post.isPremiumOnly) {
      const isPremium = await this.isPremiumUser(userId);
      if (!isPremium) {
        throw new ForbiddenException('この投稿はプレミアム会員限定です');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.bookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });
      if (existing) {
        await tx.bookmark.delete({ where: { userId_postId: { userId, postId } } });
        return { bookmarked: false };
      }
      await tx.bookmark.create({ data: { userId, postId } });
      return { bookmarked: true };
    });
  }

  async getBookmarksByUserId(userId: string, currentUserId: string, take = 50, skip = 0) {
    const isPremium = await this.isPremiumUser(currentUserId);
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId, ...(!isPremium && { post: { isPremiumOnly: false } }) },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        post: {
          include: {
            author: authorSelect,
            parentPost: { include: { author: authorSelect } },
            pokerHand: {
              include: {
                streets: {
                  orderBy: { order: 'asc' },
                  include: { actions: { orderBy: { order: 'asc' } } },
                },
              },
            },
            _count: { select: { likes: true, replies: true } },
            likes: { where: { userId: currentUserId }, select: { userId: true } },
          },
        },
      },
    });
    return bookmarks.map((b) => ({
      ...b.post,
      isLiked: b.post.likes.length > 0,
      likes: undefined,
    }));
  }

  async pinPost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only pin your own posts');
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinnedPostId: postId },
    });
    return { pinned: true };
  }

  async unpinPost(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinnedPostId: null },
    });
    return { pinned: false };
  }

  async getPostMeta(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        isPokerHand: true,
        isPremiumOnly: true,
        author: { select: { name: true, username: true, avatarUrl: true } },
        createdAt: true,
        _count: { select: { likes: true, replies: true, reposts: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    const { isPremiumOnly, ...rest } = post;
    if (isPremiumOnly) {
      return {
        ...rest,
        content: 'この投稿はプレミアム会員限定です',
        imageUrl: null,
      };
    }
    return rest;
  }

  async getSitemapData() {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [trendingPosts, activeUsers, activeHashtags] = await Promise.all([
      this.prisma.post.findMany({
        where: { createdAt: { gte: since }, parentPostId: null, isPremiumOnly: false },
        orderBy: { likes: { _count: 'desc' } },
        take: 100,
        select: { id: true, updatedAt: true },
      }),
      this.prisma.user.findMany({
        where: { posts: { some: {} } },
        orderBy: { posts: { _count: 'desc' } },
        take: 500,
        select: {
          username: true,
          updatedAt: true,
          _count: { select: { posts: true } },
        },
      }).then((users) => users.filter((u) => u._count.posts >= 5)),
      this.prisma.hashtag.findMany({
        where: { posts: { some: {} } },
        orderBy: { posts: { _count: 'desc' } },
        take: 200,
        select: {
          name: true,
          _count: { select: { posts: true } },
        },
      }).then((tags) =>
        tags
          .filter((t) => t._count.posts >= 10)
          .map((t) => ({ hashtag: t.name })),
      ),
    ]);

    return { trendingPosts, activeUsers, activeHashtags };
  }

  async getTrending(userId: string, period: '24h' | '7d' = '24h', take = 20, skip = 0) {
    const since = new Date();
    if (period === '24h') {
      since.setHours(since.getHours() - 24);
    } else {
      since.setDate(since.getDate() - 7);
    }

    const excludedIds = await this.getExcludedUserIds(userId);

    const isPremium = await this.isPremiumUser(userId);
    const posts = await this.prisma.post.findMany({
      where: {
        createdAt: { gte: since },
        ...(excludedIds.length > 0 && { authorId: { notIn: excludedIds } }),
        ...(!isPremium && { isPremiumOnly: false }),
      },
      orderBy: [
        { likes: { _count: 'desc' } },
        { reposts: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      take,
      skip,
      include: {
        author: authorSelect,
        parentPost: { include: { author: authorSelect } },
        pokerHand: {
          include: {
            streets: {
              orderBy: { order: 'asc' },
              include: { actions: { orderBy: { order: 'asc' } } },
            },
          },
        },
        _count: { select: { likes: true, replies: true, reposts: true } },
        likes: { where: { userId }, select: { userId: true } },
        reposts: { where: { userId }, select: { userId: true } },
        bookmarks: { where: { userId }, select: { userId: true } },
      },
    });

    return posts.map((post) => ({
      ...post,
      isLiked: post.likes.length > 0,
      isReposted: post.reposts.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      likes: undefined,
      reposts: undefined,
      bookmarks: undefined,
    }));
  }
}


