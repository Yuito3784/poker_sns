import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AffiliateCategory } from '@prisma/client';
import { AffiliatesService } from './affiliates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { AdminGuard } from '../auth/admin.guard';

@Controller('affiliates')
@UseGuards(JwtAuthGuard)
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get('sidebar')
  @Public()
  findSidebarRandom(@Query('limit') limit?: string) {
    const parsed = Math.min(Math.max(parseInt(limit ?? '3', 10) || 3, 1), 10);
    return this.affiliatesService.findSidebarRandom(parsed);
  }

  @Get()
  @Public()
  findAll(
    @Query('category') category?: string,
    @Query('featured') featured?: string,
  ) {
    const cat = category as AffiliateCategory | undefined;
    const isFeatured = featured === 'true';
    return this.affiliatesService.findAll(
      cat && Object.values(AffiliateCategory).includes(cat) ? cat : undefined,
      isFeatured || undefined,
    );
  }

  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getClickAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.affiliatesService.getClickAnalytics(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.affiliatesService.findBySlug(slug);
  }

  @Get(':slug/redirect')
  @Public()
  async redirect(
    @Param('slug') slug: string,
    @Query('ref') referrer: string | undefined,
    @Req() req: { user?: { userId: string } },
    @Res() res: Response,
  ) {
    const url = await this.affiliatesService.redirect(
      slug,
      req.user?.userId,
      referrer,
    );
    res.redirect(302, url);
  }
}
