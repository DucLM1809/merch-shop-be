import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth-guard';

@Injectable()
export class OptionalAuthGuard extends AuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.headers.authorization?.startsWith('Bearer ')) return true;
    return super.canActivate(context);
  }
}
