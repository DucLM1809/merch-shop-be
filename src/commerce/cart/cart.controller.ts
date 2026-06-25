import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ClerkGuard } from '../../auth/clerk.guard';
import { CurrentUser, AuthUser } from '../../auth/current-user.decorator';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  private resolveSession(req: Request): { accountId?: string; sessionId?: string } {
    const user = (req as Request & { user?: AuthUser }).user;
    if (user) return { accountId: user.userId };

    if (!req.cookies['cart_session']) {
      req.res?.cookie('cart_session', uuidv4(), { httpOnly: true, sameSite: 'lax' });
    }
    return { sessionId: req.cookies['cart_session'] };
  }

  @Get()
  async get(@Req() req: Request) {
    return this.cart.getOrCreateCart(this.resolveSession(req));
  }

  @Post('items')
  async addItem(@Req() req: Request, @Body() dto: AddToCartDto) {
    const cartCtx = this.resolveSession(req);
    const cartObj = await this.cart.getOrCreateCart(cartCtx);
    return this.cart.addItem(cartObj.id, dto);
  }

  @Delete('items/:skuId')
  async removeItem(@Req() req: Request, @Param('skuId') skuId: string) {
    const cartCtx = this.resolveSession(req);
    const cartObj = await this.cart.getOrCreateCart(cartCtx);
    return this.cart.removeItem(cartObj.id, skuId);
  }

  @Post('merge')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth()
  async mergeGuestCart(@CurrentUser() user: AuthUser, @Body('sessionId') sessionId: string) {
    return this.cart.mergeGuestCart(sessionId, user.userId);
  }
}
