import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CartSession, CartSessionContext } from './cart-session.decorator';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { SyncCartDto } from './dto/sync-cart.dto';
import { ClerkGuard, OptionalClerkGuard, CurrentUser, AuthUser } from '../../auth';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @UseGuards(OptionalClerkGuard)
  get(@CartSession() session: CartSessionContext) {
    return this.cart.getOrCreateCart(session);
  }

  @Post('items')
  @UseGuards(OptionalClerkGuard)
  async addItem(@CartSession() session: CartSessionContext, @Body() dto: AddToCartDto) {
    const cartObj = await this.cart.getOrCreateCart(session);
    return this.cart.addItem(cartObj.id, dto);
  }

  @Delete('items/:skuId')
  @UseGuards(OptionalClerkGuard)
  async removeItem(@CartSession() session: CartSessionContext, @Param('skuId') skuId: string) {
    const cartObj = await this.cart.getOrCreateCart(session);
    return this.cart.removeItem(cartObj.id, skuId);
  }

  @Post('sync')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth()
  syncCart(@CartSession() session: CartSessionContext, @Body() dto: SyncCartDto) {
    return this.cart.syncCart(session, dto);
  }

  @Post('merge')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth()
  mergeGuestCart(@CurrentUser() user: AuthUser, @Body('sessionId') sessionId: string) {
    return this.cart.mergeGuestCart(sessionId, { userId: user.userId, email: user.email });
  }
}
