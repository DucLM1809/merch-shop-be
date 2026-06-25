import { Injectable } from '@nestjs/common';
import { Cart, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from '../../common';

@Injectable()
export class CartRepository extends BaseRepository<Cart, Prisma.CartUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.cart;
  }

  findWithItems(where: { accountId?: string; sessionId?: string }) {
    return this.prisma.cart.findFirst({
      where,
      include: { items: { include: { sku: { include: { product: true } } } } },
    });
  }

  createCart(data: Prisma.CartUncheckedCreateInput) {
    return this.prisma.cart.create({
      data,
      include: { items: { include: { sku: { include: { product: true } } } } },
    });
  }

  findSku(id: string) {
    return this.prisma.sku.findUnique({
      where: { id },
      select: { id: true, available: true },
    });
  }

  upsertItem(cartId: string, skuId: string, quantity: number) {
    return this.prisma.cartItem.upsert({
      where: { cartId_skuId: { cartId, skuId } },
      create: { cartId, skuId, quantity },
      update: { quantity },
    });
  }

  removeItem(cartId: string, skuId: string) {
    return this.prisma.cartItem.delete({
      where: { cartId_skuId: { cartId, skuId } },
    });
  }

  clearItems(cartId: string) {
    return this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  findGuestCart(sessionId: string) {
    return this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
  }

  upsertMergedItem(cartId: string, skuId: string, quantity: number) {
    return this.prisma.cartItem.upsert({
      where: { cartId_skuId: { cartId, skuId } },
      create: { cartId, skuId, quantity },
      update: { quantity },
    });
  }
}
