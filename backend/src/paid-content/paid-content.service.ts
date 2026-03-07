import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PaidContentService {
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured.');
    }
    return this.stripe;
  }

  /** Create a paid content post */
  async createPaidPost(
    userId: string,
    dto: { content: string; price: number; previewText?: string },
  ) {
    if (dto.price < 100 || dto.price > 50000) {
      throw new BadRequestException('価格は100円〜50,000円の範囲で指定してください');
    }

    // Create post + paid content in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId: userId,
          content: dto.content,
        },
      });

      const paidContent = await tx.paidContent.create({
        data: {
          postId: post.id,
          price: dto.price,
          previewText: dto.previewText || null,
        },
      });

      return { post, paidContent };
    });

    return {
      postId: result.post.id,
      paidContentId: result.paidContent.id,
      price: result.paidContent.price,
    };
  }

  /** Get paid content details (respecting purchase status) */
  async getPaidContent(postId: string, userId?: string) {
    const paidContent = await this.prisma.paidContent.findUnique({
      where: { postId },
      include: {
        post: {
          include: {
            author: {
              select: { id: true, name: true, username: true, avatarUrl: true, subscriptionStatus: true },
            },
            _count: { select: { likes: true, replies: true, reposts: true } },
          },
        },
      },
    });

    if (!paidContent) throw new NotFoundException('有料コンテンツが見つかりません');

    // Check if user is the author or has purchased
    const isAuthor = userId === paidContent.post.authorId;
    let hasPurchased = false;

    if (userId && !isAuthor) {
      const purchase = await this.prisma.contentPurchase.findUnique({
        where: { buyerId_paidContentId: { buyerId: userId, paidContentId: paidContent.id } },
      });
      hasPurchased = !!purchase;
    }

    const canView = isAuthor || hasPurchased;

    return {
      id: paidContent.id,
      postId: paidContent.postId,
      price: paidContent.price,
      previewText: paidContent.previewText,
      content: canView ? paidContent.post.content : null,
      post: {
        ...paidContent.post,
        content: canView ? paidContent.post.content : (paidContent.previewText || ''),
      },
      hasPurchased,
      isAuthor,
    };
  }

  /** Purchase paid content */
  async purchaseContent(buyerId: string, paidContentId: string) {
    const paidContent = await this.prisma.paidContent.findUnique({
      where: { id: paidContentId },
      include: { post: true },
    });

    if (!paidContent) throw new NotFoundException('有料コンテンツが見つかりません');

    if (buyerId === paidContent.post.authorId) {
      throw new BadRequestException('自分のコンテンツは購入できません');
    }

    // Check if already purchased
    const existing = await this.prisma.contentPurchase.findUnique({
      where: { buyerId_paidContentId: { buyerId, paidContentId } },
    });
    if (existing) throw new BadRequestException('既に購入済みです');

    // Create PaymentIntent
    const paymentIntent = await this.getStripe().paymentIntents.create({
      amount: paidContent.price,
      currency: 'jpy',
      metadata: {
        type: 'paid_content',
        buyerId,
        paidContentId,
        postId: paidContent.postId,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /** Confirm purchase after payment */
  async confirmPurchase(pi: { id: string; metadata: Record<string, string> }) {
    if (pi.metadata?.type !== 'paid_content') return;

    const { buyerId, paidContentId } = pi.metadata;
    if (!buyerId || !paidContentId) return;

    const paidContent = await this.prisma.paidContent.findUnique({
      where: { id: paidContentId },
      include: { post: true },
    });
    if (!paidContent) return;

    // Create purchase record (idempotent via unique constraint)
    try {
      await this.prisma.contentPurchase.create({
        data: {
          buyerId,
          paidContentId,
          stripePaymentId: pi.id,
          amount: paidContent.price,
        },
      });

      // Notify the author
      await this.prisma.notification.create({
        data: {
          userId: paidContent.post.authorId,
          fromUserId: buyerId,
          type: 'CONTENT_PURCHASE',
          postId: paidContent.postId,
        },
      });
    } catch {
      // Unique constraint violation = already purchased, ignore
    }
  }

  /** Get user's purchased content */
  async getPurchases(userId: string, take = 20, skip = 0) {
    const purchases = await this.prisma.contentPurchase.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        paidContent: {
          include: {
            post: {
              include: {
                author: {
                  select: { id: true, name: true, username: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    return purchases;
  }

  /** Get sales stats for content author */
  async getSalesStats(userId: string) {
    const paidContents = await this.prisma.paidContent.findMany({
      where: { post: { authorId: userId } },
      select: { id: true },
    });

    const paidContentIds = paidContents.map((p) => p.id);

    const result = await this.prisma.contentPurchase.aggregate({
      where: { paidContentId: { in: paidContentIds } },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalSales: result._sum.amount || 0,
      purchaseCount: result._count,
    };
  }

  /** Handle Stripe webhook for paid content */
  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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
      if (pi.metadata?.type === 'paid_content') {
        await this.confirmPurchase({ id: pi.id, metadata: pi.metadata as Record<string, string> });
      }
    }

    return { received: true };
  }
}
