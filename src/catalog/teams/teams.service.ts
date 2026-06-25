import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(gameId?: string) {
    return this.prisma.team.findMany({
      where: gameId ? { gameId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  findOne(slug: string) {
    return this.prisma.team.findUniqueOrThrow({ where: { slug } });
  }

  create(dto: CreateTeamDto) {
    return this.prisma.team.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateTeamDto>) {
    return this.prisma.team.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.team.delete({ where: { id } });
  }
}
