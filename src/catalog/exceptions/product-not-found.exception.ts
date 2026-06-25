import { DomainException } from '../../common';

export class ProductNotFoundException extends DomainException {
  readonly code = 'PRODUCT_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(id: string) {
    super(`Product ${id} not found`);
    this.name = this.code;
  }
}
