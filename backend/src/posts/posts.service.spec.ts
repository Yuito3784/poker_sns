import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
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
});
