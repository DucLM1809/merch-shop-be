import { Module } from '@nestjs/common';
import { ClerkGuard } from './clerk.guard';
import { AdminGuard } from './admin.guard';

@Module({
  providers: [ClerkGuard, AdminGuard],
  exports: [ClerkGuard, AdminGuard],
})
export class AuthModule {}
