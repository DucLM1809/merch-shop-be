import { Injectable } from '@nestjs/common';
import { Account, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { BaseRepository } from '../common';

@Injectable()
export class AccountRepository extends BaseRepository<Account, Prisma.AccountUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.account;
  }

  findByEmail(email: string) {
    return this.prisma.account.findUnique({ where: { email } });
  }

  findByEmailForAuth(email: string) {
    return this.prisma.account.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        emailVerifiedAt: true,
        failedLoginCount: true,
        lockedUntil: true,
        deletedAt: true,
      },
    });
  }

  createBuyer(data: { email: string; passwordHash: string }) {
    return this.prisma.account.create({
      data: { email: data.email, passwordHash: data.passwordHash, role: 'BUYER' },
    });
  }

  incrementFailedLogin(id: string, lockedUntil: Date | null) {
    return this.prisma.account.update({
      where: { id },
      data: { failedLoginCount: { increment: 1 }, lockedUntil },
    });
  }

  resetFailedLogin(id: string) {
    return this.prisma.account.update({
      where: { id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  markEmailVerified(id: string) {
    return this.prisma.account.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
  }

  setPasswordHash(id: string, passwordHash: string) {
    return this.prisma.account.update({ where: { id }, data: { passwordHash } });
  }
}
