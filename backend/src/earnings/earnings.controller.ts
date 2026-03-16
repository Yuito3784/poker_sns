import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { EarningType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EarningsService } from './earnings.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('earnings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get('summary')
  async getSummary(@Req() req: { user: { userId: string } }) {
    return this.earningsService.getSummary(req.user.userId);
  }

  @Get('history')
  async getHistory(
    @Req() req: { user: { userId: string } },
    @Query('type') type?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const earningType =
      type && Object.values(EarningType).includes(type as EarningType)
        ? (type as EarningType)
        : undefined;
    return this.earningsService.getHistory(
      req.user.userId,
      earningType,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Get('payouts')
  async getPayouts(
    @Req() req: { user: { userId: string } },
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.earningsService.getPayouts(
      req.user.userId,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }
}
