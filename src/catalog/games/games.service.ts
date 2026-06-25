import { Injectable } from '@nestjs/common';
import { GamesRepository } from './games.repository';
import { CreateGameDto } from './dto/create-game.dto';
import { GameNotFoundException } from '../exceptions/game-not-found.exception';

@Injectable()
export class GamesService {
  constructor(private readonly repo: GamesRepository) {}

  findAll(publisherId?: string) {
    return this.repo.findAll(publisherId);
  }

  async findOne(slug: string) {
    const game = await this.repo.findBySlug(slug);
    if (!game) throw new GameNotFoundException(slug);
    return game;
  }

  create(dto: CreateGameDto) {
    return this.repo.create(dto);
  }

  update(id: string, dto: Partial<CreateGameDto>) {
    return this.repo.update(id, dto);
  }

  remove(id: string) {
    return this.repo.remove(id);
  }
}
