import { Inject, Injectable } from '@nestjs/common';
import type { ClerkClient } from '@clerk/backend';
import { PrismaService } from '../prisma';
import { AccountNotFoundException } from './exceptions/account-not-found.exception';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('CLERK_CLIENT') private readonly clerkClient: ClerkClient,
  ) {}

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

  async findByClerkId(clerkUserId: string) {
    return this.prisma.account.findUnique({ where: { clerkUserId } });
  }

  remove(id: string) {
    return this.prisma.account.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createSignInToken(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new AccountNotFoundException(id);
    return this.clerkClient.signInTokens.createSignInToken({
      userId: account.clerkUserId,
      expiresInSeconds: 60,
    });
  }
}
