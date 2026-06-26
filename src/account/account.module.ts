import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AccountService],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
