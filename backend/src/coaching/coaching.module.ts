import { Module } from '@nestjs/common';
import { CoachingController } from './coaching.controller';
import { CoachingService } from './coaching.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CoachingController],
  providers: [CoachingService, PrismaService],
})
export class CoachingModule {}
