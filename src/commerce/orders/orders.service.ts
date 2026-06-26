import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception';
import { SUPPLIER_PORT, SupplierPort } from '../../fulfillment/supplier.port';
import { FilterOrdersDto } from './dto/filter-orders.dto';
import { PagedResult } from '../../common/types/paged-result.type';

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    @Inject(SUPPLIER_PORT) private readonly supplier: SupplierPort,
  ) {}

  findByAccount(accountId: string) {
    return this.repo.findByAccount(accountId);
  }

  async findOne(id: string) {
    const order = await this.repo.findOneWithItems(id);
    if (!order) throw new OrderNotFoundException(id);
    return order;
  }

  async findAll(filters: FilterOrdersDto) {
    const { items, total, page, limit } = await this.repo.findAll(filters);
    return new PagedResult(items, { total, page, limit });
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
