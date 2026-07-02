import { Injectable } from '@nestjs/common';
import { PublishersRepository } from './publishers.repository';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { PublisherNotFoundException } from '../exceptions/publisher-not-found.exception';
import { GamesRepository } from '../games/games.repository';
import { GamesService } from '../games/games.service';

@Injectable()
export class PublishersService {
  constructor(
    private readonly repo: PublishersRepository,
    private readonly gamesRepo: GamesRepository,
    private readonly gamesService: GamesService,
  ) {}

  findAll() {
    return this.repo.findAll();
  }

  async findOne(slug: string) {
    const publisher = await this.repo.findBySlug(slug);
    if (!publisher) throw new PublisherNotFoundException(slug);
    return publisher;
  }

  create(dto: CreatePublisherDto) {
    return this.repo.create(dto);
  }

  update(id: string, dto: Partial<CreatePublisherDto>) {
    return this.repo.update(id, dto);
  }

  async remove(id: string) {
    const games = await this.gamesRepo.findAll(id);
    await Promise.all(games.map(g => this.gamesService.remove(g.id)));
    return this.repo.softRemove(id);
  }
}
