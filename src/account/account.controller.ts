import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { ClerkGuard } from '../auth/clerk.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
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
