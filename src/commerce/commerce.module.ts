import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CartController } from './cart/cart.controller';
import { CartService } from './cart/cart.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';

@Module({
  imports: [AuthModule],
  controllers: [CartController, OrdersController],
  providers: [CartService, OrdersService],
  exports: [OrdersService],
})
export class CommerceModule {}
