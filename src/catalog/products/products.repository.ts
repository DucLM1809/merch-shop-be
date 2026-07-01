import { Injectable } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { BaseRepository } from '../../common';
import { FilterProductsDto } from './dto/filter-products.dto';

@Injectable()
export class ProductsRepository extends BaseRepository<Product, Prisma.ProductUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.product;
  }

  findAll(filters: FilterProductsDto) {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(filters.gameId && { gameId: filters.gameId }),
        ...(filters.teamId && { teamId: filters.teamId }),
        ...(filters.characterId && { characterId: filters.characterId }),
      },
      select: {
        id: true,
        name: true,
        gameId: true,
        teamId: true,
        characterId: true,
        game: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true, slug: true } },
        character: { select: { id: true, name: true, slug: true } },
        skus: { where: { available: true }, select: { id: true, price: true, attributes: true } },
      },
    });
  }

  findOneWithRelations(id: string) {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { game: true, team: true, character: true, skus: true },
    });
  }

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }
}
