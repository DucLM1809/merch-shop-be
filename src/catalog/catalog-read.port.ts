import { Decimal } from '@prisma/client/runtime/library';

export const CATALOG_READ_PORT = Symbol('CATALOG_READ_PORT');

export interface CatalogReadPort {
  getSkuPrice(skuId: string): Promise<Decimal>;
}
