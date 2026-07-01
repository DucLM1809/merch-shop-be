import { Injectable } from '@nestjs/common';
import { Game, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { BaseRepository } from '../../common';

@Injectable()
export class GamesRepository extends BaseRepository<Game, Prisma.GameUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.game;
  }

  findAll(publisherId?: string) {
    return this.prisma.game.findMany({
      where: { deletedAt: null, ...(publisherId && { publisherId }) },
      select: {
        id: true,
        name: true,
        slug: true,
        publisherId: true,
        publisher: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.game.findFirst({
      where: { slug, deletedAt: null },
      include: { publisher: true },
    });
  }

  create(data: Prisma.GameUncheckedCreateInput) {
    return this.prisma.game.create({ data });
  }
}
