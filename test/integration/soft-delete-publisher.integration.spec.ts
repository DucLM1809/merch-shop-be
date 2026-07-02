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

async function seedPublisher(prefix: string) {
  return prisma.publisher.create({ data: { name: `Pub-${prefix}`, slug: `sd-pub-${prefix}` } });
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

// ─── Slice 1: DELETE publisher soft-deletes the row ──────────────────────────

describe('DELETE /api/publishers/:id (soft delete)', () => {
  let pubId: string;

  beforeAll(async () => {
    const pub = await seedPublisher('del-p');
    pubId = pub.id;
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 200 and row persists with deletedAt set', async () => {
    await request(app.getHttpServer()).delete(`/api/publishers/${pubId}`).expect(200);

    const row = await prisma.publisher.findUnique({ where: { id: pubId } });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();
  });
});

// ─── Slice 2: GET publisher 404 after soft delete ─────────────────────────────

describe('GET /api/publishers/:slug (soft-deleted)', () => {
  let pubId: string;
  let pubSlug: string;

  beforeAll(async () => {
    const pub = await seedPublisher('get-p');
    pubId = pub.id;
    pubSlug = pub.slug;
    await prisma.publisher.update({ where: { id: pubId }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 404 for a soft-deleted publisher', () =>
    request(app.getHttpServer()).get(`/api/publishers/${pubSlug}`).expect(404));
});

// ─── Slice 3: GET publishers list excludes soft-deleted ──────────────────────

describe('GET /api/publishers (soft-deleted excluded)', () => {
  let pubId: string;

  beforeAll(async () => {
    const pub = await seedPublisher('list-p');
    pubId = pub.id;
    await prisma.publisher.update({ where: { id: pubId }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('does not include soft-deleted publisher in list', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/publishers').expect(200);
    const found = (body.data as { id: string }[]).find(p => p.id === pubId);
    expect(found).toBeUndefined();
  });
});

// ─── Slice 4: DELETE publisher cascades to game → team → products → SKUs ─────

describe('DELETE /api/publishers/:id (cascade: game → team → products → SKUs)', () => {
  let pubId: string;
  let gameId: string;
  let teamId: string;
  let productId: string;
  let skuIds: string[];

  beforeAll(async () => {
    const pub = await seedPublisher('casc-pt');
    pubId = pub.id;
    const game = await prisma.game.create({ data: { name: 'Game-casc-pt', slug: 'sd-pub-casc-pt-game', publisherId: pubId } });
    gameId = game.id;
    const team = await prisma.team.create({ data: { name: 'Team-casc-pt', slug: 'sd-pub-casc-pt-team', gameId: game.id } });
    teamId = team.id;
    const product = await prisma.product.create({ data: { name: 'Product-casc-pt', gameId: game.id, teamId: team.id } });
    productId = product.id;
    const skus = await prisma.sku.createManyAndReturn({
      data: [{ productId, price: 10.0, available: true, attributes: { size: 'S' } }],
    });
    skuIds = skus.map(s => s.id);
  });

  afterAll(() => cleanupPublisher(pubId));

  it('sets deletedAt on game, team, product, and all SKUs', async () => {
    await request(app.getHttpServer()).delete(`/api/publishers/${pubId}`).expect(200);

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    expect(game!.deletedAt).not.toBeNull();

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    expect(team!.deletedAt).not.toBeNull();

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.deletedAt).not.toBeNull();

    const rows = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
    expect(rows.every(s => s.deletedAt !== null)).toBe(true);
  });
});

// ─── Slice 5: DELETE publisher cascades to game → character → products → SKUs ─

describe('DELETE /api/publishers/:id (cascade: game → character → products → SKUs)', () => {
  let pubId: string;
  let gameId: string;
  let characterId: string;
  let productId: string;
  let skuIds: string[];

  beforeAll(async () => {
    const pub = await seedPublisher('casc-pc');
    pubId = pub.id;
    const game = await prisma.game.create({ data: { name: 'Game-casc-pc', slug: 'sd-pub-casc-pc-game', publisherId: pubId } });
    gameId = game.id;
    const character = await prisma.character.create({ data: { name: 'Char-casc-pc', slug: 'sd-pub-casc-pc-char', gameId: game.id } });
    characterId = character.id;
    const product = await prisma.product.create({ data: { name: 'Product-casc-pc', gameId: game.id, characterId: character.id } });
    productId = product.id;
    const skus = await prisma.sku.createManyAndReturn({
      data: [{ productId, price: 10.0, available: true, attributes: { size: 'S' } }],
    });
    skuIds = skus.map(s => s.id);
  });

  afterAll(() => cleanupPublisher(pubId));

  it('sets deletedAt on game, character, product, and all SKUs', async () => {
    await request(app.getHttpServer()).delete(`/api/publishers/${pubId}`).expect(200);

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    expect(game!.deletedAt).not.toBeNull();

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    expect(character!.deletedAt).not.toBeNull();

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.deletedAt).not.toBeNull();

    const rows = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
    expect(rows.every(s => s.deletedAt !== null)).toBe(true);
  });
});
