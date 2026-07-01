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

async function seedProduct(prefix: string) {
  const pub = await prisma.publisher.create({ data: { name: `Pub-${prefix}`, slug: `sd-ps-${prefix}-pub` } });
  const game = await prisma.game.create({ data: { name: `Game-${prefix}`, slug: `sd-ps-${prefix}-game`, publisherId: pub.id } });
  const product = await prisma.product.create({ data: { name: `Product-${prefix}`, gameId: game.id } });
  return { pub, game, product };
}

async function cleanupPublisher(publisherId: string) {
  const gameIds = (await prisma.game.findMany({ where: { publisherId }, select: { id: true } })).map(g => g.id);
  const productIds = (await prisma.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } })).map(r => r.id);
  await prisma.sku.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
  await prisma.publisher.delete({ where: { id: publisherId } });
}

// ─── Slice 1: DELETE product soft-deletes the row ────────────────────────────


describe('DELETE /api/products/:id (soft delete)', () => {
  let pubId: string;
  let productId: string;

  beforeAll(async () => {
    const { pub, product } = await seedProduct('del-p');
    pubId = pub.id;
    productId = product.id;
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 200 and the row persists with deletedAt set', async () => {
    await request(app.getHttpServer()).delete(`/api/products/${productId}`).expect(200);

    const row = await prisma.product.findUnique({ where: { id: productId } });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();
  });
});

// ─── Slice 2: GET product 404 after soft delete ──────────────────────────────

describe('GET /api/products/:id (soft-deleted)', () => {
  let pubId: string;
  let productId: string;

  beforeAll(async () => {
    const { pub, product } = await seedProduct('get-p');
    pubId = pub.id;
    productId = product.id;
    await prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 404 for a soft-deleted product', () =>
    request(app.getHttpServer()).get(`/api/products/${productId}`).expect(404));
});

// ─── Slice 3: GET products list excludes soft-deleted ────────────────────────

describe('GET /api/products (soft-deleted excluded)', () => {
  let pubId: string;
  let productId: string;

  beforeAll(async () => {
    const { pub, product } = await seedProduct('list-p');
    pubId = pub.id;
    productId = product.id;
    await prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date() } });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('does not include soft-deleted product in list', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/products').expect(200);
    const found = body.data.find((p: { id: string }) => p.id === productId);
    expect(found).toBeUndefined();
  });
});

// ─── Slice 4: DELETE product cascades deletedAt to all its SKUs ──────────────

describe('DELETE /api/products/:id (cascade to SKUs)', () => {
  let pubId: string;
  let productId: string;
  let skuIds: string[];

  beforeAll(async () => {
    const { pub, product } = await seedProduct('casc-p');
    pubId = pub.id;
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

  it('sets deletedAt on all SKUs belonging to the product', async () => {
    await request(app.getHttpServer()).delete(`/api/products/${productId}`).expect(200);

    const rows = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
    expect(rows).toHaveLength(2);
    expect(rows.every(s => s.deletedAt !== null)).toBe(true);
  });
});

// ─── Slice 5: DELETE sku soft-deletes ────────────────────────────────────────

describe('DELETE /api/skus/:id (soft delete)', () => {
  let pubId: string;
  let skuId: string;

  beforeAll(async () => {
    const { pub, product } = await seedProduct('del-s');
    pubId = pub.id;
    const sku = await prisma.sku.create({
      data: { productId: product.id, price: 9.99, available: true, attributes: { size: 'S' } },
    });
    skuId = sku.id;
  });

  afterAll(() => cleanupPublisher(pubId));

  it('returns 200 and the SKU row persists with deletedAt set', async () => {
    await request(app.getHttpServer()).delete(`/api/skus/${skuId}`).expect(200);

    const row = await prisma.sku.findUnique({ where: { id: skuId } });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();
  });
});

// ─── Slice 6: GET skus excludes soft-deleted ──────────────────────────────────

describe('GET /api/skus?productId= (soft-deleted excluded)', () => {
  let pubId: string;
  let productId: string;

  beforeAll(async () => {
    const { pub, product } = await seedProduct('list-s');
    pubId = pub.id;
    productId = product.id;
    await prisma.sku.createMany({
      data: [
        { productId, price: 9.99, available: true, attributes: { size: 'S' }, deletedAt: new Date() },
        { productId, price: 9.99, available: true, attributes: { size: 'M' } },
      ],
    });
  });

  afterAll(() => cleanupPublisher(pubId));

  it('excludes soft-deleted SKUs from list', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/skus?productId=${productId}`)
      .expect(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].attributes).toMatchObject({ size: 'M' });
  });
});

// ─── Slice 7: Order referencing soft-deleted SKU stays intact ─────────────────

describe('Order integrity after SKU soft delete', () => {
  let pubId: string;
  let skuId: string;
  let orderId: string;

  beforeAll(async () => {
    const { pub, product } = await seedProduct('ord-s');
    pubId = pub.id;
    const sku = await prisma.sku.create({
      data: { productId: product.id, price: 25.00, available: true, attributes: { size: 'L' } },
    });
    skuId = sku.id;
    const order = await prisma.order.create({
      data: {
        buyerEmail: 'test@example.com',
        stripePaymentIntentId: `pi_sd_test_${Date.now()}`,
        shippingAddress: { line1: '1 Test St', city: 'Testville', country: 'US' },
        items: { create: { skuId, quantity: 1, unitPrice: 25.00 } },
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await cleanupPublisher(pubId);
  });

  it('OrderItem row survives SKU soft delete', async () => {
    await request(app.getHttpServer()).delete(`/api/skus/${skuId}`).expect(200);

    const item = await prisma.orderItem.findFirst({ where: { orderId, skuId } });
    expect(item).not.toBeNull();
  });
});
