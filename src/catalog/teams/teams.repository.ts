import { Injectable } from '@nestjs/common';
import { Prisma, Team } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { BaseRepository } from '../../common';

@Injectable()
export class TeamsRepository extends BaseRepository<Team, Prisma.TeamUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.team;
  }

  findAll(gameId?: string) {
    return this.prisma.team.findMany({
      where: { deletedAt: null, ...(gameId && { gameId }) },
      select: { id: true, name: true, slug: true, gameId: true },
      orderBy: { name: 'asc' },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.team.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, name: true, slug: true, gameId: true },
    });
  }

  create(data: Prisma.TeamUncheckedCreateInput) {
    return this.prisma.team.create({ data });
  }
}
