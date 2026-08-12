import { Test } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { CartService } from '../cart/cart.service';
import { SUPPLIER_PORT } from '../../fulfillment';
import { NOTIFICATION_PORT } from '../../notifications';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception';

const mockRepo = { findByPaymentIntentIdWithItems: jest.fn() };
const mockCartService = {};
const mockSupplier = {};
const mockNotifications = {};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: mockRepo },
        { provide: CartService, useValue: mockCartService },
        { provide: SUPPLIER_PORT, useValue: mockSupplier },
        { provide: NOTIFICATION_PORT, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('findByPaymentIntent', () => {
    it('returns order when found and owned by caller', async () => {
      mockRepo.findByPaymentIntentIdWithItems.mockResolvedValue({ id: 'order-1', accountId: 'account-1' });

      const result = await service.findByPaymentIntent('pi_123', 'account-1');

      expect(result).toEqual({ id: 'order-1', accountId: 'account-1' });
    });

    it('throws OrderNotFoundException when no order matches intent', async () => {
      mockRepo.findByPaymentIntentIdWithItems.mockResolvedValue(null);

      await expect(service.findByPaymentIntent('pi_missing', 'account-1')).rejects.toThrow(
        OrderNotFoundException,
      );
    });

    it('throws OrderNotFoundException when order is owned by a different account', async () => {
      mockRepo.findByPaymentIntentIdWithItems.mockResolvedValue({ id: 'order-1', accountId: 'account-other' });

      await expect(service.findByPaymentIntent('pi_123', 'account-1')).rejects.toThrow(OrderNotFoundException);
    });
  });
});
