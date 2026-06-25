# Stripe as payment gateway with webhook-driven order confirmation

Payments are processed via Stripe. The order confirmation flow is webhook-driven: the FE creates a Stripe `PaymentIntent`, the Buyer completes payment on the FE, and Stripe fires a `payment_intent.succeeded` webhook to the BE. The BE confirms the Order and forwards it to the Supplier only after receiving this webhook — never before.

This was chosen over PayPal (worse DX) and local payment methods (VNPay, MoMo) because the shop targets international buyers. Stripe's webhook model ensures the BE never fulfills an unpaid order even if the FE crashes mid-checkout.

## Consequences

Order fulfillment is asynchronous from the Buyer's perspective. The BE must validate Stripe webhook signatures to prevent spoofed confirmations.
