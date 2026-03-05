import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  RawBody,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createTournament(
    @Req() req: { user: { userId: string } },
    @Body()
    dto: {
      name: string;
      description: string;
      entryFee: number;
      maxPlayers: number;
      prizePool?: string;
      startAt: string;
    },
  ) {
    return this.tournamentsService.createTournament(req.user.userId, dto);
  }

  @Get()
  async listTournaments(
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.tournamentsService.listTournaments(
      status,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Get(':id')
  async getTournament(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.tournamentsService.getTournament(id, req.user?.userId);
  }

  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async registerForTournament(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.tournamentsService.registerForTournament(req.user.userId, id);
  }

  @Post('webhook')
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.tournamentsService.handleWebhook(rawBody, signature);
  }
}
