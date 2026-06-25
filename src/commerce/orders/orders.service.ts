import { Injectable } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception';

@Injectable()
export class OrdersService {
  constructor(private readonly repo: OrdersRepository) {}

  findByAccount(accountId: string) {
    return this.repo.findByAccount(accountId);
  }

  async findOne(id: string) {
    const order = await this.repo.findOneWithItems(id);
    if (!order) throw new OrderNotFoundException(id);
    return order;
  }

  findAll() {
    return this.repo.findAll();
  }
}
