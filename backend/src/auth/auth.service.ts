import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import * as dns from 'dns';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

type OAuthSessionData =
  | { kind: 'auth'; accessToken: string; refreshToken: string; user: Record<string, unknown> }
  | { kind: 'x_pending'; xProfile: Record<string, unknown>; xToken: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ── OAuth セッション (一時トークン、5分TTL) ─────────────────────
  private readonly oauthSessions = new Map<string, { data: OAuthSessionData; expiresAt: Date }>();

  storeOAuthSession(data: OAuthSessionData): string {
    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分
    this.oauthSessions.set(sessionId, { data, expiresAt });
    // 期限切れセッションを掃除
    for (const [key, val] of this.oauthSessions.entries()) {
      if (val.expiresAt < new Date()) this.oauthSessions.delete(key);
    }
    return sessionId;
  }

  consumeOAuthSession(sessionId: string): OAuthSessionData {
    const session = this.oauthSessions.get(sessionId);
    this.oauthSessions.delete(sessionId);
    if (!session || session.expiresAt < new Date()) {
      throw new BadRequestException('セッションが無効または期限切れです');
    }
    return session.data;
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          username: dto.username,
        },
      });

      // Send verification email
      await this.sendVerificationEmail(user.id, user.email);

      return this.buildAuthResponse(user);
    } catch (error: unknown) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'このメールアドレスまたはユーザー名は既に使用されています。',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'このアカウントはGoogle、LINE、またはXでログインしてください。',
      );
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async refreshAccessToken(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('リフレッシュトークンが無効または期限切れです');
    }

    // Rotate: delete old, create new
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const { user } = stored;
    return this.buildAuthResponse(user);
  }

  async sendVerificationEmail(userId: string, email: string) {
    // Delete existing tokens
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.prisma.emailVerificationToken.create({
      data: { token, userId, expiresAt },
    });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    try {
      await this.sendEmail({
        to: email,
        subject: 'メールアドレスの確認 - Poker SNS',
        html: `
          <h2>メールアドレスの確認</h2>
          <p>以下のリンクからメールアドレスを確認してください。このリンクは24時間有効です。</p>
          <p><a href="${verifyUrl}">${verifyUrl}</a></p>
          <p>このメールに心当たりがない場合は無視してください。</p>
        `,
      });
      return { message: '確認メールを送信しました。' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Verification email send failed: ${msg}`);
      this.logger.log(`[DEV] 認証リンク（SMTP未設定時はこのURLをブラウザで開く）: ${verifyUrl}`);
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) {
        return { message: 'メール送信に失敗しました（SMTP未設定）。下記リンクで認証できます。', verificationLink: verifyUrl };
      }
      return { message: 'メール送信に失敗しました。しばらく経ってから再送信してください。' };
    }
  }

  async verifyEmail(token: string) {
    const stored = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.emailVerificationToken.delete({ where: { id: stored.id } });
      }
      throw new BadRequestException('確認トークンが無効または期限切れです');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId: stored.userId } }),
    ]);

    return { message: 'メールアドレスが確認されました。' };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('ユーザーが見つかりません');
    if (user.emailVerified) throw new BadRequestException('既に認証済みです');
    return this.sendVerificationEmail(userId, user.email);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }
    if (!user.passwordHash) {
      throw new BadRequestException(
        'このアカウントはソーシャルログインで登録されているため、パスワードの変更はできません。',
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('現在のパスワードが正しくありません');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'パスワードが変更されました。再度ログインしてください。' };
  }

  async revokeRefreshTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to avoid leaking whether email exists
    if (!user) {
      return { message: 'パスワードリセットのメールを送信しました。' };
    }

    // Delete any existing reset tokens for this user
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    // Send email
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.sendEmail({
        to: email,
        subject: 'パスワードリセット - Poker SNS',
        html: `
          <h2>パスワードリセット</h2>
          <p>以下のリンクからパスワードをリセットしてください。このリンクは1時間有効です。</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>このメールに心当たりがない場合は無視してください。</p>
        `,
      });
    } catch (err) {
      this.logger.warn(`Password reset email send failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { message: 'パスワードリセットのメールを送信しました。' };
  }

  async resetPassword(token: string, newPassword: string) {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.passwordResetToken.delete({ where: { id: stored.id } });
      }
      throw new BadRequestException('リセットトークンが無効または期限切れです');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: stored.userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: stored.userId } }),
    ]);

    return { message: 'パスワードがリセットされました。' };
  }

  /**
   * メール送信。RESEND_API_KEY があれば Resend API（HTTPS）を優先（Railway 等で SMTP がブロックされても届く）。
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const from = process.env.SMTP_FROM || 'noreply@pokersns.com';
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const result = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      const err = result.error;
      if (err && typeof err === 'object' && 'message' in err) {
        throw new Error(String((err as { message: unknown }).message));
      }
      return;
    }
    const transporter = await this.createMailTransporterAsync();
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }

  /**
   * Railway 等で IPv6 が選ばれると ENETUNREACH になるため、リモート SMTP ホストは IPv4 に解決してから接続する。
   */
  private async createMailTransporterAsync(): Promise<nodemailer.Transporter> {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const isLocal = host === 'localhost' || host === 'mailhog' || host.startsWith('127.') || /^\[?[\d.]+\]?$/.test(host);

    let connectHost = host;
    let tlsServername: string | undefined;

    if (!isLocal && /[a-zA-Z]/.test(host)) {
      try {
        const resolved = await dns.promises.lookup(host, { family: 4 });
        connectHost = resolved.address;
        tlsServername = host;
      } catch {
        // 解決に失敗したらそのまま host を使用
      }
    }

    const options: Record<string, unknown> = {
      host: connectHost,
      port,
      secure,
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    };
    if (tlsServername) {
      options.tls = { servername: tlsServername };
    }
    return nodemailer.createTransport(options as nodemailer.TransportOptions);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  // ── OAuth helpers ──────────────────────────────────────────────

  private async generateUniqueUsername(base: string): Promise<string> {
    const cleaned = base
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 16);
    const username = cleaned || 'user';
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (!existing) return username;
    for (let i = 2; i < 1000; i++) {
      const candidate = `${username}${i}`;
      const exists = await this.prisma.user.findUnique({
        where: { username: candidate },
      });
      if (!exists) return candidate;
    }
    return `${username}${Date.now().toString(36)}`;
  }

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string | null;
    name: string;
    avatar: string | null;
  }) {
    if (!profile.email) {
      throw new BadRequestException(
        'Googleアカウントにメールアドレスが設定されていないため、ログインできません。',
      );
    }

    // Already linked
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });
    if (user) return this.buildAuthResponse(user);

    // Same email exists → link googleId
    user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
      return this.buildAuthResponse(user);
    }

    // New user
    const username = await this.generateUniqueUsername(
      profile.email.split('@')[0],
    );
    user = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        username,
        passwordHash: null,
        googleId: profile.googleId,
        avatarUrl: profile.avatar,
        emailVerified: true,
      },
    });
    return this.buildAuthResponse(user);
  }

  getLineAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINE_CLIENT_ID || '',
      redirect_uri: `${process.env.API_URL || 'http://localhost:4000'}/auth/line/callback`,
      state: randomBytes(8).toString('hex'),
      scope: 'profile openid email',
    });
    return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  }

  async handleLineCallback(code: string) {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.API_URL || 'http://localhost:4000'}/auth/line/callback`,
        client_id: process.env.LINE_CLIENT_ID || '',
        client_secret: process.env.LINE_CLIENT_SECRET || '',
      }).toString(),
    });

    if (!tokenRes.ok) {
      throw new BadRequestException('LINE認証に失敗しました。');
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      userId: string;
      displayName: string;
      pictureUrl?: string;
    };

    // Email via userinfo (requires email scope)
    let email: string | null = null;
    try {
      const userInfoRes = await fetch(
        'https://api.line.me/oauth2/v2.1/userinfo',
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
      );
      const userInfo = (await userInfoRes.json()) as { email?: string };
      email = userInfo.email ?? null;
    } catch {
      /* email not available */
    }

    if (!email) {
      throw new BadRequestException(
        'LINEアカウントにメールアドレスが設定されていないため、ログインできません。メールアドレスとパスワードでご登録ください。',
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { lineId: profile.userId },
    });
    if (user) return this.buildAuthResponse(user);

    user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lineId: profile.userId },
      });
      return this.buildAuthResponse(user);
    }

    const username = await this.generateUniqueUsername(email.split('@')[0]);
    user = await this.prisma.user.create({
      data: {
        email,
        name: profile.displayName,
        username,
        passwordHash: null,
        lineId: profile.userId,
        avatarUrl: profile.pictureUrl ?? null,
        emailVerified: true,
      },
    });
    return this.buildAuthResponse(user);
  }

  // ── Magic Link ──────────────────────────────────────────────────

  async sendMagicLink(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to avoid leaking whether email exists
    if (!user) {
      return { message: 'ログインリンクをメールに送信しました。メールをご確認ください。' };
    }

    // Delete existing magic link tokens for this user
    await this.prisma.magicLinkToken.deleteMany({ where: { userId: user.id } });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes

    await this.prisma.magicLinkToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const magicUrl = `${(process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '')}/auth/magic-link/verify?token=${token}`;

    try {
      await this.sendEmail({
        to: email,
        subject: 'ログインリンク - Poker SNS',
        html: `
          <h2>ログインリンク</h2>
          <p>以下のリンクからログインしてください。このリンクは15分間有効です。</p>
          <p><a href="${magicUrl}" style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">ログインする</a></p>
          <p>または以下のURLをブラウザにコピーしてください：</p>
          <p>${magicUrl}</p>
          <p>このメールに心当たりがない場合は無視してください。</p>
        `,
      });
    } catch (err) {
      this.logger.warn(`Magic link email send failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { message: 'ログインリンクをメールに送信しました。メールをご確認ください。' };
  }

  async verifyMagicLink(token: string) {
    const stored = await this.prisma.magicLinkToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.magicLinkToken.delete({ where: { id: stored.id } });
      }
      throw new BadRequestException('ログインリンクが無効または期限切れです');
    }

    // Delete the used token
    await this.prisma.magicLinkToken.delete({ where: { id: stored.id } });

    // Mark email as verified if not already
    if (!stored.user.emailVerified) {
      await this.prisma.user.update({
        where: { id: stored.userId },
        data: { emailVerified: true },
      });
      stored.user.emailVerified = true;
    }

    return this.buildAuthResponse(stored.user);
  }

  // ── X (Twitter) OAuth ───────────────────────────────────────────

  // In-memory store for PKCE state → code_verifier (TTL ~10 min)
  private readonly xStateStore = new Map<string, { codeVerifier: string; expiresAt: number }>();

  getXAuthUrl(): { url: string; state: string } {
    const clientId = process.env.X_CLIENT_ID || '';
    if (!clientId) throw new BadRequestException('X OAuth is not configured');

    const state = randomBytes(16).toString('hex');
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Store with 10-minute TTL
    this.xStateStore.set(state, {
      codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Clean up expired entries
    for (const [key, val] of this.xStateStore.entries()) {
      if (val.expiresAt < Date.now()) this.xStateStore.delete(key);
    }

    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: `${apiUrl}/auth/x/callback`,
      scope: 'tweet.read users.read',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: `https://twitter.com/i/oauth2/authorize?${params.toString()}`,
      state,
    };
  }

  async handleXCallback(code: string, state: string) {
    const stored = this.xStateStore.get(state);
    if (!stored || stored.expiresAt < Date.now()) {
      this.xStateStore.delete(state);
      throw new BadRequestException('X OAuth state が無効または期限切れです');
    }
    const { codeVerifier } = stored;
    this.xStateStore.delete(state);

    const clientId = process.env.X_CLIENT_ID || '';
    const clientSecret = process.env.X_CLIENT_SECRET || '';
    const apiUrl = process.env.API_URL || 'http://localhost:4000';

    // Exchange code for tokens
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${apiUrl}/auth/x/callback`,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenRes.ok) {
      throw new BadRequestException('X認証トークンの取得に失敗しました');
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Get X user profile
    const userRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );
    if (!userRes.ok) {
      throw new BadRequestException('Xユーザー情報の取得に失敗しました');
    }
    const userData = (await userRes.json()) as {
      data: { id: string; name: string; username: string; profile_image_url?: string };
    };
    const xProfile = userData.data;

    // Check if user already exists with this xId
    let user = await this.prisma.user.findUnique({ where: { xId: xProfile.id } });
    if (user) return { type: 'success' as const, result: await this.buildAuthResponse(user) };

    // No existing xId link — need email to create/link account
    // Issue a short-lived JWT containing the X profile (5 min)
    const xToken = this.jwtService.sign(
      { xId: xProfile.id, xName: xProfile.name, xUsername: xProfile.username, xAvatar: xProfile.profile_image_url ?? null },
      { expiresIn: '5m' },
    );

    return {
      type: 'pending' as const,
      xToken,
      xProfile: {
        id: xProfile.id,
        name: xProfile.name,
        username: xProfile.username,
        avatarUrl: xProfile.profile_image_url ?? null,
      },
    };
  }

  async completeXRegistration(xToken: string, email: string) {
    let xPayload: { xId: string; xName: string; xUsername: string; xAvatar: string | null };
    try {
      xPayload = this.jwtService.verify(xToken) as typeof xPayload;
    } catch {
      throw new BadRequestException('Xトークンが無効または期限切れです。もう一度Xでログインしてください。');
    }

    // Check if xId is already linked
    let user = await this.prisma.user.findUnique({ where: { xId: xPayload.xId } });
    if (user) return this.buildAuthResponse(user);

    // Link to existing email account or create new
    user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { xId: xPayload.xId },
      });
      return this.buildAuthResponse(user);
    }

    // Create new user
    const username = await this.generateUniqueUsername(xPayload.xUsername || email.split('@')[0]);
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          name: xPayload.xName,
          username,
          passwordHash: null,
          xId: xPayload.xId,
          avatarUrl: xPayload.xAvatar,
          emailVerified: false,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('このメールアドレスは既に使用されています。');
      }
      throw error;
    }

    // Send verification email
    await this.sendVerificationEmail(user.id, user.email);

    return this.buildAuthResponse(user);
  }

  // ────────────────────────────────────────────────────────────────

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    username: string;
    emailVerified?: boolean;
    avatarUrl?: string | null;
    subscriptionStatus?: string;
  }) {
    const payload = { sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        emailVerified: user.emailVerified ?? false,
        avatarUrl: user.avatarUrl ?? null,
        subscriptionStatus: user.subscriptionStatus ?? 'free',
      },
    };
  }
}
