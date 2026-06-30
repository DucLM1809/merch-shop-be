import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { FulfillmentModule } from '../fulfillment';
import { NotificationsModule } from '../notifications';
import { CatalogModule } from '../catalog';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, FulfillmentModule, NotificationsModule, CatalogModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
