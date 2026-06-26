import { Injectable } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CartSessionContext } from './cart-session.decorator';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ConfigService } from '@nestjs/config';
import { SkuNotFoundException } from '../exceptions/sku-not-found.exception';
import { SkuUnavailableException } from '../exceptions/sku-unavailable.exception';

@Injectable()
export class CartService {
  private readonly guestTtlDays: number;

  constructor(
    private readonly repo: CartRepository,
    config: ConfigService,
  ) {
    this.guestTtlDays = Number(config.get('GUEST_CART_TTL_DAYS') ?? 7);
  }

  async getOrCreateCart(ctx: CartSessionContext) {
    const where = ctx.type === 'account' ? { accountId: ctx.id } : { sessionId: ctx.id };
    const existing = await this.repo.findWithItems(where);
    if (existing) return existing;

    return this.repo.createCart({
      accountId: ctx.type === 'account' ? ctx.id : null,
      sessionId: ctx.type === 'guest' ? ctx.id : null,
      expiresAt: ctx.type === 'guest' ? new Date(Date.now() + this.guestTtlDays * 86_400_000) : null,
    });
  }

  async addItem(cartId: string, dto: AddToCartDto) {
    const sku = await this.repo.findSku(dto.skuId);
    if (!sku) throw new SkuNotFoundException(dto.skuId);
    if (!sku.available) throw new SkuUnavailableException(dto.skuId);
    return this.repo.upsertItem(cartId, dto.skuId, dto.quantity);
  }

  removeItem(cartId: string, skuId: string) {
    return this.repo.removeItem(cartId, skuId);
  }

  clearCart(cartId: string) {
    return this.repo.clearItems(cartId);
  }

  async mergeGuestCart(sessionId: string, accountId: string) {
    const guestCart = await this.repo.findGuestCart(sessionId);
    if (!guestCart) return;

    const accountCart = await this.getOrCreateCart({ type: 'account', id: accountId });

    for (const item of guestCart.items) {
      await this.repo.upsertMergedItem(accountCart.id, item.skuId, item.quantity);
    }

    await this.repo.remove(guestCart.id);
  }
}
