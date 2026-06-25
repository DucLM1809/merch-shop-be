import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CartService {
  private readonly guestTtlDays: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.guestTtlDays = Number(config.get('GUEST_CART_TTL_DAYS') ?? 7);
  }

  async getOrCreateCart(params: { accountId?: string; sessionId?: string }) {
    const { accountId, sessionId } = params;

    if (!accountId && !sessionId) {
      throw new BadRequestException('accountId or sessionId required');
    }

    const where = accountId ? { accountId } : { sessionId };
    const existing = await this.prisma.cart.findFirst({
      where,
      include: { items: { include: { sku: { include: { product: true } } } } },
    });

    if (existing) return existing;

    return this.prisma.cart.create({
      data: {
        accountId: accountId ?? null,
        sessionId: sessionId ?? null,
        expiresAt: accountId
          ? null
          : new Date(Date.now() + this.guestTtlDays * 86_400_000),
      },
      include: { items: { include: { sku: { include: { product: true } } } } },
    });
  }

  async addItem(cartId: string, dto: AddToCartDto) {
    const sku = await this.prisma.sku.findUnique({ where: { id: dto.skuId } });
    if (!sku) throw new NotFoundException(`SKU ${dto.skuId} not found`);
    if (!sku.available) throw new BadRequestException(`SKU ${dto.skuId} is unavailable`);

    return this.prisma.cartItem.upsert({
      where: { cartId_skuId: { cartId, skuId: dto.skuId } },
      create: { cartId, skuId: dto.skuId, quantity: dto.quantity },
      update: { quantity: dto.quantity },
    });
  }

  removeItem(cartId: string, skuId: string) {
    return this.prisma.cartItem.delete({
      where: { cartId_skuId: { cartId, skuId } },
    });
  }

  clearCart(cartId: string) {
    return this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  async mergeGuestCart(sessionId: string, accountId: string) {
    const guestCart = await this.prisma.cart.findUnique({ where: { sessionId }, include: { items: true } });
    if (!guestCart) return;

    const accountCart = await this.getOrCreateCart({ accountId });

    for (const item of guestCart.items) {
      await this.prisma.cartItem.upsert({
        where: { cartId_skuId: { cartId: accountCart.id, skuId: item.skuId } },
        create: { cartId: accountCart.id, skuId: item.skuId, quantity: item.quantity },
        update: { quantity: item.quantity },
      });
    }

    await this.prisma.cart.delete({ where: { id: guestCart.id } });
  }
}
