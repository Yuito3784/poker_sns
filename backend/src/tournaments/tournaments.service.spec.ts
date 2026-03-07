import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma.service';

const mockPrisma = {
  tournament: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  tournamentParticipant: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  notification: { create: jest.fn() },
};

const mockConstructEvent = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
  paymentIntents: { create: mockCreatePaymentIntent },
  products: { create: jest.fn() },
  prices: { create: jest.fn() },
};

describe('TournamentsService', () => {
  let service: TournamentsService;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
    (service as any).stripe = mockStripe;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Webhook: handleWebhook', () => {
    it('should process valid payment_intent.succeeded for tournament', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_tourney_123',
            metadata: {
              type: 'tournament',
              tournamentId: 't-1',
              userId: 'u1',
            },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockPrisma.tournamentParticipant.create.mockResolvedValue({});
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: 't-1',
        organizerId: 'org-1',
      });
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
      expect(mockPrisma.tournamentParticipant.create).toHaveBeenCalledWith({
        data: {
          tournamentId: 't-1',
          userId: 'u1',
          stripePaymentId: 'pi_tourney_123',
          status: 'registered',
        },
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
          TournamentsService,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const freshService = module.get<TournamentsService>(TournamentsService);
      (freshService as any).stripe = mockStripe;

      await expect(
        freshService.handleWebhook(Buffer.from('body'), 'sig'),
      ).rejects.toThrow('Webhook secret not configured');
    });

    it('should skip non-tournament payment intents', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_other', metadata: { type: 'tip' } },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      const result = await service.handleWebhook(Buffer.from('body'), 'sig');

      expect(result).toEqual({ received: true });
      expect(mockPrisma.tournamentParticipant.create).not.toHaveBeenCalled();
    });

    it('should handle idempotent registration (already registered)', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_dup',
            metadata: { type: 'tournament', tournamentId: 't-1', userId: 'u1' },
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockPrisma.tournamentParticipant.create.mockRejectedValue(
        new Error('Unique constraint failed'),
      );

      const result = await service.handleWebhook(Buffer.from('body'), 'sig');
      expect(result).toEqual({ received: true });
    });
  });

  describe('registerForTournament', () => {
    it('should reject registration to non-existent tournament', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.registerForTournament('u1', 't-nonexist'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject registration when tournament is not upcoming', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'completed',
        _count: { participants: 0 },
      });

      await expect(
        service.registerForTournament('u1', 't-1'),
      ).rejects.toThrow('このトーナメントは参加受付を終了しています');
    });

    it('should reject when tournament is full', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'upcoming',
        maxPlayers: 10,
        organizerId: 'org-1',
        _count: { participants: 10 },
      });

      await expect(
        service.registerForTournament('u1', 't-1'),
      ).rejects.toThrow('定員に達しています');
    });

    it('should reject organizer self-registration', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'upcoming',
        maxPlayers: 10,
        organizerId: 'u1',
        _count: { participants: 5 },
      });

      await expect(
        service.registerForTournament('u1', 't-1'),
      ).rejects.toThrow('主催者は自分のトーナメントに参加できません');
    });

    it('should reject duplicate registration', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'upcoming',
        maxPlayers: 10,
        organizerId: 'org-1',
        entryFee: 0,
        _count: { participants: 5 },
      });
      mockPrisma.tournamentParticipant.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.registerForTournament('u1', 't-1'),
      ).rejects.toThrow('既に参加登録済みです');
    });

    it('should register directly for free tournament', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'upcoming',
        maxPlayers: 10,
        organizerId: 'org-1',
        entryFee: 0,
        _count: { participants: 5 },
      });
      mockPrisma.tournamentParticipant.findUnique.mockResolvedValue(null);
      mockPrisma.tournamentParticipant.create.mockResolvedValue({
        id: 'tp-1',
        status: 'registered',
      });
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.registerForTournament('u1', 't-1');
      expect(result.paymentRequired).toBe(false);
    });
  });

  describe('createTournament', () => {
    it('should reject negative entry fee', async () => {
      await expect(
        service.createTournament('u1', {
          name: 'Test',
          description: 'desc',
          entryFee: -100,
          maxPlayers: 10,
          startAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject past start date', async () => {
      await expect(
        service.createTournament('u1', {
          name: 'Test',
          description: 'desc',
          entryFee: 1000,
          maxPlayers: 10,
          startAt: '2020-01-01T00:00:00Z',
        }),
      ).rejects.toThrow('開始日時は未来の日時を指定してください');
    });
  });
});
