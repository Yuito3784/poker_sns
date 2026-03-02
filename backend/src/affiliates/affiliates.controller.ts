import {
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AffiliateCategory } from '@prisma/client';
import { AffiliatesService } from './affiliates.service';

@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get()
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

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.affiliatesService.findBySlug(slug);
  }

  @Get(':slug/redirect')
  async redirect(
    @Param('slug') slug: string,
    @Query('ref') referrer: string | undefined,
    @Res() res: Response,
  ) {
    const url = await this.affiliatesService.redirect(
      slug,
      undefined,
      referrer,
    );
    res.redirect(302, url);
  }
}
