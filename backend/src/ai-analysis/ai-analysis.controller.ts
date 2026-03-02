import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { AiAnalysisService } from './ai-analysis.service';

@Controller('ai-analysis')
@UseGuards(JwtAuthGuard)
export class AiAnalysisController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) {}

  @Post('posts/:id')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  analyzeHand(
    @GetUser() user: { userId: string },
    @Param('id') postId: string,
  ) {
    return this.aiAnalysisService.analyzeHand(postId, user.userId);
  }

  @Get('posts/:id')
  getAnalysis(@Param('id') postId: string) {
    return this.aiAnalysisService.getAnalysis(postId);
  }

  @Get('usage')
  getUsage(@GetUser() user: { userId: string }) {
    return this.aiAnalysisService.getUsage(user.userId);
  }
}
