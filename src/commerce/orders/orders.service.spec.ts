import { Test } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { CartService } from '../cart/cart.service';
import { AccountService } from '../../account';
import { SUPPLIER_PORT } from '../../fulfillment';
import { NOTIFICATION_PORT } from '../../notifications';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception';

const mockRepo = { findByPaymentIntentIdWithItems: jest.fn() };
const mockCartService = {};
const mockAccountService = { findByClerkId: jest.fn() };
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
        { provide: AccountService, useValue: mockAccountService },
        { provide: SUPPLIER_PORT, useValue: mockSupplier },
        { provide: NOTIFICATION_PORT, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('findByPaymentIntent', () => {
    it('returns order when found and owned by caller', async () => {
      mockRepo.findByPaymentIntentIdWithItems.mockResolvedValue({ id: 'order-1', accountId: 'account-1' });
      mockAccountService.findByClerkId.mockResolvedValue({ id: 'account-1' });

      const result = await service.findByPaymentIntent('pi_123', 'clerk-1');

      expect(result).toEqual({ id: 'order-1', accountId: 'account-1' });
    });

    it('throws OrderNotFoundException when no order matches intent', async () => {
      mockRepo.findByPaymentIntentIdWithItems.mockResolvedValue(null);
      mockAccountService.findByClerkId.mockResolvedValue({ id: 'account-1' });

      await expect(service.findByPaymentIntent('pi_missing', 'clerk-1')).rejects.toThrow(OrderNotFoundException);
    });

    it('throws OrderNotFoundException when order is owned by a different account', async () => {
      mockRepo.findByPaymentIntentIdWithItems.mockResolvedValue({ id: 'order-1', accountId: 'account-other' });
      mockAccountService.findByClerkId.mockResolvedValue({ id: 'account-1' });

      await expect(service.findByPaymentIntent('pi_123', 'clerk-1')).rejects.toThrow(OrderNotFoundException);
    });
  });
});
