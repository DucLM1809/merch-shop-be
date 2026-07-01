import { Injectable } from '@nestjs/common';
import { TeamsRepository } from './teams.repository';
import { ProductsService } from '../products/products.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamNotFoundException } from '../exceptions/team-not-found.exception';

@Injectable()
export class TeamsService {
  constructor(
    private readonly repo: TeamsRepository,
    private readonly productsService: ProductsService,
  ) {}

  findAll(gameId?: string) {
    return this.repo.findAll(gameId);
  }

  async findOne(slug: string) {
    const team = await this.repo.findBySlug(slug);
    if (!team) throw new TeamNotFoundException(slug);
    return team;
  }

  create(dto: CreateTeamDto) {
    return this.repo.create(dto);
  }

  update(id: string, dto: Partial<CreateTeamDto>) {
    return this.repo.update(id, dto);
  }

  async remove(id: string) {
    const products = await this.productsService.findAll({ teamId: id });
    await Promise.all(products.map(p => this.productsService.remove(p.id)));
    return this.repo.softRemove(id);
  }
}
