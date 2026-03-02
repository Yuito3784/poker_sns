import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('ads')
@UseGuards(JwtAuthGuard)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('feed')
  @Public()
  getFeed(
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const off = Math.max(0, parseInt(offset || '0', 10) || 0);
    const lim = Math.min(20, Math.max(1, parseInt(limit || '10', 10) || 10));
    return this.adsService.getFeed(off, lim);
  }
}
