import { Injectable } from '@nestjs/common';
import { AccountToken, AccountTokenPurpose, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { BaseRepository } from '../common';

@Injectable()
export class AccountTokenRepository extends BaseRepository<AccountToken, Prisma.AccountTokenUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.accountToken;
  }

  create(data: { accountId: string; purpose: AccountTokenPurpose; tokenHash: string; expiresAt: Date }) {
    return this.prisma.accountToken.create({ data });
  }

  findValidByHash(tokenHash: string, purpose: AccountTokenPurpose) {
    return this.prisma.accountToken.findFirst({
      where: { tokenHash, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  markUsed(id: string) {
    return this.prisma.accountToken.update({ where: { id }, data: { usedAt: new Date() } });
  }
}
