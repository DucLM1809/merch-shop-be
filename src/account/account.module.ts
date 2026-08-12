import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { AccountRepository } from './account.repository';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AccountRepository, AccountService],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
