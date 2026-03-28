import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { RepliesModule } from './replies/replies.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { AdsModule } from './ads/ads.module';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AiAnalysisModule } from './ai-analysis/ai-analysis.module';
import { StatsModule } from './stats/stats.module';
import { TippingModule } from './tipping/tipping.module';
import { PaidContentModule } from './paid-content/paid-content.module';
import { SalonsModule } from './salons/salons.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { CoachingModule } from './coaching/coaching.module';
import { EarningsModule } from './earnings/earnings.module';
import { XAutopostModule } from './x-autopost/x-autopost.module';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { WebhookNotifierService } from './common/webhook-notifier.service';
import { TaskAuditService } from './common/task-audit.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    ScheduleModule.forRoot(),
    AuthModule,
    PostsModule,
    RepliesModule,
    UsersModule,
    NotificationsModule,
    SearchModule,
    AdsModule,
    AffiliatesModule,
    SubscriptionsModule,
    AiAnalysisModule,
    StatsModule,
    TippingModule,
    PaidContentModule,
    SalonsModule,
    TournamentsModule,
    CoachingModule,
    EarningsModule,
    XAutopostModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    WebhookNotifierService,
    TaskAuditService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [WebhookNotifierService],
})
export class AppModule {}
