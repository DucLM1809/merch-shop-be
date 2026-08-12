export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');

export interface NotificationPort {
  sendOrderConfirmation(params: {
    to: string;
    orderId: string;
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
  }): Promise<void>;

  sendPasswordReset(params: { to: string; resetUrl: string }): Promise<void>;

  sendEmailVerification(params: { to: string; verifyUrl: string }): Promise<void>;
}
