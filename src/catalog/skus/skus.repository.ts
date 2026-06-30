import { Injectable } from '@nestjs/common';
import { Prisma, Sku } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { BaseRepository } from '../../common';

@Injectable()
export class SkusRepository extends BaseRepository<Sku, Prisma.SkuUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate() {
    return this.prisma.sku;
  }

  findByProduct(productId: string) {
    return this.prisma.sku.findMany({
      where: { productId },
      select: { id: true, productId: true, price: true, available: true, attributes: true },
    });
  }

  create(data: Prisma.SkuCreateInput) {
    return this.prisma.sku.create({ data });
  }

  setAvailability(id: string, available: boolean) {
    return this.prisma.sku.update({
      where: { id },
      data: { available },
      select: { id: true, available: true },
    });
  }

  bulkSetAvailability(facet: 'game' | 'team' | 'character', facetId: string, available: boolean) {
    const facetKey = facet === 'game' ? 'gameId' : facet === 'team' ? 'teamId' : 'characterId';
    return this.prisma.sku.updateMany({
      where: { product: { [facetKey]: facetId } },
      data: { available },
    });
  }
}
