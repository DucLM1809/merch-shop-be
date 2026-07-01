import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ClerkGuard } from './clerk.guard';
import { PrismaService } from '../prisma';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly clerkGuard: ClerkGuard,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.clerkGuard.canActivate(context);

    const req = context.switchToHttp().getRequest();
    const account = await this.prisma.account.findUnique({
      where: { clerkUserId: req.user.userId },
      select: { role: true },
    });

    if (account?.role !== 'ADMIN') {
      throw new ForbiddenException();
    }

    return true;
  }
}
