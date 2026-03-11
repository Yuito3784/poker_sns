import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  RawBody,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalonsService } from './salons.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createSalon(
    @Req() req: { user: { userId: string } },
    @Body() dto: { name: string; slug: string; description: string; monthlyPrice: number; imageUrl?: string },
  ) {
    return this.salonsService.createSalon(req.user.userId, dto);
  }

  @Get()
  async listSalons(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.salonsService.listSalons(
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getSalonEarnings(@Req() req: { user: { userId: string } }) {
    return this.salonsService.getSalonEarnings(req.user.userId);
  }

  @Get('owned')
  @UseGuards(JwtAuthGuard)
  async getOwnedSalons(@Req() req: { user: { userId: string } }) {
    return this.salonsService.getOwnedSalons(req.user.userId);
  }

  @Get('memberships')
  @UseGuards(JwtAuthGuard)
  async getMemberships(@Req() req: { user: { userId: string } }) {
    return this.salonsService.getMemberships(req.user.userId);
  }

  @Get(':slug')
  async getSalon(
    @Param('slug') slug: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.salonsService.getSalon(slug, req.user?.userId);
  }

  @Post(':salonId/join')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async joinSalon(
    @Req() req: { user: { userId: string } },
    @Param('salonId') salonId: string,
  ) {
    return this.salonsService.joinSalon(req.user.userId, salonId);
  }

  @Get(':salonId/posts')
  @UseGuards(JwtAuthGuard)
  async getSalonPosts(
    @Req() req: { user: { userId: string } },
    @Param('salonId') salonId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.salonsService.getSalonPosts(
      salonId,
      req.user.userId,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Post(':salonId/posts')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createSalonPost(
    @Req() req: { user: { userId: string } },
    @Param('salonId') salonId: string,
    @Body() dto: { content: string; imageUrl?: string },
  ) {
    return this.salonsService.createSalonPost(salonId, req.user.userId, dto);
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.salonsService.handleWebhook(rawBody, signature);
  }
}
