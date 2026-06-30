import { Injectable } from '@nestjs/common';
import { Order, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { BaseRepository } from '../../common';
import { FilterOrdersDto } from './dto/filter-orders.dto';

@Injectable()
export class OrdersRepository extends BaseRepository<Order, Prisma.OrderUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.order;
  }

  findByAccount(accountId: string) {
    return this.prisma.order.findMany({
      where: { accountId },
      select: {
        id: true,
        accountId: true,
        status: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            sku: { select: { id: true, price: true, attributes: true, product: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOneWithItems(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        accountId: true,
        status: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            sku: { select: { id: true, price: true, attributes: true, product: { select: { id: true, name: true } } } },
          },
        },
      },
    });
  }

  async findAll(filters: FilterOrdersDto) {
    const where: Prisma.OrderWhereInput = filters.status ? { status: filters.status } : {};
    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          accountId: true,
          status: true,
          supplierReference: true,
          createdAt: true,
          items: { select: { id: true, quantity: true, skuId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page: filters.page, limit: filters.limit };
  }

  findOneForRetry(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, supplierReference: true, buyerEmail: true, shippingAddress: true, items: { select: { skuId: true, quantity: true, unitPrice: true } } },
    });
  }

  markForwarded(id: string, supplierReference: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: 'FORWARDED', supplierReference },
      select: { id: true, status: true, supplierReference: true },
    });
  }
}
