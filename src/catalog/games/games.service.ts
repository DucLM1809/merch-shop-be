import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(publisherId?: string) {
    return this.prisma.game.findMany({
      where: publisherId ? { publisherId } : undefined,
      include: { publisher: { select: { id: true, name: true, slug: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findOne(slug: string) {
    return this.prisma.game.findUniqueOrThrow({
      where: { slug },
      include: { publisher: true },
    });
  }

  create(dto: CreateGameDto) {
    return this.prisma.game.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateGameDto>) {
    return this.prisma.game.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.game.delete({ where: { id } });
  }
}
