import { DomainException } from '../../common';

export class OrderNotFoundException extends DomainException {
  readonly code = 'ORDER_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(id: string) {
    super(`Order ${id} not found`);
    this.name = this.code;
  }
}
