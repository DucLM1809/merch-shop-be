import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as request from 'supertest';
import Stripe from 'stripe';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ClerkGuard } from '../../src/auth/clerk.guard';
import { PaymentsService } from '../../src/payments/payments.service';
import { NOTIFICATION_PORT } from '../../src/notifications/notification.port';

const TEST_CLERK_ID = 'payments-clerk-001';
const TEST_EMAIL = 'buyer@example.com';

const injectUser = {
  canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
    ctx.switchToHttp().getRequest().user = { userId: TEST_CLERK_ID, email: TEST_EMAIL };
    return true;
  },
};

const mockNotifications = { sendOrderConfirmation: jest.fn() };

let app: INestApplication;
let prisma: PrismaService;
let paymentsService: PaymentsService;
let stripeCreateIntent: jest.SpyInstance;
let stripeConstructEvent: jest.SpyInstance;

async function seedAccount(p: PrismaService) {
  return p.account.upsert({
    where: { clerkUserId: TEST_CLERK_ID },
    update: {},
    create: { clerkUserId: TEST_CLERK_ID, email: TEST_EMAIL },
  });
}

async function seedSku(p: PrismaService, prefix: string) {
  const pub = await p.publisher.create({ data: { name: `Pay-Pub-${prefix}`, slug: `pay-pub-${prefix}` } });
  const game = await p.game.create({ data: { name: `Pay-Game-${prefix}`, slug: `pay-game-${prefix}`, publisherId: pub.id } });
  const product = await p.product.create({ data: { name: `Pay-Product-${prefix}`, gameId: game.id } });
  const sku = await p.sku.create({ data: { productId: product.id, price: 25.00, available: true, attributes: { size: 'M' } } });
  return { pubId: pub.id, sku };
}

async function seedCart(p: PrismaService, accountId: string, skuId: string) {
  return p.cart.create({
    data: {
      accountId,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      items: { create: { skuId, quantity: 2 } },
    },
  });
}

async function cleanupAll(p: PrismaService, pubId: string, accountId: string) {
  await p.orderItem.deleteMany({
    where: { order: { accountId } },
  });
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
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ClerkGuard).useValue(injectUser)
    .overrideProvider(NOTIFICATION_PORT).useValue(mockNotifications)
    .compile();

  app = moduleRef.createNestApplication();
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();

  prisma = moduleRef.get(PrismaService);
  paymentsService = moduleRef.get(PaymentsService);

  stripeCreateIntent = jest.spyOn((paymentsService as any).stripe.paymentIntents, 'create');
  stripeConstructEvent = jest.spyOn((paymentsService as any).stripe.webhooks, 'constructEvent');
});

afterAll(() => app.close());

// ─── Slice 1: POST /api/payments/payment-intent ───────────────────────────────

describe('POST /api/payments/payment-intent', () => {
  let pubId: string;
  let accountId: string;
  let cartId: string;

  beforeAll(async () => {
    const account = await seedAccount(prisma);
    accountId = account.id;
    const { pubId: pid, sku } = await seedSku(prisma, 'pi1');
    pubId = pid;
    const cart = await seedCart(prisma, accountId, sku.id);
    cartId = cart.id;
  });

  afterAll(() => cleanupAll(prisma, pubId, accountId));

  it('returns clientSecret for valid cartId', async () => {
    stripeCreateIntent.mockResolvedValueOnce({ client_secret: 'pi_test_secret_123' } as any);

    const res = await request(app.getHttpServer())
      .post('/api/payments/payment-intent')
      .send({ cartId })
      .expect(201);

    expect(res.body.data.clientSecret).toBe('pi_test_secret_123');
    expect(stripeCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'usd', metadata: { cartId } }),
    );
  });

  it('amount equals SKU price × quantity in cents', async () => {
    stripeCreateIntent.mockResolvedValueOnce({ client_secret: 'pi_test_secret_456' } as any);

    await request(app.getHttpServer())
      .post('/api/payments/payment-intent')
      .send({ cartId })
      .expect(201);

    // price=25.00, quantity=2 → 5000 cents
    expect(stripeCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000 }),
    );
  });
});

// ─── Slice 2: POST /api/payments/webhook — happy path ─────────────────────────

describe('POST /api/payments/webhook — payment_intent.succeeded', () => {
  let pubId: string;
  let accountId: string;
  let cartId: string;
  let skuId: string;
  const paymentIntentId = 'pi_test_webhook_001';

  beforeAll(async () => {
    const account = await seedAccount(prisma);
    accountId = account.id;
    const { pubId: pid, sku } = await seedSku(prisma, 'wh1');
    pubId = pid;
    skuId = sku.id;
    const cart = await seedCart(prisma, accountId, skuId);
    cartId = cart.id;
  });

  afterAll(() => cleanupAll(prisma, pubId, accountId));

  it('creates Order FORWARDED and deletes Cart', async () => {
    mockNotifications.sendOrderConfirmation.mockResolvedValue(undefined);
    stripeConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          metadata: { cartId },
          receipt_email: TEST_EMAIL,
          shipping: null,
        } as Partial<Stripe.PaymentIntent>,
      },
    } as Stripe.Event);

    const res = await request(app.getHttpServer())
      .post('/api/payments/webhook')
      .set('stripe-signature', 'valid-sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'))
      .expect(201);

    expect(res.body.data.received).toBe(true);

    const order = await prisma.order.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
    expect(order).not.toBeNull();
    expect(order!.status).toBe('FORWARDED');
    expect(order!.supplierReference).toBe(`MOCK-${order!.id}`);

    const deletedCart = await prisma.cart.findUnique({ where: { id: cartId } });
    expect(deletedCart).toBeNull();

    expect(mockNotifications.sendOrderConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ to: TEST_EMAIL, orderId: order!.id }),
    );
  });
});

// ─── Slice 3: duplicate webhook — idempotency ─────────────────────────────────

describe('POST /api/payments/webhook — duplicate PaymentIntentId', () => {
  let pubId: string;
  let accountId: string;
  let cartId: string;
  const paymentIntentId = 'pi_test_webhook_dup_001';

  beforeAll(async () => {
    const account = await seedAccount(prisma);
    accountId = account.id;
    const { pubId: pid, sku } = await seedSku(prisma, 'wh2');
    pubId = pid;
    const cart = await seedCart(prisma, accountId, sku.id);
    cartId = cart.id;
  });

  afterAll(() => cleanupAll(prisma, pubId, accountId));

  it('processes first webhook and creates one Order', async () => {
    mockNotifications.sendOrderConfirmation.mockResolvedValue(undefined);
    stripeConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          metadata: { cartId },
          receipt_email: TEST_EMAIL,
          shipping: null,
        } as Partial<Stripe.PaymentIntent>,
      },
    } as Stripe.Event);

    await request(app.getHttpServer())
      .post('/api/payments/webhook')
      .set('stripe-signature', 'valid-sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'))
      .expect(201);

    const orders = await prisma.order.findMany({ where: { stripePaymentIntentId: paymentIntentId } });
    expect(orders).toHaveLength(1);
  });

  it('second identical webhook is a no-op — still only one Order', async () => {
    // Cart is gone after first webhook; service must handle missing cart gracefully
    stripeConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          metadata: { cartId },
          receipt_email: TEST_EMAIL,
          shipping: null,
        } as Partial<Stripe.PaymentIntent>,
      },
    } as Stripe.Event);

    await request(app.getHttpServer())
      .post('/api/payments/webhook')
      .set('stripe-signature', 'valid-sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'))
      .expect(201);

    const orders = await prisma.order.findMany({ where: { stripePaymentIntentId: paymentIntentId } });
    expect(orders).toHaveLength(1);
  });
});
