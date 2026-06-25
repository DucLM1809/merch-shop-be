import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  prisma = moduleRef.get(PrismaService);
});

afterAll(() => app.close());

// ─── Slice 1: 404 for unknown resources ──────────────────────────────────────

describe('GET /api/publishers/:slug', () => {
  it('returns 404 for unknown slug', () =>
    request(app.getHttpServer()).get('/api/publishers/no-such-publisher').expect(404));
});

describe('GET /api/products/:id', () => {
  it('returns 404 for unknown id', () =>
    request(app.getHttpServer()).get('/api/products/no-such-product-id').expect(404));
});

// ─── Slice 2: Publishers sorted by name ──────────────────────────────────────

describe('GET /api/publishers', () => {
  let pubIds: string[];

  beforeAll(async () => {
    const [z, a] = await Promise.all([
      prisma.publisher.create({ data: { name: 'Zyncast', slug: 'cat-pub-z' } }),
      prisma.publisher.create({ data: { name: 'Apex Studios', slug: 'cat-pub-a' } }),
    ]);
    pubIds = [z.id, a.id];
  });

  afterAll(() => prisma.publisher.deleteMany({ where: { id: { in: pubIds } } }));

  it('returns publishers ordered by name asc', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/publishers').expect(200);
    const seeded = body.filter((p: any) => pubIds.includes(p.id));
    expect(seeded.map((p: any) => p.name)).toEqual(['Apex Studios', 'Zyncast']);
  });
});

// ─── Slice 3: Games filtered by publisherId ───────────────────────────────────

describe('GET /api/games?publisherId=', () => {
  let p1Id: string;
  let p2Id: string;
  let gameIds: string[];

  beforeAll(async () => {
    const [p1, p2] = await Promise.all([
      prisma.publisher.create({ data: { name: 'GP1', slug: 'cat-gp1' } }),
      prisma.publisher.create({ data: { name: 'GP2', slug: 'cat-gp2' } }),
    ]);
    p1Id = p1.id;
    p2Id = p2.id;
    const [g1, g2, g3] = await Promise.all([
      prisma.game.create({ data: { name: 'G1', slug: 'cat-g1', publisherId: p1.id } }),
      prisma.game.create({ data: { name: 'G2', slug: 'cat-g2', publisherId: p1.id } }),
      prisma.game.create({ data: { name: 'G3', slug: 'cat-g3', publisherId: p2.id } }),
    ]);
    gameIds = [g1.id, g2.id, g3.id];
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
    await prisma.publisher.deleteMany({ where: { id: { in: [p1Id, p2Id] } } });
  });

  it('returns only games for the given publisher', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/games?publisherId=${p1Id}`)
      .expect(200);
    const seeded = body.filter((g: any) => gameIds.includes(g.id));
    expect(seeded).toHaveLength(2);
    expect(seeded.every((g: any) => g.publisher.id === p1Id)).toBe(true);
  });
});

// ─── Products fixture helpers ─────────────────────────────────────────────────

async function seedCatalog(p: PrismaService, prefix: string) {
  const pub = await p.publisher.create({ data: { name: `Pub-${prefix}`, slug: `cat-${prefix}-pub` } });
  const game = await p.game.create({ data: { name: `Game-${prefix}`, slug: `cat-${prefix}-game`, publisherId: pub.id } });
  const team = await p.team.create({ data: { name: `Team-${prefix}`, slug: `cat-${prefix}-team`, gameId: game.id } });
  const char = await p.character.create({ data: { name: `Char-${prefix}`, slug: `cat-${prefix}-char`, gameId: game.id } });
  return { pub, game, team, char };
}

async function cleanupCatalog(p: PrismaService, publisherId: string) {
  const gameIds = (await p.game.findMany({ where: { publisherId }, select: { id: true } })).map(g => g.id);
  const productIds = (await p.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(r => r.id);
  await p.sku.deleteMany({ where: { productId: { in: productIds } } });
  await p.product.deleteMany({ where: { id: { in: productIds } } });
  await p.character.deleteMany({ where: { gameId: { in: gameIds } } });
  await p.team.deleteMany({ where: { gameId: { in: gameIds } } });
  await p.game.deleteMany({ where: { id: { in: gameIds } } });
  await p.publisher.delete({ where: { id: publisherId } });
}

// ─── Slice 4: Products exclude unavailable SKUs ───────────────────────────────

describe('GET /api/products (SKU availability)', () => {
  let pubId: string;
  let productId: string;

  beforeAll(async () => {
    const { pub, game } = await seedCatalog(prisma, 'avail');
    pubId = pub.id;
    const product = await prisma.product.create({ data: { name: 'Avail Hoodie', gameId: game.id } });
    productId = product.id;
    await prisma.sku.createMany({
      data: [
        { productId, price: 49.99, available: true, attributes: { size: 'M' } },
        { productId, price: 49.99, available: false, attributes: { size: 'XL' } },
      ],
    });
  });

  afterAll(() => cleanupCatalog(prisma, pubId));

  it('excludes unavailable SKUs', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/products').expect(200);
    const p = body.find((p: any) => p.id === productId);
    expect(p).toBeDefined();
    expect(p.skus).toHaveLength(1);
    expect(p.skus[0].attributes).toMatchObject({ size: 'M' });
  });
});

// ─── Slice 5 + 6: Facet filtering ────────────────────────────────────────────

describe('GET /api/products (facet filters)', () => {
  let pubId: string;
  let gameId: string;
  let teamId: string;
  let productIds: string[];

  beforeAll(async () => {
    const { pub, game, team } = await seedCatalog(prisma, 'facet');
    pubId = pub.id;
    gameId = game.id;
    teamId = team.id;
    const [p1, p2, p3] = await Promise.all([
      prisma.product.create({ data: { name: 'Game+Team product', gameId: game.id, teamId: team.id } }),
      prisma.product.create({ data: { name: 'Game-only product', gameId: game.id } }),
      prisma.product.create({ data: { name: 'No-facet product' } }),
    ]);
    productIds = [p1.id, p2.id, p3.id];
  });

  afterAll(() => cleanupCatalog(prisma, pubId));

  it('filters by single facet (gameId)', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/products?gameId=${gameId}`)
      .expect(200);
    const seeded = body.filter((p: any) => productIds.includes(p.id));
    expect(seeded).toHaveLength(2);
    expect(seeded.every((p: any) => p.game?.id === gameId)).toBe(true);
  });

  it('filters by combined facets (gameId + teamId)', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/products?gameId=${gameId}&teamId=${teamId}`)
      .expect(200);
    const seeded = body.filter((p: any) => productIds.includes(p.id));
    expect(seeded).toHaveLength(1);
    expect(seeded[0].name).toBe('Game+Team product');
  });
});

// ─── Slice 8: SKUs by productId (all, including unavailable) ─────────────────

describe('GET /api/skus?productId=', () => {
  let pubId: string;
  let productId: string;

  beforeAll(async () => {
    const { pub, game } = await seedCatalog(prisma, 'sku');
    pubId = pub.id;
    const product = await prisma.product.create({ data: { name: 'SKU Test Product', gameId: game.id } });
    productId = product.id;
    await prisma.sku.createMany({
      data: [
        { productId, price: 29.99, available: true, attributes: { size: 'S' } },
        { productId, price: 29.99, available: false, attributes: { size: 'L' } },
      ],
    });
  });

  afterAll(() => cleanupCatalog(prisma, pubId));

  it('returns all SKUs including unavailable', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/skus?productId=${productId}`)
      .expect(200);
    expect(body).toHaveLength(2);
  });
});
