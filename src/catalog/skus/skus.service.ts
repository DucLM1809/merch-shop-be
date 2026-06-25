import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSkuDto } from './dto/create-sku.dto';

@Injectable()
export class SkusService {
  constructor(private readonly prisma: PrismaService) {}

  findByProduct(productId: string) {
    return this.prisma.sku.findMany({ where: { productId } });
  }

  create(dto: CreateSkuDto) {
    return this.prisma.sku.create({ data: { ...dto, attributes: dto.attributes as any } });
  }

  setAvailability(id: string, available: boolean) {
    return this.prisma.sku.update({ where: { id }, data: { available } });
  }

  remove(id: string) {
    return this.prisma.sku.delete({ where: { id } });
  }
}
