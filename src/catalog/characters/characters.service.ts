import { Injectable } from '@nestjs/common';
import { CharactersRepository } from './characters.repository';
import { CreateCharacterDto } from './dto/create-character.dto';
import { CharacterNotFoundException } from '../exceptions/character-not-found.exception';

@Injectable()
export class CharactersService {
  constructor(private readonly repo: CharactersRepository) {}

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

  remove(id: string) {
    return this.repo.remove(id);
  }
}
