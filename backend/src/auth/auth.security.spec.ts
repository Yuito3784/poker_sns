import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';

jest.mock('bcryptjs');

/**
 * セキュリティテスト: bcrypt rounds (4件) + OAuth セッション (3件)
 * qa-report.md セクション 3.1 / 3.3 に対応
 */

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  emailVerificationToken: {
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

describe('Security: bcrypt rounds (3.1.1-3.1.4)', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();

    // Default mocks
    mockPrisma.refreshToken.create.mockResolvedValue({ token: 'mock-refresh-token' });
    mockPrisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.emailVerificationToken.create.mockResolvedValue({});
  });

  // 3.1.1: register() で bcrypt rounds=12 を使用
  it('3.1.1: register() should hash password with 12 rounds', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test',
      username: 'testuser',
      passwordHash: 'hashed-password',
    });

    await service.register({
      email: 'test@example.com',
      password: 'TestPass123',
      name: 'Test',
      username: 'testuser',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('TestPass123', 12);
  });

  // 3.1.2: changePassword() で bcrypt rounds=12 を使用
  it('3.1.2: changePassword() should hash new password with 12 rounds', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'old-hashed',
    });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    await service.changePassword('user-1', 'OldPass123', 'NewPass456');

    expect(bcrypt.hash).toHaveBeenCalledWith('NewPass456', 12);
  });

  // 3.1.3: resetPassword() で bcrypt rounds=12 を使用
  it('3.1.3: resetPassword() should hash new password with 12 rounds', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('reset-hashed');
    const futureDate = new Date(Date.now() + 3600000);
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      token: 'valid-reset-token',
      userId: 'user-1',
      expiresAt: futureDate,
    });
    mockPrisma.$transaction.mockResolvedValue([]);

    await service.resetPassword('valid-reset-token', 'ResetPass789');

    expect(bcrypt.hash).toHaveBeenCalledWith('ResetPass789', 12);
  });

  // 3.1.4: 旧パスワード(rounds=10)でもログイン可能
  it('3.1.4: login should succeed with old password hashed at rounds=10', async () => {
    // bcrypt.compare は rounds に関係なくハッシュを検証できる
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test',
      username: 'testuser',
      passwordHash: '$2a$10$oldHashWithRounds10', // rounds=10 のハッシュ
    });
    mockPrisma.refreshToken.create.mockResolvedValue({ token: 'refresh' });

    const result = await service.login({
      email: 'test@example.com',
      password: 'OldPassword123',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('OldPassword123', '$2a$10$oldHashWithRounds10');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });
});

describe('Security: OAuth Session (3.3.1-3.3.3)', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // 3.3.1: storeOAuthSession が 32文字 hex ID を返す
  it('3.3.1: storeOAuthSession should return a 32-char hex session ID', () => {
    const sessionId = service.storeOAuthSession({
      kind: 'auth',
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'user-1' },
    });

    expect(sessionId).toMatch(/^[a-f0-9]{32}$/);
  });

  // 3.3.2: consumeOAuthSession でデータ取得＆セッション削除
  it('3.3.2: consumeOAuthSession should return data and delete session (second call throws)', () => {
    const data = {
      kind: 'auth' as const,
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'user-1' },
    };
    const sessionId = service.storeOAuthSession(data);

    // 1回目: データ取得成功
    const result = service.consumeOAuthSession(sessionId);
    expect(result).toEqual(data);

    // 2回目: BadRequestException
    expect(() => service.consumeOAuthSession(sessionId)).toThrow(BadRequestException);
  });

  // 3.3.3: 期限切れセッション(>5分)の拒否
  it('3.3.3: expired session (>5min) should be rejected', () => {
    jest.useFakeTimers();

    const data = {
      kind: 'auth' as const,
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'user-1' },
    };
    const sessionId = service.storeOAuthSession(data);

    // 時間を6分後に進める
    jest.advanceTimersByTime(6 * 60 * 1000);

    expect(() => service.consumeOAuthSession(sessionId)).toThrow(BadRequestException);

    jest.useRealTimers();
  });
});
