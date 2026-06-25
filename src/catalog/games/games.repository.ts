import { Injectable } from '@nestjs/common';
import { Game, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
      where: publisherId ? { publisherId } : undefined,
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
    return this.prisma.game.findUnique({
      where: { slug },
      include: { publisher: true },
    });
  }

  create(data: Prisma.GameUncheckedCreateInput) {
    return this.prisma.game.create({ data });
  }
}
