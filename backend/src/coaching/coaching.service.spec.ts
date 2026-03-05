import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CoachingService } from './coaching.service';
import { PrismaService } from '../prisma.service';

const mockPrisma = {
  coachProfile: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  coachBooking: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  notification: { create: jest.fn() },
};

const mockConstructEvent = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
  paymentIntents: { create: mockCreatePaymentIntent },
};

describe('CoachingService', () => {
  let service: CoachingService;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoachingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CoachingService>(CoachingService);
    (service as any).stripe = mockStripe;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Webhook: handleWebhook', () => {
    it('should process valid payment_intent.succeeded for coaching', async () => {
      const scheduledAt = new Date(Date.now() + 86400000).toISOString();
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_coach_123',
            amount: 5000,
            metadata: {
              type: 'coaching',
              coachId: 'coach-1',
              studentId: 'student-1',
              scheduledAt,
              durationMinutes: '60',
            },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockPrisma.coachProfile.findUnique.mockResolvedValue({
        id: 'coach-1',
        userId: 'coach-user-1',
      });
      mockPrisma.coachBooking.create.mockResolvedValue({});
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
      expect(mockPrisma.coachBooking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          coachId: 'coach-1',
          studentId: 'student-1',
          amount: 5000,
          stripePaymentId: 'pi_coach_123',
          status: 'confirmed',
        }),
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
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CoachingService,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const freshService = module.get<CoachingService>(CoachingService);
      (freshService as any).stripe = mockStripe;

      await expect(
        freshService.handleWebhook(Buffer.from('body'), 'sig'),
      ).rejects.toThrow('Webhook secret not configured');
    });

    it('should skip non-coaching payment intents', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_other', metadata: { type: 'tip' } },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      const result = await service.handleWebhook(Buffer.from('body'), 'sig');

      expect(result).toEqual({ received: true });
      expect(mockPrisma.coachBooking.create).not.toHaveBeenCalled();
    });

    it('should handle idempotent booking (already exists)', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_dup',
            amount: 5000,
            metadata: {
              type: 'coaching',
              coachId: 'coach-1',
              studentId: 'student-1',
              scheduledAt: new Date().toISOString(),
              durationMinutes: '60',
            },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockPrisma.coachProfile.findUnique.mockResolvedValue({
        id: 'coach-1',
        userId: 'coach-user-1',
      });
      mockPrisma.coachBooking.create.mockRejectedValue(
        new Error('Unique constraint failed'),
      );

      const result = await service.handleWebhook(Buffer.from('body'), 'sig');
      expect(result).toEqual({ received: true });
    });
  });

  describe('bookSession', () => {
    it('should reject booking non-existent coach', async () => {
      mockPrisma.coachProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.bookSession('student-1', 'coach-nonexist', {
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject self-booking', async () => {
      mockPrisma.coachProfile.findUnique.mockResolvedValue({
        id: 'coach-1',
        userId: 'u1',
        isActive: true,
        hourlyRate: 5000,
      });

      await expect(
        service.bookSession('u1', 'coach-1', {
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow('自分自身を予約することはできません');
    });

    it('should reject past scheduled date', async () => {
      mockPrisma.coachProfile.findUnique.mockResolvedValue({
        id: 'coach-1',
        userId: 'coach-user',
        isActive: true,
        hourlyRate: 5000,
      });

      await expect(
        service.bookSession('student-1', 'coach-1', {
          scheduledAt: '2020-01-01T00:00:00Z',
        }),
      ).rejects.toThrow('予約日時は未来の日時を指定してください');
    });

    it('should calculate correct amount for custom duration', async () => {
      mockPrisma.coachProfile.findUnique.mockResolvedValue({
        id: 'coach-1',
        userId: 'coach-user',
        isActive: true,
        hourlyRate: 6000,
      });
      mockCreatePaymentIntent.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'cs_123',
      });

      const result = await service.bookSession('student-1', 'coach-1', {
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 90,
      });

      // 6000 * 90 / 60 = 9000
      expect(result.amount).toBe(9000);
      expect(mockCreatePaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 9000, currency: 'jpy' }),
      );
    });

    it('should reject booking inactive coach', async () => {
      mockPrisma.coachProfile.findUnique.mockResolvedValue({
        id: 'coach-1',
        userId: 'coach-user',
        isActive: false,
        hourlyRate: 5000,
      });

      await expect(
        service.bookSession('student-1', 'coach-1', {
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCoachProfile', () => {
    it('should reject hourly rate below 500', async () => {
      await expect(
        service.createCoachProfile('u1', {
          title: 'Coach',
          description: 'desc',
          hourlyRate: 100,
          specialties: 'NLH',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject hourly rate above 100000', async () => {
      await expect(
        service.createCoachProfile('u1', {
          title: 'Coach',
          description: 'desc',
          hourlyRate: 200000,
          specialties: 'NLH',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate coach profile', async () => {
      mockPrisma.coachProfile.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createCoachProfile('u1', {
          title: 'Coach',
          description: 'desc',
          hourlyRate: 5000,
          specialties: 'NLH',
        }),
      ).rejects.toThrow('既にコーチプロフィールが存在します');
    });
  });
});
