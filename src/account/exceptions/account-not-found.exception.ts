import { DomainException } from '../../common';

export class AccountNotFoundException extends DomainException {
  readonly code = 'ACCOUNT_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(id: string) {
    super(`Account ${id} not found`);
    this.name = this.code;
  }
}
