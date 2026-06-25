export interface SupplierOrder {
  orderId: string;
  buyerEmail: string;
  shippingAddress: Record<string, unknown>;
  items: Array<{ skuId: string; quantity: number; unitPrice: number }>;
}

export interface SupplierResult {
  reference: string;
}

export const SUPPLIER_PORT = Symbol('SUPPLIER_PORT');

export interface SupplierPort {
  submitOrder(order: SupplierOrder): Promise<SupplierResult>;
  checkAvailability(skuId: string): Promise<boolean>;
}
