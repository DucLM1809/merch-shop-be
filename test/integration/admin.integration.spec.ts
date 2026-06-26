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

// ─── Publishers CRUD ──────────────────────────────────────────────────────────

describe('Publishers admin write', () => {
  let pubId: string;

  it('POST /api/publishers → 201 creates publisher', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/publishers')
      .send({ name: 'Adm Publisher', slug: 'adm-pub-test' })
      .expect(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    pubId = body.data.id;
  });

  it('PATCH /api/publishers/:id → 200 updates name', async () => {
    const { body } = await request(app.getHttpServer())
      .patch(`/api/publishers/${pubId}`)
      .send({ name: 'Adm Publisher Updated' })
      .expect(200);
    expect(body.data.name).toBe('Adm Publisher Updated');
  });

  it('DELETE /api/publishers/:id → 200 removes publisher', () =>
    request(app.getHttpServer()).delete(`/api/publishers/${pubId}`).expect(200));
});

// ─── Games CRUD ───────────────────────────────────────────────────────────────

describe('Games admin write', () => {
  let pubId: string;
  let gameId: string;

  beforeAll(async () => {
    const pub = await prisma.publisher.create({ data: { name: 'Adm Game Pub', slug: 'adm-game-pub' } });
    pubId = pub.id;
  });

  afterAll(() => prisma.publisher.delete({ where: { id: pubId } }));

  it('POST /api/games → 201 creates game', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/games')
      .send({ name: 'Adm Game', slug: 'adm-game-test', publisherId: pubId })
      .expect(201);
    expect(body.data.id).toBeDefined();
    gameId = body.data.id;
  });

  it('PATCH /api/games/:id → 200 updates', async () => {
    const { body } = await request(app.getHttpServer())
      .patch(`/api/games/${gameId}`)
      .send({ name: 'Adm Game Updated' })
      .expect(200);
    expect(body.data.name).toBe('Adm Game Updated');
  });

  it('DELETE /api/games/:id → 200', () =>
    request(app.getHttpServer()).delete(`/api/games/${gameId}`).expect(200));
});

// ─── Teams CRUD ───────────────────────────────────────────────────────────────

describe('Teams admin write', () => {
  let pubId: string;
  let gameId: string;
  let teamId: string;

  beforeAll(async () => {
    const pub = await prisma.publisher.create({ data: { name: 'Adm Team Pub', slug: 'adm-team-pub' } });
    const game = await prisma.game.create({ data: { name: 'Adm Team Game', slug: 'adm-team-game', publisherId: pub.id } });
    pubId = pub.id;
    gameId = game.id;
  });

  afterAll(async () => {
    await prisma.game.delete({ where: { id: gameId } });
    await prisma.publisher.delete({ where: { id: pubId } });
  });

  it('POST /api/teams → 201 creates team', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/teams')
      .send({ name: 'Adm Team', slug: 'adm-team-test', gameId })
      .expect(201);
    expect(body.data.id).toBeDefined();
    teamId = body.data.id;
  });

  it('PATCH /api/teams/:id → 200 updates', async () => {
    const { body } = await request(app.getHttpServer())
      .patch(`/api/teams/${teamId}`)
      .send({ name: 'Adm Team Updated' })
      .expect(200);
    expect(body.data.name).toBe('Adm Team Updated');
  });

  it('DELETE /api/teams/:id → 200', () =>
    request(app.getHttpServer()).delete(`/api/teams/${teamId}`).expect(200));
});

// ─── Characters CRUD ──────────────────────────────────────────────────────────

describe('Characters admin write', () => {
  let pubId: string;
  let gameId: string;
  let charId: string;

  beforeAll(async () => {
    const pub = await prisma.publisher.create({ data: { name: 'Adm Char Pub', slug: 'adm-char-pub' } });
    const game = await prisma.game.create({ data: { name: 'Adm Char Game', slug: 'adm-char-game', publisherId: pub.id } });
    pubId = pub.id;
    gameId = game.id;
  });

  afterAll(async () => {
    await prisma.game.delete({ where: { id: gameId } });
    await prisma.publisher.delete({ where: { id: pubId } });
  });

  it('POST /api/characters → 201 creates character', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/characters')
      .send({ name: 'Adm Char', slug: 'adm-char-test', gameId })
      .expect(201);
    expect(body.data.id).toBeDefined();
    charId = body.data.id;
  });

  it('PATCH /api/characters/:id → 200 updates', async () => {
    const { body } = await request(app.getHttpServer())
      .patch(`/api/characters/${charId}`)
      .send({ name: 'Adm Char Updated' })
      .expect(200);
    expect(body.data.name).toBe('Adm Char Updated');
  });

  it('DELETE /api/characters/:id → 200', () =>
    request(app.getHttpServer()).delete(`/api/characters/${charId}`).expect(200));
});

// ─── Products CRUD ────────────────────────────────────────────────────────────

describe('Products admin write', () => {
  let pubId: string;
  let gameId: string;
  let productId: string;

  beforeAll(async () => {
    const pub = await prisma.publisher.create({ data: { name: 'Adm Prod Pub', slug: 'adm-prod-pub' } });
    const game = await prisma.game.create({ data: { name: 'Adm Prod Game', slug: 'adm-prod-game', publisherId: pub.id } });
    pubId = pub.id;
    gameId = game.id;
  });

  afterAll(async () => {
    await prisma.game.delete({ where: { id: gameId } });
    await prisma.publisher.delete({ where: { id: pubId } });
  });

  it('POST /api/products → 201 creates product', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/products')
      .send({ name: 'Adm Product', gameId })
      .expect(201);
    expect(body.data.id).toBeDefined();
    productId = body.data.id;
  });

  it('PATCH /api/products/:id → 200 updates', async () => {
    const { body } = await request(app.getHttpServer())
      .patch(`/api/products/${productId}`)
      .send({ name: 'Adm Product Updated' })
      .expect(200);
    expect(body.data.name).toBe('Adm Product Updated');
  });

  it('DELETE /api/products/:id → 200', () =>
    request(app.getHttpServer()).delete(`/api/products/${productId}`).expect(200));
});

// ─── SKUs CRUD + availability toggle ─────────────────────────────────────────

describe('SKUs admin write', () => {
  let pubId: string;
  let productId: string;
  let skuId: string;

  beforeAll(async () => {
    const pub = await prisma.publisher.create({ data: { name: 'Adm SKU Pub', slug: 'adm-sku-pub' } });
    const game = await prisma.game.create({ data: { name: 'Adm SKU Game', slug: 'adm-sku-game', publisherId: pub.id } });
    const product = await prisma.product.create({ data: { name: 'Adm SKU Product', gameId: game.id } });
    pubId = pub.id;
    productId = product.id;
  });

  afterAll(async () => {
    const gameIds = (await prisma.game.findMany({ where: { publisherId: pubId }, select: { id: true } })).map(g => g.id);
    await prisma.product.deleteMany({ where: { gameId: { in: gameIds } } });
    await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
    await prisma.publisher.delete({ where: { id: pubId } });
  });

  it('POST /api/skus → 201 creates SKU', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/skus')
      .send({ productId, price: 39.99, attributes: { size: 'M' } })
      .expect(201);
    expect(body.data.id).toBeDefined();
    skuId = body.data.id;
  });

  it('PATCH /api/skus/:id/availability → 200 toggles available=false', async () => {
    const { body } = await request(app.getHttpServer())
      .patch(`/api/skus/${skuId}/availability`)
      .send({ available: false })
      .expect(200);
    expect(body.data.available).toBe(false);
  });

  it('PATCH /api/skus/:id/availability → 200 toggles available=true', async () => {
    const { body } = await request(app.getHttpServer())
      .patch(`/api/skus/${skuId}/availability`)
      .send({ available: true })
      .expect(200);
    expect(body.data.available).toBe(true);
  });

  it('DELETE /api/skus/:id → 200', () =>
    request(app.getHttpServer()).delete(`/api/skus/${skuId}`).expect(200));
});

// ─── End-to-end: Admin creates Publisher → Game → Team → Product → SKU ───────

describe('Admin end-to-end create chain', () => {
  let pubId: string;
  let gameId: string;
  let teamId: string;
  let productId: string;
  let skuId: string;

  afterAll(async () => {
    if (skuId) await prisma.sku.deleteMany({ where: { productId } });
    if (productId) await prisma.product.delete({ where: { id: productId } });
    if (teamId) await prisma.team.delete({ where: { id: teamId } });
    if (gameId) await prisma.game.delete({ where: { id: gameId } });
    if (pubId) await prisma.publisher.delete({ where: { id: pubId } });
  });

  it('creates Publisher', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/publishers')
      .send({ name: 'Chain Pub', slug: 'chain-pub' })
      .expect(201);
    pubId = body.data.id;
    expect(pubId).toBeDefined();
  });

  it('creates Game under Publisher', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/games')
      .send({ name: 'Chain Game', slug: 'chain-game', publisherId: pubId })
      .expect(201);
    gameId = body.data.id;
    expect(gameId).toBeDefined();
  });

  it('creates Team under Game', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/teams')
      .send({ name: 'Chain Team', slug: 'chain-team', gameId })
      .expect(201);
    teamId = body.data.id;
    expect(teamId).toBeDefined();
  });

  it('creates Product linked to Game', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/products')
      .send({ name: 'Chain Product', gameId, teamId })
      .expect(201);
    productId = body.data.id;
    expect(productId).toBeDefined();
  });

  it('creates SKU under Product', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/skus')
      .send({ productId, price: 49.99, attributes: { size: 'L' } })
      .expect(201);
    skuId = body.data.id;
    expect(skuId).toBeDefined();
  });
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

  it('POST /api/publishers → 403', () =>
    request(guardApp.getHttpServer()).post('/api/publishers').send({}).expect(403));

  it('PATCH /api/publishers/:id → 403', () =>
    request(guardApp.getHttpServer()).patch('/api/publishers/any-id').send({}).expect(403));

  it('DELETE /api/publishers/:id → 403', () =>
    request(guardApp.getHttpServer()).delete('/api/publishers/any-id').expect(403));

  it('POST /api/games → 403', () =>
    request(guardApp.getHttpServer()).post('/api/games').send({}).expect(403));

  it('PATCH /api/games/:id → 403', () =>
    request(guardApp.getHttpServer()).patch('/api/games/any-id').send({}).expect(403));

  it('DELETE /api/games/:id → 403', () =>
    request(guardApp.getHttpServer()).delete('/api/games/any-id').expect(403));

  it('POST /api/teams → 403', () =>
    request(guardApp.getHttpServer()).post('/api/teams').send({}).expect(403));

  it('PATCH /api/teams/:id → 403', () =>
    request(guardApp.getHttpServer()).patch('/api/teams/any-id').send({}).expect(403));

  it('DELETE /api/teams/:id → 403', () =>
    request(guardApp.getHttpServer()).delete('/api/teams/any-id').expect(403));

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
