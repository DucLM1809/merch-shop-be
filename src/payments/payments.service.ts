import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { SUPPLIER_PORT, SupplierPort } from '../fulfillment/supplier.port';
import { NOTIFICATION_PORT, NotificationPort } from '../notifications/notification.port';
import { CatalogReadService } from '../catalog/catalog-read.service';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SUPPLIER_PORT) private readonly supplier: SupplierPort,
    @Inject(NOTIFICATION_PORT) private readonly notifications: NotificationPort,
    private readonly catalogRead: CatalogReadService,
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
    await this.confirmOrder(intent);
  }

  private async confirmOrder(intent: Stripe.PaymentIntent): Promise<void> {
    const cartId = intent.metadata['cartId'];
    if (!cartId) return;

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: { include: { sku: { include: { product: true } } } } },
    });

    if (!cart) {
      this.logger.warn(`Cart ${cartId} not found for intent ${intent.id}`);
      return;
    }

    // Idempotency: skip if order already created for this intent
    const existing = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: intent.id },
    });
    if (existing) return;

    const order = await this.prisma.order.create({
      data: {
        accountId: cart.accountId ?? null,
        buyerEmail: intent.receipt_email ?? '',
        status: 'CONFIRMED',
        stripePaymentIntentId: intent.id,
        shippingAddress: ((intent.shipping ?? {}) as any),
        items: {
          create: cart.items.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
            unitPrice: item.sku.price,
          })),
        },
      },
      include: { items: { include: { sku: { include: { product: true } } } } },
    });

    const supplierResult = await this.supplier.submitOrder({
      orderId: order.id,
      buyerEmail: order.buyerEmail,
      shippingAddress: order.shippingAddress as Record<string, unknown>,
      items: order.items.map((i) => ({
        skuId: i.skuId,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'FORWARDED', supplierReference: supplierResult.reference },
    });

    await this.notifications.sendOrderConfirmation({
      to: order.buyerEmail,
      orderId: order.id,
      items: order.items.map((i) => ({
        name: i.sku.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    });

    await this.prisma.cart.delete({ where: { id: cartId } });

    this.logger.log(`Order ${order.id} confirmed and forwarded (ref: ${supplierResult.reference})`);
  }
}
