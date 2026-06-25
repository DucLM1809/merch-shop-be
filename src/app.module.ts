import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CommerceModule } from './commerce/commerce.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
      { name: 'auth', ttl: 60_000, limit: 10 },
      { name: 'checkout', ttl: 60_000, limit: 5 },
    ]),
    EventEmitterModule.forRoot(),
    CacheModule.register({ isGlobal: true, ttl: 300 }),
    PrismaModule,
    CommonModule,
    AuthModule,
    CatalogModule,
    CommerceModule,
    FulfillmentModule,
    PaymentsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
