import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClerkGuard } from './clerk.guard';
import { AdminGuard } from './admin.guard';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ClerkGuard, AdminGuard],
  exports: [ClerkGuard, AdminGuard],
})
export class AuthModule {}
