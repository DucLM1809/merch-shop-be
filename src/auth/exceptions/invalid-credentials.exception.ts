import { DomainException } from '../../common';

export class InvalidCredentialsException extends DomainException {
  readonly code = 'INVALID_CREDENTIALS';
  readonly httpStatus = 401;

  constructor() {
    super('Invalid email or password');
    this.name = this.code;
  }
}
