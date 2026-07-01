import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SkusRepository } from './skus.repository';
import { CreateSkuDto } from './dto/create-sku.dto';
import { BulkAvailabilityDto } from './dto/bulk-availability.dto';

@Injectable()
export class SkusService {
  constructor(private readonly repo: SkusRepository) {}

  findByProduct(productId: string) {
    return this.repo.findByProduct(productId);
  }

  create(dto: CreateSkuDto) {
    const data: Prisma.SkuCreateInput = {
      price: dto.price,
      available: dto.available,
      attributes: dto.attributes as Prisma.InputJsonValue,
      product: { connect: { id: dto.productId } },
    };
    return this.repo.create(data);
  }

  setAvailability(id: string, available: boolean) {
    return this.repo.setAvailability(id, available);
  }

  bulkSetAvailability(dto: BulkAvailabilityDto) {
    return this.repo.bulkSetAvailability(dto.facet, dto.facetId, dto.available);
  }

  remove(id: string) {
    return this.repo.softRemove(id);
  }
}
