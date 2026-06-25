import { Injectable, Logger } from '@nestjs/common';
import { SupplierPort, SupplierOrder, SupplierResult } from './supplier.port';

// ponytail: mock implementation, replace with real Supplier adapter when contracted
@Injectable()
export class MockSupplierService implements SupplierPort {
  private readonly logger = new Logger(MockSupplierService.name);

  async submitOrder(order: SupplierOrder): Promise<SupplierResult> {
    this.logger.log(`[MOCK] Forwarding order ${order.orderId} to supplier`);
    return { reference: `MOCK-${order.orderId}` };
  }

  async checkAvailability(skuId: string): Promise<boolean> {
    this.logger.log(`[MOCK] Checking availability for SKU ${skuId}`);
    return true;
  }
}
