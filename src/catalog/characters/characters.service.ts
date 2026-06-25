import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(gameId?: string) {
    return this.prisma.character.findMany({
      where: gameId ? { gameId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  findOne(slug: string) {
    return this.prisma.character.findUniqueOrThrow({ where: { slug } });
  }

  create(dto: CreateCharacterDto) {
    return this.prisma.character.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateCharacterDto>) {
    return this.prisma.character.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.character.delete({ where: { id } });
  }
}
