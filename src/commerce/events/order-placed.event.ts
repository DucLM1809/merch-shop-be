export class OrderPlacedEvent {
  static readonly NAME = 'order.placed';
  constructor(
    readonly orderId: string,
    readonly accountId: string,
  ) {}
}
