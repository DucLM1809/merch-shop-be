import { DomainException } from '../../common';

export class InvalidOrExpiredTokenException extends DomainException {
  readonly code = 'INVALID_OR_EXPIRED_TOKEN';
  readonly httpStatus = 400;

  constructor() {
    super('Token is invalid or has expired');
    this.name = this.code;
  }
}
