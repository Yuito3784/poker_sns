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
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const reply = await this.prisma.reply.create({
      data: {
        postId,
        authorId: userId,
        content: dto.content,
      },
      include: {
        author: authorSelect,
      },
    });

    await this.notificationsService.createNotification(
      post.authorId,
      userId,
      'REPLY',
      postId,
    );

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

