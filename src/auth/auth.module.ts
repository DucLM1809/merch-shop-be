import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications';
import { AuthGuard } from './auth-guard';
import { AdminGuard } from './admin.guard';
import { OptionalAuthGuard } from './optional-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { AccountTokenRepository } from './account-token.repository';

@Global()
@Module({
  imports: [PrismaModule, NotificationsModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthGuard,
    AdminGuard,
    OptionalAuthGuard,
    AuthService,
    RefreshTokenRepository,
    AccountTokenRepository,
  ],
  exports: [AuthGuard, AdminGuard, OptionalAuthGuard, JwtModule],
})
export class AuthModule {}
