import { Controller, Post, Body, Headers, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { ClerkGuard } from '../auth/clerk.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payment-intent')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth()
  createPaymentIntent(@Body('cartId') cartId: string) {
    return this.payments.createPaymentIntent(cartId);
  }

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    await this.payments.handleWebhook(req.body as Buffer, sig);
    return { received: true };
  }
}
