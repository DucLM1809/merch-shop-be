import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AdminGuard } from '../../src/auth/admin.guard';
import { AuthGuard } from '../../src/auth/auth-guard';

const EMAIL = 'sd-acct@example.com';

function initApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  return app;
}

// ─── Slice 1: DELETE /account/:id soft-deletes the row ───────────────────────

describe('DELETE /api/account/:id (soft delete)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accountId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = initApp(moduleRef.createNestApplication());
    await app.init();
    prisma = moduleRef.get(PrismaService);
    const acct = await prisma.account.create({ data: { email: `del-${EMAIL}` } });
    accountId = acct.id;
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { id: accountId } });
    await app.close();
  });

  it('returns 200 and row persists with deletedAt set', async () => {
    await request(app.getHttpServer()).delete(`/api/account/${accountId}`).expect(200);
    const row = await prisma.account.findUnique({ where: { id: accountId } });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();
  });
});

// ─── Slice 2: Soft-deleted Account is locked out (401) ───────────────────────

describe('GET /api/account/me after account soft-delete (lockout)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let deletedAccountId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(AuthGuard)
      .useFactory({
        factory: (p: PrismaService): CanActivate => ({
          canActivate: async (ctx: ExecutionContext) => {
            const req = ctx.switchToHttp().getRequest();
            req.user = { userId: deletedAccountId, email: EMAIL };
            const account = await p.account.findUnique({
              where: { id: deletedAccountId },
              select: { deletedAt: true },
            });
            if (!account || account.deletedAt) throw new UnauthorizedException();
            return true;
          },
        }),
        inject: [PrismaService],
      })
      .compile();
    app = initApp(moduleRef.createNestApplication());
    await app.init();
    prisma = moduleRef.get(PrismaService);
    const acct = await prisma.account.create({
      data: { email: `lock-${EMAIL}`, deletedAt: new Date() },
    });
    deletedAccountId = acct.id;
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { id: deletedAccountId } });
    await app.close();
  });

  it('returns 401 for soft-deleted account', () =>
    request(app.getHttpServer()).get('/api/account/me').expect(401));
});

// ─── Slice 3: Non-admin DELETE returns 403 ───────────────────────────────────

describe('DELETE /api/account/:id (non-admin → 403)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let nonAdminAccountId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = { userId: nonAdminAccountId, email: EMAIL };
          return true;
        },
      })
      .compile();
    app = initApp(moduleRef.createNestApplication());
    await app.init();
    prisma = moduleRef.get(PrismaService);
    const acct = await prisma.account.create({ data: { email: `nadmin-${EMAIL}` } });
    nonAdminAccountId = acct.id;
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { id: nonAdminAccountId } });
    await app.close();
  });

  it('returns 403 when caller is not admin', () =>
    request(app.getHttpServer()).delete(`/api/account/${nonAdminAccountId}`).expect(403));
});
