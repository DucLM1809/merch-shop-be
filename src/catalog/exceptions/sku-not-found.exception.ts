import { DomainException } from '../../common';

export class SkuNotFoundException extends DomainException {
  readonly code = 'SKU_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(id: string) {
    super(`SKU ${id} not found`);
    this.name = this.code;
  }
}
