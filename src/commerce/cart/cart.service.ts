import { Injectable } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CartSessionContext } from './cart-session.decorator';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { SyncCartDto } from './dto/sync-cart.dto';
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
    if (ctx.type === 'account') {
      const existing = await this.repo.findWithItems({ accountId: ctx.id });
      if (existing) return existing;
      return this.repo.createCart({ accountId: ctx.id, sessionId: null, expiresAt: null });
    }

    const existing = await this.repo.findWithItems({ sessionId: ctx.id });
    if (existing) return existing;
    return this.repo.createCart({
      accountId: null,
      sessionId: ctx.id,
      expiresAt: new Date(Date.now() + this.guestTtlDays * 86_400_000),
    });
  }

  async addItem(cartId: string, dto: AddToCartDto) {
    const sku = await this.repo.findSku(dto.skuId);
    if (!sku) throw new SkuNotFoundException(dto.skuId);
    if (!sku.available) throw new SkuUnavailableException(dto.skuId);
    return this.repo.upsertItem(cartId, dto.skuId, dto.quantity);
  }

  findById(cartId: string) {
    return this.repo.findByIdWithItems(cartId);
  }

  removeItem(cartId: string, skuId: string) {
    return this.repo.removeItem(cartId, skuId);
  }

  clearCart(cartId: string) {
    return this.repo.clearItems(cartId);
  }

  async syncCart(ctx: CartSessionContext, dto: SyncCartDto) {
    const cart = await this.getOrCreateCart(ctx);
    if (dto.items.length === 0) return cart;

    const validSkus = await this.repo.findSkusBatch(dto.items.map((i) => i.skuId));
    const validIds = new Set(validSkus.map((s) => s.id));

    for (const item of dto.items) {
      if (validIds.has(item.skuId)) {
        await this.repo.upsertSyncItem(cart.id, item.skuId, item.quantity);
      }
    }

    const where = cart.accountId ? { accountId: cart.accountId } : { sessionId: cart.sessionId ?? undefined };
    return this.repo.findWithItems(where);
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
