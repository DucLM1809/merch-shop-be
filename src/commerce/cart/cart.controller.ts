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
import { ClerkGuard } from '../../auth/clerk.guard';
import { CurrentUser, AuthUser } from '../../auth/current-user.decorator';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CartSession() session: CartSessionContext) {
    return this.cart.getOrCreateCart(session);
  }

  @Post('items')
  async addItem(@CartSession() session: CartSessionContext, @Body() dto: AddToCartDto) {
    const cartObj = await this.cart.getOrCreateCart(session);
    return this.cart.addItem(cartObj.id, dto);
  }

  @Delete('items/:skuId')
  async removeItem(@CartSession() session: CartSessionContext, @Param('skuId') skuId: string) {
    const cartObj = await this.cart.getOrCreateCart(session);
    return this.cart.removeItem(cartObj.id, skuId);
  }

  @Post('merge')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth()
  mergeGuestCart(@CurrentUser() user: AuthUser, @Body('sessionId') sessionId: string) {
    return this.cart.mergeGuestCart(sessionId, user.userId);
  }
}
