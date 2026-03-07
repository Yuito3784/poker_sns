import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TournamentsService {
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

  /** Create a tournament */
  async createTournament(
    organizerId: string,
    dto: {
      name: string;
      description: string;
      entryFee: number;
      maxPlayers: number;
      prizePool?: string;
      startAt: string;
    },
  ) {
    if (dto.entryFee < 0 || dto.entryFee > 100000) {
      throw new BadRequestException('参加費は0円〜100,000円の範囲で指定してください');
    }

    const startAt = new Date(dto.startAt);
    if (startAt <= new Date()) {
      throw new BadRequestException('開始日時は未来の日時を指定してください');
    }

    let stripeProductId: string | undefined;
    let stripePriceId: string | undefined;

    if (dto.entryFee > 0) {
      const product = await this.getStripe().products.create({
        name: `Tournament: ${dto.name}`,
        metadata: { type: 'tournament', organizerId },
      });
      const price = await this.getStripe().prices.create({
        product: product.id,
        unit_amount: dto.entryFee,
        currency: 'jpy',
      });
      stripeProductId = product.id;
      stripePriceId = price.id;
    }

    return this.prisma.tournament.create({
      data: {
        organizerId,
        name: dto.name,
        description: dto.description,
        entryFee: dto.entryFee,
        maxPlayers: dto.maxPlayers,
        prizePool: dto.prizePool || null,
        startAt,
        stripeProductId: stripeProductId || null,
        stripePriceId: stripePriceId || null,
      },
    });
  }

  /** List tournaments */
  async listTournaments(status?: string, take = 20, skip = 0) {
    const where = status ? { status } : {};
    return this.prisma.tournament.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take,
      skip,
      include: {
        organizer: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        _count: { select: { participants: true } },
      },
    });
  }

  /** Get tournament detail */
  async getTournament(tournamentId: string, userId?: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        organizer: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!tournament) throw new NotFoundException('トーナメントが見つかりません');

    let isRegistered = false;
    if (userId) {
      const entry = tournament.participants.find((p) => p.userId === userId);
      isRegistered = !!entry;
    }

    return { ...tournament, isRegistered };
  }

  /** Register for a tournament */
  async registerForTournament(userId: string, tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { participants: true } } },
    });

    if (!tournament) throw new NotFoundException('トーナメントが見つかりません');
    if (tournament.status !== 'upcoming') {
      throw new BadRequestException('このトーナメントは参加受付を終了しています');
    }
    if (tournament._count.participants >= tournament.maxPlayers) {
      throw new BadRequestException('定員に達しています');
    }
    if (tournament.organizerId === userId) {
      throw new BadRequestException('主催者は自分のトーナメントに参加できません');
    }

    // Check already registered
    const existing = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) throw new BadRequestException('既に参加登録済みです');

    // Free tournament
    if (tournament.entryFee === 0) {
      const participant = await this.prisma.tournamentParticipant.create({
        data: { tournamentId, userId, status: 'registered' },
      });

      // Notify organizer
      await this.prisma.notification.create({
        data: {
          userId: tournament.organizerId,
          fromUserId: userId,
          type: 'TOURNAMENT_JOIN',
        },
      });

      return { participant, paymentRequired: false };
    }

    // Paid tournament - create payment intent
    const paymentIntent = await this.getStripe().paymentIntents.create({
      amount: tournament.entryFee,
      currency: 'jpy',
      metadata: {
        type: 'tournament',
        tournamentId,
        userId,
      },
    });

    return {
      paymentRequired: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /** Confirm tournament registration after payment */
  async confirmRegistration(pi: { id: string; metadata: Record<string, string> }) {
    if (pi.metadata?.type !== 'tournament') return;

    const { tournamentId, userId } = pi.metadata;
    if (!tournamentId || !userId) return;

    try {
      await this.prisma.tournamentParticipant.create({
        data: {
          tournamentId,
          userId,
          stripePaymentId: pi.id,
          status: 'registered',
        },
      });

      const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
      if (tournament) {
        await this.prisma.notification.create({
          data: {
            userId: tournament.organizerId,
            fromUserId: userId,
            type: 'TOURNAMENT_JOIN',
          },
        });
      }
    } catch {
      // Already registered
    }
  }

  /** Handle webhook */
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
      if (pi.metadata?.type === 'tournament') {
        await this.confirmRegistration({ id: pi.id, metadata: pi.metadata as Record<string, string> });
      }
    }

    return { received: true };
  }
}
