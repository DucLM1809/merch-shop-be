import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma';
import { CATALOG_READ_PORT, CatalogReadPort } from '../catalog';
import { OrdersService } from '../commerce';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    @Inject(CATALOG_READ_PORT) private readonly catalogRead: CatalogReadPort,
    config: ConfigService,
  ) {
    this.stripe = new Stripe(config.getOrThrow('STRIPE_SECRET_KEY'));
    this.webhookSecret = config.getOrThrow('STRIPE_WEBHOOK_SECRET');
  }

  async createPaymentIntent(cartId: string): Promise<{ clientSecret: string }> {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: { items: true },
    });

    const itemAmounts = await Promise.all(
      cart.items.map(async (item) => {
        const price = await this.catalogRead.getSkuPrice(item.skuId);
        return Number(price) * item.quantity * 100;
      }),
    );
    const amount = itemAmounts.reduce((sum, v) => sum + v, 0);

    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'usd',
      metadata: { cartId },
    });

    return { clientSecret: intent.client_secret! };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type !== 'payment_intent.succeeded') return;

    const intent = event.data.object as Stripe.PaymentIntent;
    const cartId = intent.metadata['cartId'];
    if (!cartId) return;

    await this.orders.confirm({
      stripePaymentIntentId: intent.id,
      cartId,
      buyerEmail: intent.receipt_email ?? '',
      // external trust boundary: Stripe webhook → Prisma Json field
      shippingAddress: (intent.shipping ?? {}) as Record<string, unknown>,
    });
  }
}
