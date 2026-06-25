import { Injectable } from '@nestjs/common';
import { Order, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from '../../common';

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

  findAll() {
    return this.prisma.order.findMany({
      select: {
        id: true,
        accountId: true,
        status: true,
        createdAt: true,
        items: { select: { id: true, quantity: true, skuId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
