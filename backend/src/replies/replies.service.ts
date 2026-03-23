import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { NotificationsService } from '../notifications/notifications.service';

const authorSelect = {
  select: { id: true, name: true, username: true, avatarUrl: true },
} as const;

@Injectable()
export class RepliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, postId: string, dto: CreateReplyDto) {
    // トランザクション内で投稿の存在確認と返信作成を行い、競合を防ぐ
    const { reply, postAuthorId } = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      const created = await tx.reply.create({
        data: {
          postId,
          authorId: userId,
          content: dto.content,
        },
        include: {
          author: authorSelect,
        },
      });

      return { reply: created, postAuthorId: post.authorId };
    });

    // 通知はトランザクション外で非同期実行（失敗しても返信は成立）
    this.notificationsService.createNotification(
      postAuthorId,
      userId,
      'REPLY',
      postId,
    ).catch(() => { /* 通知失敗は無視 */ });

    return reply;
  }

  async getByPostId(postId: string, take = 100, skip = 0) {
    return this.prisma.reply.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      take,
      skip,
      include: {
        author: authorSelect,
      },
    });
  }
}

