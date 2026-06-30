import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkusService } from './skus.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { BulkAvailabilityDto } from './dto/bulk-availability.dto';
import { AdminGuard } from '../../auth';

@ApiTags('skus')
@Controller('skus')
export class SkusController {
  constructor(private readonly skus: SkusService) {}

  @Get()
  findByProduct(@Query('productId') productId: string) {
    return this.skus.findByProduct(productId);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateSkuDto) {
    return this.skus.create(dto);
  }

  // ponytail: must be declared before :id/availability to avoid route shadowing
  @Patch('availability/bulk')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  bulkSetAvailability(@Body() dto: BulkAvailabilityDto) {
    return this.skus.bulkSetAvailability(dto);
  }

  @Patch(':id/availability')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  setAvailability(@Param('id') id: string, @Body('available') available: boolean) {
    return this.skus.setAvailability(id, available);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.skus.remove(id);
  }
}
