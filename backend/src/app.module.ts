import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
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
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
