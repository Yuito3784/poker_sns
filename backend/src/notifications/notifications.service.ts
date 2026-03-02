import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { PrismaService } from '../prisma.service';
import { NotificationType } from '@prisma/client';

export interface NotificationEvent {
  userId: string;
  notification: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly notificationSubject = new Subject<NotificationEvent>();

  readonly notifications$ = this.notificationSubject.asObservable();

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(
    userId: string,
    fromUserId: string,
    type: NotificationType,
    postId?: string,
  ) {
    if (userId === fromUserId) return;

    const existing = await this.prisma.notification.findFirst({
      where: { userId, fromUserId, type, postId: postId ?? null },
    });
    if (existing) return existing;

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        fromUserId,
        type,
        postId,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    // Emit SSE event
    this.notificationSubject.next({ userId, notification });

    return notification;
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }
}
