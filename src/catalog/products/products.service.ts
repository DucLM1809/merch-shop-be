import { Injectable } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { SkusRepository } from '../skus/skus.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { ProductNotFoundException } from '../exceptions/product-not-found.exception';

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly skusRepo: SkusRepository,
  ) {}

  findAll(filters: FilterProductsDto) {
    return this.repo.findAll(filters);
  }

  async findOne(id: string) {
    const product = await this.repo.findOneWithRelations(id);
    if (!product) throw new ProductNotFoundException(id);
    return product;
  }

  create(dto: CreateProductDto) {
    return this.repo.create(dto);
  }

  update(id: string, dto: Partial<CreateProductDto>) {
    return this.repo.update(id, dto);
  }

  async remove(id: string) {
    await this.skusRepo.softRemoveByProduct(id);
    return this.repo.softRemove(id);
  }
}
