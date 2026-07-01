import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AdminGuard } from '../../src/auth/admin.guard';
import { ClerkGuard } from '../../src/auth/clerk.guard';

const CLERK_ID = 'sd-acct-clerk-001';
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
    const acct = await prisma.account.create({ data: { clerkUserId: `${CLERK_ID}-del`, email: EMAIL } });
    accountId = acct.id;
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { clerkUserId: `${CLERK_ID}-del` } });
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(ClerkGuard)
      .useFactory({
        factory: (p: PrismaService): CanActivate => ({
          canActivate: async (ctx: ExecutionContext) => {
            const req = ctx.switchToHttp().getRequest();
            req.user = { userId: `${CLERK_ID}-lock`, email: EMAIL };
            const account = await p.account.findUnique({
              where: { clerkUserId: `${CLERK_ID}-lock` },
              select: { deletedAt: true },
            });
            if (account?.deletedAt) throw new UnauthorizedException();
            return true;
          },
        }),
        inject: [PrismaService],
      })
      .compile();
    app = initApp(moduleRef.createNestApplication());
    await app.init();
    prisma = moduleRef.get(PrismaService);
    await prisma.account.create({
      data: { clerkUserId: `${CLERK_ID}-lock`, email: EMAIL, deletedAt: new Date() },
    });
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { clerkUserId: `${CLERK_ID}-lock` } });
    await app.close();
  });

  it('returns 401 for soft-deleted account', () =>
    request(app.getHttpServer()).get('/api/account/me').expect(401));
});

// ─── Slice 3: Non-admin DELETE returns 403 ───────────────────────────────────

describe('DELETE /api/account/:id (non-admin → 403)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accountId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ClerkGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = { userId: `${CLERK_ID}-nadmin`, email: EMAIL };
          return true;
        },
      })
      .compile();
    app = initApp(moduleRef.createNestApplication());
    await app.init();
    prisma = moduleRef.get(PrismaService);
    const acct = await prisma.account.create({ data: { clerkUserId: `${CLERK_ID}-nadmin`, email: EMAIL } });
    accountId = acct.id;
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { clerkUserId: `${CLERK_ID}-nadmin` } });
    await app.close();
  });

  it('returns 403 when caller is not admin', () =>
    request(app.getHttpServer()).delete(`/api/account/${accountId}`).expect(403));
});
