import { Module } from '@nestjs/common';
import { AiAnalysisController } from './ai-analysis.controller';
import { AiAnalysisService } from './ai-analysis.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AiAnalysisController],
  providers: [AiAnalysisService, PrismaService],
})
export class AiAnalysisModule {}
