import { DomainException } from '../../common';

export class SkuUnavailableException extends DomainException {
  readonly code = 'SKU_UNAVAILABLE';
  readonly httpStatus = 422;
  constructor(skuId: string) {
    super(`SKU ${skuId} is unavailable`);
    this.name = this.code;
  }
}
