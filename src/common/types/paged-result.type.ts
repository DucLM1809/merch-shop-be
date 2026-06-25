import { PaginationMeta } from './pagination-meta.type';

export class PagedResult<T> {
  constructor(
    readonly data: T[],
    readonly meta: PaginationMeta,
  ) {}
}
