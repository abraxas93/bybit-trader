import {OrderClass} from '../../types';
import {Redis} from 'ioredis';
import {inject} from 'tsyringe';
import {RKEYS} from '../../constants';

export class OrderState {
  private _orderBook: Record<string, OrderClass> = {};
  private _isAvgOrderExists = false;
  private _isPositionExists = false;

  constructor(
    @inject('Redis')
    private readonly redis: Redis
  ) {
    this.loadVars().catch(err => {
      // Handle errors appropriately, e.g., logging
      console.error('Error in OrderState:', err);
    });
  }

  // Getters for private variables
  get orderBook(): Record<string, OrderClass> {
    return this._orderBook;
  }

  get isAvgOrderExists(): boolean {
    return this._isAvgOrderExists;
  }

  get isPositionExists(): boolean {
    return this._isPositionExists;
  }

  private async loadVars() {
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

    // Handle any other necessary variable assignments from Redis
    // ...
  }
}
