import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  RawBody,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaidContentService } from './paid-content.service';

@Controller('paid-content')
export class PaidContentController {
  constructor(private readonly paidContentService: PaidContentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createPaidPost(
    @Req() req: { user: { userId: string } },
    @Body() dto: { content: string; price: number; previewText?: string },
  ) {
    return this.paidContentService.createPaidPost(req.user.userId, dto);
  }

  @Get('post/:postId')
  async getPaidContent(
    @Param('postId') postId: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.paidContentService.getPaidContent(postId, req.user?.userId);
  }

  @Post('purchase/:paidContentId')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async purchaseContent(
    @Req() req: { user: { userId: string } },
    @Param('paidContentId') paidContentId: string,
  ) {
    return this.paidContentService.purchaseContent(req.user.userId, paidContentId);
  }

  @Get('purchases')
  @UseGuards(JwtAuthGuard)
  async getPurchases(
    @Req() req: { user: { userId: string } },
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.paidContentService.getPurchases(
      req.user.userId,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Get('sales-stats')
  @UseGuards(JwtAuthGuard)
  async getSalesStats(@Req() req: { user: { userId: string } }) {
    return this.paidContentService.getSalesStats(req.user.userId);
  }

  @Post('webhook')
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paidContentService.handleWebhook(rawBody, signature);
  }
}
