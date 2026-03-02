import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(offset = 0, limit = 10) {
    const now = new Date();
    const ads = await this.prisma.ad.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
      skip: offset,
      take: Math.min(limit, 20),
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        linkUrl: true,
      },
    });
    return ads;
  }
}
