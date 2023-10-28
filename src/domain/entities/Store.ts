import {OrderClass} from '../../types';
import {injectable} from 'tsyringe';

@injectable()
export class Store {
  id = Date.now();
  public quantity = '0.05';
  readonly category = 'linear';
  readonly orderBook: Record<string, OrderClass> = {};
  constructor(private readonly _symbol: string) {}
  get symbol() {
    return this._symbol;
  }
  addOrder = (orderId: string, type: OrderClass) => {
    this.orderBook[orderId] = type;
  };
  removeOrder = (orderId: string) => {
    delete this.orderBook[orderId];
  };
  getOrderClass = (orderId: string) => {
    console.log({orderId});
    console.log(this.orderBook[orderId]);
    console.log(this.orderBook);
    return this.orderBook[orderId];
  };
}
