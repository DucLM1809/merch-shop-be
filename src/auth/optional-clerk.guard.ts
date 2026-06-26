import { Injectable, ExecutionContext } from '@nestjs/common';
import { ClerkGuard } from './clerk.guard';

@Injectable()
export class OptionalClerkGuard extends ClerkGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.headers.authorization?.startsWith('Bearer ')) return true;
    return super.canActivate(context);
  }
}
