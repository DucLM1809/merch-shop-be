import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkGuard } from '../auth/clerk.guard';
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
}
