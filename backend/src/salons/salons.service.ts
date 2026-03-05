import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SalonsService {
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

  /** Create a new salon */
  async createSalon(
    ownerId: string,
    dto: { name: string; slug: string; description: string; monthlyPrice: number; imageUrl?: string },
  ) {
    if (dto.monthlyPrice < 100 || dto.monthlyPrice > 100000) {
      throw new BadRequestException('月額料金は100円〜100,000円の範囲で指定してください');
    }

    // Check slug uniqueness
    const existing = await this.prisma.salon.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('このスラッグは既に使用されています');

    // Create Stripe product + price
    const product = await this.getStripe().products.create({
      name: `Salon: ${dto.name}`,
      metadata: { type: 'salon', ownerId },
    });

    const price = await this.getStripe().prices.create({
      product: product.id,
      unit_amount: dto.monthlyPrice,
      currency: 'jpy',
      recurring: { interval: 'month' },
    });

    const salon = await this.prisma.salon.create({
      data: {
        ownerId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        monthlyPrice: dto.monthlyPrice,
        imageUrl: dto.imageUrl || null,
        stripeProductId: product.id,
        stripePriceId: price.id,
      },
    });

    return salon;
  }

  /** List active salons */
  async listSalons(take = 20, skip = 0) {
    const salons = await this.prisma.salon.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        owner: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        _count: { select: { members: true, posts: true } },
      },
    });

    return salons;
  }

  /** Get salon detail */
  async getSalon(slug: string, userId?: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { slug },
      include: {
        owner: {
          select: { id: true, name: true, username: true, avatarUrl: true, subscriptionStatus: true },
        },
        _count: { select: { members: true, posts: true } },
      },
    });

    if (!salon) throw new NotFoundException('サロンが見つかりません');

    let isMember = false;
    let isOwner = false;
    if (userId) {
      isOwner = salon.ownerId === userId;
      if (!isOwner) {
        const membership = await this.prisma.salonMember.findUnique({
          where: { salonId_userId: { salonId: salon.id, userId } },
        });
        isMember = !!membership && membership.status === 'active';
      } else {
        isMember = true;
      }
    }

    return { ...salon, isMember, isOwner };
  }

  /** Join a salon (create Stripe checkout) */
  async joinSalon(userId: string, salonId: string) {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon || !salon.isActive) throw new NotFoundException('サロンが見つかりません');

    if (salon.ownerId === userId) {
      throw new BadRequestException('オーナーは自分のサロンに参加できません');
    }

    const existing = await this.prisma.salonMember.findUnique({
      where: { salonId_userId: { salonId, userId } },
    });
    if (existing?.status === 'active') {
      throw new BadRequestException('既にメンバーです');
    }

    if (!salon.stripePriceId) {
      throw new BadRequestException('サロンの決済設定が完了していません');
    }

    // Ensure Stripe customer
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await this.getStripe().customers.create({
        email: user!.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await this.getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: salon.stripePriceId, quantity: 1 }],
      success_url: `${frontendUrl}/salons/${salon.slug}?joined=success`,
      cancel_url: `${frontendUrl}/salons/${salon.slug}?joined=canceled`,
      metadata: { type: 'salon', salonId, userId },
    });

    return { checkoutUrl: session.url };
  }

  /** Get salon posts (members only) */
  async getSalonPosts(salonId: string, userId: string, take = 20, skip = 0) {
    // Verify membership
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new NotFoundException('サロンが見つかりません');

    const isOwner = salon.ownerId === userId;
    if (!isOwner) {
      const member = await this.prisma.salonMember.findUnique({
        where: { salonId_userId: { salonId, userId } },
      });
      if (!member || member.status !== 'active') {
        throw new ForbiddenException('サロンメンバーのみ閲覧可能です');
      }
    }

    return this.prisma.salonPost.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  /** Create a salon post */
  async createSalonPost(
    salonId: string,
    authorId: string,
    dto: { content: string; imageUrl?: string },
  ) {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new NotFoundException('サロンが見つかりません');

    const isOwner = salon.ownerId === authorId;
    if (!isOwner) {
      const member = await this.prisma.salonMember.findUnique({
        where: { salonId_userId: { salonId, userId: authorId } },
      });
      if (!member || member.status !== 'active') {
        throw new ForbiddenException('サロンメンバーのみ投稿可能です');
      }
    }

    return this.prisma.salonPost.create({
      data: {
        salonId,
        authorId,
        content: dto.content,
        imageUrl: dto.imageUrl || null,
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  /** Handle salon subscription webhook */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.metadata?.type !== 'salon') return;

    const { salonId, userId } = session.metadata;
    if (!salonId || !userId) return;

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id: string })?.id;

    await this.prisma.salonMember.upsert({
      where: { salonId_userId: { salonId, userId } },
      create: {
        salonId,
        userId,
        stripeSubscriptionId: subscriptionId || null,
        status: 'active',
      },
      update: {
        stripeSubscriptionId: subscriptionId || null,
        status: 'active',
      },
    });

    // Notify salon owner
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (salon) {
      await this.prisma.notification.create({
        data: {
          userId: salon.ownerId,
          fromUserId: userId,
          type: 'SALON_JOIN',
        },
      });
    }
  }

  /** Get salons owned by user */
  async getOwnedSalons(userId: string) {
    return this.prisma.salon.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { members: true, posts: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get salons user is member of */
  async getMemberships(userId: string) {
    const memberships = await this.prisma.salonMember.findMany({
      where: { userId, status: 'active' },
      include: {
        salon: {
          include: {
            owner: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
            _count: { select: { members: true } },
          },
        },
      },
    });

    return memberships.map((m) => m.salon);
  }
}
