import { Global, Module } from '@nestjs/common';
import { ClerkGuard } from './clerk.guard';
import { AdminGuard } from './admin.guard';

@Global()
@Module({
  providers: [ClerkGuard, AdminGuard],
  exports: [ClerkGuard, AdminGuard],
})
export class AuthModule {}
