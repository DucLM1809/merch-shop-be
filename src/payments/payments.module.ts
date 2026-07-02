import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { CatalogModule } from '../catalog';
import { CommerceModule } from '../commerce/commerce.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, CatalogModule, CommerceModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
