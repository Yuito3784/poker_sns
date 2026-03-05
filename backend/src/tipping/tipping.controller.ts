import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  RawBody,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TippingService } from './tipping.service';

@Controller('tipping')
export class TippingController {
  constructor(private readonly tippingService: TippingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createTip(
    @Req() req: { user: { userId: string } },
    @Body() dto: { receiverId: string; postId?: string; amount: number; message?: string },
  ) {
    return this.tippingService.createTip(req.user.userId, dto);
  }

  @Get('received')
  @UseGuards(JwtAuthGuard)
  async getReceivedTips(
    @Req() req: { user: { userId: string } },
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.tippingService.getReceivedTips(
      req.user.userId,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getTipStats(@Req() req: { user: { userId: string } }) {
    return this.tippingService.getTipStats(req.user.userId);
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.tippingService.handleWebhook(rawBody, signature);
  }
}
