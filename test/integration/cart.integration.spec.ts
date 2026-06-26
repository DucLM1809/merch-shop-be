import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;

function extractCartCookie(res: request.Response): string {
  const cookies = (res.headers['set-cookie'] as string[] | string) ?? [];
  const list = Array.isArray(cookies) ? cookies : [cookies];
  const found = list.find((c) => c.startsWith('cart_session='));
  if (!found) throw new Error('cart_session cookie not found in response');
  return found.split(';')[0]; // "cart_session=<uuid>"
}

async function seedSku(p: PrismaService, prefix: string, available = true) {
  const pub = await p.publisher.create({ data: { name: `Cart-Pub-${prefix}`, slug: `cart-pub-${prefix}` } });
  const game = await p.game.create({ data: { name: `Cart-Game-${prefix}`, slug: `cart-game-${prefix}`, publisherId: pub.id } });
  const product = await p.product.create({ data: { name: `Cart-Product-${prefix}`, gameId: game.id } });
  const sku = await p.sku.create({ data: { productId: product.id, price: 25.00, available, attributes: { size: 'M' } } });
  return { pub, game, product, sku };
}

async function cleanupCatalog(p: PrismaService, pubId: string) {
  const games = await p.game.findMany({ where: { publisherId: pubId }, select: { id: true } });
  const gameIds = games.map((g) => g.id);
  const products = await p.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } });
  const productIds = products.map((pr) => pr.id);
  await p.sku.deleteMany({ where: { productId: { in: productIds } } });
  await p.product.deleteMany({ where: { id: { in: productIds } } });
  await p.game.deleteMany({ where: { id: { in: gameIds } } });
  await p.publisher.delete({ where: { id: pubId } });
}

async function cleanupCart(p: PrismaService, sessionId: string) {
  const cart = await p.cart.findFirst({ where: { sessionId } });
  if (!cart) return;
  await p.cartItem.deleteMany({ where: { cartId: cart.id } });
  await p.cart.delete({ where: { id: cart.id } });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  prisma = moduleRef.get(PrismaService);
});

afterAll(() => app.close());

// ─── Slice 1: GET /api/cart with no cookie creates guest Cart ─────────────────

describe('GET /api/cart — no cookie', () => {
  let sessionId: string;

  afterAll(async () => {
    if (sessionId) await cleanupCart(prisma, sessionId);
  });

  it('creates new guest Cart and sets cart_session HttpOnly cookie', async () => {
    const res = await request(app.getHttpServer()).get('/api/cart').expect(200);

    const cookie = extractCartCookie(res);
    sessionId = cookie.replace('cart_session=', '');

    expect(res.body.success).toBe(true);
    expect(res.body.data.accountId).toBeNull();
    expect(res.body.data.expiresAt).not.toBeNull();

    const setCookieHeader = (res.headers['set-cookie'] as string[] | string);
    const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const cartCookieFull = list.find((c) => c.startsWith('cart_session='))!;
    expect(cartCookieFull.toLowerCase()).toContain('httponly');
  });
});

// ─── Slice 2: GET /api/cart with existing cookie returns same Cart ─────────────

describe('GET /api/cart — existing cookie', () => {
  let cookie: string;
  let sessionId: string;

  beforeAll(async () => {
    const res = await request(app.getHttpServer()).get('/api/cart');
    cookie = extractCartCookie(res);
    sessionId = cookie.replace('cart_session=', '');
  });

  afterAll(() => cleanupCart(prisma, sessionId));

  it('returns same Cart for same cookie', async () => {
    const res1 = await request(app.getHttpServer()).get('/api/cart').set('Cookie', cookie).expect(200);
    const res2 = await request(app.getHttpServer()).get('/api/cart').set('Cookie', cookie).expect(200);
    expect(res1.body.data.id).toBe(res2.body.data.id);
  });
});

// ─── Slice 3: POST /api/cart/items — available SKU ────────────────────────────

describe('POST /api/cart/items — available SKU', () => {
  let cookie: string;
  let sessionId: string;
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'add');
    pubId = pub.id;
    skuId = sku.id;
    const res = await request(app.getHttpServer()).get('/api/cart');
    cookie = extractCartCookie(res);
    sessionId = cookie.replace('cart_session=', '');
  });

  afterAll(async () => {
    await cleanupCart(prisma, sessionId);
    await cleanupCatalog(prisma, pubId);
  });

  it('adds item to cart', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ skuId, quantity: 2 })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.skuId).toBe(skuId);
    expect(res.body.data.quantity).toBe(2);
  });

  it('updates quantity when same SKU added again', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ skuId, quantity: 5 })
      .expect(201);

    expect(res.body.data.quantity).toBe(5);
  });
});

// ─── Slice 4: POST /api/cart/items — unavailable SKU → 422 ───────────────────

describe('POST /api/cart/items — unavailable SKU', () => {
  let cookie: string;
  let sessionId: string;
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'unavail', false);
    pubId = pub.id;
    skuId = sku.id;
    const res = await request(app.getHttpServer()).get('/api/cart');
    cookie = extractCartCookie(res);
    sessionId = cookie.replace('cart_session=', '');
  });

  afterAll(async () => {
    await cleanupCart(prisma, sessionId);
    await cleanupCatalog(prisma, pubId);
  });

  it('returns 422 for unavailable SKU', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ skuId, quantity: 1 })
      .expect(422);
    expect(body.code).toBe('SKU_UNAVAILABLE');
  });
});

// ─── Slice 5: POST /api/cart/items — non-existent SKU → 404 ──────────────────

describe('POST /api/cart/items — non-existent SKU', () => {
  let cookie: string;
  let sessionId: string;

  beforeAll(async () => {
    const res = await request(app.getHttpServer()).get('/api/cart');
    cookie = extractCartCookie(res);
    sessionId = cookie.replace('cart_session=', '');
  });

  afterAll(() => cleanupCart(prisma, sessionId));

  it('returns 404 for non-existent SKU', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ skuId: 'no-such-sku', quantity: 1 })
      .expect(404);
    expect(body.code).toBe('SKU_NOT_FOUND');
  });
});

// ─── Slice 6: DELETE /api/cart/items/:skuId ───────────────────────────────────

describe('DELETE /api/cart/items/:skuId', () => {
  let cookie: string;
  let sessionId: string;
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'del');
    pubId = pub.id;
    skuId = sku.id;
    const res = await request(app.getHttpServer()).get('/api/cart');
    cookie = extractCartCookie(res);
    sessionId = cookie.replace('cart_session=', '');
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ skuId, quantity: 1 });
  });

  afterAll(async () => {
    await cleanupCart(prisma, sessionId);
    await cleanupCatalog(prisma, pubId);
  });

  it('removes item from cart', async () => {
    await request(app.getHttpServer())
      .delete(`/api/cart/items/${skuId}`)
      .set('Cookie', cookie)
      .expect(200);

    const cart = await request(app.getHttpServer()).get('/api/cart').set('Cookie', cookie);
    expect(cart.body.data.items).toHaveLength(0);
  });
});

// ─── Slice 7: Full guest cart lifecycle ───────────────────────────────────────

describe('Guest cart lifecycle — create → add → update quantity → remove', () => {
  let cookie: string;
  let sessionId: string;
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'lifecycle');
    pubId = pub.id;
    skuId = sku.id;
  });

  afterAll(async () => {
    if (sessionId) await cleanupCart(prisma, sessionId);
    await cleanupCatalog(prisma, pubId);
  });

  it('creates cart on first GET', async () => {
    const res = await request(app.getHttpServer()).get('/api/cart').expect(200);
    cookie = extractCartCookie(res);
    sessionId = cookie.replace('cart_session=', '');
    expect(res.body.data.items).toHaveLength(0);
  });

  it('adds SKU to cart', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ skuId, quantity: 1 })
      .expect(201);
    expect(res.body.data.skuId).toBe(skuId);
  });

  it('updates quantity', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ skuId, quantity: 3 })
      .expect(201);
    expect(res.body.data.quantity).toBe(3);
  });

  it('removes item', async () => {
    await request(app.getHttpServer())
      .delete(`/api/cart/items/${skuId}`)
      .set('Cookie', cookie)
      .expect(200);

    const res = await request(app.getHttpServer()).get('/api/cart').set('Cookie', cookie).expect(200);
    expect(res.body.data.items).toHaveLength(0);
  });
});

// ─── Slice 8: Unavailable SKU rejected, Cart not modified ─────────────────────

describe('Unavailable SKU rejected before Cart is modified', () => {
  let cookie: string;
  let sessionId: string;
  let availSkuId: string;
  let unavailSkuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku: availSku } = await seedSku(prisma, 'guard-avail', true);
    pubId = pub.id;
    availSkuId = availSku.id;
    const unavailSku = await prisma.sku.create({
      data: { productId: availSku.productId, price: 25.00, available: false, attributes: { size: 'XL' } },
    });
    unavailSkuId = unavailSku.id;

    const res = await request(app.getHttpServer()).get('/api/cart');
    cookie = extractCartCookie(res);
    sessionId = cookie.replace('cart_session=', '');

    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ skuId: availSkuId, quantity: 1 });
  });

  afterAll(async () => {
    await cleanupCart(prisma, sessionId);
    await cleanupCatalog(prisma, pubId);
  });

  it('rejects unavailable SKU and leaves cart unchanged', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ skuId: unavailSkuId, quantity: 1 })
      .expect(422);

    const res = await request(app.getHttpServer()).get('/api/cart').set('Cookie', cookie).expect(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].skuId).toBe(availSkuId);
  });
});
