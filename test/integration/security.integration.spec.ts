import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import helmet from 'helmet';
import { AppModule } from '../../src/app.module';

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  const config = app.get(ConfigService);

  // Mirror src/main.ts bootstrap — these are applied imperatively there, not
  // wired into AppModule, so a test app must replicate them to exercise them.
  app.use(helmet());
  app.enableCors({ origin: config.get('FRONTEND_URL'), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
});

afterAll(() => app.close());

describe('Security headers (Helmet)', () => {
  it('sets X-Content-Type-Options and X-Frame-Options on responses', async () => {
    const res = await request(app.getHttpServer()).get('/api/publishers').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

describe('CORS', () => {
  it('does not grant access to an origin outside FRONTEND_URL', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/publishers')
      .set('Origin', 'http://evil.example.com')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.example.com');
  });

  it('grants access to the configured FRONTEND_URL origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/publishers')
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});

describe('Rate limiting (ThrottlerModule)', () => {
  it('returns at least one 429 across 11 rapid requests to a throttled endpoint', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/payments/payment-intent')
        .send({ cartId: 'does-not-matter-for-throttling' });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
