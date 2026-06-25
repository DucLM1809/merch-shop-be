import { Module } from '@nestjs/common';
import { PublishersController } from './publishers/publishers.controller';
import { PublishersService } from './publishers/publishers.service';
import { PublishersRepository } from './publishers/publishers.repository';
import { GamesController } from './games/games.controller';
import { GamesService } from './games/games.service';
import { GamesRepository } from './games/games.repository';
import { TeamsController } from './teams/teams.controller';
import { TeamsService } from './teams/teams.service';
import { TeamsRepository } from './teams/teams.repository';
import { CharactersController } from './characters/characters.controller';
import { CharactersService } from './characters/characters.service';
import { CharactersRepository } from './characters/characters.repository';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { ProductsRepository } from './products/products.repository';
import { SkusController } from './skus/skus.controller';
import { SkusService } from './skus/skus.service';
import { SkusRepository } from './skus/skus.repository';

@Module({
  controllers: [
    PublishersController,
    GamesController,
    TeamsController,
    CharactersController,
    ProductsController,
    SkusController,
  ],
  providers: [
    PublishersService, PublishersRepository,
    GamesService, GamesRepository,
    TeamsService, TeamsRepository,
    CharactersService, CharactersRepository,
    ProductsService, ProductsRepository,
    SkusService, SkusRepository,
  ],
})
export class CatalogModule {}
