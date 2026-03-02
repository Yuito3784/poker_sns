import { Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateCategory } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AffiliatesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
