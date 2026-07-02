export interface ConfirmedPaymentIntent {
  stripePaymentIntentId: string;
  cartId: string;
  buyerEmail: string;
  shippingAddress: Record<string, unknown>;
}
