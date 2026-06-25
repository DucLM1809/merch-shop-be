import { Injectable } from '@nestjs/common';
import { TeamsRepository } from './teams.repository';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamNotFoundException } from '../exceptions/team-not-found.exception';

@Injectable()
export class TeamsService {
  constructor(private readonly repo: TeamsRepository) {}

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

  remove(id: string) {
    return this.repo.remove(id);
  }
}
