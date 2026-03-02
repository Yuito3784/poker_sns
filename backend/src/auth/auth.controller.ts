import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MagicLinkDto } from './dto/magic-link.dto';
import { CompleteXRegistrationDto } from './dto/complete-x-registration.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  logout(@GetUser() user: { userId: string }) {
    return this.authService.revokeRefreshTokens(user.userId).then(() => ({
      message: 'ログアウトしました',
    }));
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  changePassword(
    @GetUser() user: { userId: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @Post('verify-email')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  resendVerification(@GetUser() user: { userId: string }) {
    return this.authService.resendVerificationEmail(user.userId);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ── Google OAuth ────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: { googleId: string; email: string | null; name: string; avatar: string | null } },
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const result = await this.authService.findOrCreateGoogleUser(req.user);
      const sessionId = this.authService.storeOAuthSession({
        kind: 'auth',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user as Record<string, unknown>,
      });
      return res.redirect(`${frontendUrl}/?oauthSession=${sessionId}`);
    } catch {
      return res.redirect(`${frontendUrl}/?authError=true`);
    }
  }

  // ── LINE OAuth ──────────────────────────────────────────────────

  @Get('line')
  lineAuth(@Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!process.env.LINE_CLIENT_ID) {
      return res.redirect(`${frontendUrl}/?authError=true`);
    }
    return res.redirect(this.authService.getLineAuthUrl());
  }

  @Get('line/callback')
  async lineCallback(
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!code) return res.redirect(`${frontendUrl}/?authError=true`);
    try {
      const result = await this.authService.handleLineCallback(code);
      const sessionId = this.authService.storeOAuthSession({
        kind: 'auth',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user as Record<string, unknown>,
      });
      return res.redirect(`${frontendUrl}/?oauthSession=${sessionId}`);
    } catch {
      return res.redirect(`${frontendUrl}/?authError=true`);
    }
  }

  // ── Magic Link ──────────────────────────────────────────────────

  @Post('magic-link')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  sendMagicLink(@Body() dto: MagicLinkDto) {
    return this.authService.sendMagicLink(dto.email);
  }

  @Get('magic-link/verify')
  async verifyMagicLink(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!token) return res.redirect(`${frontendUrl}/?authError=magiclink`);
    try {
      const result = await this.authService.verifyMagicLink(token);
      const sessionId = this.authService.storeOAuthSession({
        kind: 'auth',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user as Record<string, unknown>,
      });
      return res.redirect(`${frontendUrl}/?oauthSession=${sessionId}`);
    } catch {
      return res.redirect(`${frontendUrl}/?authError=magiclink`);
    }
  }

  // ── X (Twitter) OAuth ───────────────────────────────────────────

  @Get('x')
  xAuth(@Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!process.env.X_CLIENT_ID) {
      return res.redirect(`${frontendUrl}/?authError=true`);
    }
    try {
      const { url } = this.authService.getXAuthUrl();
      return res.redirect(url);
    } catch {
      return res.redirect(`${frontendUrl}/?authError=true`);
    }
  }

  @Get('x/callback')
  async xCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!code || !state) return res.redirect(`${frontendUrl}/?authError=true`);
    try {
      const result = await this.authService.handleXCallback(code, state);
      if (result.type === 'success') {
        const sessionId = this.authService.storeOAuthSession({
          kind: 'auth',
          accessToken: result.result.accessToken,
          refreshToken: result.result.refreshToken,
          user: result.result.user as Record<string, unknown>,
        });
        return res.redirect(`${frontendUrl}/?oauthSession=${sessionId}`);
      } else {
        // Need email completion
        const sessionId = this.authService.storeOAuthSession({
          kind: 'x_pending',
          xProfile: result.xProfile as Record<string, unknown>,
          xToken: result.xToken,
        });
        return res.redirect(`${frontendUrl}/?oauthSession=${sessionId}`);
      }
    } catch {
      return res.redirect(`${frontendUrl}/?authError=true`);
    }
  }

  @Post('x/complete')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  completeXRegistration(@Body() dto: CompleteXRegistrationDto) {
    return this.authService.completeXRegistration(dto.xToken, dto.email);
  }

  // ── OAuth セッション取得 (one-time, 5分TTL) ─────────────────────
  @Get('oauth-session')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  getOAuthSession(@Query('id') id: string) {
    if (!id) throw new BadRequestException('セッションIDが必要です');
    return this.authService.consumeOAuthSession(id);
  }
}
