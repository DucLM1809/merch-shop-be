export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}
