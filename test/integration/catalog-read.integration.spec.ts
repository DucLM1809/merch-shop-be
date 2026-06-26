import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CatalogReadService } from '../../src/catalog/catalog-read.service';

let app: INestApplication;
let moduleRef: TestingModule;
let prisma: PrismaService;
let catalogRead: CatalogReadService;

beforeAll(async () => {
  moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  prisma = moduleRef.get(PrismaService);
  catalogRead = moduleRef.get(CatalogReadService);
});

afterAll(() => app.close());

// ─── Slice 1: getSkuPrice returns correct price ───────────────────────────────

describe('CatalogReadService.getSkuPrice', () => {
  let pubId: string;
  let skuId: string;

  beforeAll(async () => {
    const pub = await prisma.publisher.create({ data: { name: 'ReadSvc-Pub', slug: 'cr-pub' } });
    pubId = pub.id;
    const game = await prisma.game.create({ data: { name: 'ReadSvc-Game', slug: 'cr-game', publisherId: pub.id } });
    const product = await prisma.product.create({ data: { name: 'ReadSvc-Product', gameId: game.id } });
    const sku = await prisma.sku.create({ data: { productId: product.id, price: 39.99, available: true, attributes: {} } });
    skuId = sku.id;
  });

  afterAll(async () => {
    const games = await prisma.game.findMany({ where: { publisherId: pubId }, select: { id: true } });
    const gameIds = games.map((g) => g.id);
    const products = await prisma.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } });
    await prisma.sku.deleteMany({ where: { productId: { in: products.map((p) => p.id) } } });
    await prisma.product.deleteMany({ where: { id: { in: products.map((p) => p.id) } } });
    await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
    await prisma.publisher.delete({ where: { id: pubId } });
  });

  it('returns price for existing SKU', async () => {
    const price = await catalogRead.getSkuPrice(skuId);
    expect(Number(price)).toBeCloseTo(39.99, 2);
  });

  it('throws for unknown SKU', async () => {
    await expect(catalogRead.getSkuPrice('no-such-sku')).rejects.toMatchObject({ code: 'SKU_NOT_FOUND' });
  });
});

// ─── Slice 2: findPublisher returns publisher by slug ─────────────────────────

describe('CatalogReadService.findPublisher', () => {
  let pubId: string;

  beforeAll(async () => {
    const pub = await prisma.publisher.create({ data: { name: 'ReadSvc-Pub2', slug: 'cr-pub2' } });
    pubId = pub.id;
  });

  afterAll(() => prisma.publisher.delete({ where: { id: pubId } }));

  it('returns publisher by slug', async () => {
    const pub = await catalogRead.findPublisher('cr-pub2');
    expect(pub.slug).toBe('cr-pub2');
    expect(pub.name).toBe('ReadSvc-Pub2');
  });

  it('throws for unknown slug', async () => {
    await expect(catalogRead.findPublisher('no-such-slug')).rejects.toMatchObject({ code: 'PUBLISHER_NOT_FOUND' });
  });
});
