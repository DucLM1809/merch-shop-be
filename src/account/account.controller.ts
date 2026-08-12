import { Controller, Get, Delete, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard, AdminGuard, CurrentUser, AuthUser } from '../auth';
import { AccountService } from './account.service';
import { AccountResponseDto } from './dto/account-response.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const account = await this.accountService.findById(user.userId);
    if (!account) throw new NotFoundException();
    return new AccountResponseDto(account);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountService.remove(id);
  }
}
