import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
import { PrismaModule } from '../prisma';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AccountService,
    {
      provide: 'CLERK_CLIENT',
      useFactory: (config: ConfigService) =>
        createClerkClient({ secretKey: config.getOrThrow('CLERK_SECRET_KEY') }),
      inject: [ConfigService],
    },
  ],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
