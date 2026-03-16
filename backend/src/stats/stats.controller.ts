import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('platform')
  getPlatformStats() {
    return this.statsService.getPlatformStats();
  }

  @Get('dashboard/:userId')
  getDashboard(
    @GetUser() user: { userId: string },
    @Param('userId') targetUserId: string,
  ) {
    return this.statsService.getDashboard(user.userId, targetUserId);
  }

  @Get('dashboard')
  getMyDashboard(@GetUser() user: { userId: string }) {
    return this.statsService.getDashboard(user.userId, user.userId);
  }
}
