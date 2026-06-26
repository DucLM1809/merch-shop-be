import { Module } from '@nestjs/common';
import { NOTIFICATION_PORT } from './notification.port';
import { ResendAdapter } from './resend.adapter';

@Module({
  providers: [{ provide: NOTIFICATION_PORT, useClass: ResendAdapter }],
  exports: [NOTIFICATION_PORT],
})
export class NotificationsModule {}
