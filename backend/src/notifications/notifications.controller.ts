import { Controller, Get, Patch, Param, Sse, UseGuards } from '@nestjs/common';
import { Observable, filter, map } from 'rxjs';
import { Throttle } from '@nestjs/throttler';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

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

  @Sse('stream')
  stream(@GetUser() user: { userId: string }): Observable<MessageEvent> {
    return this.notificationsService.notifications$.pipe(
      filter((event) => event.userId === user.userId),
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
