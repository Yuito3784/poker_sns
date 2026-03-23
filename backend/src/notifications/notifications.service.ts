import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Subject } from 'rxjs';
import { PrismaService } from '../prisma.service';
import { NotificationType } from '@prisma/client';

export interface NotificationEvent {
  userId: string;
  notification: Record<string, unknown>;
}

interface SseTicket {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly notificationSubject = new Subject<NotificationEvent>();
  private readonly sseTickets = new Map<string, SseTicket>();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  readonly notifications$ = this.notificationSubject.asObservable();

  constructor(private readonly prisma: PrismaService) {
    // 10分ごとに期限切れチケットをクリーンアップ
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, ticket] of this.sseTickets) {
        if (ticket.expiresAt < now) this.sseTickets.delete(key);
      }
    }, 10 * 60 * 1000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }

  /** Issue a short-lived, single-use ticket for SSE connection (30s TTL) */
  issueSseTicket(userId: string): string {
    // Cleanup expired tickets
    const now = Date.now();
    for (const [key, ticket] of this.sseTickets) {
      if (ticket.expiresAt < now) this.sseTickets.delete(key);
    }

    const ticketId = randomBytes(32).toString('hex');
    this.sseTickets.set(ticketId, { userId, expiresAt: now + 30_000 });
    return ticketId;
  }

  /** Consume a SSE ticket (single-use). Returns userId or null. */
  consumeSseTicket(ticketId: string): string | null {
    const ticket = this.sseTickets.get(ticketId);
    if (!ticket) return null;
    this.sseTickets.delete(ticketId); // single-use
    if (ticket.expiresAt < Date.now()) return null;
    return ticket.userId;
  }

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
