import { DomainException } from '../../common';

export class TeamNotFoundException extends DomainException {
  readonly code = 'TEAM_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(slug: string) {
    super(`Team ${slug} not found`);
    this.name = this.code;
  }
}
