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

  afterAll(() => prisma.publisher.deleteMany({ where: { slug: 'adm-pub-test' } }));

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

  afterAll(() => cleanupCatalog(prisma, pubId));

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
    await prisma.team.deleteMany({ where: { gameId } });
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
    await prisma.character.deleteMany({ where: { gameId } });
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
    const productIds = (await prisma.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(p => p.id);
    await prisma.sku.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
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

  it('PATCH /api/skus/availability/bulk → 403', () =>
    request(guardApp.getHttpServer()).patch('/api/skus/availability/bulk').send({}).expect(403));

  it('POST /api/orders/:id/retry-fulfillment → 403', () =>
    request(guardApp.getHttpServer()).post('/api/orders/any-id/retry-fulfillment').send({}).expect(403));
});

// ─── Order list: status filter + pagination ───────────────────────────────────

describe('GET /api/orders (filter + pagination)', () => {
  let orderIds: string[];

  beforeAll(async () => {
    const [o1, o2, o3] = await Promise.all([
      prisma.order.create({ data: { buyerEmail: 'a@test.com', status: 'CONFIRMED', stripePaymentIntentId: 'pi_filter_1', shippingAddress: {} } }),
      prisma.order.create({ data: { buyerEmail: 'b@test.com', status: 'CONFIRMED', stripePaymentIntentId: 'pi_filter_2', shippingAddress: {} } }),
      prisma.order.create({ data: { buyerEmail: 'c@test.com', status: 'PENDING',   stripePaymentIntentId: 'pi_filter_3', shippingAddress: {} } }),
    ]);
    orderIds = [o1.id, o2.id, o3.id];
  });

  afterAll(() => prisma.order.deleteMany({ where: { id: { in: orderIds } } }));

  it('filters by status=CONFIRMED', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/orders?status=CONFIRMED')
      .expect(200);
    const seeded = body.data.filter((o: { id: string }) => orderIds.includes(o.id));
    expect(seeded).toHaveLength(2);
    expect(seeded.every((o: { status: string }) => o.status === 'CONFIRMED')).toBe(true);
  });

  it('paginates with page=1&limit=1', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/orders?page=1&limit=1')
      .expect(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBeGreaterThanOrEqual(3);
  });
});

// ─── Retry fulfillment ────────────────────────────────────────────────────────

describe('POST /api/orders/:id/retry-fulfillment', () => {
  let confirmedOrderId: string;
  let forwardedOrderId: string;

  beforeAll(async () => {
    const [confirmed, forwarded] = await Promise.all([
      prisma.order.create({ data: { buyerEmail: 'retry@test.com', status: 'CONFIRMED', stripePaymentIntentId: 'pi_retry_1', shippingAddress: {} } }),
      prisma.order.create({ data: { buyerEmail: 'fwd@test.com', status: 'FORWARDED', stripePaymentIntentId: 'pi_retry_2', shippingAddress: {}, supplierReference: 'REF-123' } }),
    ]);
    confirmedOrderId = confirmed.id;
    forwardedOrderId = forwarded.id;
  });

  afterAll(() => prisma.order.deleteMany({ where: { id: { in: [confirmedOrderId, forwardedOrderId] } } }));

  it('200 + sets supplierReference on CONFIRMED order', async () => {
    const { body } = await request(app.getHttpServer())
      .post(`/api/orders/${confirmedOrderId}/retry-fulfillment`)
      .expect(200);
    expect(body.data.supplierReference).toBeDefined();
    expect(body.data.status).toBe('FORWARDED');
  });

  it('409 when order already FORWARDED', () =>
    request(app.getHttpServer())
      .post(`/api/orders/${forwardedOrderId}/retry-fulfillment`)
      .expect(409));
});

// ─── Bulk SKU availability toggle ────────────────────────────────────────────

describe('PATCH /api/skus/availability/bulk', () => {
  let pubId: string;
  let gameId: string;
  let skuInGame: string;
  let skuOtherGame: string;

  beforeAll(async () => {
    const pub = await prisma.publisher.create({ data: { name: 'Bulk Pub', slug: 'bulk-pub' } });
    const game = await prisma.game.create({ data: { name: 'Bulk Game', slug: 'bulk-game', publisherId: pub.id } });
    const otherGame = await prisma.game.create({ data: { name: 'Other Game', slug: 'bulk-other-game', publisherId: pub.id } });
    const p1 = await prisma.product.create({ data: { name: 'Bulk P1', gameId: game.id } });
    const p2 = await prisma.product.create({ data: { name: 'Bulk P2', gameId: otherGame.id } });
    const s1 = await prisma.sku.create({ data: { productId: p1.id, price: 10, available: true, attributes: {} } });
    const s2 = await prisma.sku.create({ data: { productId: p2.id, price: 10, available: true, attributes: {} } });
    pubId = pub.id;
    gameId = game.id;
    skuInGame = s1.id;
    skuOtherGame = s2.id;
  });

  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { id: { in: [skuInGame, skuOtherGame] } } });
    const gameIds = (await prisma.game.findMany({ where: { publisherId: pubId }, select: { id: true } })).map(g => g.id);
    await prisma.product.deleteMany({ where: { gameId: { in: gameIds } } });
    await prisma.game.deleteMany({ where: { publisherId: pubId } });
    await prisma.publisher.delete({ where: { id: pubId } });
  });

  it('toggles available=false for all SKUs in the game', async () => {
    await request(app.getHttpServer())
      .patch('/api/skus/availability/bulk')
      .send({ facet: 'game', facetId: gameId, available: false })
      .expect(200);
    const sku = await prisma.sku.findUnique({ where: { id: skuInGame } });
    expect(sku?.available).toBe(false);
  });

  it('does not affect SKUs outside the facet', async () => {
    const sku = await prisma.sku.findUnique({ where: { id: skuOtherGame } });
    expect(sku?.available).toBe(true);
  });
});
