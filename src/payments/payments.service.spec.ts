import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { SUPPLIER_PORT } from '../fulfillment/supplier.port';
import { NOTIFICATION_PORT } from '../notifications/notification.port';
import { CatalogReadService } from '../catalog/catalog-read.service';

const mockPrisma = { cart: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn() }, order: { findUnique: jest.fn() } };
const mockSupplier = { submitOrder: jest.fn() };
const mockNotifications = { sendOrderConfirmation: jest.fn() };
const mockCatalogRead = { getSkuPrice: jest.fn() };

jest.mock('stripe');

describe('PaymentsService', () => {
  let service: PaymentsService;
  let constructEvent: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    constructEvent = jest.fn();
    (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => ({
      paymentIntents: { create: jest.fn() },
      webhooks: { constructEvent },
    }) as any);

    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SUPPLIER_PORT, useValue: mockSupplier },
        { provide: NOTIFICATION_PORT, useValue: mockNotifications },
        { provide: CatalogReadService, useValue: mockCatalogRead },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => (key === 'STRIPE_SECRET_KEY' ? 'sk_test_fake' : 'whsec_fake') },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('handleWebhook — invalid signature', () => {
    it('throws BadRequestException before any DB write', async () => {
      constructEvent.mockImplementation(() => { throw new Error('signature mismatch'); });

      await expect(service.handleWebhook(Buffer.from('body'), 'bad-sig')).rejects.toThrow(BadRequestException);

      expect(mockPrisma.cart.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
    });
  });
});
