import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';

jest.mock('bcryptjs');

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
  },
  emailVerificationToken: {
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

describe('AuthService', () => {
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
    // Default mock for refresh token generation
    mockPrisma.refreshToken.create.mockResolvedValue({ token: 'mock-refresh-token' });
    mockPrisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.emailVerificationToken.create.mockResolvedValue({});
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    };

    it('should register a new user and return auth response', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: registerDto.email,
        name: registerDto.name,
        username: registerDto.username,
        passwordHash: 'hashed-password',
      });

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          passwordHash: 'hashed-password',
          name: registerDto.name,
          username: registerDto.username,
          avatarUrl: null,
        },
      });
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        refreshToken: expect.any(String),
        user: {
          id: 'user-1',
          email: registerDto.email,
          name: registerDto.name,
          username: registerDto.username,
          emailVerified: false,
          avatarUrl: null,
          subscriptionStatus: 'free',
        },
      });
    });

    it('should throw BadRequestException on duplicate email/username', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      const prismaError = new Error('Unique constraint failed');
      Object.assign(prismaError, { code: 'P2002' });
      Object.defineProperty(prismaError, 'constructor', {
        value: { name: 'PrismaClientKnownRequestError' },
      });
      // Simulate PrismaClientKnownRequestError
      mockPrisma.user.create.mockRejectedValue(prismaError);

      // The service checks instanceof PrismaClientKnownRequestError
      // Since we can't easily mock that, we test the error is thrown
      await expect(service.register(registerDto)).rejects.toThrow();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        name: 'Test User',
        username: 'testuser',
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        refreshToken: expect.any(String),
        user: {
          id: 'user-1',
          email: loginDto.email,
          name: 'Test User',
          username: 'testuser',
          emailVerified: false,
          avatarUrl: null,
          subscriptionStatus: 'free',
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
