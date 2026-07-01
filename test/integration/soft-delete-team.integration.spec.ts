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

async function seedTeam(prefix: string) {
  const pub = await prisma.publisher.create({ data: { name: `Pub-${prefix}`, slug: `sd-team-${prefix}-pub` } });
  const game = await prisma.game.create({ data: { name: `Game-${prefix}`, slug: `sd-team-${prefix}-game`, publisherId: pub.id } });
  const team = await prisma.team.create({ data: { name: `Team-${prefix}`, slug: `sd-team-${prefix}`, gameId: game.id } });
  return { pub, game, team };
}

async function cleanupPublisher(publisherId: string) {
  const gameIds = (await prisma.game.findMany({ where: { publisherId }, select: { id: true } })).map(g => g.id);
  const teamIds = (await prisma.team.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(t => t.id);
  const productIds = (await prisma.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(r => r.id);
  await prisma.sku.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
  await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
  await prisma.publisher.delete({ where: { id: publisherId } });
}

// ─── Slice 1: DELETE team soft-deletes the row ───────────────────────────────

describe('DELETE /api/teams/:id (soft delete)', () => {
  let pubId: string;
  let teamId: string;

  beforeAll(async () => {
    const { pub, team } = await seedTeam('del-t');
    pubId = pub.id;
    teamId = team.id;
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 200 and the row persists with deletedAt set', async () => {
    await request(app.getHttpServer()).delete(`/api/teams/${teamId}`).expect(200);

    const row = await prisma.team.findUnique({ where: { id: teamId } });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();
  });
});

// ─── Slice 2: GET team 404 after soft delete ─────────────────────────────────

describe('GET /api/teams/:slug (soft-deleted)', () => {
  let pubId: string;
  let teamSlug: string;
  let teamId: string;

  beforeAll(async () => {
    const { pub, team } = await seedTeam('get-t');
    pubId = pub.id;
    teamSlug = team.slug;
    teamId = team.id;
    await prisma.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 404 for a soft-deleted team', () =>
    request(app.getHttpServer()).get(`/api/teams/${teamSlug}`).expect(404));
});

// ─── Slice 3: GET teams list excludes soft-deleted ───────────────────────────

describe('GET /api/teams (soft-deleted excluded)', () => {
  let pubId: string;
  let teamId: string;

  beforeAll(async () => {
    const { pub, team } = await seedTeam('list-t');
    pubId = pub.id;
    teamId = team.id;
    await prisma.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('does not include soft-deleted team in list', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/teams').expect(200);
    const found = (body.data as { id: string }[]).find((t: { id: string }) => t.id === teamId);
    expect(found).toBeUndefined();
  });
});

// ─── Slice 4: DELETE team cascades to products and SKUs ──────────────────────

describe('DELETE /api/teams/:id (cascade to products and SKUs)', () => {
  let pubId: string;
  let teamId: string;
  let productId: string;
  let skuIds: string[];

  beforeAll(async () => {
    const { pub, game, team } = await seedTeam('casc-t');
    pubId = pub.id;
    teamId = team.id;
    const product = await prisma.product.create({ data: { name: `Product-casc-t`, gameId: game.id, teamId: team.id } });
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

  it('sets deletedAt on the product and all its SKUs', async () => {
    await request(app.getHttpServer()).delete(`/api/teams/${teamId}`).expect(200);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.deletedAt).not.toBeNull();

    const rows = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
    expect(rows).toHaveLength(2);
    expect(rows.every(s => s.deletedAt !== null)).toBe(true);
  });
});

// ─── Slice 5: CASCADE with product linked to both team and game ──────────────

describe('DELETE /api/teams/:id (cascade: product with teamId + gameId)', () => {
  let pubId: string;
  let teamId: string;
  let productId: string;

  beforeAll(async () => {
    const { pub, game, team } = await seedTeam('casc-tg');
    pubId = pub.id;
    teamId = team.id;
    const product = await prisma.product.create({
      data: { name: `Product-casc-tg`, gameId: game.id, teamId: team.id },
    });
    productId = product.id;
  });

  afterAll(() => cleanupPublisher(pubId));

  it('soft-deletes product that has both teamId and gameId', async () => {
    await request(app.getHttpServer()).delete(`/api/teams/${teamId}`).expect(200);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.deletedAt).not.toBeNull();
  });
});
