import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthGuard } from '../../src/auth/auth-guard';

let app: INestApplication;
let prisma: PrismaService;
let accountId: string;
const TEST_EMAIL = 'acct-test@example.com';

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
        ctx.switchToHttp().getRequest().user = { userId: accountId, email: TEST_EMAIL };
        return true;
      },
    })
    .compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  prisma = moduleRef.get(PrismaService);

  const account = await prisma.account.create({ data: { email: TEST_EMAIL } });
  accountId = account.id;
});

afterAll(async () => {
  await prisma.account.deleteMany({ where: { id: accountId } });
  await app.close();
});

// ─── GET /account/me returns the authenticated Account, unchanged across calls ─

describe('GET /api/account/me (authenticated)', () => {
  it('returns the authenticated account id, email, and role', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/account/me').expect(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(accountId);
    expect(body.data.email).toBe(TEST_EMAIL);
    expect(body.data.role).toBe('BUYER');
  });

  it('returns the same account id on a repeated call', async () => {
    const { body: first } = await request(app.getHttpServer()).get('/api/account/me').expect(200);
    const { body: second } = await request(app.getHttpServer()).get('/api/account/me').expect(200);
    expect(first.data.id).toBe(second.data.id);
  });
});

// ─── No token → 401 ────────────────────────────────────────────────────────────

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
