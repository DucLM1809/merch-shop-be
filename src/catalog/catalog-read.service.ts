import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { SkusRepository } from './skus/skus.repository';
import { ProductsService } from './products/products.service';
import { PublishersService } from './publishers/publishers.service';
import { FilterProductsDto } from './products/dto/filter-products.dto';
import { SkuNotFoundException } from './exceptions/sku-not-found.exception';
import { CatalogReadPort } from './catalog-read.port';

@Injectable()
export class CatalogReadService implements CatalogReadPort {
  constructor(
    private readonly skusRepo: SkusRepository,
    private readonly productsService: ProductsService,
    private readonly publishersService: PublishersService,
  ) {}

  async getSkuPrice(skuId: string): Promise<Decimal> {
    const sku = await this.skusRepo.findById(skuId);
    if (!sku) throw new SkuNotFoundException(skuId);
    return sku.price;
  }

  findProducts(filter: FilterProductsDto) {
    return this.productsService.findAll(filter);
  }

  findPublisher(slug: string) {
    return this.publishersService.findOne(slug);
  }
}
