import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TippingService } from './tipping.service';
import { PrismaService } from '../prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  tip: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  notification: { create: jest.fn() },
};

const mockConstructEvent = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
  paymentIntents: { create: mockCreatePaymentIntent },
};

describe('TippingService', () => {
  let service: TippingService;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
      STRIPE_TIPPING_WEBHOOK_SECRET: 'whsec_tipping_fake',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TippingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TippingService>(TippingService);
    (service as any).stripe = mockStripe;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Webhook: handleWebhook', () => {
    it('should process valid payment_intent.succeeded for tip', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_tip_123',
            metadata: { type: 'tip', senderId: 'u1', receiverId: 'u2' },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockPrisma.tip.findUnique.mockResolvedValue({
        id: 'tip-1',
        stripePaymentId: 'pi_tip_123',
        senderId: 'u1',
        receiverId: 'u2',
        postId: null,
        status: 'pending',
      });
      mockPrisma.tip.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.handleWebhook(
        Buffer.from('raw-body'),
        'valid-sig',
      );

      expect(result).toEqual({ received: true });
      expect(mockConstructEvent).toHaveBeenCalledWith(
        Buffer.from('raw-body'),
        'valid-sig',
        'whsec_tipping_fake',
      );
      expect(mockPrisma.tip.update).toHaveBeenCalledWith({
        where: { id: 'tip-1' },
        data: { status: 'completed' },
      });
    });

    it('should throw BadRequestException on invalid signature', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook(Buffer.from('body'), 'bad-sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when webhook secret is missing', async () => {
      delete process.env.STRIPE_TIPPING_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TippingService,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const freshService = module.get<TippingService>(TippingService);
      (freshService as any).stripe = mockStripe;

      await expect(
        freshService.handleWebhook(Buffer.from('body'), 'sig'),
      ).rejects.toThrow('Webhook secret not configured');
    });

    it('should skip non-tip payment intents', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_other_123',
            metadata: { type: 'subscription' },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      const result = await service.handleWebhook(Buffer.from('body'), 'sig');

      expect(result).toEqual({ received: true });
      expect(mockPrisma.tip.findUnique).not.toHaveBeenCalled();
    });

    it('should handle idempotent tip confirmation (already completed)', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_dup_123',
            metadata: { type: 'tip' },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockPrisma.tip.findUnique.mockResolvedValue({
        id: 'tip-1',
        stripePaymentId: 'pi_dup_123',
        status: 'completed',
      });

      const result = await service.handleWebhook(Buffer.from('body'), 'sig');

      expect(result).toEqual({ received: true });
      expect(mockPrisma.tip.update).not.toHaveBeenCalled();
    });
  });

  describe('createTip', () => {
    it('should reject amount below 100', async () => {
      await expect(
        service.createTip('u1', { receiverId: 'u2', amount: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject amount above 100000', async () => {
      await expect(
        service.createTip('u1', { receiverId: 'u2', amount: 200000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject self-tipping', async () => {
      await expect(
        service.createTip('u1', { receiverId: 'u1', amount: 500 }),
      ).rejects.toThrow('自分自身にチップを送ることはできません');
    });

    it('should reject tip to non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createTip('u1', { receiverId: 'u2', amount: 500 }),
      ).rejects.toThrow('受取ユーザーが見つかりません');
    });

    it('should create tip and return clientSecret', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2' });
      mockCreatePaymentIntent.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'cs_123',
      });
      mockPrisma.tip.create.mockResolvedValue({ id: 'tip-1' });

      const result = await service.createTip('u1', {
        receiverId: 'u2',
        amount: 1000,
        message: 'GG!',
      });

      expect(result).toEqual({ tipId: 'tip-1', clientSecret: 'cs_123' });
      expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'jpy',
        metadata: {
          type: 'tip',
          senderId: 'u1',
          receiverId: 'u2',
          postId: '',
        },
      });
    });
  });
});
