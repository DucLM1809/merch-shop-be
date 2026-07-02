import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OrdersService } from '../../src/commerce/orders/orders.service';
import { NOTIFICATION_PORT } from '../../src/notifications/notification.port';

const TEST_EMAIL = 'confirm-buyer@example.com';

const mockNotifications = { sendOrderConfirmation: jest.fn() };

let app: INestApplication;
let prisma: PrismaService;
let ordersService: OrdersService;

async function seedAccount(p: PrismaService) {
  return p.account.upsert({
    where: { clerkUserId: 'order-intake-clerk-001' },
    update: {},
    create: { clerkUserId: 'order-intake-clerk-001', email: TEST_EMAIL },
  });
}

async function seedCart(p: PrismaService, accountId: string, prefix: string) {
  const pub = await p.publisher.create({ data: { name: `Intake-Pub-${prefix}`, slug: `intake-pub-${prefix}` } });
  const game = await p.game.create({ data: { name: `Intake-Game-${prefix}`, slug: `intake-game-${prefix}`, publisherId: pub.id } });
  const product = await p.product.create({ data: { name: `Intake-Product-${prefix}`, gameId: game.id } });
  const sku = await p.sku.create({ data: { productId: product.id, price: 15.0, available: true, attributes: { size: 'L' } } });
  const cart = await p.cart.create({
    data: { accountId, expiresAt: new Date(Date.now() + 7 * 86_400_000), items: { create: { skuId: sku.id, quantity: 3 } } },
  });
  return { pubId: pub.id, cart };
}

async function cleanup(p: PrismaService, pubId: string, accountId: string) {
  await p.orderItem.deleteMany({ where: { order: { accountId } } });
  await p.order.deleteMany({ where: { accountId } });
  const cart = await p.cart.findFirst({ where: { accountId } });
  if (cart) {
    await p.cartItem.deleteMany({ where: { cartId: cart.id } });
    await p.cart.delete({ where: { id: cart.id } });
  }
  const games = await p.game.findMany({ where: { publisherId: pubId }, select: { id: true } });
  const gameIds = games.map((g) => g.id);
  const products = await p.product.findMany({ where: { gameId: { in: gameIds } }, select: { id: true } });
  const productIds = products.map((pr) => pr.id);
  await p.sku.deleteMany({ where: { productId: { in: productIds } } });
  await p.product.deleteMany({ where: { id: { in: productIds } } });
  await p.game.deleteMany({ where: { id: { in: gameIds } } });
  await p.publisher.delete({ where: { id: pubId } });
  await p.account.delete({ where: { id: accountId } });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(NOTIFICATION_PORT).useValue(mockNotifications)
    .compile();

  app = moduleRef.createNestApplication();
  await app.init();

  prisma = moduleRef.get(PrismaService);
  ordersService = moduleRef.get(OrdersService);
});

afterAll(() => app.close());

describe('OrdersService.confirm — order intake (no Stripe client involved)', () => {
  let pubId: string;
  let accountId: string;
  let cartId: string;

  beforeAll(async () => {
    const account = await seedAccount(prisma);
    accountId = account.id;
    const { pubId: pid, cart } = await seedCart(prisma, accountId, 'confirm1');
    pubId = pid;
    cartId = cart.id;
  });

  afterAll(() => cleanup(prisma, pubId, accountId));

  it('creates a FORWARDED Order, clears the Cart, and notifies the buyer', async () => {
    mockNotifications.sendOrderConfirmation.mockResolvedValue(undefined);

    const order = await ordersService.confirm({
      stripePaymentIntentId: 'pi_confirm_test_001',
      cartId,
      buyerEmail: TEST_EMAIL,
      shippingAddress: { line1: '1 Test St' },
    });

    expect(order).toBeDefined();

    const stored = await prisma.order.findUnique({ where: { stripePaymentIntentId: 'pi_confirm_test_001' } });
    expect(stored).not.toBeNull();
    expect(stored!.status).toBe('FORWARDED');
    expect(stored!.supplierReference).toBe(`MOCK-${stored!.id}`);

    const cart = await prisma.cart.findUnique({ where: { id: cartId }, include: { items: true } });
    expect(cart).not.toBeNull();
    expect(cart!.items).toHaveLength(0);

    expect(mockNotifications.sendOrderConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ to: TEST_EMAIL, orderId: stored!.id }),
    );
  });

  it('is idempotent for a repeated stripePaymentIntentId', async () => {
    await ordersService.confirm({
      stripePaymentIntentId: 'pi_confirm_test_001',
      cartId,
      buyerEmail: TEST_EMAIL,
      shippingAddress: {},
    });

    const orders = await prisma.order.findMany({ where: { stripePaymentIntentId: 'pi_confirm_test_001' } });
    expect(orders).toHaveLength(1);
  });
});
