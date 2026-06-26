import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ClerkGuard } from '../../src/auth/clerk.guard';
import { OptionalClerkGuard } from '../../src/auth/optional-clerk.guard';

const TEST_CLERK_ID = 'account-cart-clerk-001';
const TEST_EMAIL = 'account-cart@example.com';

const injectUser = {
  canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
    ctx.switchToHttp().getRequest().user = { userId: TEST_CLERK_ID, email: TEST_EMAIL };
    return true;
  },
};

let app: INestApplication;
let prisma: PrismaService;

async function seedSku(p: PrismaService, prefix: string) {
  const pub = await p.publisher.create({ data: { name: `AC-Pub-${prefix}`, slug: `ac-pub-${prefix}` } });
  const game = await p.game.create({ data: { name: `AC-Game-${prefix}`, slug: `ac-game-${prefix}`, publisherId: pub.id } });
  const product = await p.product.create({ data: { name: `AC-Product-${prefix}`, gameId: game.id } });
  const sku = await p.sku.create({ data: { productId: product.id, price: 30.00, available: true, attributes: { size: 'L' } } });
  return { pub, sku };
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

async function seedGuestCart(p: PrismaService, sessionId: string, skuId: string, quantity: number) {
  const cart = await p.cart.create({
    data: {
      sessionId,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      items: { create: { skuId, quantity } },
    },
  });
  return cart;
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
  await cleanupAccount(prisma, TEST_CLERK_ID);
  await app.close();
});

// ─── Slice 1: GET /api/cart with Clerk JWT creates Account Cart ───────────────

describe('GET /api/cart — authenticated', () => {
  afterAll(() => cleanupAccount(prisma, TEST_CLERK_ID));

  it('creates Account Cart with no TTL and accountId set', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/cart').expect(200);

    expect(body.success).toBe(true);
    expect(body.data.accountId).not.toBeNull();
    expect(body.data.sessionId).toBeNull();
    expect(body.data.expiresAt).toBeNull();
  });
});

// ─── Slice 2: GET /api/cart same JWT returns same Cart ────────────────────────

describe('GET /api/cart — idempotent for same account', () => {
  afterAll(() => cleanupAccount(prisma, TEST_CLERK_ID));

  it('returns same Cart id on repeated calls', async () => {
    const res1 = await request(app.getHttpServer()).get('/api/cart').expect(200);
    const res2 = await request(app.getHttpServer()).get('/api/cart').expect(200);
    expect(res1.body.data.id).toBe(res2.body.data.id);
  });
});

// ─── Slice 3: POST /api/cart/items adds item to Account Cart ─────────────────

describe('POST /api/cart/items — authenticated', () => {
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'acct-add');
    pubId = pub.id;
    skuId = sku.id;
  });

  afterAll(async () => {
    await cleanupAccount(prisma, TEST_CLERK_ID);
    await cleanupCatalog(prisma, pubId);
  });

  it('adds item to Account Cart', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/items')
      .send({ skuId, quantity: 2 })
      .expect(201);
    expect(body.data.skuId).toBe(skuId);
    expect(body.data.quantity).toBe(2);
  });
});

// ─── Slice 4: DELETE /api/cart/items/:skuId removes item ─────────────────────

describe('DELETE /api/cart/items/:skuId — authenticated', () => {
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'acct-del');
    pubId = pub.id;
    skuId = sku.id;
    await request(app.getHttpServer()).post('/api/cart/items').send({ skuId, quantity: 1 });
  });

  afterAll(async () => {
    await cleanupAccount(prisma, TEST_CLERK_ID);
    await cleanupCatalog(prisma, pubId);
  });

  it('removes item from Account Cart', async () => {
    await request(app.getHttpServer()).delete(`/api/cart/items/${skuId}`).expect(200);
    const { body } = await request(app.getHttpServer()).get('/api/cart').expect(200);
    expect(body.data.items).toHaveLength(0);
  });
});

// ─── Slice 5: Full account cart lifecycle ─────────────────────────────────────

describe('Account cart lifecycle — create → add → update qty → remove', () => {
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'acct-lifecycle');
    pubId = pub.id;
    skuId = sku.id;
  });

  afterAll(async () => {
    await cleanupAccount(prisma, TEST_CLERK_ID);
    await cleanupCatalog(prisma, pubId);
  });

  it('creates cart on first GET', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/cart').expect(200);
    expect(body.data.items).toHaveLength(0);
    expect(body.data.expiresAt).toBeNull();
  });

  it('adds SKU', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/items')
      .send({ skuId, quantity: 1 })
      .expect(201);
    expect(body.data.skuId).toBe(skuId);
  });

  it('updates quantity', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/items')
      .send({ skuId, quantity: 4 })
      .expect(201);
    expect(body.data.quantity).toBe(4);
  });

  it('removes item', async () => {
    await request(app.getHttpServer()).delete(`/api/cart/items/${skuId}`).expect(200);
    const { body } = await request(app.getHttpServer()).get('/api/cart').expect(200);
    expect(body.data.items).toHaveLength(0);
  });
});

// ─── Slice 6: POST /api/cart/merge moves guest items into Account Cart ────────

describe('POST /api/cart/merge — moves guest items into Account Cart', () => {
  const GUEST_SESSION = 'merge-test-guest-session-001';
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'merge-basic');
    pubId = pub.id;
    skuId = sku.id;
    await seedGuestCart(prisma, GUEST_SESSION, skuId, 3);
  });

  afterAll(async () => {
    // guest cart should be deleted by merge; clean up if still exists
    const guestCart = await prisma.cart.findFirst({ where: { sessionId: GUEST_SESSION } });
    if (guestCart) {
      await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
      await prisma.cart.delete({ where: { id: guestCart.id } });
    }
    await cleanupAccount(prisma, TEST_CLERK_ID);
    await cleanupCatalog(prisma, pubId);
  });

  it('merges guest items into Account Cart', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/merge')
      .send({ sessionId: GUEST_SESSION })
      .expect(201);

    const { body } = await request(app.getHttpServer()).get('/api/cart').expect(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].skuId).toBe(skuId);
    expect(body.data.items[0].quantity).toBe(3);
  });
});

// ─── Slice 7: Guest Cart deleted after merge ──────────────────────────────────

describe('POST /api/cart/merge — guest cart deleted after merge', () => {
  const GUEST_SESSION = 'merge-test-guest-session-002';
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'merge-del');
    pubId = pub.id;
    skuId = sku.id;
    await seedGuestCart(prisma, GUEST_SESSION, skuId, 1);
  });

  afterAll(async () => {
    await cleanupAccount(prisma, TEST_CLERK_ID);
    await cleanupCatalog(prisma, pubId);
  });

  it('guest cart is deleted after merge', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/merge')
      .send({ sessionId: GUEST_SESSION })
      .expect(201);

    const guestCart = await prisma.cart.findFirst({ where: { sessionId: GUEST_SESSION } });
    expect(guestCart).toBeNull();
  });
});

// ─── Slice 8: Merge dedup — Account Cart quantity preserved ───────────────────

describe('POST /api/cart/merge — dedup preserves Account Cart quantity', () => {
  const GUEST_SESSION = 'merge-test-guest-session-003';
  let skuId: string;
  let pubId: string;

  beforeAll(async () => {
    const { pub, sku } = await seedSku(prisma, 'merge-dedup');
    pubId = pub.id;
    skuId = sku.id;
    // Put SKU in account cart with qty=5
    await request(app.getHttpServer()).post('/api/cart/items').send({ skuId, quantity: 5 });
    // Guest cart has same SKU with qty=2
    await seedGuestCart(prisma, GUEST_SESSION, skuId, 2);
  });

  afterAll(async () => {
    const guestCart = await prisma.cart.findFirst({ where: { sessionId: GUEST_SESSION } });
    if (guestCart) {
      await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
      await prisma.cart.delete({ where: { id: guestCart.id } });
    }
    await cleanupAccount(prisma, TEST_CLERK_ID);
    await cleanupCatalog(prisma, pubId);
  });

  it('keeps Account Cart quantity when same SKU present in both carts', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/merge')
      .send({ sessionId: GUEST_SESSION })
      .expect(201);

    const { body } = await request(app.getHttpServer()).get('/api/cart').expect(200);
    const item = body.data.items.find((i: { skuId: string }) => i.skuId === skuId);
    expect(item).toBeDefined();
    expect(item.quantity).toBe(5);
  });
});

// ─── Slice 9: Merge non-existent sessionId is a no-op ────────────────────────

describe('POST /api/cart/merge — non-existent sessionId is a no-op', () => {
  afterAll(() => cleanupAccount(prisma, TEST_CLERK_ID));

  it('returns success for non-existent sessionId', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/cart/merge')
      .send({ sessionId: 'no-such-session-id-xyz' })
      .expect(201);
    expect(body.success).toBe(true);
  });
});
