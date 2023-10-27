import {injectable} from 'tsyringe';

export type OrderClass = 'OPEN_ORDER' | 'TAKE_PROFIT_ORDER';

@injectable()
export class Store {
  public quantity = '0.05';
  readonly category = 'linear';
  readonly orderBook: Record<string, OrderClass> = {};
  constructor(private readonly _symbol: string) {}
  get symbol() {
    return this._symbol;
  }
  addOrder(orderId: string, type: OrderClass) {
    this.orderBook[orderId] = type;
  }
  removeOrder(orderId: string) {
    delete this.orderBook[orderId];
  }
}
