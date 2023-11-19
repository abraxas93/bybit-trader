import {Redis} from 'ioredis';
import {inject} from 'tsyringe';
import {RKEYS} from '../../constants';

export class CandleState {
  private _klineStarted = false;
  private _isNewCandle = false;
  private _currentLowPrice = '0';
  public _lastCandleLowPrice = '0';
  private _nextCandleIn = 0;
  private _count = 0;

  constructor(
    @inject('Redis')
    private readonly redis: Redis
  ) {
    this.loadVars().catch(err => {
      // Handle errors appropriately, e.g., logging
      console.error('Error in CandleState:', err);
    });
  }

  // Getters for private variables
  get klineStarted(): boolean {
    return this._klineStarted;
  }

  get isNewCandle(): boolean {
    return this._isNewCandle;
  }

  get currentLowPrice(): string {
    return this._currentLowPrice;
  }

  get lastCandleLowPrice(): string {
    return this._lastCandleLowPrice;
  }

  get nextCandleIn(): number {
    return this._nextCandleIn;
  }

  get count(): number {
    return this._count;
  }

  private async loadVars() {
    // Load data from Redis
    const klineStarted = await this.redis.get(RKEYS.KLINE_STARTED);
    this._klineStarted = klineStarted === 'true';

    const isNewCandle = await this.redis.get(RKEYS.IS_NEW_CANDLE);
    this._isNewCandle = isNewCandle === 'true';

    this._currentLowPrice =
      (await this.redis.get(RKEYS.CANDLE_LOW_PRICE)) || '0';
    this._lastCandleLowPrice =
      (await this.redis.get(RKEYS.LAST_CANDLE_LOW_PRICE)) || '0';

    const nextCandleIn = await this.redis.get(RKEYS.TIMEFRAME);
    this._nextCandleIn = nextCandleIn ? parseInt(nextCandleIn) : 0;

    const count = await this.redis.get(RKEYS.AVG_ORDER_COUNT);
    this._count = count ? parseInt(count) : 0;
  }
}
