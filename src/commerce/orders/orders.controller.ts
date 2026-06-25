import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ClerkGuard } from '../../auth/clerk.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { CurrentUser, AuthUser } from '../../auth/current-user.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('mine')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth()
  findMine(@CurrentUser() user: AuthUser) {
    return this.orders.findByAccount(user.userId);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  findAll() {
    return this.orders.findAll();
  }

  @Get(':id')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }
}
