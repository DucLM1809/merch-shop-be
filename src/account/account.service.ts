import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFromClerk(clerkUser: { userId: string; email: string }) {
    return this.prisma.account.upsert({
      where: { clerkUserId: clerkUser.userId },
      create: { clerkUserId: clerkUser.userId, email: clerkUser.email },
      update: {},
    });
  }

  async hasRole(clerkUserId: string, role: string): Promise<boolean> {
    const account = await this.prisma.account.findUnique({
      where: { clerkUserId },
      select: { role: true },
    });
    return account?.role === role;
  }

  async findById(id: string) {
    return this.prisma.account.findUnique({ where: { id } });
  }
}
