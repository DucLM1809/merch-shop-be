import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { CatalogModule } from './catalog/catalog.module';
import { CommerceModule } from './commerce/commerce.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Single named throttler: every route gets the generous default limit
    // unless overridden per-route with @Throttle({ default: { ... } }).
    // A second globally-registered throttler would apply to every route at
    // once (not just where it's referenced), silently rate-limiting the
    // whole API to its tightest limit — see merch-shop-BE-zdy.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    CacheModule.register({ isGlobal: true, ttl: 300 }),
    PrismaModule,
    CommonModule,
    AuthModule,
    AccountModule,
    CatalogModule,
    CommerceModule,
    FulfillmentModule,
    PaymentsModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
