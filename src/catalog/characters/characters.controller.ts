import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { AdminGuard } from '../../auth';

@ApiTags('characters')
@Controller('characters')
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  @Get()
  findAll(@Query('gameId') gameId?: string) {
    return this.characters.findAll(gameId);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.characters.findOne(slug);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateCharacterDto) {
    return this.characters.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateCharacterDto>) {
    return this.characters.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.characters.remove(id);
  }
}
