import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ClerkGuard } from './clerk.guard';
import { AccountService } from '../account';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly clerkGuard: ClerkGuard;

  constructor(
    private readonly accountService: AccountService,
    config: ConfigService,
  ) {
    this.clerkGuard = new ClerkGuard(config);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.clerkGuard.canActivate(context);

    const req = context.switchToHttp().getRequest();
    const isAdmin = await this.accountService.hasRole(req.user.userId, 'ADMIN');

    if (!isAdmin) {
      throw new ForbiddenException();
    }

    return true;
  }
}
