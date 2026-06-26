import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ClerkGuard } from '../../src/auth/clerk.guard';

let app: INestApplication;
let prisma: PrismaService;
const TEST_CLERK_ID = 'acct-test-clerk-001';
const TEST_EMAIL = 'acct-test@example.com';

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ClerkGuard)
    .useValue({
      canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
        ctx.switchToHttp().getRequest().user = { userId: TEST_CLERK_ID, email: TEST_EMAIL };
        return true;
      },
    })
    .compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  prisma = moduleRef.get(PrismaService);
});

afterAll(async () => {
  await prisma.account.deleteMany({ where: { clerkUserId: TEST_CLERK_ID } });
  await app.close();
});

// ─── Slice 2 & 3: upsert on first call, idempotent on second ─────────────────

describe('GET /api/account/me (authenticated)', () => {
  it('creates Account on first call and returns id, email, role', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/account/me').expect(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.email).toBe(TEST_EMAIL);
    expect(body.data.role).toBe('BUYER');
  });

  it('returns same Account id on second call (no duplicate)', async () => {
    const { body: first } = await request(app.getHttpServer()).get('/api/account/me').expect(200);
    const { body: second } = await request(app.getHttpServer()).get('/api/account/me').expect(200);
    expect(first.data.id).toBe(second.data.id);
  });
});

// ─── Slice 1: 401 with no token ───────────────────────────────────────────────

describe('GET /api/account/me (no token app)', () => {
  let noAuthApp: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    noAuthApp = moduleRef.createNestApplication();
    noAuthApp.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    noAuthApp.setGlobalPrefix('api');
    await noAuthApp.init();
  });

  afterAll(() => noAuthApp.close());

  it('returns 401 when no Bearer token', () =>
    request(noAuthApp.getHttpServer()).get('/api/account/me').expect(401));
});
