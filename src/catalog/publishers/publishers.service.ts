import { Injectable } from '@nestjs/common';
import { PublishersRepository } from './publishers.repository';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { PublisherNotFoundException } from '../exceptions/publisher-not-found.exception';

@Injectable()
export class PublishersService {
  constructor(private readonly repo: PublishersRepository) {}

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

  remove(id: string) {
    return this.repo.remove(id);
  }
}
