import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: FilterProductsDto) {
    return this.prisma.product.findMany({
      where: {
        ...(filters.gameId && { gameId: filters.gameId }),
        ...(filters.teamId && { teamId: filters.teamId }),
        ...(filters.characterId && { characterId: filters.characterId }),
      },
      include: {
        game: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true, slug: true } },
        character: { select: { id: true, name: true, slug: true } },
        skus: { where: { available: true }, select: { id: true, price: true, attributes: true } },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { game: true, team: true, character: true, skus: true },
    });
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateProductDto>) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
