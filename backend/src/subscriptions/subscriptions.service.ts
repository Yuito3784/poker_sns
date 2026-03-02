import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
    }
    return this.stripe;
  }

  async createCheckoutSession(userId: string, plan: 'monthly' | 'annual' = 'monthly') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (user.subscriptionStatus === 'active') {
      throw new BadRequestException('既にプレミアム会員です');
    }

    const priceId =
      plan === 'annual'
        ? process.env.STRIPE_ANNUAL_PRICE_ID
        : process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      throw new BadRequestException(
        `${plan === 'annual' ? '年間' : '月額'}プランが設定されていません`,
      );
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.getStripe().customers.create({
        email: user.email,
        metadata: { userId: user.id },
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
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/settings?subscription=success`,
      cancel_url: `${frontendUrl}/settings?subscription=canceled`,
      metadata: { userId, plan },
    });

    return { checkoutUrl: session.url };
  }

  async cancelSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeSubscriptionId) {
      throw new BadRequestException('アクティブなサブスクリプションがありません');
    }

    const subscription = await this.getStripe().subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'canceled' },
    });

    const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

    return {
      message: 'サブスクリプションは現在の期間終了時にキャンセルされます。',
      periodEnd: new Date(periodEnd * 1000).toISOString(),
    };
  }

  async reactivateSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeSubscriptionId) {
      throw new BadRequestException('サブスクリプションがありません');
    }

    await this.getStripe().subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'active' },
    });

    return { message: 'サブスクリプションが再開されました。' };
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionPeriodEnd: true,
        stripeSubscriptionId: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    let cancelAtPeriodEnd = false;
    if (user.stripeSubscriptionId && user.subscriptionStatus === 'canceled') {
      cancelAtPeriodEnd = true;
    }

    return {
      status: user.subscriptionStatus,
      periodEnd: user.subscriptionPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd,
    };
  }

  async createPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      throw new BadRequestException('Stripeカスタマーが見つかりません');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await this.getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/settings`,
    });

    return { portalUrl: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Idempotency check
    const existing = await this.prisma.subscriptionEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing) return { received: true };

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (!userId) return;

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId || null,
        subscriptionStatus: 'active',
      },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        userId,
        stripeEventId: event.id,
        eventType: event.type,
        status: 'active',
      },
    });
  }

  private async handleInvoicePaid(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
    if (!customerId) return;

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
    if (!user) return;

    const periodEnd = invoice.lines.data[0]?.period?.end;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: periodEnd
          ? new Date(periodEnd * 1000)
          : undefined,
      },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        userId: user.id,
        stripeEventId: event.id,
        eventType: event.type,
        status: 'active',
      },
    });
  }

  private async handleInvoicePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
    if (!customerId) return;

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
    if (!user) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: 'past_due' },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        userId: user.id,
        stripeEventId: event.id,
        eventType: event.type,
        status: 'past_due',
      },
    });
  }

  private async handleSubscriptionUpdated(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;
    if (!customerId) return;

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
    if (!user) return;

    const sub = subscription as unknown as {
      cancel_at_period_end: boolean;
      current_period_end: number;
    };
    const status = sub.cancel_at_period_end ? 'canceled' : 'active';

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: status,
        subscriptionPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        userId: user.id,
        stripeEventId: event.id,
        eventType: event.type,
        status,
      },
    });
  }

  private async handleSubscriptionDeleted(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;
    if (!customerId) return;

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
    if (!user) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'free',
        stripeSubscriptionId: null,
        subscriptionPeriodEnd: null,
      },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        userId: user.id,
        stripeEventId: event.id,
        eventType: event.type,
        status: 'free',
      },
    });
  }
}
