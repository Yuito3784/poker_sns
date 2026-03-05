import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TippingService {
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.',
      );
    }
    return this.stripe;
  }

  /** Create a Stripe PaymentIntent for a tip */
  async createTip(
    senderId: string,
    dto: { receiverId: string; postId?: string; amount: number; message?: string },
  ) {
    if (dto.amount < 100 || dto.amount > 100000) {
      throw new BadRequestException('チップ金額は100円〜100,000円の範囲で指定してください');
    }

    if (senderId === dto.receiverId) {
      throw new BadRequestException('自分自身にチップを送ることはできません');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
    });
    if (!receiver) throw new BadRequestException('受取ユーザーが見つかりません');

    // Create Stripe PaymentIntent (amount in JPY = no decimal conversion needed)
    const paymentIntent = await this.getStripe().paymentIntents.create({
      amount: dto.amount,
      currency: 'jpy',
      metadata: {
        type: 'tip',
        senderId,
        receiverId: dto.receiverId,
        postId: dto.postId || '',
      },
    });

    // Create tip record
    const tip = await this.prisma.tip.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        postId: dto.postId || null,
        amount: dto.amount,
        message: dto.message || null,
        stripePaymentId: paymentIntent.id,
        status: 'pending',
      },
    });

    return {
      tipId: tip.id,
      clientSecret: paymentIntent.client_secret,
    };
  }

  /** Confirm tip after successful payment (called via webhook or client) */
  async confirmTip(stripePaymentId: string) {
    const tip = await this.prisma.tip.findUnique({
      where: { stripePaymentId },
    });
    if (!tip) return;

    await this.prisma.tip.update({
      where: { id: tip.id },
      data: { status: 'completed' },
    });

    // Create notification
    await this.prisma.notification.create({
      data: {
        userId: tip.receiverId,
        fromUserId: tip.senderId,
        type: 'TIP',
        postId: tip.postId,
      },
    });
  }

  /** Get tips received by a user */
  async getReceivedTips(userId: string, take = 20, skip = 0) {
    const [tips, total] = await Promise.all([
      this.prisma.tip.findMany({
        where: { receiverId: userId, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          sender: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.tip.count({
        where: { receiverId: userId, status: 'completed' },
      }),
    ]);

    return { tips, total };
  }

  /** Get total tips received */
  async getTipStats(userId: string) {
    const result = await this.prisma.tip.aggregate({
      where: { receiverId: userId, status: 'completed' },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalReceived: result._sum.amount || 0,
      tipCount: result._count,
    };
  }

  /** Handle Stripe webhook for tip payment */
  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_TIPPING_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.type === 'tip') {
        await this.confirmTip(pi.id);
      }
    }

    return { received: true };
  }
}
