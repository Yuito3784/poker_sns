import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import * as dns from 'dns';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SanitizeInputPipe } from './common/sanitize.pipe';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { WebhookNotifierService } from './common/webhook-notifier.service';

// SMTP 接続で IPv6 が選ばれると Railway 等で ENETUNREACH になることがあるため、IPv4 を優先する
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Register global exception filter with webhook notification
  const webhookNotifier = app.get(WebhookNotifierService);
  app.useGlobalFilters(new GlobalExceptionFilter(webhookNotifier));

  // Stripe webhook needs raw body for signature verification
  app.use('/subscriptions/webhook', express.raw({ type: 'application/json' }));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://js.stripe.com'],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS: dev は dev 用フロント URL のみ、本番は本番ドメインのみ。運用ルールは docs/ENV_CONFIG_SUMMARY.md 参照
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map((o) => o.trim()),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
