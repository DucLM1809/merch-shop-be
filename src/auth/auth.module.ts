import { Global, Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ClerkGuard } from './clerk.guard';
import { AdminGuard } from './admin.guard';

@Global()
@Module({
  imports: [AccountModule],
  providers: [ClerkGuard, AdminGuard],
  exports: [ClerkGuard, AdminGuard],
})
export class AuthModule {}
