import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CoachingService {
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

  /** Register as a coach */
  async createCoachProfile(
    userId: string,
    dto: {
      title: string;
      description: string;
      hourlyRate: number;
      specialties: string;
      experience?: string;
    },
  ) {
    if (dto.hourlyRate < 500 || dto.hourlyRate > 100000) {
      throw new BadRequestException('時給は500円〜100,000円の範囲で指定してください');
    }

    const existing = await this.prisma.coachProfile.findUnique({
      where: { userId },
    });
    if (existing) throw new BadRequestException('既にコーチプロフィールが存在します');

    return this.prisma.coachProfile.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        hourlyRate: dto.hourlyRate,
        specialties: dto.specialties,
        experience: dto.experience || null,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true, subscriptionStatus: true },
        },
      },
    });
  }

  /** Update coach profile */
  async updateCoachProfile(
    userId: string,
    dto: {
      title?: string;
      description?: string;
      hourlyRate?: number;
      specialties?: string;
      experience?: string;
      isActive?: boolean;
    },
  ) {
    const profile = await this.prisma.coachProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('コーチプロフィールが見つかりません');

    return this.prisma.coachProfile.update({
      where: { userId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.hourlyRate !== undefined && { hourlyRate: dto.hourlyRate }),
        ...(dto.specialties !== undefined && { specialties: dto.specialties }),
        ...(dto.experience !== undefined && { experience: dto.experience }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /** List active coaches */
  async listCoaches(specialty?: string, take = 20, skip = 0) {
    const where: Record<string, unknown> = { isActive: true };
    if (specialty) {
      where.specialties = { contains: specialty, mode: 'insensitive' };
    }

    return this.prisma.coachProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true, subscriptionStatus: true },
        },
        _count: { select: { bookings: true } },
      },
    });
  }

  /** Get coach detail */
  async getCoach(coachId: string) {
    const coach = await this.prisma.coachProfile.findUnique({
      where: { id: coachId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true, bio: true, subscriptionStatus: true },
        },
        _count: { select: { bookings: true } },
      },
    });

    if (!coach) throw new NotFoundException('コーチが見つかりません');
    return coach;
  }

  /** Book a coaching session */
  async bookSession(
    studentId: string,
    coachId: string,
    dto: { scheduledAt: string; durationMinutes?: number; notes?: string },
  ) {
    const coach = await this.prisma.coachProfile.findUnique({
      where: { id: coachId },
    });
    if (!coach || !coach.isActive) throw new NotFoundException('コーチが見つかりません');

    if (coach.userId === studentId) {
      throw new BadRequestException('自分自身を予約することはできません');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('予約日時は未来の日時を指定してください');
    }

    const durationMinutes = dto.durationMinutes || 60;
    const amount = Math.round((coach.hourlyRate * durationMinutes) / 60);

    // Create PaymentIntent
    const paymentIntent = await this.getStripe().paymentIntents.create({
      amount,
      currency: 'jpy',
      metadata: {
        type: 'coaching',
        coachId,
        studentId,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: String(durationMinutes),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    };
  }

  /** Confirm booking after payment */
  async confirmBooking(stripePaymentId: string) {
    const pi = await this.getStripe().paymentIntents.retrieve(stripePaymentId);
    if (pi.metadata?.type !== 'coaching') return;

    const { coachId, studentId, scheduledAt, durationMinutes } = pi.metadata;
    if (!coachId || !studentId) return;

    const coach = await this.prisma.coachProfile.findUnique({ where: { id: coachId } });
    if (!coach) return;

    try {
      await this.prisma.coachBooking.create({
        data: {
          coachId,
          studentId,
          scheduledAt: new Date(scheduledAt),
          durationMinutes: parseInt(durationMinutes) || 60,
          amount: pi.amount || 0,
          stripePaymentId,
          status: 'confirmed',
          notes: null,
        },
      });

      // Notify coach
      await this.prisma.notification.create({
        data: {
          userId: coach.userId,
          fromUserId: studentId,
          type: 'COACHING_BOOKING',
        },
      });
    } catch {
      // Already exists
    }
  }

  /** Get bookings for a student */
  async getStudentBookings(studentId: string, take = 20, skip = 0) {
    return this.prisma.coachBooking.findMany({
      where: { studentId },
      orderBy: { scheduledAt: 'desc' },
      take,
      skip,
      include: {
        coach: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  /** Get bookings for a coach */
  async getCoachBookings(userId: string, take = 20, skip = 0) {
    const coach = await this.prisma.coachProfile.findUnique({
      where: { userId },
    });
    if (!coach) throw new NotFoundException('コーチプロフィールが見つかりません');

    return this.prisma.coachBooking.findMany({
      where: { coachId: coach.id },
      orderBy: { scheduledAt: 'desc' },
      take,
      skip,
      include: {
        student: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });
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
      if (pi.metadata?.type === 'coaching') {
        await this.confirmBooking(pi.id);
      }
    }

    return { received: true };
  }
}
