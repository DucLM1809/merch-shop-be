import { INestApplication, ExecutionContext, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ClerkGuard } from '../../src/auth/clerk.guard';
import { AdminGuard } from '../../src/auth/admin.guard';
import { OrdersService } from '../../src/commerce';

const BUYER_A_CLERK_ID = 'orders-buyer-a-001';
const BUYER_A_EMAIL = 'buyer-a@example.com';
const BUYER_B_CLERK_ID = 'orders-buyer-b-001';
const BUYER_B_EMAIL = 'buyer-b@example.com';

function injectUser(clerkUserId: string, email: string) {
  return {
    canActivate: (ctx: ExecutionContext) => {
      ctx.switchToHttp().getRequest().user = { userId: clerkUserId, email };
      return true;
    },
  };
}

let app: INestApplication;
let prisma: PrismaService;
let ordersService: OrdersService;

async function seedAccount(p: PrismaService, clerkUserId: string, email: string) {
  return p.account.upsert({
    where: { clerkUserId },
    update: {},
    create: { clerkUserId, email },
  });
}

async function seedCart(p: PrismaService, accountId: string, prefix: string) {
  const pub = await p.publisher.create({ data: { name: `Hist-Pub-${prefix}`, slug: `hist-pub-${prefix}` } });
  const game = await p.game.create({ data: { name: `Hist-Game-${prefix}`, slug: `hist-game-${prefix}`, publisherId: pub.id } });
  const product = await p.product.create({ data: { name: `Hist-Product-${prefix}`, gameId: game.id } });
  const sku = await p.sku.create({ data: { productId: product.id, price: 10.0, available: true, attributes: { size: 'S' } } });
  const cart = await p.cart.create({
    data: { accountId, expiresAt: new Date(Date.now() + 7 * 86_400_000), items: { create: { skuId: sku.id, quantity: 1 } } },
  });
  return { pubId: pub.id, cart };
}

async function confirmOrder(orders: OrdersService, cartId: string, buyerEmail: string, intentId: string) {
  return orders.confirm({ stripePaymentIntentId: intentId, cartId, buyerEmail, shippingAddress: {} });
}

async function cleanup(p: PrismaService, pubIds: string[], accountIds: string[]) {
  for (const accountId of accountIds) {
    await p.orderItem.deleteMany({ where: { order: { accountId } } });
    await p.order.deleteMany({ where: { accountId } });
    const cart = await p.cart.findFirst({ where: { accountId } });
    if (cart) {
      await p.cartItem.deleteMany({ where: { cartId: cart.id } });
      await p.cart.delete({ where: { id: cart.id } });
    }
  }
  for (const pubId of pubIds) {
    const games = await p.game.findMany({ where: { publisherId: pubId }, select: { id: true } });
    const gameIds = games.map((g) => g.id);
    const products = await p.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } });
    const productIds = products.map((pr) => pr.id);
    await p.sku.deleteMany({ where: { productId: { in: productIds } } });
    await p.product.deleteMany({ where: { id: { in: productIds } } });
    await p.game.deleteMany({ where: { id: { in: gameIds } } });
    await p.publisher.delete({ where: { id: pubId } });
  }
  for (const accountId of accountIds) {
    await p.account.delete({ where: { id: accountId } });
  }
}

async function buildApp(guardOverride: { canActivate: (ctx: ExecutionContext) => boolean }) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ClerkGuard)
    .useValue(guardOverride)
    .compile();
  const a = moduleRef.createNestApplication();
  a.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  a.setGlobalPrefix('api');
  await a.init();
  return { app: a, prisma: moduleRef.get(PrismaService) as PrismaService, orders: moduleRef.get(OrdersService) as OrdersService };
}

// AdminGuard injects ClerkGuard directly (not via @UseGuards), so
// overrideGuard(ClerkGuard) never reaches it. Re-create the real role
// check against Prisma instead, same pattern as admin.integration.spec.ts.
async function buildAdminCheckedApp(clerkUserId: string) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(AdminGuard)
    .useFactory({
      inject: [PrismaService],
      factory: (p: PrismaService) => ({
        canActivate: async (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { userId: clerkUserId };
          const account = await p.account.findUnique({ where: { clerkUserId }, select: { role: true } });
          if (account?.role !== 'ADMIN') throw new ForbiddenException();
          return true;
        },
      }),
    })
    .compile();
  const a = moduleRef.createNestApplication();
  a.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  a.setGlobalPrefix('api');
  await a.init();
  return a;
}

describe('GET /api/orders/mine', () => {
  let accountId: string;
  let pubId: string;

  beforeAll(async () => {
    const built = await buildApp(injectUser(BUYER_A_CLERK_ID, BUYER_A_EMAIL));
    app = built.app;
    prisma = built.prisma;
    ordersService = built.orders;

    const account = await seedAccount(prisma, BUYER_A_CLERK_ID, BUYER_A_EMAIL);
    accountId = account.id;
  });

  afterAll(async () => {
    await cleanup(prisma, pubId ? [pubId] : [], [accountId]);
    await app.close();
  });

  it('returns empty array (not 404) when Account has no Orders', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/orders/mine').expect(200);
    expect(body.data).toEqual([]);
  });

  it('returns the authenticated Account own Orders with line items after confirm', async () => {
    const { pubId: pid, cart } = await seedCart(prisma, accountId, 'mine1');
    pubId = pid;

    await confirmOrder(ordersService, cart.id, BUYER_A_EMAIL, 'pi_history_mine_001');

    const { body } = await request(app.getHttpServer()).get('/api/orders/mine').expect(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].items).toHaveLength(1);
    expect(body.data[0].status).toBe('FORWARDED');
  });
});

describe('GET /api/orders/:id', () => {
  let accountAId: string;
  let accountBId: string;
  let pubId: string;
  let orderId: string;

  beforeAll(async () => {
    const built = await buildApp(injectUser(BUYER_A_CLERK_ID, BUYER_A_EMAIL));
    app = built.app;
    prisma = built.prisma;
    ordersService = built.orders;

    const accountA = await seedAccount(prisma, BUYER_A_CLERK_ID, BUYER_A_EMAIL);
    accountAId = accountA.id;
    const accountB = await seedAccount(prisma, BUYER_B_CLERK_ID, BUYER_B_EMAIL);
    accountBId = accountB.id;

    const { pubId: pid, cart } = await seedCart(prisma, accountAId, 'byid1');
    pubId = pid;
    const order = await confirmOrder(ordersService, cart.id, BUYER_A_EMAIL, 'pi_history_byid_001');
    orderId = order!.id;
  });

  afterAll(async () => {
    await cleanup(prisma, [pubId], [accountAId, accountBId]);
    await app.close();
  });

  it('returns the Order with line items for its owner', async () => {
    const { body } = await request(app.getHttpServer()).get(`/api/orders/${orderId}`).expect(200);
    expect(body.data.id).toBe(orderId);
    expect(body.data.items).toHaveLength(1);
  });

  it('404s for a Buyer requesting another Account Order', async () => {
    const other = await buildApp(injectUser(BUYER_B_CLERK_ID, BUYER_B_EMAIL));
    await request(other.app.getHttpServer()).get(`/api/orders/${orderId}`).expect(404);
    await other.app.close();
  });
});

describe('GET /api/orders (admin)', () => {
  let accountAId: string;
  let accountBId: string;
  let adminAccountId: string;
  let pubIds: string[];

  const ADMIN_CLERK_ID = 'orders-admin-001';
  const ADMIN_EMAIL = 'orders-admin@example.com';

  beforeAll(async () => {
    const built = await buildApp(injectUser(BUYER_A_CLERK_ID, BUYER_A_EMAIL));
    app = built.app;
    prisma = built.prisma;
    ordersService = built.orders;

    const accountA = await seedAccount(prisma, BUYER_A_CLERK_ID, BUYER_A_EMAIL);
    accountAId = accountA.id;
    const accountB = await seedAccount(prisma, BUYER_B_CLERK_ID, BUYER_B_EMAIL);
    accountBId = accountB.id;
    const admin = await prisma.account.upsert({
      where: { clerkUserId: ADMIN_CLERK_ID },
      update: { role: 'ADMIN' },
      create: { clerkUserId: ADMIN_CLERK_ID, email: ADMIN_EMAIL, role: 'ADMIN' },
    });
    adminAccountId = admin.id;

    const seedA = await seedCart(prisma, accountAId, 'admlist-a');
    const seedB = await seedCart(prisma, accountBId, 'admlist-b');
    pubIds = [seedA.pubId, seedB.pubId];

    await confirmOrder(ordersService, seedA.cart.id, BUYER_A_EMAIL, 'pi_history_admin_a');
    await confirmOrder(ordersService, seedB.cart.id, BUYER_B_EMAIL, 'pi_history_admin_b');
  });

  afterAll(async () => {
    await cleanup(prisma, pubIds, [accountAId, accountBId, adminAccountId]);
    await app.close();
  });

  it('403s for a non-admin Buyer', async () => {
    const buyerChecked = await buildAdminCheckedApp(BUYER_A_CLERK_ID);
    await request(buyerChecked.getHttpServer()).get('/api/orders').expect(403);
    await buyerChecked.close();
  });

  it('returns all Orders for an Admin, not just their own', async () => {
    const adminChecked = await buildAdminCheckedApp(ADMIN_CLERK_ID);
    const { body } = await request(adminChecked.getHttpServer()).get('/api/orders').expect(200);
    const accountIds = body.data.map((o: { accountId: string }) => o.accountId);
    expect(accountIds).toEqual(expect.arrayContaining([accountAId, accountBId]));
    await adminChecked.close();
  });
});
