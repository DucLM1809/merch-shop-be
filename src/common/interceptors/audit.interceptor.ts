import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (MUTATING.has(req.method)) {
      const userId: string = (req as Request & { auth?: { userId?: string } }).auth?.userId ?? 'anonymous';
      this.logger.log({ userId, method: req.method, path: req.path, timestamp: new Date().toISOString() });
    }
    return next.handle();
  }
}
