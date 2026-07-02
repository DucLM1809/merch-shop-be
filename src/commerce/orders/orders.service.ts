import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from './orders.repository';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception';
import { SUPPLIER_PORT, SupplierPort } from '../../fulfillment';
import { NOTIFICATION_PORT, NotificationPort } from '../../notifications';
import { CartService } from '../cart/cart.service';
import { AccountService } from '../../account';
import { FilterOrdersDto } from './dto/filter-orders.dto';
import { PagedResult } from '../../common';
import { ConfirmedPaymentIntent } from './confirmed-payment-intent.type';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly repo: OrdersRepository,
    private readonly cartService: CartService,
    private readonly accountService: AccountService,
    @Inject(SUPPLIER_PORT) private readonly supplier: SupplierPort,
    @Inject(NOTIFICATION_PORT) private readonly notifications: NotificationPort,
  ) {}

  async findMine(clerkUserId: string) {
    const account = await this.accountService.findByClerkId(clerkUserId);
    if (!account) return [];
    return this.repo.findByAccount(account.id);
  }

  async findOne(id: string, clerkUserId: string) {
    const [order, account] = await Promise.all([
      this.repo.findOneWithItems(id),
      this.accountService.findByClerkId(clerkUserId),
    ]);
    if (!order || !account || order.accountId !== account.id) {
      throw new OrderNotFoundException(id);
    }
    return order;
  }

  async findAll(filters: FilterOrdersDto) {
    const { items, total, page, limit } = await this.repo.findAll(filters);
    return new PagedResult(items, { total, page, limit });
  }

  async confirm(intent: ConfirmedPaymentIntent) {
    const existing = await this.repo.findByPaymentIntentId(intent.stripePaymentIntentId);
    if (existing) return existing;

    const cart = await this.cartService.findById(intent.cartId);
    if (!cart) {
      this.logger.warn(`Cart ${intent.cartId} not found for intent ${intent.stripePaymentIntentId}`);
      return undefined;
    }

    const order = await this.repo.createConfirmed({
      accountId: cart.accountId ?? null,
      buyerEmail: intent.buyerEmail,
      status: 'CONFIRMED',
      stripePaymentIntentId: intent.stripePaymentIntentId,
      shippingAddress: intent.shippingAddress as Prisma.InputJsonValue,
      items: {
        create: cart.items.map((item) => ({
          skuId: item.skuId,
          quantity: item.quantity,
          unitPrice: item.sku.price,
        })),
      },
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

    await this.repo.markForwarded(order.id, supplierResult.reference);

    await this.notifications.sendOrderConfirmation({
      to: order.buyerEmail,
      orderId: order.id,
      items: order.items.map((i) => ({
        name: i.sku.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    });

    await this.cartService.clearCart(intent.cartId);

    this.logger.log(`Order ${order.id} confirmed and forwarded (ref: ${supplierResult.reference})`);

    return order;
  }

  async retryFulfillment(id: string) {
    const order = await this.repo.findOneForRetry(id);
    if (!order) throw new OrderNotFoundException(id);

    if (order.status === 'FORWARDED' || order.supplierReference) {
      throw new ConflictException('Order already forwarded');
    }

    const result = await this.supplier.submitOrder({
      orderId: order.id,
      buyerEmail: order.buyerEmail,
      shippingAddress: order.shippingAddress as Record<string, unknown>,
      items: order.items.map(i => ({ skuId: i.skuId, quantity: i.quantity, unitPrice: Number(i.unitPrice) })),
    });

    return this.repo.markForwarded(id, result.reference);
  }
}
