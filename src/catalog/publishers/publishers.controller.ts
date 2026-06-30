import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PublishersService } from './publishers.service';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { AdminGuard } from '../../auth';

@ApiTags('publishers')
@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishers: PublishersService) {}

  @Get()
  findAll() {
    return this.publishers.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.publishers.findOne(slug);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreatePublisherDto) {
    return this.publishers.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreatePublisherDto>) {
    return this.publishers.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.publishers.remove(id);
  }
}
