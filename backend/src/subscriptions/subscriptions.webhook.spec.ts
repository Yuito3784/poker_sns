import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma.service';

/**
 * セキュリティテスト: Stripe Webhook (4件)
 * qa-report.md セクション 3.6 に対応
 */

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

// Stripe SDK モック
const mockConstructEvent = jest.fn();
const mockStripe = {
  webhooks: {
    constructEvent: mockConstructEvent,
  },
};

describe('Security: Stripe Webhook (3.6.1-3.6.4)', () => {
  let service: SubscriptionsService;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);

    // Stripe SDK の内部インスタンスをモックに差し替え
    (service as any).stripe = mockStripe;

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // 3.6.1: 有効な署名でwebhookイベント処理成功
  it('3.6.1: valid signature should process event and return { received: true }', async () => {
    const mockEvent = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: 'user-1' },
          customer: 'cus_test',
          subscription: 'sub_test',
        },
      },
    };

    mockConstructEvent.mockReturnValue(mockEvent);
    mockPrisma.subscriptionEvent.findUnique.mockResolvedValue(null);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.subscriptionEvent.create.mockResolvedValue({});

    const result = await service.handleWebhook(
      Buffer.from('raw-body'),
      'valid-signature',
    );

    expect(result).toEqual({ received: true });
    expect(mockConstructEvent).toHaveBeenCalledWith(
      Buffer.from('raw-body'),
      'valid-signature',
      'whsec_test_fake',
    );
  });

  // 3.6.2: 無効な署名で BadRequestException
  it('3.6.2: invalid signature should throw BadRequestException', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await expect(
      service.handleWebhook(Buffer.from('raw-body'), 'invalid-signature'),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.handleWebhook(Buffer.from('raw-body'), 'invalid-signature'),
    ).rejects.toThrow('Invalid webhook signature');
  });

  // 3.6.3: STRIPE_WEBHOOK_SECRET 未設定で BadRequestException
  it('3.6.3: missing STRIPE_WEBHOOK_SECRET should throw BadRequestException', async () => {
    // STRIPE_WEBHOOK_SECRET を削除
    delete process.env.STRIPE_WEBHOOK_SECRET;

    // handleWebhook 内で process.env.STRIPE_WEBHOOK_SECRET を読むので直接テスト
    // サービスを再作成する必要あり
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    const freshService = module.get<SubscriptionsService>(SubscriptionsService);
    (freshService as any).stripe = mockStripe;

    await expect(
      freshService.handleWebhook(Buffer.from('body'), 'sig'),
    ).rejects.toThrow(BadRequestException);

    await expect(
      freshService.handleWebhook(Buffer.from('body'), 'sig'),
    ).rejects.toThrow('Webhook secret not configured');
  });

  // 3.6.4: 重複イベントのべき等処理
  it('3.6.4: duplicate event should return { received: true } without reprocessing', async () => {
    const mockEvent = {
      id: 'evt_duplicate_123',
      type: 'checkout.session.completed',
      data: { object: {} },
    };

    mockConstructEvent.mockReturnValue(mockEvent);
    // 既存イベントが見つかる（重複）
    mockPrisma.subscriptionEvent.findUnique.mockResolvedValue({
      id: 'existing',
      stripeEventId: 'evt_duplicate_123',
    });

    const result = await service.handleWebhook(
      Buffer.from('raw-body'),
      'valid-signature',
    );

    expect(result).toEqual({ received: true });
    // user.update が呼ばれないことを確認（再処理されていない）
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.subscriptionEvent.create).not.toHaveBeenCalled();
  });
});
