import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma.service';
import { WebhookNotifierService } from './webhook-notifier.service';

function isTableMissingError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || '';
  return msg.includes('does not exist in the current database');
}

interface AuditResult {
  check: string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
  count?: number;
}

@Injectable()
export class TaskAuditService {
  private readonly logger = new Logger(TaskAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookNotifier: WebhookNotifierService,
  ) {}

  /**
   * Runs every 5 minutes to audit system health and flag outstanding items.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async auditPendingTasks(): Promise<void> {
    this.logger.log('Running 5-minute task audit...');

    const results: AuditResult[] = [];

    try {
      // 1. Check for expired refresh tokens that need cleanup
      const expiredRefreshTokens = await this.prisma.refreshToken.count({
        where: { expiresAt: { lt: new Date() } },
      });
      results.push({
        check: 'Expired Refresh Tokens',
        status: expiredRefreshTokens > 100 ? 'warning' : 'ok',
        detail:
          expiredRefreshTokens > 100
            ? `${expiredRefreshTokens} expired tokens pending cleanup`
            : 'Within threshold',
        count: expiredRefreshTokens,
      });

      // 2. Check for expired password reset tokens
      const expiredResetTokens = await this.prisma.passwordResetToken.count({
        where: { expiresAt: { lt: new Date() } },
      });
      results.push({
        check: 'Expired Password Reset Tokens',
        status: expiredResetTokens > 50 ? 'warning' : 'ok',
        detail:
          expiredResetTokens > 50
            ? `${expiredResetTokens} expired tokens pending cleanup`
            : 'Within threshold',
        count: expiredResetTokens,
      });

      // 3. Check for expired email verification tokens
      const expiredVerificationTokens =
        await this.prisma.emailVerificationToken.count({
          where: { expiresAt: { lt: new Date() } },
        });
      results.push({
        check: 'Expired Verification Tokens',
        status: expiredVerificationTokens > 50 ? 'warning' : 'ok',
        detail:
          expiredVerificationTokens > 50
            ? `${expiredVerificationTokens} expired tokens pending cleanup`
            : 'Within threshold',
        count: expiredVerificationTokens,
      });

      // 4. Check for unverified users older than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const staleUnverifiedUsers = await this.prisma.user.count({
        where: {
          emailVerified: false,
          createdAt: { lt: sevenDaysAgo },
          passwordHash: { not: null }, // exclude OAuth-only users
        },
      });
      results.push({
        check: 'Stale Unverified Users (>7 days)',
        status: staleUnverifiedUsers > 20 ? 'warning' : 'ok',
        detail:
          staleUnverifiedUsers > 20
            ? `${staleUnverifiedUsers} users never verified email`
            : 'Within threshold',
        count: staleUnverifiedUsers,
      });

      // 5. Check for past_due subscriptions that need attention
      const pastDueSubscriptions = await this.prisma.user.count({
        where: { subscriptionStatus: 'past_due' },
      });
      results.push({
        check: 'Past-Due Subscriptions',
        status: pastDueSubscriptions > 0 ? 'warning' : 'ok',
        detail:
          pastDueSubscriptions > 0
            ? `${pastDueSubscriptions} subscriptions past due`
            : 'No past-due subscriptions',
        count: pastDueSubscriptions,
      });

      // 6. Cleanup expired tokens automatically
      const cleanupResults = await this.cleanupExpiredTokens();
      results.push(...cleanupResults);

      // Report warnings
      const warnings = results.filter((r) => r.status !== 'ok');
      if (warnings.length > 0) {
        const summary = warnings
          .map((w) => `- [${w.status.toUpperCase()}] ${w.check}: ${w.detail}`)
          .join('\n');

        this.logger.warn(`Task audit found ${warnings.length} issue(s):\n${summary}`);

        await this.webhookNotifier.notifyInfo(
          'Task Audit Report',
          `Found ${warnings.length} item(s) requiring attention:\n${summary}`,
          { totalChecks: results.length, warnings: warnings.length },
        );
      } else {
        this.logger.log('Task audit complete: all checks passed.');
      }
    } catch (error) {
      const err = error as Error;
      if (isTableMissingError(error)) {
        this.logger.warn(
          'Task audit skipped: database schema is not up to date (e.g. RefreshToken table missing). ' +
            'Run: npx prisma migrate deploy',
        );
        return;
      }
      this.logger.error(`Task audit failed: ${err.message}`, err.stack);
      await this.webhookNotifier
        .notifyError('TaskAuditFailure', err.message, 'TaskAuditService', err.stack)
        .catch(() => {/* swallow */});
    }
  }

  /**
   * Clean up expired tokens to prevent DB bloat.
   * Runs as part of the 5-minute audit.
   */
  private async cleanupExpiredTokens(): Promise<AuditResult[]> {
    const now = new Date();
    const results: AuditResult[] = [];

    try {
      const deletedRefresh = await this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      if (deletedRefresh.count > 0) {
        results.push({
          check: 'Refresh Token Cleanup',
          status: 'ok',
          detail: `Cleaned ${deletedRefresh.count} expired tokens`,
          count: deletedRefresh.count,
        });
      }

      const deletedReset = await this.prisma.passwordResetToken.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      if (deletedReset.count > 0) {
        results.push({
          check: 'Password Reset Token Cleanup',
          status: 'ok',
          detail: `Cleaned ${deletedReset.count} expired tokens`,
          count: deletedReset.count,
        });
      }

      const deletedVerification =
        await this.prisma.emailVerificationToken.deleteMany({
          where: { expiresAt: { lt: now } },
        });
      if (deletedVerification.count > 0) {
        results.push({
          check: 'Verification Token Cleanup',
          status: 'ok',
          detail: `Cleaned ${deletedVerification.count} expired tokens`,
          count: deletedVerification.count,
        });
      }

      const deletedMagicLink = await this.prisma.magicLinkToken.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      if (deletedMagicLink.count > 0) {
        results.push({
          check: 'Magic Link Token Cleanup',
          status: 'ok',
          detail: `Cleaned ${deletedMagicLink.count} expired tokens`,
          count: deletedMagicLink.count,
        });
      }
    } catch (error) {
      const err = error as Error;
      results.push({
        check: 'Token Cleanup',
        status: 'error',
        detail: `Cleanup failed: ${err.message}`,
      });
    }

    return results;
  }

  /**
   * 孤児画像のクリーンアップ（毎時実行）。
   * uploads/posts 内のファイルで、DBに参照されていないものを削除する。
   * アップロード後1時間以上経過したファイルのみ対象（投稿中のファイルを保護）。
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOrphanedImages(): Promise<void> {
    const uploadsDir = join(process.cwd(), 'uploads', 'posts');
    try {
      const files = readdirSync(uploadsDir);
      if (files.length === 0) return;

      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      // DBに存在する全画像URLを取得
      const posts = await this.prisma.post.findMany({
        where: { imageUrl: { not: null } },
        select: { imageUrl: true },
      });
      const usedFilenames = new Set(
        posts.map((p) => p.imageUrl!.replace('/uploads/posts/', '')),
      );

      let cleaned = 0;
      for (const file of files) {
        if (usedFilenames.has(file)) continue;
        const filePath = join(uploadsDir, file);
        try {
          const stat = statSync(filePath);
          if (stat.mtimeMs < oneHourAgo) {
            unlinkSync(filePath);
            cleaned++;
          }
        } catch {
          // ファイルが既に削除されている場合は無視
        }
      }
      if (cleaned > 0) {
        this.logger.log(`Cleaned ${cleaned} orphaned image(s) from uploads/posts`);
      }
    } catch {
      // uploads ディレクトリが存在しない場合は無視
    }
  }
}
