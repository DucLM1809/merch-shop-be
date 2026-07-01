import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AdminGuard } from '../../src/auth/admin.guard';

let app: INestApplication;
let prisma: PrismaService;

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

async function seedGame(prefix: string) {
  const pub = await prisma.publisher.create({ data: { name: `Pub-${prefix}`, slug: `sd-game-${prefix}-pub` } });
  const game = await prisma.game.create({ data: { name: `Game-${prefix}`, slug: `sd-game-${prefix}`, publisherId: pub.id } });
  return { pub, game };
}

async function cleanupPublisher(publisherId: string) {
  const gameIds = (await prisma.game.findMany({ where: { publisherId }, select: { id: true } })).map(g => g.id);
  const teamIds = (await prisma.team.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(t => t.id);
  const characterIds = (await prisma.character.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(c => c.id);
  const productIds = (await prisma.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(p => p.id);
  await prisma.sku.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.character.deleteMany({ where: { id: { in: characterIds } } });
  await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
  await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
  await prisma.publisher.delete({ where: { id: publisherId } });
}

// ─── Slice 1: DELETE game soft-deletes the row ───────────────────────────────

describe('DELETE /api/games/:id (soft delete)', () => {
  let pubId: string;
  let gameId: string;

  beforeAll(async () => {
    const { pub, game } = await seedGame('del-g');
    pubId = pub.id;
    gameId = game.id;
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 200 and row persists with deletedAt set', async () => {
    await request(app.getHttpServer()).delete(`/api/games/${gameId}`).expect(200);

    const row = await prisma.game.findUnique({ where: { id: gameId } });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();
  });
});

// ─── Slice 2: GET game 404 after soft delete ─────────────────────────────────

describe('GET /api/games/:slug (soft-deleted)', () => {
  let pubId: string;
  let gameId: string;
  let gameSlug: string;

  beforeAll(async () => {
    const { pub, game } = await seedGame('get-g');
    pubId = pub.id;
    gameId = game.id;
    gameSlug = game.slug;
    await prisma.game.update({ where: { id: gameId }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 404 for a soft-deleted game', () =>
    request(app.getHttpServer()).get(`/api/games/${gameSlug}`).expect(404));
});

// ─── Slice 3: GET games list excludes soft-deleted ───────────────────────────

describe('GET /api/games (soft-deleted excluded)', () => {
  let pubId: string;
  let gameId: string;

  beforeAll(async () => {
    const { pub, game } = await seedGame('list-g');
    pubId = pub.id;
    gameId = game.id;
    await prisma.game.update({ where: { id: gameId }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('does not include soft-deleted game in list', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/games').expect(200);
    const found = (body.data as { id: string }[]).find((g: { id: string }) => g.id === gameId);
    expect(found).toBeUndefined();
  });
});

// ─── Slice 4: DELETE game cascades to teams → products → SKUs ────────────────

describe('DELETE /api/games/:id (cascade: team → products → SKUs)', () => {
  let pubId: string;
  let gameId: string;
  let teamId: string;
  let productId: string;
  let skuIds: string[];

  beforeAll(async () => {
    const { pub, game } = await seedGame('casc-gt');
    pubId = pub.id;
    gameId = game.id;
    const team = await prisma.team.create({ data: { name: 'Team-casc-gt', slug: 'sd-game-casc-gt-team', gameId: game.id } });
    teamId = team.id;
    const product = await prisma.product.create({ data: { name: 'Product-casc-gt', gameId: game.id, teamId: team.id } });
    productId = product.id;
    const skus = await prisma.sku.createManyAndReturn({
      data: [
        { productId, price: 10.00, available: true, attributes: { size: 'S' } },
        { productId, price: 10.00, available: true, attributes: { size: 'M' } },
      ],
    });
    skuIds = skus.map(s => s.id);
  });

  afterAll(() => cleanupPublisher(pubId));

  it('sets deletedAt on team, product, and all SKUs', async () => {
    await request(app.getHttpServer()).delete(`/api/games/${gameId}`).expect(200);

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    expect(team!.deletedAt).not.toBeNull();

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.deletedAt).not.toBeNull();

    const rows = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
    expect(rows.every(s => s.deletedAt !== null)).toBe(true);
  });
});

// ─── Slice 5: DELETE game cascades to characters → products → SKUs ───────────

describe('DELETE /api/games/:id (cascade: character → products → SKUs)', () => {
  let pubId: string;
  let gameId: string;
  let characterId: string;
  let productId: string;
  let skuIds: string[];

  beforeAll(async () => {
    const { pub, game } = await seedGame('casc-gc');
    pubId = pub.id;
    gameId = game.id;
    const character = await prisma.character.create({ data: { name: 'Char-casc-gc', slug: 'sd-game-casc-gc-char', gameId: game.id } });
    characterId = character.id;
    const product = await prisma.product.create({ data: { name: 'Product-casc-gc', gameId: game.id, characterId: character.id } });
    productId = product.id;
    const skus = await prisma.sku.createManyAndReturn({
      data: [{ productId, price: 10.00, available: true, attributes: { size: 'S' } }],
    });
    skuIds = skus.map(s => s.id);
  });

  afterAll(() => cleanupPublisher(pubId));

  it('sets deletedAt on character, product, and all SKUs', async () => {
    await request(app.getHttpServer()).delete(`/api/games/${gameId}`).expect(200);

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    expect(character!.deletedAt).not.toBeNull();

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.deletedAt).not.toBeNull();

    const rows = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
    expect(rows.every(s => s.deletedAt !== null)).toBe(true);
  });
});

// ─── Slice 6: DELETE game cascades to products with gameId only ───────────────

describe('DELETE /api/games/:id (cascade: product with gameId only)', () => {
  let pubId: string;
  let gameId: string;
  let productId: string;
  let skuIds: string[];

  beforeAll(async () => {
    const { pub, game } = await seedGame('casc-gp');
    pubId = pub.id;
    gameId = game.id;
    const product = await prisma.product.create({ data: { name: 'Product-casc-gp', gameId: game.id } });
    productId = product.id;
    const skus = await prisma.sku.createManyAndReturn({
      data: [{ productId, price: 10.00, available: true, attributes: { size: 'S' } }],
    });
    skuIds = skus.map(s => s.id);
  });

  afterAll(() => cleanupPublisher(pubId));

  it('sets deletedAt on product and SKUs with no team/character', async () => {
    await request(app.getHttpServer()).delete(`/api/games/${gameId}`).expect(200);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.deletedAt).not.toBeNull();

    const rows = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
    expect(rows.every(s => s.deletedAt !== null)).toBe(true);
  });
});
