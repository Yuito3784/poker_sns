import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaidContentService } from './paid-content.service';
import { PrismaService } from '../prisma.service';

const mockPrisma = {
  post: { create: jest.fn() },
  paidContent: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  contentPurchase: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  notification: { create: jest.fn() },
  creatorEarning: { create: jest.fn() },
  $transaction: jest.fn((cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma)),
};

const mockConstructEvent = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
  paymentIntents: { create: mockCreatePaymentIntent },
};

describe('PaidContentService', () => {
  let service: PaidContentService;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaidContentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaidContentService>(PaidContentService);
    (service as any).stripe = mockStripe;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Webhook: handleWebhook', () => {
    it('should process valid payment_intent.succeeded for paid_content', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_pc_123',
            metadata: {
              type: 'paid_content',
              buyerId: 'buyer-1',
              paidContentId: 'pc-1',
              postId: 'post-1',
            },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockPrisma.paidContent.findUnique.mockResolvedValue({
        id: 'pc-1',
        price: 500,
        post: { authorId: 'author-1', id: 'post-1' },
        postId: 'post-1',
      });
      mockPrisma.contentPurchase.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.handleWebhook(
        Buffer.from('raw-body'),
        'valid-sig',
      );

      expect(result).toEqual({ received: true });
      expect(mockConstructEvent).toHaveBeenCalledWith(
        Buffer.from('raw-body'),
        'valid-sig',
        'whsec_test_fake',
      );
      expect(mockPrisma.contentPurchase.create).toHaveBeenCalled();
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
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaidContentService,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const freshService = module.get<PaidContentService>(PaidContentService);
      (freshService as any).stripe = mockStripe;

      await expect(
        freshService.handleWebhook(Buffer.from('body'), 'sig'),
      ).rejects.toThrow('Webhook secret not configured');
    });

    it('should skip non-paid_content payment intents', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_other',
            metadata: { type: 'tip' },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      const result = await service.handleWebhook(Buffer.from('body'), 'sig');

      expect(result).toEqual({ received: true });
      expect(mockPrisma.paidContent.findUnique).not.toHaveBeenCalled();
    });

    it('should handle idempotent purchase (duplicate via unique constraint)', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_dup',
            metadata: {
              type: 'paid_content',
              buyerId: 'buyer-1',
              paidContentId: 'pc-1',
              postId: 'post-1',
            },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockPrisma.paidContent.findUnique.mockResolvedValue({
        id: 'pc-1',
        price: 500,
        post: { authorId: 'author-1', id: 'post-1' },
        postId: 'post-1',
      });
      // Simulate unique constraint violation
      mockPrisma.contentPurchase.create.mockRejectedValue(
        new Error('Unique constraint failed'),
      );

      const result = await service.handleWebhook(Buffer.from('body'), 'sig');

      expect(result).toEqual({ received: true });
    });
  });

  describe('createPaidPost', () => {
    it('should reject price below 100', async () => {
      await expect(
        service.createPaidPost('u1', { content: 'test', price: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject price above 50000', async () => {
      await expect(
        service.createPaidPost('u1', { content: 'test', price: 60000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('purchaseContent', () => {
    it('should reject self-purchase', async () => {
      mockPrisma.paidContent.findUnique.mockResolvedValue({
        id: 'pc-1',
        post: { authorId: 'u1' },
      });

      await expect(
        service.purchaseContent('u1', 'pc-1'),
      ).rejects.toThrow('自分のコンテンツは購入できません');
    });

    it('should reject already purchased content', async () => {
      mockPrisma.paidContent.findUnique.mockResolvedValue({
        id: 'pc-1',
        post: { authorId: 'u2' },
      });
      mockPrisma.contentPurchase.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.purchaseContent('u1', 'pc-1'),
      ).rejects.toThrow('既に購入済みです');
    });

    it('should reject non-existent content', async () => {
      mockPrisma.paidContent.findUnique.mockResolvedValue(null);

      await expect(
        service.purchaseContent('u1', 'pc-nonexist'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
