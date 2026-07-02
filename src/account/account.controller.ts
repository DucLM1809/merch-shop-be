import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { ClerkGuard } from '../auth';
import { AdminGuard } from '../auth';
import { CurrentUser } from '../auth';
import { AccountService } from './account.service';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @UseGuards(ClerkGuard)
  @Get('me')
  me(@CurrentUser() user: { userId: string; email: string }) {
    return this.accountService.upsertFromClerk(user);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountService.remove(id);
  }
}
