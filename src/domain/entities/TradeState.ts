import {Redis} from 'ioredis';
import BigJs from 'big.js';
import {inject} from 'tsyringe';
import {RKEYS} from '../../constants';
import {OrderClass} from '../../types';
import {Options} from './Options';

export class TradeState {
  private _orderBook: Record<string, OrderClass> = {};
  private _isAvgOrderExists = false;
  private _isPositionExists = false;
  private _avgPosPrice = '0';
  private _lastAvgOrderPrice = '0';
  private _avgOrderCount = 0;

  public quantity: string[] = [];

  constructor(
    @inject('Redis')
    private readonly redis: Redis,
    @inject('Options')
    public readonly options: Options
  ) {
    this.loadVars().catch(err => {
      // Handle errors appropriately, e.g., logging
      console.error('Error in TradeState:', err);
    });
  }

  get orderBook(): Record<string, OrderClass> {
    return this._orderBook;
  }

  get isAvgOrderExists(): boolean {
    return this._isAvgOrderExists;
  }

  get isPositionExists(): boolean {
    return this._isPositionExists;
  }

  get avgPosPrice(): string {
    return this._avgPosPrice;
  }

  get lastAvgOrderPrice(): string {
    return this._lastAvgOrderPrice;
  }

  get avgOrderCount(): number {
    return this._avgOrderCount;
  }

  private async loadVars() {
    // Load data from Redis
    this._avgPosPrice = (await this.redis.get(RKEYS.AVG_POS_PRICE)) || '0';
    this._lastAvgOrderPrice =
      (await this.redis.get(RKEYS.AVG_ORDER_PRICE)) || '0';

    const avgOrderCount = await this.redis.get(RKEYS.AVG_ORDER_COUNT);
    this._avgOrderCount = avgOrderCount ? parseInt(avgOrderCount) : 0;

    // Load data from Redis
    const orderBookKeys = await this.redis.keys(`${RKEYS.ORDERBOOK}:*`);
    if (orderBookKeys.length > 0) {
      for (const key of orderBookKeys) {
        const orderData = await this.redis.get(key);
        if (orderData) {
          const orderId = key.split(':').pop() || '';
          this._orderBook[orderId] = JSON.parse(orderData) as OrderClass;
        }
      }
    }

    const avgOrderExists = await this.redis.get(RKEYS.AVG_ORDER_EXISTS);
    this._isAvgOrderExists = avgOrderExists === 'true';

    const positionExists = await this.redis.get(RKEYS.POSITION_OPENED);
    this._isPositionExists = positionExists === 'true';
  }

  get avgOrderPrice() {
    return new BigJs(this._lastAvgOrderPrice)
      .mul(this.options.avgRate)
      .toFixed(this.options.digits);
  }

  get profitOrderPrice() {
    return new BigJs(this._avgPosPrice)
      .mul(this.options.profitRate)
      .toFixed(this.options.digits);
  }

  get posQty() {
    if (!this.quantity.length) return '0';
    const result = this.quantity.reduce((prev, cur) =>
      new BigJs(prev).add(cur).toFixed(this.options.digits)
    );

    return result;
  }

  get avgQty() {
    return new BigJs(this.posQty)
      .mul(this.options.martinGale)
      .toFixed(this.options.digits);
  }

  openPosOrder(avgPrice: string, qty: string) {
    this._isPositionExists = true;
    this._avgPosPrice = avgPrice;
    this.quantity = [qty];
    this._lastAvgOrderPrice = avgPrice;
  }

  closePosOrder() {
    this._isPositionExists = false;
    this._avgPosPrice = '0';
    this.quantity = [];
    this._avgOrderCount = 0;
  }

  addToOrdBook(orderId: string, type: OrderClass) {
    this.orderBook[orderId] = type;
  }

  removeFromOrdBook = (orderId: string) => {
    delete this.orderBook[orderId];
  };

  getOrderClass = (orderId: string) => {
    return this.orderBook[orderId];
  };

  getOrderIdbyClass = (ordClass: OrderClass) => {
    for (const orderId in this.orderBook) {
      if (this.orderBook[orderId] === ordClass) return orderId;
    }
    return null;
  };

  closeAvgOrder(price: string, qty: string, value: string) {
    this._isAvgOrderExists = false;

    const totalQty = this.quantity.reduce((prev: string, cur: string) =>
      new BigJs(prev).add(cur).toString()
    );
    const numerator = new BigJs(totalQty).mul(this._avgPosPrice).plus(value);
    const denominator = new BigJs(totalQty).add(qty);
    this.quantity.push(qty);
    this._avgPosPrice = new BigJs(numerator).div(denominator).toString();
    this._lastAvgOrderPrice = price;
    this._avgOrderCount += 1;
  }

  openAvgOrder(orderId: string) {
    this.addToOrdBook(orderId, 'AVERAGE_ORDER');
    this._isAvgOrderExists = true;
  }
}
