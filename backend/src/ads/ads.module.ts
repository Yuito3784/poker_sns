import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AdsController],
  providers: [AdsService, PrismaService],
})
export class AdsModule {}
