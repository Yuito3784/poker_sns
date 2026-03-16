import { Injectable } from '@nestjs/common';
import { EarningType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Summary: totals + last 6 months trend */
  async getSummary(creatorId: string) {
    const totals = await this.prisma.creatorEarning.aggregate({
      where: { creatorId },
      _sum: { grossAmount: true, platformFee: true, netAmount: true },
      _count: true,
    });

    const pendingPayout = await this.prisma.creatorEarning.aggregate({
      where: { creatorId, payoutId: null },
      _sum: { netAmount: true },
    });

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const earnings = await this.prisma.creatorEarning.findMany({
      where: { creatorId, createdAt: { gte: sixMonthsAgo } },
      select: { grossAmount: true, platformFee: true, netAmount: true, type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyMap = new Map<string, { gross: number; fee: number; net: number }>();
    for (const e of earnings) {
      const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key) || { gross: 0, fee: 0, net: 0 };
      entry.gross += e.grossAmount;
      entry.fee += e.platformFee;
      entry.net += e.netAmount;
      monthlyMap.set(key, entry);
    }

    const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));

    return {
      grossTotal: totals._sum.grossAmount || 0,
      feeTotal: totals._sum.platformFee || 0,
      netTotal: totals._sum.netAmount || 0,
      transactionCount: totals._count,
      pendingPayout: pendingPayout._sum.netAmount || 0,
      monthly,
    };
  }

  /** Earning history with optional type filter and pagination */
  async getHistory(
    creatorId: string,
    type?: EarningType,
    take = 20,
    skip = 0,
  ) {
    const where: Record<string, unknown> = { creatorId };
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.creatorEarning.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          salon: { select: { id: true, name: true, slug: true } },
          paidContent: { select: { id: true, postId: true } },
        },
      }),
      this.prisma.creatorEarning.count({ where }),
    ]);

    return { items, total, take, skip };
  }

  /** Payout history */
  async getPayouts(creatorId: string, take = 20, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.creatorPayout.findMany({
        where: { creatorId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.creatorPayout.count({ where: { creatorId } }),
    ]);

    return { items, total, take, skip };
  }
}
