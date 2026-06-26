import { INestApplication, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AdminGuard } from '../../src/auth/admin.guard';

// ─── App A: AdminGuard bypassed (harness for positive admin tests) ────────────

let app: INestApplication;
export let prisma: PrismaService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(AdminGuard)
    .useValue({ canActivate: () => true })
    .compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  prisma = moduleRef.get(PrismaService);
});

afterAll(() => app.close());

// ─── Catalog fixture helpers ──────────────────────────────────────────────────

export async function seedCatalog(p: PrismaService, prefix: string) {
  const pub = await p.publisher.create({ data: { name: `Pub-${prefix}`, slug: `adm-${prefix}-pub` } });
  const game = await p.game.create({ data: { name: `Game-${prefix}`, slug: `adm-${prefix}-game`, publisherId: pub.id } });
  const team = await p.team.create({ data: { name: `Team-${prefix}`, slug: `adm-${prefix}-team`, gameId: game.id } });
  const char = await p.character.create({ data: { name: `Char-${prefix}`, slug: `adm-${prefix}-char`, gameId: game.id } });
  return { pub, game, team, char };
}

export async function cleanupCatalog(p: PrismaService, publisherId: string) {
  const gameIds = (await p.game.findMany({ where: { publisherId }, select: { id: true } })).map(g => g.id);
  const productIds = (await p.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(r => r.id);
  await p.sku.deleteMany({ where: { productId: { in: productIds } } });
  await p.product.deleteMany({ where: { id: { in: productIds } } });
  await p.character.deleteMany({ where: { gameId: { in: gameIds } } });
  await p.team.deleteMany({ where: { gameId: { in: gameIds } } });
  await p.game.deleteMany({ where: { id: { in: gameIds } } });
  await p.publisher.delete({ where: { id: publisherId } });
}

// ─── App A smoke test ─────────────────────────────────────────────────────────

describe('Admin harness (AdminGuard bypassed)', () => {
  it('app boots and serves public endpoints', () =>
    request(app.getHttpServer()).get('/api/characters').expect(200));
});

// ─── App B: AdminGuard does Prisma role check only — 403 role enforcement ─────

// ponytail: AdminGuard re-created with Prisma check only (no Clerk JWT).
// Sets req.user={userId:'nobody'}; no Account in DB → role check → 403.
// Tests role enforcement, not JWT verification.
describe('Admin guard role enforcement (403)', () => {
  let guardApp: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(AdminGuard)
      .useFactory({
        inject: [PrismaService],
        factory: (p: PrismaService) => ({
          canActivate: async (ctx: ExecutionContext) => {
            const req = ctx.switchToHttp().getRequest();
            req.user = { userId: 'nobody' };
            const account = await p.account.findUnique({
              where: { clerkUserId: 'nobody' },
              select: { role: true },
            });
            if (account?.role !== 'ADMIN') throw new ForbiddenException();
            return true;
          },
        }),
      })
      .compile();
    guardApp = moduleRef.createNestApplication();
    guardApp.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    guardApp.setGlobalPrefix('api');
    await guardApp.init();
  });

  afterAll(() => guardApp.close());

  it('POST /api/characters → 403', () =>
    request(guardApp.getHttpServer()).post('/api/characters').send({}).expect(403));

  it('PATCH /api/characters/:id → 403', () =>
    request(guardApp.getHttpServer()).patch('/api/characters/any-id').send({}).expect(403));

  it('DELETE /api/characters/:id → 403', () =>
    request(guardApp.getHttpServer()).delete('/api/characters/any-id').expect(403));

  it('POST /api/products → 403', () =>
    request(guardApp.getHttpServer()).post('/api/products').send({}).expect(403));

  it('PATCH /api/products/:id → 403', () =>
    request(guardApp.getHttpServer()).patch('/api/products/any-id').send({}).expect(403));

  it('DELETE /api/products/:id → 403', () =>
    request(guardApp.getHttpServer()).delete('/api/products/any-id').expect(403));

  it('POST /api/skus → 403', () =>
    request(guardApp.getHttpServer()).post('/api/skus').send({}).expect(403));

  it('PATCH /api/skus/:id/availability → 403', () =>
    request(guardApp.getHttpServer()).patch('/api/skus/any-id/availability').send({}).expect(403));

  it('DELETE /api/skus/:id → 403', () =>
    request(guardApp.getHttpServer()).delete('/api/skus/any-id').expect(403));

  it('GET /api/orders → 403', () =>
    request(guardApp.getHttpServer()).get('/api/orders').expect(403));
});
