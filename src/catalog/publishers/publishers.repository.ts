import { Injectable } from '@nestjs/common';
import { Prisma, Publisher } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { BaseRepository } from '../../common';

@Injectable()
export class PublishersRepository extends BaseRepository<Publisher, Prisma.PublisherUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.publisher;
  }

  findAll() {
    return this.prisma.publisher.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.publisher.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, name: true, slug: true },
    });
  }

  create(data: Prisma.PublisherUncheckedCreateInput) {
    return this.prisma.publisher.create({ data });
  }
}
