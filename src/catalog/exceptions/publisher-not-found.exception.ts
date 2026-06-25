import { DomainException } from '../../common';

export class PublisherNotFoundException extends DomainException {
  readonly code = 'PUBLISHER_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(slug: string) {
    super(`Publisher ${slug} not found`);
    this.name = this.code;
  }
}
