import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePublisherDto } from './dto/create-publisher.dto';

@Injectable()
export class PublishersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.publisher.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(slug: string) {
    return this.prisma.publisher.findUniqueOrThrow({ where: { slug } });
  }

  create(dto: CreatePublisherDto) {
    return this.prisma.publisher.create({ data: dto });
  }

  update(id: string, dto: Partial<CreatePublisherDto>) {
    return this.prisma.publisher.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.publisher.delete({ where: { id } });
  }
}
