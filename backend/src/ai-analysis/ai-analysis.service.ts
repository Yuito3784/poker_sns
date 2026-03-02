import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma.service';

const FREE_MONTHLY_LIMIT = 5;
const MODEL_ID = 'claude-sonnet-4-6';
const MAX_TOKENS = 2048;

@Injectable()
export class AiAnalysisService {
  private client: Anthropic | null = null;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  private getClient(): Anthropic {
    if (!this.client) {
      throw new BadRequestException(
        'AI analysis is not configured. Set ANTHROPIC_API_KEY environment variable.',
      );
    }
    return this.client;
  }

  async analyzeHand(postId: string, userId: string) {
    // Check if user is premium
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
        'AI hand analysis is a premium feature. Please upgrade to use this.',
      );
    }

    // Check if analysis already exists for this post
    const existing = await this.prisma.aiAnalysis.findUnique({
      where: { postId },
    });
    if (existing) {
      return { analysis: JSON.parse(existing.analysis), cached: true };
    }

    // Check monthly usage
    const yearMonth = this.getCurrentYearMonth();
    const usage = await this.prisma.aiAnalysisUsage.findUnique({
      where: { userId_yearMonth: { userId, yearMonth } },
    });

    const currentCount = usage?.usageCount ?? 0;
    if (currentCount >= FREE_MONTHLY_LIMIT) {
      throw new ForbiddenException(
        `Monthly AI analysis limit reached (${FREE_MONTHLY_LIMIT}/${FREE_MONTHLY_LIMIT}). Additional analyses will be available with the unlimited plan.`,
      );
    }

    // Load the poker hand data
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        pokerHand: {
          include: {
            streets: {
              orderBy: { order: 'asc' },
              include: { actions: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    if (!post) throw new NotFoundException('Post not found');
    if (!post.isPokerHand || !post.pokerHand) {
      throw new BadRequestException(
        'This post does not contain a poker hand to analyze.',
      );
    }

    const handDescription = this.formatHandForAnalysis(post.pokerHand);

    // Call Claude API
    const response = await this.getClient().messages.create({
      model: MODEL_ID,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: handDescription,
        },
      ],
      system: `You are an expert poker strategy analyst. Analyze the following poker hand and provide actionable feedback in Japanese. Structure your response as JSON with these fields:
- "summary": A 1-2 sentence overview of the hand
- "preflopAnalysis": Analysis of preflop decisions
- "postflopAnalysis": Analysis of postflop play (flop/turn/river)
- "mistakes": Array of specific mistakes or suboptimal plays identified
- "improvements": Array of suggested improvements
- "rating": A rating from 1-10 of the overall play
- "optimalLine": What the optimal play would have been

Respond ONLY with valid JSON, no markdown formatting.`,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const analysisText = textBlock?.text ?? '{}';
    const tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);

    let parsedAnalysis: Record<string, unknown>;
    try {
      parsedAnalysis = JSON.parse(analysisText);
    } catch {
      parsedAnalysis = { rawAnalysis: analysisText };
    }

    // Store the analysis result
    await this.prisma.aiAnalysis.create({
      data: {
        postId,
        userId,
        analysis: JSON.stringify(parsedAnalysis),
        modelUsed: MODEL_ID,
        tokensUsed,
      },
    });

    // Increment monthly usage
    await this.prisma.aiAnalysisUsage.upsert({
      where: { userId_yearMonth: { userId, yearMonth } },
      update: { usageCount: { increment: 1 } },
      create: { userId, yearMonth, usageCount: 1 },
    });

    return {
      analysis: parsedAnalysis,
      cached: false,
      usage: {
        used: currentCount + 1,
        limit: FREE_MONTHLY_LIMIT,
      },
    };
  }

  async getUsage(userId: string) {
    const yearMonth = this.getCurrentYearMonth();
    const usage = await this.prisma.aiAnalysisUsage.findUnique({
      where: { userId_yearMonth: { userId, yearMonth } },
    });
    return {
      used: usage?.usageCount ?? 0,
      limit: FREE_MONTHLY_LIMIT,
      yearMonth,
    };
  }

  async getAnalysis(postId: string) {
    const existing = await this.prisma.aiAnalysis.findUnique({
      where: { postId },
    });
    if (!existing) return null;
    return {
      analysis: JSON.parse(existing.analysis),
      modelUsed: existing.modelUsed,
      createdAt: existing.createdAt,
    };
  }

  private getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatHandForAnalysis(
    pokerHand: {
      tableType: string;
      blinds: string;
      tableSize: string;
      heroStack: string;
      heroPosition: string;
      heroHand: string | null;
      result: string | null;
      streets: Array<{
        street: string;
        boardCards: string | null;
        potSize: string | null;
        actions: Array<{
          position: string;
          actionType: string;
          amount: string | null;
        }>;
      }>;
    },
  ): string {
    let description = `Poker Hand Analysis Request:\n`;
    description += `Table: ${pokerHand.tableType} ${pokerHand.tableSize} (Blinds: ${pokerHand.blinds})\n`;
    description += `Hero Position: ${pokerHand.heroPosition}, Stack: ${pokerHand.heroStack}\n`;
    if (pokerHand.heroHand) {
      description += `Hero Hand: ${pokerHand.heroHand}\n`;
    }
    if (pokerHand.result) {
      description += `Result: ${pokerHand.result}\n`;
    }

    description += `\nAction:\n`;
    for (const street of pokerHand.streets) {
      description += `\n--- ${street.street} ---`;
      if (street.boardCards) {
        description += ` Board: ${street.boardCards}`;
      }
      if (street.potSize) {
        description += ` (Pot: ${street.potSize})`;
      }
      description += `\n`;
      for (const action of street.actions) {
        description += `  ${action.position}: ${action.actionType}`;
        if (action.amount) description += ` ${action.amount}`;
        description += `\n`;
      }
    }

    return description;
  }
}
