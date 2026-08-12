import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { NotificationPort } from './notification.port';

@Injectable()
export class ResendAdapter implements NotificationPort {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(ResendAdapter.name);

  constructor(config: ConfigService) {
    this.resend = new Resend(config.getOrThrow('RESEND_API_KEY'));
    this.from = config.getOrThrow('RESEND_FROM_EMAIL');
  }

  async sendOrderConfirmation(params: {
    to: string;
    orderId: string;
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
  }): Promise<void> {
    const { to, orderId, items } = params;
    const itemLines = items
      .map((i) => `${i.quantity}x ${i.name} — $${i.unitPrice.toFixed(2)}`)
      .join('\n');

    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Order confirmed — #${orderId}`,
      text: `Your order has been confirmed.\n\n${itemLines}\n\nThank you for your purchase!`,
    });

    this.logger.log(`Order confirmation sent to ${to} for order ${orderId}`);
  }

  async sendPasswordReset(params: { to: string; resetUrl: string }): Promise<void> {
    const { to, resetUrl } = params;

    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Reset your password',
      text: `Click the link below to reset your password. This link expires soon and can only be used once.\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }

  async sendEmailVerification(params: { to: string; verifyUrl: string }): Promise<void> {
    const { to, verifyUrl } = params;

    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Verify your email',
      text: `Click the link below to verify your email address.\n\n${verifyUrl}`,
    });

    this.logger.log(`Email verification sent to ${to}`);
  }
}
