import { Controller, Get, Patch, Param, Post, Query, Sse, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Observable, filter, map } from 'rxjs';
import { Throttle } from '@nestjs/throttler';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { Public } from '../auth/public.decorator';

interface MessageEvent {
  data: string | object;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@GetUser() user: { userId: string }) {
    return this.notificationsService.getNotifications(user.userId);
  }

  /** Issue a short-lived, single-use ticket for SSE connection */
  @Post('sse-ticket')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  issueSseTicket(@GetUser() user: { userId: string }) {
    const ticket = this.notificationsService.issueSseTicket(user.userId);
    return { ticket };
  }

  /**
   * SSE stream authenticated via single-use ticket (not JWT in URL).
   * The JwtAuthGuard on the class won't block this because we use @Public-like
   * handling below via ticket validation.
   */
  @Sse('stream')
  @Public()
  stream(@Query('ticket') ticket: string): Observable<MessageEvent> {
    if (!ticket) {
      throw new UnauthorizedException('SSE ticket is required');
    }
    const userId = this.notificationsService.consumeSseTicket(ticket);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired SSE ticket');
    }

    return this.notificationsService.notifications$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({
        data: event.notification,
      })),
    );
  }

  @Patch('read-all')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  markAllAsRead(@GetUser() user: { userId: string }) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Patch(':id/read')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  markAsRead(
    @GetUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.userId, id);
  }
}
