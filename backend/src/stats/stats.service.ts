import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers30d,
      totalPosts,
      totalPokerHands,
      premiumSubscribers,
      affiliatePartners,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { updatedAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { isPokerHand: true } }),
      this.prisma.user.count({
        where: { subscriptionStatus: 'active' },
      }),
      this.prisma.affiliatePartner.count({ where: { isActive: true } }),
    ]);

    return {
      totalUsers,
      activeUsers30d,
      totalPosts,
      totalPokerHands,
      premiumSubscribers,
      affiliatePartners,
      generatedAt: now.toISOString(),
    };
  }

  async getDashboard(userId: string, targetUserId: string) {
    // Only premium users can view detailed stats
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const isPremium =
      user.subscriptionStatus === 'active' ||
      user.subscriptionStatus === 'canceled';
    if (!isPremium) {
      throw new ForbiddenException(
        'Statistics dashboard is a premium feature.',
      );
    }

    const [
      totalHands,
      positionStats,
      streetStats,
      recentResults,
    ] = await Promise.all([
      this.getTotalHands(targetUserId),
      this.getPositionStats(targetUserId),
      this.getStreetActionStats(targetUserId),
      this.getRecentResults(targetUserId),
    ]);

    return {
      totalHands,
      positionStats,
      streetStats,
      recentResults,
    };
  }

  private async getTotalHands(userId: string): Promise<number> {
    return this.prisma.pokerHand.count({
      where: { post: { authorId: userId } },
    });
  }

  private async getPositionStats(userId: string) {
    const hands = await this.prisma.pokerHand.findMany({
      where: { post: { authorId: userId } },
      select: {
        heroPosition: true,
        result: true,
      },
    });

    const stats: Record<string, { total: number; wins: number; losses: number }> = {};
    for (const hand of hands) {
      const pos = hand.heroPosition;
      if (!stats[pos]) stats[pos] = { total: 0, wins: 0, losses: 0 };
      stats[pos].total++;
      if (hand.result) {
        if (hand.result.toLowerCase().startsWith('won')) {
          stats[pos].wins++;
        } else if (hand.result.toLowerCase().startsWith('lost')) {
          stats[pos].losses++;
        }
      }
    }

    return Object.entries(stats).map(([position, data]) => ({
      position,
      ...data,
      winRate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
    }));
  }

  private async getStreetActionStats(userId: string) {
    const hands = await this.prisma.pokerHand.findMany({
      where: { post: { authorId: userId } },
      select: {
        heroPosition: true,
        streets: {
          orderBy: { order: 'asc' },
          include: { actions: { orderBy: { order: 'asc' } } },
        },
      },
    });

    const stats: Record<string, Record<string, number>> = {};
    for (const hand of hands) {
      for (const street of hand.streets) {
        const s = street.street;
        if (!stats[s]) stats[s] = {};
        // Only count hero's actions
        for (const action of street.actions) {
          if (action.position === hand.heroPosition) {
            const at = action.actionType;
            stats[s][at] = (stats[s][at] ?? 0) + 1;
          }
        }
      }
    }

    return Object.entries(stats).map(([street, actions]) => ({
      street,
      actions,
    }));
  }

  private async getRecentResults(userId: string) {
    const hands = await this.prisma.pokerHand.findMany({
      where: {
        post: { authorId: userId },
        result: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        heroPosition: true,
        heroHand: true,
        tableType: true,
        blinds: true,
        result: true,
        createdAt: true,
      },
    });

    return hands.map((h) => ({
      ...h,
      resultValue: this.parseResultValue(h.result),
    }));
  }

  private parseResultValue(result: string | null): number | null {
    if (!result) return null;
    const match = result.match(/(Won|Lost)\s+([\d.]+)/i);
    if (!match) return null;
    const value = parseFloat(match[2]);
    return match[1].toLowerCase() === 'won' ? value : -value;
  }
}
