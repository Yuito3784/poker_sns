import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  createCheckout(@GetUser() user: { userId: string }) {
    return this.subscriptionsService.createCheckoutSession(user.userId);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  cancel(@GetUser() user: { userId: string }) {
    return this.subscriptionsService.cancelSubscription(user.userId);
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  reactivate(@GetUser() user: { userId: string }) {
    return this.subscriptionsService.reactivateSubscription(user.userId);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@GetUser() user: { userId: string }) {
    return this.subscriptionsService.getStatus(user.userId);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  createPortal(@GetUser() user: { userId: string }) {
    return this.subscriptionsService.createPortalSession(user.userId);
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  async webhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      const result = await this.subscriptionsService.handleWebhook(
        req.body as Buffer,
        signature,
      );
      return res.status(200).json(result);
    } catch (err) {
      if (err instanceof BadRequestException) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
