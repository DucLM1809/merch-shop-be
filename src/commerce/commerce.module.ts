import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { FulfillmentModule } from '../fulfillment';
import { NotificationsModule } from '../notifications';
import { CatalogModule } from '../catalog';
import { CartController } from './cart/cart.controller';
import { CartService } from './cart/cart.service';
import { CartRepository } from './cart/cart.repository';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { OrdersRepository } from './orders/orders.repository';

@Module({
  imports: [PrismaModule, FulfillmentModule, NotificationsModule, CatalogModule],
  controllers: [CartController, OrdersController],
  providers: [CartService, CartRepository, OrdersService, OrdersRepository],
  exports: [OrdersService],
})
export class CommerceModule {}
