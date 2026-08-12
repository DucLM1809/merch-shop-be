import { DomainException } from '../../common';

export class EmailAlreadyRegisteredException extends DomainException {
  readonly code = 'EMAIL_ALREADY_REGISTERED';
  readonly httpStatus = 409;

  constructor() {
    super('Email already registered');
    this.name = this.code;
  }
}
