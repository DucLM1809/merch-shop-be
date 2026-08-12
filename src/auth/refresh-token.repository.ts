import { Injectable } from '@nestjs/common';
import { RefreshToken, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { BaseRepository } from '../common';

@Injectable()
export class RefreshTokenRepository extends BaseRepository<RefreshToken, Prisma.RefreshTokenUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.refreshToken;
  }

  create(data: { accountId: string; tokenHash: string; expiresAt: Date }) {
    return this.prisma.refreshToken.create({ data });
  }

  findByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  revoke(id: string) {
    return this.prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  revokeAllForAccount(accountId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
