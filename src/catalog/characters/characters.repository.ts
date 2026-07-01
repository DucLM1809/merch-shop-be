import { Injectable } from '@nestjs/common';
import { Character, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { BaseRepository } from '../../common';

@Injectable()
export class CharactersRepository extends BaseRepository<Character, Prisma.CharacterUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.character;
  }

  findAll(gameId?: string) {
    return this.prisma.character.findMany({
      where: { deletedAt: null, ...(gameId && { gameId }) },
      select: { id: true, name: true, slug: true, gameId: true },
      orderBy: { name: 'asc' },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.character.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, name: true, slug: true, gameId: true },
    });
  }

  create(data: Prisma.CharacterUncheckedCreateInput) {
    return this.prisma.character.create({ data });
  }
}
