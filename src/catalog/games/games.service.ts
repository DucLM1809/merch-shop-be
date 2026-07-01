import { Injectable } from '@nestjs/common';
import { GamesRepository } from './games.repository';
import { TeamsService } from '../teams/teams.service';
import { CharactersService } from '../characters/characters.service';
import { ProductsService } from '../products/products.service';
import { CreateGameDto } from './dto/create-game.dto';
import { GameNotFoundException } from '../exceptions/game-not-found.exception';

@Injectable()
export class GamesService {
  constructor(
    private readonly repo: GamesRepository,
    private readonly teamsService: TeamsService,
    private readonly charactersService: CharactersService,
    private readonly productsService: ProductsService,
  ) {}

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

  async remove(id: string) {
    const [teams, characters, products] = await Promise.all([
      this.teamsService.findAll(id),
      this.charactersService.findAll(id),
      this.productsService.findAll({ gameId: id }),
    ]);
    await Promise.all([
      ...teams.map(t => this.teamsService.remove(t.id)),
      ...characters.map(c => this.charactersService.remove(c.id)),
      ...products.map(p => this.productsService.remove(p.id)),
    ]);
    return this.repo.softRemove(id);
  }
}
