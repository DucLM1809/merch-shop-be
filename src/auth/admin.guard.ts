import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from './auth-guard';
import { PrismaService } from '../prisma';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authGuard: AuthGuard,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.authGuard.canActivate(context);

    const req = context.switchToHttp().getRequest();
    const account = await this.prisma.account.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (account?.role !== 'ADMIN') {
      throw new ForbiddenException();
    }

    return true;
  }
}
