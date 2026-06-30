import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ClerkGuard } from '../../src/auth/clerk.guard';
import { OptionalClerkGuard } from '../../src/auth/optional-clerk.guard';

const TEST_CLERK_ID = 'cart-sync-clerk-001';
const TEST_EMAIL = 'cart-sync@example.com';

const injectUser = {
  canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
    ctx.switchToHttp().getRequest().user = { userId: TEST_CLERK_ID, email: TEST_EMAIL };
    return true;
  },
};

let app: INestApplication;
let prisma: PrismaService;

async function seedSku(p: PrismaService, prefix: string, available = true) {
  const id = `${prefix}-${Date.now()}`;
  const pub = await p.publisher.create({ data: { name: `Sync-Pub-${id}`, slug: `sync-pub-${id}` } });
  const game = await p.game.create({ data: { name: `Sync-Game-${id}`, slug: `sync-game-${id}`, publisherId: pub.id } });
  const product = await p.product.create({ data: { name: `Sync-Product-${id}`, gameId: game.id } });
  const sku = await p.sku.create({ data: { productId: product.id, price: 25.00, available, attributes: { size: 'M' } } });
  return { pub, sku };
}

async function cleanupCatalog(p: PrismaService, pubId: string) {
  const games = await p.game.findMany({ where: { publisherId: pubId }, select: { id: true } });
  const gameIds = games.map((g) => g.id);
  const products = await p.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } });
  const productIds = products.map((pr) => pr.id);
  const skus = await p.sku.findMany({ where: { productId: { in: productIds } }, select: { id: true } });
  const skuIds = skus.map((s) => s.id);
  await p.cartItem.deleteMany({ where: { skuId: { in: skuIds } } });
  await p.sku.deleteMany({ where: { productId: { in: productIds } } });
  await p.product.deleteMany({ where: { id: { in: productIds } } });
  await p.game.deleteMany({ where: { id: { in: gameIds } } });
  await p.publisher.delete({ where: { id: pubId } });
}

async function cleanupAccount(p: PrismaService, clerkId: string) {
  const account = await p.account.findUnique({ where: { clerkUserId: clerkId } });
  if (!account) return;
  const cart = await p.cart.findFirst({ where: { accountId: account.id } });
  if (cart) {
    await p.cartItem.deleteMany({ where: { cartId: cart.id } });
    await p.cart.delete({ where: { id: cart.id } });
  }
  await p.account.delete({ where: { id: account.id } });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(OptionalClerkGuard)
    .useValue(injectUser)
    .overrideGuard(ClerkGuard)
    .useValue(injectUser)
    .compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  prisma = moduleRef.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

// ─── Slice 1: syncs new items into empty account cart ────────────────────────

describe('POST /api/cart/sync — syncs new items into empty account cart', () => {
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'sync-new');
    pubId = pub.id;
    skuId = sku.id;
  });

  afterAll(async () => {
    await cleanupAccount(prisma, TEST_CLERK_ID);
    await cleanupCatalog(prisma, pubId);
  });

  it('adds items from localStorage payload to empty server cart', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/sync')
      .send({ items: [{ skuId, quantity: 3 }] })
      .expect(201);

    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].skuId).toBe(skuId);
    expect(body.data.items[0].quantity).toBe(3);
  });
});

// ─── Slice 2: accumulates quantities for items already in cart ────────────────

describe('POST /api/cart/sync — accumulates quantity on top of existing items', () => {
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'sync-accum');
    pubId = pub.id;
    skuId = sku.id;
    // Seed server cart with qty=5
    await request(app.getHttpServer()).post('/api/cart/items').send({ skuId, quantity: 5 });
  });

  afterAll(async () => {
    await cleanupAccount(prisma, TEST_CLERK_ID);
    await cleanupCatalog(prisma, pubId);
  });

  it('increments existing cart item quantity by localStorage quantity', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/sync')
      .send({ items: [{ skuId, quantity: 2 }] })
      .expect(201);

    const item = body.data.items.find((i: { skuId: string }) => i.skuId === skuId);
    expect(item).toBeDefined();
    expect(item.quantity).toBe(7);
  });
});

// ─── Slice 3: skips invalid or unavailable SKUs ───────────────────────────────

describe('POST /api/cart/sync — skips invalid or unavailable SKUs', () => {
  let validSkuId: string;
  let unavailableSkuId: string;
  let pubId: string;
  let unavailPubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'sync-skip-valid');
    pubId = pub.id;
    validSkuId = sku.id;
    const { pub: pub2, sku: sku2 } = await seedSku(prisma, 'sync-skip-unavail', false);
    unavailPubId = pub2.id;
    unavailableSkuId = sku2.id;
  });

  afterAll(async () => {
    await cleanupAccount(prisma, TEST_CLERK_ID);
    await cleanupCatalog(prisma, pubId);
    await cleanupCatalog(prisma, unavailPubId);
  });

  it('syncs valid SKU and silently skips unknown and unavailable SKUs', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/sync')
      .send({
        items: [
          { skuId: validSkuId, quantity: 1 },
          { skuId: 'nonexistent-sku-id', quantity: 1 },
          { skuId: unavailableSkuId, quantity: 1 },
        ],
      })
      .expect(201);

    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].skuId).toBe(validSkuId);
  });
});

// ─── Slice 4: empty items array is a no-op ────────────────────────────────────

describe('POST /api/cart/sync — empty items array is a no-op', () => {
  afterAll(() => cleanupAccount(prisma, TEST_CLERK_ID));

  it('returns empty cart when items array is empty', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/sync')
      .send({ items: [] })
      .expect(201);

    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(0);
  });
});
