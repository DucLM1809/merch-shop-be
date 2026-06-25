import { DomainException } from '../../common';

export class GameNotFoundException extends DomainException {
  readonly code = 'GAME_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(slug: string) {
    super(`Game ${slug} not found`);
    this.name = this.code;
  }
}
