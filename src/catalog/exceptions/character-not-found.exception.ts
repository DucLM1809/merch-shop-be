import { DomainException } from '../../common';

export class CharacterNotFoundException extends DomainException {
  readonly code = 'CHARACTER_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(slug: string) {
    super(`Character ${slug} not found`);
    this.name = this.code;
  }
}
