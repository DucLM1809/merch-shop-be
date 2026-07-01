import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma';

@Injectable()
export class ClerkGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = auth.slice(7);

    try {
      const payload = await verifyToken(token, {
        secretKey: this.config.getOrThrow('CLERK_SECRET_KEY'),
      });
      const p = payload as typeof payload & { email?: string; email_address?: string };
      req.user = { userId: payload.sub, email: p.email ?? p.email_address ?? '' };
    } catch {
      throw new UnauthorizedException();
    }

    const account = await this.prisma.account.findUnique({
      where: { clerkUserId: req.user.userId },
      select: { deletedAt: true },
    });
    if (account?.deletedAt) throw new UnauthorizedException();

    return true;
  }
}
