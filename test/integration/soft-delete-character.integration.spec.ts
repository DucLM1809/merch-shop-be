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

async function seedCharacter(prefix: string) {
  const pub = await prisma.publisher.create({ data: { name: `Pub-${prefix}`, slug: `sd-char-${prefix}-pub` } });
  const game = await prisma.game.create({ data: { name: `Game-${prefix}`, slug: `sd-char-${prefix}-game`, publisherId: pub.id } });
  const character = await prisma.character.create({ data: { name: `Char-${prefix}`, slug: `sd-char-${prefix}`, gameId: game.id } });
  return { pub, game, character };
}

async function cleanupPublisher(publisherId: string) {
  const gameIds = (await prisma.game.findMany({ where: { publisherId }, select: { id: true } })).map(g => g.id);
  const characterIds = (await prisma.character.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(c => c.id);
  const productIds = (await prisma.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(p => p.id);
  await prisma.sku.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.character.deleteMany({ where: { id: { in: characterIds } } });
  await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
  await prisma.publisher.delete({ where: { id: publisherId } });
}

// ─── Slice 1: DELETE character soft-deletes the row ──────────────────────────

describe('DELETE /api/characters/:id (soft delete)', () => {
  let pubId: string;
  let characterId: string;

  beforeAll(async () => {
    const { pub, character } = await seedCharacter('del-c');
    pubId = pub.id;
    characterId = character.id;
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 200 and the row persists with deletedAt set', async () => {
    await request(app.getHttpServer()).delete(`/api/characters/${characterId}`).expect(200);

    const row = await prisma.character.findUnique({ where: { id: characterId } });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();
  });
});

// ─── Slice 2: GET character 404 after soft delete ────────────────────────────

describe('GET /api/characters/:slug (soft-deleted)', () => {
  let pubId: string;
  let characterSlug: string;

  beforeAll(async () => {
    const { pub, character } = await seedCharacter('get-c');
    pubId = pub.id;
    characterSlug = character.slug;
    await prisma.character.update({ where: { id: character.id }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 404 for a soft-deleted character', () =>
    request(app.getHttpServer()).get(`/api/characters/${characterSlug}`).expect(404));
});

// ─── Slice 3: GET characters list excludes soft-deleted ──────────────────────

describe('GET /api/characters (soft-deleted excluded)', () => {
  let pubId: string;
  let characterId: string;

  beforeAll(async () => {
    const { pub, character } = await seedCharacter('list-c');
    pubId = pub.id;
    characterId = character.id;
    await prisma.character.update({ where: { id: characterId }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('does not include soft-deleted character in list', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/characters').expect(200);
    const found = body.data.find((c: { id: string }) => c.id === characterId);
    expect(found).toBeUndefined();
  });
});

// ─── Slice 4: DELETE character cascades to products and SKUs ─────────────────

describe('DELETE /api/characters/:id (cascade to products and SKUs)', () => {
  let pubId: string;
  let characterId: string;
  let productId: string;
  let skuIds: string[];

  beforeAll(async () => {
    const { pub, game, character } = await seedCharacter('casc-c');
    pubId = pub.id;
    characterId = character.id;
    const product = await prisma.product.create({ data: { name: `Prod-casc-c`, gameId: game.id, characterId: character.id } });
    productId = product.id;
    const skus = await prisma.sku.createManyAndReturn({
      data: [
        { productId, price: 19.99, available: true, attributes: { size: 'S' } },
        { productId, price: 19.99, available: true, attributes: { size: 'M' } },
      ],
    });
    skuIds = skus.map(s => s.id);
  });

  afterAll(() => cleanupPublisher(pubId));

  it('sets deletedAt on cascaded product and all its SKUs', async () => {
    await request(app.getHttpServer()).delete(`/api/characters/${characterId}`).expect(200);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.deletedAt).not.toBeNull();

    const rows = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
    expect(rows).toHaveLength(2);
    expect(rows.every(s => s.deletedAt !== null)).toBe(true);
  });
});

// ─── Slice 5: Cascade with product linked to both character and game ──────────

describe('DELETE /api/characters/:id (cascade — product with characterId + gameId)', () => {
  let pubId: string;
  let characterId: string;
  let productId: string;

  beforeAll(async () => {
    const { pub, game, character } = await seedCharacter('casc2-c');
    pubId = pub.id;
    characterId = character.id;
    const product = await prisma.product.create({ data: { name: `Prod-casc2-c`, gameId: game.id, characterId: character.id } });
    productId = product.id;
  });

  afterAll(() => cleanupPublisher(pubId));

  it('soft-deletes product that has both characterId and gameId', async () => {
    await request(app.getHttpServer()).delete(`/api/characters/${characterId}`).expect(200);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.deletedAt).not.toBeNull();
  });
});
