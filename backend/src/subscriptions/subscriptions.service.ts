import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
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

    // 既に有効なサブスクまたは解約予定（期間終了まで有効）の場合は二重加入を防ぐ
    if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'canceled') {
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
      try {
        const customer = await this.getStripe().customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await this.prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`createCheckoutSession customers.create failed userId=${userId}: ${msg}`, err instanceof Error ? err.stack : undefined);
        throw new BadRequestException('お客様情報の登録に失敗しました。しばらくしてからお試しください');
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const session = await this.getStripe().checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${frontendUrl}/settings?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/settings?subscription=canceled`,
        metadata: { userId, plan, type: 'subscription' },
        subscription_data: {
          metadata: {
            userId,
            plan,
            type: 'subscription',
          },
        },
      });
      return { checkoutUrl: session.url };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`createCheckoutSession failed userId=${userId}: ${msg}`, err instanceof Error ? err.stack : undefined);
      throw new BadRequestException('チェックアウトの作成に失敗しました。しばらくしてからお試しください');
    }
  }

  async cancelSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeSubscriptionId) {
      throw new BadRequestException('アクティブなサブスクリプションがありません');
    }

    let subscription: Stripe.Subscription;
    try {
      subscription = await this.getStripe().subscriptions.update(
        user.stripeSubscriptionId,
        { cancel_at_period_end: true },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`cancelSubscription Stripe failed userId=${userId}: ${msg}`, err instanceof Error ? err.stack : undefined);
      throw new BadRequestException('解約処理に失敗しました。しばらくしてからお試しください');
    }

    const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
    const periodEndDate = periodEnd ? new Date(periodEnd * 1000) : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'canceled',
        subscriptionPeriodEnd: periodEndDate,
      },
    });

    return {
      message: 'サブスクリプションは現在の期間終了時にキャンセルされます。',
      periodEnd: periodEndDate?.toISOString() ?? null,
    };
  }

  async reactivateSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeSubscriptionId) {
      throw new BadRequestException('サブスクリプションがありません');
    }

    try {
      await this.getStripe().subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`reactivateSubscription Stripe failed userId=${userId}: ${msg}`, err instanceof Error ? err.stack : undefined);
      throw new BadRequestException('再開処理に失敗しました。しばらくしてからお試しください');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'active' },
    });

    return { message: 'サブスクリプションが再開されました。' };
  }

  /**
   * 成功画面から呼ばれるフォールバック。Stripe Checkout Session を検証し、未反映なら User を更新する。
   * Webhook が届いていない環境（ローカルなど）でも課金状態を確実に反映する。
   * sessionId が省略された場合は Stripe API で最新の完了済みセッションを検索する。
   */
  async confirmCheckoutSession(userId: string, sessionId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    let session: Stripe.Checkout.Session | null = null;

    if (sessionId) {
      // session_id が渡された場合は直接取得
      try {
        session = await this.getStripe().checkout.sessions.retrieve(sessionId, {
          expand: ['subscription'],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`confirmCheckoutSession: Stripe retrieve failed for session=${sessionId?.slice(0, 12)}... userId=${userId}: ${msg}`);
        // session_id で取得失敗した場合は customer ベースのフォールバックへ
        session = null;
      }
    }

    // session_id がないか取得失敗した場合: customer から最新セッションを検索
    if (!session && user.stripeCustomerId) {
      try {
        const sessions = await this.getStripe().checkout.sessions.list({
          customer: user.stripeCustomerId,
          limit: 5,
          expand: ['data.subscription'],
        });
        session = sessions.data.find(
          (s) => s.status === 'complete' && s.metadata?.userId === userId,
        ) ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`confirmCheckoutSession: Stripe sessions.list failed userId=${userId}: ${msg}`);
      }
    }

    if (!session) {
      throw new BadRequestException('有効なチェックアウトセッションが見つかりません。しばらくしてからお試しください');
    }

    const metadata = session.metadata as Record<string, string> | null;
    const sessionUserId = metadata?.userId;
    if (sessionUserId !== userId) {
      throw new BadRequestException('このチェックアウトセッションはあなたのものではありません');
    }
    if (session.status !== 'complete') {
      throw new BadRequestException('チェックアウトが完了していません');
    }
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id: string } | null)?.id ?? null;
    const plan = (metadata?.plan as 'monthly' | 'annual' | undefined) ?? null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: (session.customer as string) ?? user.stripeCustomerId,
        stripeSubscriptionId: subscriptionId || undefined,
        subscriptionStatus: 'active',
        subscriptionPlan: plan ?? undefined,
      },
    });

    return this.getStatus(userId);
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionPeriodEnd: true,
        stripeSubscriptionId: true,
        subscriptionPlan: true,
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
      plan: user.subscriptionPlan ?? null,
    };
  }

  async createPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      throw new BadRequestException('Stripeカスタマーが見つかりません');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const session = await this.getStripe().billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${frontendUrl}/settings`,
      });
      return { portalUrl: session.url };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`createPortalSession failed userId=${userId}: ${msg}`, err instanceof Error ? err.stack : undefined);
      throw new BadRequestException('支払い管理ページの作成に失敗しました。しばらくしてからお試しください');
    }
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`handleWebhook: signature verification failed: ${msg}`);
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
    // プレミアムサブスクの checkout のみ処理（サロン type:'salon' 等はスキップ）
    if (session.metadata?.type !== 'subscription') return;
    const userId = session.metadata?.userId;
    if (!userId) return;

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    const plan = (session.metadata?.plan as 'monthly' | 'annual' | undefined) ?? null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId || null,
        subscriptionStatus: 'active',
        subscriptionPlan: plan ?? undefined,
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

    // サロンの invoice を誤処理しない — ユーザーのプレミアムサブスクのみ対象
    const rawSub = (invoice as unknown as Record<string, unknown>).subscription;
    const invoiceSubId =
      typeof rawSub === 'string'
        ? rawSub
        : (rawSub as { id: string } | null)?.id;

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
    if (!user) return;

    // サロン用サブスクの invoice はスキップ（ユーザーのプレミアムサブスクIDと一致する場合のみ処理）
    if (invoiceSubId && user.stripeSubscriptionId && invoiceSubId !== user.stripeSubscriptionId) {
      return;
    }

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

    // サロンの invoice はスキップ
    const rawSub = (invoice as unknown as Record<string, unknown>).subscription;
    const invoiceSubId =
      typeof rawSub === 'string'
        ? rawSub
        : (rawSub as { id: string } | null)?.id;

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
    if (!user) return;

    if (invoiceSubId && user.stripeSubscriptionId && invoiceSubId !== user.stripeSubscriptionId) {
      return;
    }

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

    // サロン用サブスクの更新イベントはスキップ
    if (user.stripeSubscriptionId && subscription.id !== user.stripeSubscriptionId) {
      return;
    }

    const sub = subscription as unknown as {
      cancel_at_period_end: boolean;
      current_period_end: number;
    };
    const status = sub.cancel_at_period_end ? 'canceled' : 'active';
    const plan =
      (subscription.metadata?.plan as 'monthly' | 'annual' | undefined) ?? null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: status,
        subscriptionPeriodEnd: new Date(sub.current_period_end * 1000),
        subscriptionPlan: plan ?? undefined,
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

    // サロン用サブスクの削除イベントはスキップ
    if (user.stripeSubscriptionId && subscription.id !== user.stripeSubscriptionId) {
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'free',
        stripeSubscriptionId: null,
        subscriptionPeriodEnd: null,
        subscriptionPlan: null,
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
