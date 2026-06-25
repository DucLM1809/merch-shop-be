import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findByAccount(accountId: string) {
    return this.prisma.order.findMany({
      where: { accountId },
      include: { items: { include: { sku: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: { items: { include: { sku: { include: { product: true } } } } },
    });
  }

  findAll() {
    return this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
