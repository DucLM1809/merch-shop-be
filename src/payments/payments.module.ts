import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, FulfillmentModule, NotificationsModule, CatalogModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
