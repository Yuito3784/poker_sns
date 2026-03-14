import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrismaBase = {
  post: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  like: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  repost: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  bookmark: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  follow: {
    findMany: jest.fn(),
  },
  block: {
    findMany: jest.fn(),
  },
  mute: {
    findMany: jest.fn(),
  },
  hashtag: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  postHashtag: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};
const mockPrisma = {
  ...mockPrismaBase,
  $transaction: jest.fn((fn: (tx: typeof mockPrismaBase) => Promise<unknown>) => fn(mockPrismaBase)),
};

const mockNotifications = {
  createNotification: jest.fn(),
};

describe('PostsService', () => {
  let service: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a post', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });
      const mockPost = {
        id: 'post-1',
        content: 'Hello world',
        authorId: 'user-1',
        author: { id: 'user-1', name: 'Test', username: 'test' },
        pokerHand: null,
      };
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const result = await service.create('user-1', { content: 'Hello world' });

      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'user-1',
            content: 'Hello world',
          }),
        }),
      );
      expect(result).toEqual(mockPost);
    });

    it('should create mention notifications for @mentions', async () => {
      const mockPost = {
        id: 'post-1',
        content: 'Hello @alice',
        authorId: 'user-1',
        author: { id: 'user-1', name: 'Test', username: 'test' },
        pokerHand: null,
      };
      mockPrisma.post.create.mockResolvedValue(mockPost);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-2' }]);

      await service.create('user-1', { content: 'Hello @alice' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { username: { in: ['alice'] } },
        select: { id: true },
      });
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        'user-2', 'user-1', 'MENTION', 'post-1',
      );
    });
  });

  describe('delete', () => {
    it('should delete own post', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-1' });
      mockPrisma.post.delete.mockResolvedValue({});

      await service.delete('user-1', 'post-1');

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-1' },
      });
    });

    it('should throw NotFoundException when post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.delete('user-1', 'post-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when deleting another user post', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2' });

      await expect(service.delete('user-1', 'post-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('toggleLike', () => {
    it('should create like when not already liked', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2' });
      mockPrisma.like.findUnique.mockResolvedValue(null);
      mockPrisma.like.create.mockResolvedValue({});

      const result = await service.toggleLike('user-1', 'post-1');

      expect(result).toEqual({ liked: true });
      expect(mockPrisma.like.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', postId: 'post-1' },
      });
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        'user-2', 'user-1', 'LIKE', 'post-1',
      );
    });

    it('should remove like when already liked', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2' });
      mockPrisma.like.findUnique.mockResolvedValue({ userId: 'user-1', postId: 'post-1' });
      mockPrisma.like.delete.mockResolvedValue({});

      const result = await service.toggleLike('user-1', 'post-1');

      expect(result).toEqual({ liked: false });
      expect(mockPrisma.like.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.toggleLike('user-1', 'post-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleRepost', () => {
    it('should create repost when not already reposted', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2' });
      mockPrisma.repost.findUnique.mockResolvedValue(null);
      mockPrisma.repost.create.mockResolvedValue({});

      const result = await service.toggleRepost('user-1', 'post-1');

      expect(result).toEqual({ reposted: true });
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        'user-2', 'user-1', 'REPOST', 'post-1',
      );
    });

    it('should remove repost when already reposted', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2' });
      mockPrisma.repost.findUnique.mockResolvedValue({ userId: 'user-1', postId: 'post-1' });
      mockPrisma.repost.delete.mockResolvedValue({});

      const result = await service.toggleRepost('user-1', 'post-1');

      expect(result).toEqual({ reposted: false });
    });

    it('should not send notification when reposting own post', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-1' });
      mockPrisma.repost.findUnique.mockResolvedValue(null);
      mockPrisma.repost.create.mockResolvedValue({});

      await service.toggleRepost('user-1', 'post-1');

      expect(mockNotifications.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('toggleBookmark', () => {
    it('should create bookmark', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ id: 'post-1' });
      mockPrisma.bookmark.findUnique.mockResolvedValue(null);
      mockPrisma.bookmark.create.mockResolvedValue({});

      const result = await service.toggleBookmark('user-1', 'post-1');

      expect(result).toEqual({ bookmarked: true });
    });

    it('should remove bookmark', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ id: 'post-1' });
      mockPrisma.bookmark.findUnique.mockResolvedValue({ userId: 'user-1', postId: 'post-1' });
      mockPrisma.bookmark.delete.mockResolvedValue({});

      const result = await service.toggleBookmark('user-1', 'post-1');

      expect(result).toEqual({ bookmarked: false });
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.toggleBookmark('user-1', 'post-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('pinPost', () => {
    it('should pin own post', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.pinPost('user-1', 'post-1');

      expect(result).toEqual({ pinned: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { pinnedPostId: 'post-1' },
      });
    });

    it('should throw ForbiddenException when pinning other user post', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2' });

      await expect(service.pinPost('user-1', 'post-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('unpinPost', () => {
    it('should unpin post', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.unpinPost('user-1');

      expect(result).toEqual({ pinned: false });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { pinnedPostId: null },
      });
    });
  });

  // ===========================================================================
  // Premium character limit tests (Task 1-4-3)
  // ===========================================================================
  describe('premium character limit', () => {
    const makeLongContent = (len: number) => 'a'.repeat(len);

    it('free user should be limited to 280 characters', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });

      await expect(
        service.create('user-1', { content: makeLongContent(281) }),
      ).rejects.toThrow('280');
    });

    it('free user should be able to post up to 280 characters', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });
      const mockPost = {
        id: 'post-1',
        content: makeLongContent(280),
        authorId: 'user-1',
        author: { id: 'user-1', name: 'Test', username: 'test' },
        pokerHand: null,
      };
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const result = await service.create('user-1', { content: makeLongContent(280) });

      expect(result).toEqual(mockPost);
    });

    it('active (premium) user should be limited to 1000 characters', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });

      await expect(
        service.create('user-1', { content: makeLongContent(1001) }),
      ).rejects.toThrow('1000');
    });

    it('active (premium) user should be able to post up to 1000 characters', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
      const mockPost = {
        id: 'post-1',
        content: makeLongContent(1000),
        authorId: 'user-1',
        author: { id: 'user-1', name: 'Test', username: 'test' },
        pokerHand: null,
      };
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const result = await service.create('user-1', { content: makeLongContent(1000) });

      expect(result).toEqual(mockPost);
    });

    it('canceled user (in grace period) should still have 1000 char limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'canceled' });
      const mockPost = {
        id: 'post-1',
        content: makeLongContent(500),
        authorId: 'user-1',
        author: { id: 'user-1', name: 'Test', username: 'test' },
        pokerHand: null,
      };
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const result = await service.create('user-1', { content: makeLongContent(500) });

      expect(result).toEqual(mockPost);
    });

    it('past_due user should be limited to 280 characters (same as free)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'past_due' });

      await expect(
        service.create('user-1', { content: makeLongContent(281) }),
      ).rejects.toThrow('280');
    });
  });

  // ===========================================================================
  // Premium-only post tests
  // ===========================================================================
  describe('premium-only posts', () => {
    const mockPost = (overrides = {}) => ({
      id: 'post-1',
      content: 'Premium content',
      authorId: 'user-1',
      isPremiumOnly: false,
      author: { id: 'user-1', name: 'Test', username: 'test', subscriptionStatus: 'active' },
      pokerHand: null,
      likes: [],
      reposts: [],
      bookmarks: [],
      _count: { likes: 0, replies: 0, reposts: 0 },
      ...overrides,
    });

    // Helper to set up common mocks for timeline tests
    const setupTimelineMocks = () => {
      mockPrisma.follow.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.mute.findMany.mockResolvedValue([]);
    };

    // ---------------------------------------------------------------
    // 1. 投稿作成
    // ---------------------------------------------------------------
    describe('create - premium-only post creation', () => {
      it('premium user (active) should create a premium-only post', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.post.create.mockResolvedValue(mockPost({ isPremiumOnly: true }));

        const result = await service.create('user-1', { content: 'Premium content', isPremiumOnly: true });

        expect(mockPrisma.post.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              isPremiumOnly: true,
            }),
          }),
        );
        expect(result.isPremiumOnly).toBe(true);
      });

      it('canceled (grace period) user should NOT create a premium-only post', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'canceled' });

        await expect(
          service.create('user-1', { content: 'Premium content', isPremiumOnly: true }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('free user should NOT create a premium-only post', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });

        await expect(
          service.create('user-1', { content: 'Try premium', isPremiumOnly: true }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('past_due user should NOT create a premium-only post', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'past_due' });

        await expect(
          service.create('user-1', { content: 'Try premium', isPremiumOnly: true }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should default isPremiumOnly to false when not specified', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });
        mockPrisma.post.create.mockResolvedValue(mockPost());

        await service.create('user-1', { content: 'Normal post' });

        expect(mockPrisma.post.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              isPremiumOnly: false,
            }),
          }),
        );
      });

      it('free user should create normal posts without issue', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });
        mockPrisma.post.create.mockResolvedValue(mockPost());

        const result = await service.create('user-1', { content: 'Normal post', isPremiumOnly: false });

        expect(result).toBeDefined();
      });
    });

    // ---------------------------------------------------------------
    // 2. 個別投稿閲覧 (getById)
    // ---------------------------------------------------------------
    describe('getById - premium-only post access', () => {
      it('premium user should view a premium-only post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue(mockPost({ isPremiumOnly: true }));
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });

        const result = await service.getById('post-1', 'premium-user');

        expect(result).toBeDefined();
        expect(result!.id).toBe('post-1');
      });

      it('canceled (grace) user should view a premium-only post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue(mockPost({ isPremiumOnly: true }));
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'canceled' });

        const result = await service.getById('post-1', 'canceled-user');

        expect(result).toBeDefined();
      });

      it('free user should NOT view a premium-only post (403)', async () => {
        mockPrisma.post.findUnique.mockResolvedValue(mockPost({ isPremiumOnly: true }));
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });

        await expect(
          service.getById('post-1', 'free-user'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('past_due user should NOT view a premium-only post (403)', async () => {
        mockPrisma.post.findUnique.mockResolvedValue(mockPost({ isPremiumOnly: true }));
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'past_due' });

        await expect(
          service.getById('post-1', 'past-due-user'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('unauthenticated user should NOT view a premium-only post (403)', async () => {
        mockPrisma.post.findUnique.mockResolvedValue(mockPost({ isPremiumOnly: true }));

        await expect(
          service.getById('post-1', null),
        ).rejects.toThrow(ForbiddenException);
      });

      it('any user should view a normal post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue(mockPost({ isPremiumOnly: false }));

        const result = await service.getById('post-1', 'free-user');

        expect(result).toBeDefined();
      });

      it('should return null for non-existent post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue(null);

        const result = await service.getById('nonexistent', 'user-1');

        expect(result).toBeNull();
      });
    });

    // ---------------------------------------------------------------
    // 3. タイムライン (getTimelineForUser)
    // ---------------------------------------------------------------
    describe('getTimelineForUser - premium filtering', () => {
      it('premium user - normal timeline should show ALL posts', async () => {
        setupTimelineMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.post.findMany.mockResolvedValue([]);

        await service.getTimelineForUser('user-1', undefined, 20, false);

        // The where clause should NOT have isPremiumOnly filter for premium users
        const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
        expect(findManyCall.where.isPremiumOnly).toBeUndefined();
      });

      it('free user - normal timeline should exclude premium-only posts', async () => {
        setupTimelineMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });
        mockPrisma.post.findMany.mockResolvedValue([]);

        await service.getTimelineForUser('user-1', undefined, 20, false);

        const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
        expect(findManyCall.where.isPremiumOnly).toBe(false);
      });

      it('past_due user - normal timeline should exclude premium-only posts', async () => {
        setupTimelineMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'past_due' });
        mockPrisma.post.findMany.mockResolvedValue([]);

        await service.getTimelineForUser('user-1', undefined, 20, false);

        const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
        expect(findManyCall.where.isPremiumOnly).toBe(false);
      });

      it('premium user - premium tab should show ONLY premium-only posts', async () => {
        setupTimelineMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.post.findMany.mockResolvedValue([]);

        await service.getTimelineForUser('user-1', undefined, 20, true);

        const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
        expect(findManyCall.where.isPremiumOnly).toBe(true);
      });

      it('free user - premium tab should throw ForbiddenException', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });

        await expect(
          service.getTimelineForUser('user-1', undefined, 20, true),
        ).rejects.toThrow(ForbiddenException);
      });

      it('past_due user - premium tab should throw ForbiddenException', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'past_due' });

        await expect(
          service.getTimelineForUser('user-1', undefined, 20, true),
        ).rejects.toThrow(ForbiddenException);
      });

      it('canceled (grace) user - premium tab should be accessible', async () => {
        setupTimelineMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'canceled' });
        mockPrisma.post.findMany.mockResolvedValue([]);

        await expect(
          service.getTimelineForUser('user-1', undefined, 20, true),
        ).resolves.toBeDefined();
      });
    });

    // ---------------------------------------------------------------
    // 4. ユーザー投稿一覧 (getByUserId)
    // ---------------------------------------------------------------
    describe('getByUserId - premium filtering', () => {
      it('premium user should see all posts including premium-only', async () => {
        mockPrisma.user.findUnique
          .mockResolvedValueOnce({ pinnedPostId: null })   // getByUserId's user lookup
          .mockResolvedValueOnce({ subscriptionStatus: 'active' }); // isPremiumUser check
        mockPrisma.post.findMany.mockResolvedValue([]);

        await service.getByUserId('target-user', 'premium-user');

        const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
        expect(findManyCall.where.isPremiumOnly).toBeUndefined();
      });

      it('free user should NOT see premium-only posts in another user profile', async () => {
        mockPrisma.user.findUnique
          .mockResolvedValueOnce({ pinnedPostId: null })
          .mockResolvedValueOnce({ subscriptionStatus: 'free' });
        mockPrisma.post.findMany.mockResolvedValue([]);

        await service.getByUserId('target-user', 'free-user');

        const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
        expect(findManyCall.where.isPremiumOnly).toBe(false);
      });

      it('unauthenticated user should NOT see premium-only posts', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ pinnedPostId: null });
        mockPrisma.post.findMany.mockResolvedValue([]);

        await service.getByUserId('target-user', null);

        const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
        expect(findManyCall.where.isPremiumOnly).toBe(false);
      });
    });

    // ---------------------------------------------------------------
    // 5. トレンド (getTrending)
    // ---------------------------------------------------------------
    describe('getTrending - premium filtering', () => {
      it('premium user should see premium-only posts in trending', async () => {
        mockPrisma.block.findMany.mockResolvedValue([]);
        mockPrisma.mute.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.post.findMany.mockResolvedValue([]);

        await service.getTrending('user-1');

        const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
        expect(findManyCall.where.isPremiumOnly).toBeUndefined();
      });

      it('free user should NOT see premium-only posts in trending', async () => {
        mockPrisma.block.findMany.mockResolvedValue([]);
        mockPrisma.mute.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });
        mockPrisma.post.findMany.mockResolvedValue([]);

        await service.getTrending('user-1');

        const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
        expect(findManyCall.where.isPremiumOnly).toBe(false);
      });
    });

    // ---------------------------------------------------------------
    // 6. ハッシュタグ (getByHashtag)
    // ---------------------------------------------------------------
    describe('getByHashtag - premium filtering', () => {
      it('premium user should see premium-only posts in hashtag results', async () => {
        mockPrisma.hashtag.findUnique.mockResolvedValue({ id: 'hashtag-1' });
        mockPrisma.block.findMany.mockResolvedValue([]);
        mockPrisma.mute.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.postHashtag.findMany.mockResolvedValue([]);

        await service.getByHashtag('test', 'premium-user');

        const findManyCall = mockPrisma.postHashtag.findMany.mock.calls[0][0];
        // Should not filter by isPremiumOnly
        const postFilter = findManyCall.where.post;
        expect(postFilter?.isPremiumOnly).toBeUndefined();
      });

      it('free user should NOT see premium-only posts in hashtag results', async () => {
        mockPrisma.hashtag.findUnique.mockResolvedValue({ id: 'hashtag-1' });
        mockPrisma.block.findMany.mockResolvedValue([]);
        mockPrisma.mute.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });
        mockPrisma.postHashtag.findMany.mockResolvedValue([]);

        await service.getByHashtag('test', 'free-user');

        const findManyCall = mockPrisma.postHashtag.findMany.mock.calls[0][0];
        const postFilter = findManyCall.where.post;
        expect(postFilter?.isPremiumOnly).toBe(false);
      });

      it('unauthenticated user should NOT see premium-only posts in hashtag results', async () => {
        mockPrisma.hashtag.findUnique.mockResolvedValue({ id: 'hashtag-1' });
        mockPrisma.postHashtag.findMany.mockResolvedValue([]);

        await service.getByHashtag('test', null);

        const findManyCall = mockPrisma.postHashtag.findMany.mock.calls[0][0];
        const postFilter = findManyCall.where.post;
        expect(postFilter?.isPremiumOnly).toBe(false);
      });
    });

    // ---------------------------------------------------------------
    // 7. エッジケース
    // ---------------------------------------------------------------
    describe('edge cases', () => {
      it('premium user creating normal post should set isPremiumOnly=false', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.post.create.mockResolvedValue(mockPost());

        await service.create('user-1', { content: 'Normal post', isPremiumOnly: false });

        expect(mockPrisma.post.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              isPremiumOnly: false,
            }),
          }),
        );
      });

      it('premium user can view their own premium-only post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue(mockPost({ isPremiumOnly: true, authorId: 'user-1' }));
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });

        const result = await service.getById('post-1', 'user-1');

        expect(result).toBeDefined();
      });

      it('free user cannot view premium post even if they are the author', async () => {
        // This tests an edge case: if somehow a user who was premium posted
        // a premium-only post but later downgraded to free
        mockPrisma.post.findUnique.mockResolvedValue(mockPost({ isPremiumOnly: true, authorId: 'user-1' }));
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });

        await expect(
          service.getById('post-1', 'user-1'),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    // ---------------------------------------------------------------
    // 8. いいね/リポスト/ブックマーク のガード
    // ---------------------------------------------------------------
    describe('toggleLike - premium guard', () => {
      it('free user should NOT like a premium-only post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2', isPremiumOnly: true });
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });

        await expect(
          service.toggleLike('free-user', 'post-1'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('premium user should like a premium-only post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2', isPremiumOnly: true });
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.like.findUnique.mockResolvedValue(null);
        mockPrisma.like.create.mockResolvedValue({});

        const result = await service.toggleLike('premium-user', 'post-1');

        expect(result).toEqual({ liked: true });
      });

      it('any user should like a normal post (no guard)', async () => {
        mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2', isPremiumOnly: false });
        mockPrisma.like.findUnique.mockResolvedValue(null);
        mockPrisma.like.create.mockResolvedValue({});

        const result = await service.toggleLike('free-user', 'post-1');

        expect(result).toEqual({ liked: true });
      });
    });

    describe('toggleRepost - premium guard', () => {
      it('free user should NOT repost a premium-only post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2', isPremiumOnly: true });
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });

        await expect(
          service.toggleRepost('free-user', 'post-1'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('premium user should repost a premium-only post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue({ authorId: 'user-2', isPremiumOnly: true });
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.repost.findUnique.mockResolvedValue(null);
        mockPrisma.repost.create.mockResolvedValue({});

        const result = await service.toggleRepost('premium-user', 'post-1');

        expect(result).toEqual({ reposted: true });
      });
    });

    describe('toggleBookmark - premium guard', () => {
      it('free user should NOT bookmark a premium-only post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue({ id: 'post-1', isPremiumOnly: true });
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });

        await expect(
          service.toggleBookmark('free-user', 'post-1'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('premium user should bookmark a premium-only post', async () => {
        mockPrisma.post.findUnique.mockResolvedValue({ id: 'post-1', isPremiumOnly: true });
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.bookmark.findUnique.mockResolvedValue(null);
        mockPrisma.bookmark.create.mockResolvedValue({});

        const result = await service.toggleBookmark('premium-user', 'post-1');

        expect(result).toEqual({ bookmarked: true });
      });
    });

    // ---------------------------------------------------------------
    // 9. getPostMeta コンテンツ漏洩防止
    // ---------------------------------------------------------------
    describe('getPostMeta - premium content masking', () => {
      it('should mask content and imageUrl for premium-only posts', async () => {
        mockPrisma.post.findUnique.mockResolvedValue({
          id: 'post-1',
          content: 'Secret premium content',
          imageUrl: '/uploads/secret.png',
          isPokerHand: false,
          isPremiumOnly: true,
          author: { name: 'Test', username: 'test', avatarUrl: null },
          createdAt: new Date(),
          _count: { likes: 5, replies: 2, reposts: 1 },
        });

        const result = await service.getPostMeta('post-1');

        expect(result.content).toBe('この投稿はプレミアム会員限定です');
        expect(result.imageUrl).toBeNull();
      });

      it('should return full content for normal posts', async () => {
        mockPrisma.post.findUnique.mockResolvedValue({
          id: 'post-1',
          content: 'Normal content',
          imageUrl: '/uploads/normal.png',
          isPokerHand: false,
          isPremiumOnly: false,
          author: { name: 'Test', username: 'test', avatarUrl: null },
          createdAt: new Date(),
          _count: { likes: 5, replies: 2, reposts: 1 },
        });

        const result = await service.getPostMeta('post-1');

        expect(result.content).toBe('Normal content');
        expect(result.imageUrl).toBe('/uploads/normal.png');
      });
    });

    // ---------------------------------------------------------------
    // 10. getLikedByUserId / getBookmarksByUserId フィルタ
    // ---------------------------------------------------------------
    describe('getLikedByUserId - premium filtering', () => {
      it('free user should not see premium-only posts in liked list', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });
        mockPrisma.like.findMany.mockResolvedValue([]);

        await service.getLikedByUserId('target-user', 'free-user');

        const findManyCall = mockPrisma.like.findMany.mock.calls[0][0];
        expect(findManyCall.where.post).toEqual({ isPremiumOnly: false });
      });

      it('premium user should see premium-only posts in liked list', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.like.findMany.mockResolvedValue([]);

        await service.getLikedByUserId('target-user', 'premium-user');

        const findManyCall = mockPrisma.like.findMany.mock.calls[0][0];
        expect(findManyCall.where.post).toBeUndefined();
      });
    });

    describe('getBookmarksByUserId - premium filtering', () => {
      it('free user should not see premium-only posts in bookmarks', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'free' });
        mockPrisma.bookmark.findMany.mockResolvedValue([]);

        await service.getBookmarksByUserId('user-1', 'user-1');

        const findManyCall = mockPrisma.bookmark.findMany.mock.calls[0][0];
        expect(findManyCall.where.post).toEqual({ isPremiumOnly: false });
      });

      it('premium user should see premium-only posts in bookmarks', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
        mockPrisma.bookmark.findMany.mockResolvedValue([]);

        await service.getBookmarksByUserId('user-1', 'user-1');

        const findManyCall = mockPrisma.bookmark.findMany.mock.calls[0][0];
        expect(findManyCall.where.post).toBeUndefined();
      });
    });
  });
});
