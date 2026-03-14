import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma.service';

// ---------------------------------------------------------------------------
// Stripe mock
// ---------------------------------------------------------------------------
const mockStripeWebhooks = {
  constructEvent: jest.fn(),
};

const mockStripeCustomers = { create: jest.fn() };
const mockStripeCheckoutSessions = { create: jest.fn() };
const mockStripeSubscriptions = { update: jest.fn() };
const mockStripeBillingPortalSessions = { create: jest.fn() };

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: mockStripeWebhooks,
    customers: mockStripeCustomers,
    checkout: { sessions: mockStripeCheckoutSessions },
    subscriptions: mockStripeSubscriptions,
    billingPortal: { sessions: mockStripeBillingPortalSessions },
  }));
});

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  subscriptionEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FAKE_USER_ID = 'user-001';
const FAKE_CUSTOMER_ID = 'cus_test123';
const FAKE_SUBSCRIPTION_ID = 'sub_test456';

/** Build a minimal Stripe-like event object */
function buildEvent(
  type: string,
  dataObject: Record<string, unknown>,
  id = `evt_${Date.now()}`,
): { id: string; type: string; data: { object: Record<string, unknown> } } {
  return { id, type, data: { object: dataObject } };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_PRICE_ID = 'price_test';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. Webhook signature validation
  // =========================================================================
  describe('handleWebhook – signature validation', () => {
    it('should return 400 when signature is invalid', async () => {
      mockStripeWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook(Buffer.from('{}'), 'bad_sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return 400 when STRIPE_WEBHOOK_SECRET is missing', async () => {
      const original = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      // Re-instantiate to pick up missing secret
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SubscriptionsService,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();
      const svc = module.get<SubscriptionsService>(SubscriptionsService);

      await expect(
        svc.handleWebhook(Buffer.from('{}'), 'sig'),
      ).rejects.toThrow(BadRequestException);

      process.env.STRIPE_WEBHOOK_SECRET = original;
    });
  });

  // =========================================================================
  // 2. Idempotency (duplicate event)
  // =========================================================================
  describe('handleWebhook – idempotency', () => {
    it('should skip processing when stripeEventId already exists', async () => {
      const event = buildEvent('checkout.session.completed', {
        metadata: { userId: FAKE_USER_ID },
        customer: FAKE_CUSTOMER_ID,
        subscription: FAKE_SUBSCRIPTION_ID,
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue({
        id: 'existing',
        stripeEventId: event.id,
      });

      const result = await service.handleWebhook(
        Buffer.from('{}'),
        'valid_sig',
      );

      expect(result).toEqual({ received: true });
      // user.update should NOT be called because event was already processed
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.subscriptionEvent.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. checkout.session.completed
  // =========================================================================
  describe('handleWebhook – checkout.session.completed', () => {
    it('should set user status to active and store stripe IDs', async () => {
      const event = buildEvent('checkout.session.completed', {
        metadata: { userId: FAKE_USER_ID, plan: 'monthly', type: 'subscription' },
        customer: FAKE_CUSTOMER_ID,
        subscription: FAKE_SUBSCRIPTION_ID,
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.subscriptionEvent.create.mockResolvedValue({});

      const result = await service.handleWebhook(
        Buffer.from('{}'),
        'valid_sig',
      );

      expect(result).toEqual({ received: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: FAKE_USER_ID },
        data: {
          stripeCustomerId: FAKE_CUSTOMER_ID,
          stripeSubscriptionId: FAKE_SUBSCRIPTION_ID,
          subscriptionStatus: 'active',
          subscriptionPlan: 'monthly',
        },
      });
      expect(mockPrisma.subscriptionEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: FAKE_USER_ID,
          eventType: 'checkout.session.completed',
          status: 'active',
        }),
      });
    });

    it('should skip when metadata.userId is missing', async () => {
      const event = buildEvent('checkout.session.completed', {
        metadata: {},
        customer: FAKE_CUSTOMER_ID,
        subscription: FAKE_SUBSCRIPTION_ID,
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should skip when metadata.type is not subscription (e.g. salon)', async () => {
      const event = buildEvent('checkout.session.completed', {
        metadata: { userId: FAKE_USER_ID, type: 'salon', salonId: 'salon-1' },
        customer: FAKE_CUSTOMER_ID,
        subscription: 'sub_salon',
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. invoice.paid
  // =========================================================================
  describe('handleWebhook – invoice.paid', () => {
    it('should set status to active and update subscriptionPeriodEnd', async () => {
      const periodEndTs = Math.floor(Date.now() / 1000) + 30 * 86400;
      const event = buildEvent('invoice.paid', {
        customer: FAKE_CUSTOMER_ID,
        lines: { data: [{ period: { end: periodEndTs } }] },
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeCustomerId: FAKE_CUSTOMER_ID,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.subscriptionEvent.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: FAKE_USER_ID },
        data: {
          subscriptionStatus: 'active',
          subscriptionPeriodEnd: new Date(periodEndTs * 1000),
        },
      });
    });

    it('should skip when customer not found in DB', async () => {
      const event = buildEvent('invoice.paid', {
        customer: 'cus_unknown',
        lines: { data: [] },
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. invoice.payment_failed
  // =========================================================================
  describe('handleWebhook – invoice.payment_failed', () => {
    it('should set user status to past_due', async () => {
      const event = buildEvent('invoice.payment_failed', {
        customer: FAKE_CUSTOMER_ID,
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeCustomerId: FAKE_CUSTOMER_ID,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.subscriptionEvent.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: FAKE_USER_ID },
        data: { subscriptionStatus: 'past_due' },
      });
      expect(mockPrisma.subscriptionEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: FAKE_USER_ID,
          eventType: 'invoice.payment_failed',
          status: 'past_due',
        }),
      });
    });

    it('should skip when customer not found in DB', async () => {
      const event = buildEvent('invoice.payment_failed', {
        customer: 'cus_unknown',
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should be idempotent for duplicate payment_failed events', async () => {
      const event = buildEvent(
        'invoice.payment_failed',
        { customer: FAKE_CUSTOMER_ID },
        'evt_duplicate_pf',
      );
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue({
        id: 'existing',
        stripeEventId: 'evt_duplicate_pf',
      });

      const result = await service.handleWebhook(
        Buffer.from('{}'),
        'valid_sig',
      );

      expect(result).toEqual({ received: true });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. customer.subscription.updated
  // =========================================================================
  describe('handleWebhook – customer.subscription.updated', () => {
    it('should set status to canceled when cancel_at_period_end is true', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 15 * 86400;
      const event = buildEvent('customer.subscription.updated', {
        customer: FAKE_CUSTOMER_ID,
        cancel_at_period_end: true,
        current_period_end: periodEnd,
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeCustomerId: FAKE_CUSTOMER_ID,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.subscriptionEvent.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: FAKE_USER_ID },
        data: {
          subscriptionStatus: 'canceled',
          subscriptionPeriodEnd: new Date(periodEnd * 1000),
        },
      });
    });

    it('should set status to active when cancel_at_period_end is false', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
      const event = buildEvent('customer.subscription.updated', {
        customer: FAKE_CUSTOMER_ID,
        cancel_at_period_end: false,
        current_period_end: periodEnd,
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeCustomerId: FAKE_CUSTOMER_ID,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.subscriptionEvent.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: FAKE_USER_ID },
        data: {
          subscriptionStatus: 'active',
          subscriptionPeriodEnd: new Date(periodEnd * 1000),
        },
      });
    });
  });

  // =========================================================================
  // 7. customer.subscription.deleted
  // =========================================================================
  describe('handleWebhook – customer.subscription.deleted', () => {
    it('should set status to free and clear stripe fields', async () => {
      const event = buildEvent('customer.subscription.deleted', {
        customer: FAKE_CUSTOMER_ID,
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeCustomerId: FAKE_CUSTOMER_ID,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.subscriptionEvent.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: FAKE_USER_ID },
        data: {
          subscriptionStatus: 'free',
          stripeSubscriptionId: null,
          subscriptionPeriodEnd: null,
          subscriptionPlan: null,
        },
      });
      expect(mockPrisma.subscriptionEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: FAKE_USER_ID,
          eventType: 'customer.subscription.deleted',
          status: 'free',
        }),
      });
    });

    it('should skip when customer not found in DB', async () => {
      const event = buildEvent('customer.subscription.deleted', {
        customer: 'cus_ghost',
      });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. Unhandled event types
  // =========================================================================
  describe('handleWebhook – unhandled event type', () => {
    it('should return received:true without processing unknown events', async () => {
      const event = buildEvent('payment_intent.succeeded', { amount: 980 });
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);

      const result = await service.handleWebhook(
        Buffer.from('{}'),
        'valid_sig',
      );

      expect(result).toEqual({ received: true });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.subscriptionEvent.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. createCheckoutSession
  // =========================================================================
  describe('createCheckoutSession', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession(FAKE_USER_ID),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when user already active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        subscriptionStatus: 'active',
      });

      await expect(
        service.createCheckoutSession(FAKE_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user is canceled (period not ended)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        subscriptionStatus: 'canceled',
      });

      await expect(
        service.createCheckoutSession(FAKE_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create checkout session for free user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        email: 'test@example.com',
        subscriptionStatus: 'free',
        stripeCustomerId: null,
      });
      mockStripeCustomers.create.mockResolvedValue({
        id: FAKE_CUSTOMER_ID,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockStripeCheckoutSessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      const result = await service.createCheckoutSession(FAKE_USER_ID);

      expect(result).toEqual({
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test',
      });
      expect(mockStripeCustomers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { userId: FAKE_USER_ID },
      });
    });

    it('should reuse existing stripeCustomerId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        email: 'test@example.com',
        subscriptionStatus: 'free',
        stripeCustomerId: FAKE_CUSTOMER_ID,
      });
      mockStripeCheckoutSessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession(FAKE_USER_ID);

      expect(mockStripeCustomers.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 10. cancelSubscription
  // =========================================================================
  describe('cancelSubscription', () => {
    it('should throw BadRequestException when no active subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeSubscriptionId: null,
      });

      await expect(
        service.cancelSubscription(FAKE_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel at period end and update status', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 20 * 86400;
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeSubscriptionId: FAKE_SUBSCRIPTION_ID,
      });
      mockStripeSubscriptions.update.mockResolvedValue({
        current_period_end: periodEnd,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.cancelSubscription(FAKE_USER_ID);

      expect(mockStripeSubscriptions.update).toHaveBeenCalledWith(
        FAKE_SUBSCRIPTION_ID,
        { cancel_at_period_end: true },
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: FAKE_USER_ID },
        data: {
          subscriptionStatus: 'canceled',
          subscriptionPeriodEnd: expect.any(Date),
        },
      });
      expect(result.periodEnd).toBeDefined();
    });
  });

  // =========================================================================
  // 11. reactivateSubscription
  // =========================================================================
  describe('reactivateSubscription', () => {
    it('should throw BadRequestException when no subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeSubscriptionId: null,
      });

      await expect(
        service.reactivateSubscription(FAKE_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reactivate and set status to active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeSubscriptionId: FAKE_SUBSCRIPTION_ID,
      });
      mockStripeSubscriptions.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.reactivateSubscription(FAKE_USER_ID);

      expect(mockStripeSubscriptions.update).toHaveBeenCalledWith(
        FAKE_SUBSCRIPTION_ID,
        { cancel_at_period_end: false },
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: FAKE_USER_ID },
        data: { subscriptionStatus: 'active' },
      });
      expect(result.message).toContain('再開');
    });
  });

  // =========================================================================
  // 12. getStatus
  // =========================================================================
  describe('getStatus', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getStatus(FAKE_USER_ID)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return status with cancelAtPeriodEnd=true for canceled with subscription and include plan', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        subscriptionStatus: 'canceled',
        subscriptionPeriodEnd: new Date('2026-04-01'),
        stripeSubscriptionId: FAKE_SUBSCRIPTION_ID,
        subscriptionPlan: 'monthly',
      });

      const result = await service.getStatus(FAKE_USER_ID);

      expect(result.status).toBe('canceled');
      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(result.periodEnd).toBeTruthy();
      expect(result.plan).toBe('monthly');
    });

    it('should return status with cancelAtPeriodEnd=false for active user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: new Date('2026-04-01'),
        stripeSubscriptionId: FAKE_SUBSCRIPTION_ID,
      });

      const result = await service.getStatus(FAKE_USER_ID);

      expect(result.status).toBe('active');
      expect(result.cancelAtPeriodEnd).toBe(false);
    });
  });

  // =========================================================================
  // 13. createPortalSession
  // =========================================================================
  describe('createPortalSession', () => {
    it('should throw BadRequestException when no stripeCustomerId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeCustomerId: null,
      });

      await expect(
        service.createPortalSession(FAKE_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return portal URL', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: FAKE_USER_ID,
        stripeCustomerId: FAKE_CUSTOMER_ID,
      });
      mockStripeBillingPortalSessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/session/xxx',
      });

      const result = await service.createPortalSession(FAKE_USER_ID);

      expect(result).toEqual({
        portalUrl: 'https://billing.stripe.com/session/xxx',
      });
    });
  });
});
