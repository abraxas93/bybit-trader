import {Redis} from 'ioredis';
import {EventEmitter} from 'events';
// import BigJs from 'big.js';
import {inject, injectable} from 'tsyringe';
import {RKEYS} from '../../constants';
import {OrderClass} from '../../types';
import {Options} from './Options';
import {initLogger} from '../../utils/logger';
import {ENV, USER} from '../../config';
// import {normalizeFloat} from '../../utils';

const errLogger = initLogger('OrderBook', 'errors.log');

@injectable()
export class OrderBook {
  private _orderBook: Record<string, OrderClass> = {};
  private _isAvgOrderExists = false;
  private _avgOrderCount = 0;
  private _profitTakesCount = 0;
  private symbol = '';
  public profitOrderId = '';
  public avgOrderId = '';

  constructor(
    @inject('Redis')
    private readonly redis: Redis,
    @inject('Options')
    public readonly options: Options,
    @inject('EventEmitter')
    private readonly _emitter: EventEmitter
  ) {
    this.loadVars().catch(err => {
      // Handle errors appropriately, e.g., logging
      // TODO: add error logging
      console.error('Error in OrderBook:', err);
    });
  }

  async loadVars() {
    const symbol = (await this.redis.get(`${USER}:${ENV}:SYMBOL`)) || '';
    this.symbol = symbol;
    const avgOrderCount = await this.redis.get(
      `${USER}:${ENV}:${this.symbol}:${RKEYS.AVG_ORDER_COUNT}`
    );
    this._avgOrderCount = avgOrderCount ? parseInt(avgOrderCount) : 0;

    const avgOrderExists = await this.redis.get(
      `${USER}:${ENV}:${this.symbol}:${RKEYS.AVG_ORDER_EXISTS}`
    );
    this._isAvgOrderExists = avgOrderExists === 'true';

    const cyclesCount = await this.redis.get(
      `${USER}:${ENV}:${this.symbol}:${RKEYS.PROFIT_TAKES_COUNT}`
    );
    this._profitTakesCount = cyclesCount ? parseInt(cyclesCount) : 0;
    const orders = await this.redis.hgetall(
      `${USER}:${ENV}:${this.symbol}:${RKEYS.ORDERBOOK}`
    );
    this._orderBook = orders as Record<string, OrderClass>;
  }

  get profitTakesCount() {
    return this._profitTakesCount;
  }

  set profitTakesCount(val: number) {
    this._profitTakesCount = val;
    this.redis
      .set(`${USER}:${ENV}:${this.symbol}:${RKEYS.PROFIT_TAKES_COUNT}`, '0')
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  get orderBook(): Record<string, OrderClass> {
    return this._orderBook;
  }

  get isAvgOrderExists(): boolean {
    return this._isAvgOrderExists;
  }

  set isAvgOrderExists(val: boolean) {
    this._isAvgOrderExists = val;
    this.redis
      .set(
        `${USER}:${ENV}:${this.symbol}:${RKEYS.AVG_ORDER_EXISTS}`,
        String(val)
      )
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  get avgOrderCount(): number {
    return this._avgOrderCount;
  }

  set avgOrderCount(val: number) {
    this._avgOrderCount = val;
    this.redis
      .set(
        `${USER}:${ENV}:${this.symbol}:${RKEYS.AVG_ORDER_COUNT}`,
        String(val)
      )
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  // get orderIds() {
  //   return Object.keys(this._orderBook);
  // }

  getAvgOrderIndex = () => {
    return this.avgOrderCount + 1;
  };

  incAvgOrderCount() {
    this._avgOrderCount += 1;
    this.redis
      .set(
        `${USER}:${ENV}:${this.symbol}:${RKEYS.AVG_ORDER_COUNT}`,
        this._avgOrderCount
      )
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  // getOrderIdBy = (type: OrderClass) => {
  //   for (const [key, value] of Object.entries(this._orderBook)) {
  //     if (value === type) return key;
  //   }
  //   return null;
  // };

  // clearOrderBook = () => {
  //   this._orderBook = {};
  //   this.redis
  //     .del(`${USER}:${ENV}:${this.symbol}:${RKEYS.ORDERBOOK}`)
  //     .catch(err => errLogger.error(JSON.stringify(err)));
  // };

  incProfitTakeCount() {
    this._profitTakesCount += 1;
    this.redis
      .set(
        `${USER}:${ENV}:${this.symbol}:${RKEYS.PROFIT_TAKES_COUNT}`,
        this._profitTakesCount
      )
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  // addToOrdBook = (orderId: string, type: OrderClass, logged = true) => {
  //   this.orderBook[orderId] = type;
  //   this.redis
  //     .hset(`${USER}:${ENV}:${this.symbol}:${RKEYS.ORDERBOOK}`, orderId, type)
  //     .catch(err => errLogger.error(JSON.stringify(err)));
  //   logged && this._emitter.emit(LOG_EVENT, 'addToOrdBook');
  // };

  // removeFromOrdBook = (orderId: string, logged = true) => {
  //   delete this.orderBook[orderId];
  //   this.redis
  //     .hdel(`${USER}:${ENV}:${this.symbol}:${RKEYS.ORDERBOOK}`, orderId)
  //     .catch(err => errLogger.error(JSON.stringify(err)));
  //   logged && this._emitter.emit(LOG_EVENT, 'removeFromOrdBook');
  // };

  handleFilledProfitOrder = () => {
    this.isAvgOrderExists = false;
    this.incProfitTakeCount();
    this.avgOrderCount = 0;

    this.profitOrderId = '';
    this.avgOrderId = '';
  };

  reset = () => {
    // this.clearOrderBook();
    this.isAvgOrderExists = false;
    this.avgOrderCount = 0;
    this.profitTakesCount = 0;

    this.profitOrderId = '';
    this.avgOrderId = '';
  };
}
