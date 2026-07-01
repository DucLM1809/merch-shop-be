import { Injectable } from '@nestjs/common';
import { CharactersRepository } from './characters.repository';
import { CreateCharacterDto } from './dto/create-character.dto';
import { CharacterNotFoundException } from '../exceptions/character-not-found.exception';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CharactersService {
  constructor(
    private readonly repo: CharactersRepository,
    private readonly productsService: ProductsService,
  ) {}

  findAll(gameId?: string) {
    return this.repo.findAll(gameId);
  }

  async findOne(slug: string) {
    const character = await this.repo.findBySlug(slug);
    if (!character) throw new CharacterNotFoundException(slug);
    return character;
  }

  create(dto: CreateCharacterDto) {
    return this.repo.create(dto);
  }

  update(id: string, dto: Partial<CreateCharacterDto>) {
    return this.repo.update(id, dto);
  }

  async remove(id: string) {
    const products = await this.productsService.findAll({ characterId: id });
    await Promise.all(products.map(p => this.productsService.remove(p.id)));
    return this.repo.softRemove(id);
  }
}
