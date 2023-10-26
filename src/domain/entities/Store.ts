import {injectable} from 'tsyringe';

type OrderType = 'OPEN_POSITION';

@injectable()
export class Store {
  readonly category = 'linear';
  readonly orderBook: Record<string, OrderType> = {};
  constructor(private readonly _symbol: string) {}
  get symbol() {
    return this._symbol;
  }
  addOrder(orderId: string, type: OrderType) {
    this.orderBook[orderId] = type;
  }
  removeOrder(orderId: string) {
    delete this.orderBook[orderId];
  }
}
