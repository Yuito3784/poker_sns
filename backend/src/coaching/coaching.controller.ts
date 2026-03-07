import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  RawBody,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoachingService } from './coaching.service';

@Controller('coaching')
export class CoachingController {
  constructor(private readonly coachingService: CoachingService) {}

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createCoachProfile(
    @Req() req: { user: { userId: string } },
    @Body()
    dto: {
      title: string;
      description: string;
      hourlyRate: number;
      specialties: string;
      experience?: string;
    },
  ) {
    return this.coachingService.createCoachProfile(req.user.userId, dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateCoachProfile(
    @Req() req: { user: { userId: string } },
    @Body()
    dto: {
      title?: string;
      description?: string;
      hourlyRate?: number;
      specialties?: string;
      experience?: string;
      isActive?: boolean;
    },
  ) {
    return this.coachingService.updateCoachProfile(req.user.userId, dto);
  }

  @Get('coaches')
  async listCoaches(
    @Query('specialty') specialty?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.coachingService.listCoaches(
      specialty,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Get('coaches/:id')
  async getCoach(@Param('id') id: string) {
    return this.coachingService.getCoach(id);
  }

  @Post('coaches/:id/book')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bookSession(
    @Req() req: { user: { userId: string } },
    @Param('id') coachId: string,
    @Body() dto: { scheduledAt: string; durationMinutes?: number; notes?: string },
  ) {
    return this.coachingService.bookSession(req.user.userId, coachId, dto);
  }

  @Get('bookings/student')
  @UseGuards(JwtAuthGuard)
  async getStudentBookings(
    @Req() req: { user: { userId: string } },
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.coachingService.getStudentBookings(
      req.user.userId,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Get('bookings/coach')
  @UseGuards(JwtAuthGuard)
  async getCoachBookings(
    @Req() req: { user: { userId: string } },
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.coachingService.getCoachBookings(
      req.user.userId,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.coachingService.handleWebhook(rawBody, signature);
  }
}
