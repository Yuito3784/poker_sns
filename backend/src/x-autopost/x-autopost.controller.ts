import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { XAutopostService } from './x-autopost.service';

@Controller('x-autopost')
export class XAutopostController {
  constructor(private readonly xAutopost: XAutopostService) {}

  /** 接続ステータス取得 */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('status')
  async getStatus() {
    return this.xAutopost.getConnectionStatus();
  }

  /** 管理者がXアカウントを接続するためのOAuth URL取得 */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('auth')
  getAuthUrl() {
    return { url: this.xAutopost.getOAuthUrl() };
  }

  /** X OAuth コールバック (リダイレクトで来るのでGuard不要) */
  @Get('auth/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const username = await this.xAutopost.handleOAuthCallback(code, state);
      res.redirect(
        `${frontendUrl}/settings?x_autopost=connected&username=${username}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      res.redirect(
        `${frontendUrl}/settings?x_autopost=error&message=${encodeURIComponent(msg)}`,
      );
    }
  }

  /** 手動でツイートを投稿 (テスト・即時投稿用) */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('post-now')
  async postNow() {
    return this.xAutopost.manualPost();
  }

  /** X連携を解除 */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('disconnect')
  async disconnect() {
    return this.xAutopost.disconnect();
  }
}
