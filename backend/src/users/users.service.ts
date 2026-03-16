import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        avatarUrl: true,
        pinnedPostId: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserMeta(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        avatarUrl: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: { select: { followers: true, following: true, posts: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingFollow = await tx.follow.findUnique({
        where: {
          followerId_followingId: { followerId, followingId },
        },
      });

      if (existingFollow) {
        await tx.follow.delete({
          where: {
            followerId_followingId: { followerId, followingId },
          },
        });
        return { following: false };
      } else {
        await tx.follow.create({
          data: { followerId, followingId },
        });
        await this.notificationsService.createNotification(
          followingId, followerId, 'FOLLOW',
        );
        return { following: true };
      }
    });
  }

  async isFollowing(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
    return { isFollowing: !!follow };
  }

  /** 複数ユーザーに対するフォロー状態を一括取得（検索結果の isFollowing 補正用） */
  async getFollowingStatusBatch(followerId: string, followingIds: string[]): Promise<Record<string, boolean>> {
    if (followingIds.length === 0) return {};
    const uniqueIds = [...new Set(followingIds)].slice(0, 50);
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId,
        followingId: { in: uniqueIds },
      },
      select: { followingId: true },
    });
    const set = new Set(follows.map((f) => f.followingId));
    return Object.fromEntries(uniqueIds.map((id) => [id, set.has(id)]));
  }

  async getFollowers(username: string, take = 50, skip = 0) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const follows = await this.prisma.follow.findMany({
      where: { followingId: user.id },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
            _count: { select: { followers: true, following: true, posts: true } },
          },
        },
      },
    });
    return follows.map((f) => f.follower);
  }

  async getFollowing(username: string, take = 50, skip = 0) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const follows = await this.prisma.follow.findMany({
      where: { followerId: user.id },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
            _count: { select: { followers: true, following: true, posts: true } },
          },
        },
      },
    });
    return follows.map((f) => f.following);
  }

  async updateProfile(userId: string, data: { name?: string; username?: string; bio?: string }) {
    if (data.username !== undefined) {
      const existing = await this.prisma.user.findUnique({
        where: { username: data.username },
      });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('このユーザー名は既に使用されています。');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.bio !== undefined && { bio: data.bio }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        bio: true,
        avatarUrl: true,
        emailVerified: true,
      },
    });
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    // Delete old avatar file if it exists
    if (user?.avatarUrl) {
      const oldPath = join(process.cwd(), user.avatarUrl);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          // Ignore deletion errors
        }
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        bio: true,
        avatarUrl: true,
        emailVerified: true,
      },
    });
  }

  async deleteAccount(userId: string) {
    // Cascade deletes handle related records
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'アカウントが削除されました' };
  }

  // --- Block ---

  async toggleBlock(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('自分自身をブロックできません');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.block.findUnique({
        where: { blockerId_blockedId: { blockerId, blockedId } },
      });

      if (existing) {
        await tx.block.delete({
          where: { blockerId_blockedId: { blockerId, blockedId } },
        });
        return { blocked: false };
      }

      await tx.block.create({ data: { blockerId, blockedId } });
      // Remove mutual follows
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      });
      return { blocked: true };
    });
  }

  async isBlocked(blockerId: string, blockedId: string) {
    const block = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    return { isBlocked: !!block };
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId !== userId) ids.add(b.blockerId);
      if (b.blockedId !== userId) ids.add(b.blockedId);
    }
    return [...ids];
  }

  // --- Mute ---

  async toggleMute(muterId: string, mutedId: string) {
    if (muterId === mutedId) {
      throw new BadRequestException('自分自身をミュートできません');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.mute.findUnique({
        where: { muterId_mutedId: { muterId, mutedId } },
      });

      if (existing) {
        await tx.mute.delete({
          where: { muterId_mutedId: { muterId, mutedId } },
        });
        return { muted: false };
      }

      await tx.mute.create({ data: { muterId, mutedId } });
      return { muted: true };
    });
  }

  async isMuted(muterId: string, mutedId: string) {
    const mute = await this.prisma.mute.findUnique({
      where: { muterId_mutedId: { muterId, mutedId } },
    });
    return { isMuted: !!mute };
  }

  async getMutedUserIds(userId: string): Promise<string[]> {
    const mutes = await this.prisma.mute.findMany({
      where: { muterId: userId },
      select: { mutedId: true },
    });
    return mutes.map((m) => m.mutedId);
  }

  async getBlockMuteStatus(userId: string, targetId: string) {
    const [block, mute] = await Promise.all([
      this.prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      }),
      this.prisma.mute.findUnique({
        where: { muterId_mutedId: { muterId: userId, mutedId: targetId } },
      }),
    ]);
    return { isBlocked: !!block, isMuted: !!mute };
  }
}

