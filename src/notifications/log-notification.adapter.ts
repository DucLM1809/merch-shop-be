import { Injectable, Logger } from '@nestjs/common';
import { NotificationPort } from './notification.port';

@Injectable()
export class LogNotificationAdapter implements NotificationPort {
  private readonly logger = new Logger(LogNotificationAdapter.name);

  async sendOrderConfirmation(params: {
    to: string;
    orderId: string;
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
  }): Promise<void> {
    this.logger.log(`[TEST] sendOrderConfirmation to=${params.to} orderId=${params.orderId}`);
  }
}
