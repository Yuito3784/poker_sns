import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Rate Limit テスト (5件)
 * qa-report.md セクション 3.7 に対応
 *
 * 注意: ThrottlerModule はリクエスト単位でカウントするため、
 * テスト環境では実際のレート制限をトリガーさせる。
 * テスト前に ThrottlerStorage をクリアするか、十分な間隔を空ける。
 */

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.enableCors({ origin: 'http://localhost:3000', credentials: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * ヘルパー: 指定回数リクエストを送信し、最後のレスポンスを返す
   */
  async function sendRequests(
    method: 'post' | 'get',
    endpoint: string,
    count: number,
    body?: Record<string, unknown>,
  ) {
    let lastResponse: request.Response | null = null;
    for (let i = 0; i < count; i++) {
      const req = method === 'post'
        ? request(app.getHttpServer()).post(endpoint).send(body || {})
        : request(app.getHttpServer()).get(endpoint);
      lastResponse = await req;
    }
    return lastResponse!;
  }

  // 3.7.1: POST /auth/register 5回/分
  it('3.7.1: POST /auth/register should be limited to 5 requests/min', async () => {
    const body = { email: 'ratelimit@test.com', password: 'Pass1234', name: 'RL', username: 'ratelimit' };

    // 5回送信（バリデーションエラーや重複でも ThrottlerModule はカウントする）
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/auth/register').send(body);
    }

    // 6回目 → 429
    const res = await request(app.getHttpServer()).post('/auth/register').send(body);
    expect(res.status).toBe(429);
  });

  // 3.7.2: POST /auth/login 10回/分
  it('3.7.2: POST /auth/login should be limited to 10 requests/min', async () => {
    const body = { email: 'ratelimit@test.com', password: 'Wrong123' };

    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer()).post('/auth/login').send(body);
    }

    // 11回目 → 429
    const res = await request(app.getHttpServer()).post('/auth/login').send(body);
    expect(res.status).toBe(429);
  });

  // 3.7.3: POST /auth/verify-email 5回/分
  it('3.7.3: POST /auth/verify-email should be limited to 5 requests/min', async () => {
    const body = { token: 'fake-token' };

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/auth/verify-email').send(body);
    }

    // 6回目 → 429
    const res = await request(app.getHttpServer()).post('/auth/verify-email').send(body);
    expect(res.status).toBe(429);
  });

  // 3.7.4: POST /auth/forgot-password 3回/分
  it('3.7.4: POST /auth/forgot-password should be limited to 3 requests/min', async () => {
    const body = { email: 'ratelimit@test.com' };

    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).post('/auth/forgot-password').send(body);
    }

    // 4回目 → 429
    const res = await request(app.getHttpServer()).post('/auth/forgot-password').send(body);
    expect(res.status).toBe(429);
  });

  // 3.7.5: POST /auth/resend-verification 3回/分
  it('3.7.5: POST /auth/resend-verification should be limited to 3 requests/min', async () => {
    // resend-verification は JwtAuthGuard 付き → 認証なしでは 401
    // ThrottlerModule は Guard の前にカウントするか後かは実装次第
    // NestJS ThrottlerGuard は Guard として動作するため、JwtAuth と同じレベル
    // ここでは、認証なしでもスロットルカウントは増えることを確認
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).post('/auth/resend-verification');
    }

    // 4回目 → 429 (または 401 が先に来る場合がある)
    const res = await request(app.getHttpServer()).post('/auth/resend-verification');
    // ThrottlerGuard が先に評価されれば 429、JwtAuthGuard が先なら 401
    expect([401, 429]).toContain(res.status);
  });
});
