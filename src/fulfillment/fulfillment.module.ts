import { Module } from '@nestjs/common';
import { SUPPLIER_PORT } from './supplier.port';
import { MockSupplierService } from './mock-supplier.service';

@Module({
  providers: [{ provide: SUPPLIER_PORT, useClass: MockSupplierService }],
  exports: [SUPPLIER_PORT],
})
export class FulfillmentModule {}
