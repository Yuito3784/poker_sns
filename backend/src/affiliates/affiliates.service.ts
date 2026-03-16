import { Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateCategory } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AffiliatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findSidebarRandom(limit: number = 3) {
    const all = await this.prisma.affiliatePartner.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        logoUrl: true,
        bonus: true,
        sortOrder: true,
      },
    });
    // Fisher-Yates shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, limit);
  }

  async findAll(category?: AffiliateCategory, featured?: boolean) {
    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;
    if (featured) where.isFeatured = true;

    return this.prisma.affiliatePartner.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        logoUrl: true,
        bonus: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const partner = await this.prisma.affiliatePartner.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        longDescription: true,
        category: true,
        logoUrl: true,
        bannerUrl: true,
        bonus: true,
        sortOrder: true,
        // affiliateUrl is NOT returned directly
      },
    });

    if (!partner) {
      throw new NotFoundException('パートナーが見つかりません');
    }

    return partner;
  }

  async redirect(slug: string, userId?: string, referrer?: string) {
    const partner = await this.prisma.affiliatePartner.findUnique({
      where: { slug, isActive: true },
    });

    if (!partner) {
      throw new NotFoundException('パートナーが見つかりません');
    }

    // Record click asynchronously (don't block redirect)
    this.prisma.affiliateClick
      .create({
        data: {
          partnerId: partner.id,
          userId: userId || null,
          referrer: referrer || null,
        },
      })
      .catch(() => {
        // Silently ignore click recording failures
      });

    return partner.affiliateUrl;
  }

  async getClickAnalytics(from?: Date, to?: Date) {
    const where: Record<string, unknown> = {};
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = from;
      if (to) (where.createdAt as Record<string, unknown>).lte = to;
    }

    const partners = await this.prisma.affiliatePartner.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: 'asc' },
    });

    const clicks = await this.prisma.affiliateClick.groupBy({
      by: ['partnerId'],
      where,
      _count: true,
    });

    const authenticatedClicks = await this.prisma.affiliateClick.groupBy({
      by: ['partnerId'],
      where: { ...where, userId: { not: null } },
      _count: true,
    });

    const clickMap = new Map(clicks.map((c) => [c.partnerId, c._count]));
    const authClickMap = new Map(authenticatedClicks.map((c) => [c.partnerId, c._count]));

    return partners.map((p) => ({
      partnerId: p.id,
      name: p.name,
      slug: p.slug,
      totalClicks: clickMap.get(p.id) || 0,
      authenticatedClicks: authClickMap.get(p.id) || 0,
      anonymousClicks: (clickMap.get(p.id) || 0) - (authClickMap.get(p.id) || 0),
    }));
  }
}
