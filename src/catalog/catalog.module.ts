import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublishersController } from './publishers/publishers.controller';
import { PublishersService } from './publishers/publishers.service';
import { GamesController } from './games/games.controller';
import { GamesService } from './games/games.service';
import { TeamsController } from './teams/teams.controller';
import { TeamsService } from './teams/teams.service';
import { CharactersController } from './characters/characters.controller';
import { CharactersService } from './characters/characters.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { SkusController } from './skus/skus.controller';
import { SkusService } from './skus/skus.service';

@Module({
  imports: [AuthModule],
  controllers: [
    PublishersController,
    GamesController,
    TeamsController,
    CharactersController,
    ProductsController,
    SkusController,
  ],
  providers: [
    PublishersService,
    GamesService,
    TeamsService,
    CharactersService,
    ProductsService,
    SkusService,
  ],
})
export class CatalogModule {}
