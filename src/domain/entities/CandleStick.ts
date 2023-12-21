import {Redis} from 'ioredis';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {CANDLE_CLOSED, LOG_EVENT, RKEYS} from '../../constants';
import {Options} from './Options';
// import {initLogger} from '../../utils/logger';
import moment from 'moment';
import {roundToNearestTen} from '../../utils';

// const logger = initLogger('CandleStick', 'logs.log');

@injectable()
export class CandleStick {
  private _klineStarted = false;
  private _isNewCandle = false;
  private _currentLowPrice = '0';
  private _lastCandleLowPrice = '0';
  private _nextCandleIn = 0;
  private _count = 0;

  private _candles: Record<number, boolean> = {};

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
      console.error('Error in CandleState:', err);
    });
  }

  get candles() {
    return this._candles;
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

  set lastCandleLowPrice(val: string) {
    this._lastCandleLowPrice = val;
  }

  get nextCandleIn(): number {
    return this._nextCandleIn;
  }

  get count(): number {
    return this._count;
  }

  public clear = () => {
    this._klineStarted = false;
    this._isNewCandle = false;
    this._currentLowPrice = '0';
    this._lastCandleLowPrice = '0';
    this._nextCandleIn = 0;
    this._count = 0;
    this._candles = {};
  };

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
  }

  resetCandlesCount = () => {
    this._count = 0;
  };

  // setLastLowCandlePrice = (price: string) => {
  //   this._lastCandleLowPrice = price;
  //   this._emitter.emit(LOG_EVENT, 'setLastLowCandlePrice');
  // };

  updateLowPrice = (lastPrice: string | undefined): boolean => {
    if (!this._klineStarted) return false;
    if (this._isNewCandle && lastPrice) {
      this._currentLowPrice = lastPrice;
      this._isNewCandle = false;
      return true;
    } else if (lastPrice && Number(lastPrice) < Number(this._currentLowPrice)) {
      this._currentLowPrice = lastPrice;
      return true;
    }
    this._emitter.emit(LOG_EVENT, 'updateLowPrice');
    return false;
  };

  private closeCandleStick = () => {
    this._lastCandleLowPrice = this._currentLowPrice;
    this._nextCandleIn += this.options.period;
    this._isNewCandle = true;
    this._count += 1;
    // logger.info(
    //   `Candle closed: ${this.lastCandleLowPrice}, next candle: ${this._nextCandleIn}, count: ${this._count}`
    // );
    const current =
      this._nextCandleIn > 0 ? this._nextCandleIn - this.options.period : 50;

    if (this._candles[current]) return;
    this._emitter.emit(CANDLE_CLOSED);
    this._emitter.emit(LOG_EVENT, 'updateLastCandleData');
    this._candles[current] = true;
    const previous = current > 0 ? current - this.options.period : 50;
    delete this._candles[previous];
  };

  countTick = (ts: number) => {
    const seconds = moment(ts).seconds();
    let nearest;
    if (!this._klineStarted && seconds % this.options.period === 0) {
      this._klineStarted = true;
      this._isNewCandle = true;
      nearest = roundToNearestTen(seconds);
      this._nextCandleIn = (nearest as number) + this.options.period;
      // logger.info(
      //   `Candle klineStarted: ${this._currentLowPrice}, next candle in: ${this._nextCandleIn} and seconds: ${seconds}, ts: ${ts}`
      // );
      this._emitter.emit(LOG_EVENT, 'updateLastCandleLowPrice');
    }

    if (this.klineStarted) {
      if (
        seconds >= 10 &&
        seconds >= this._nextCandleIn &&
        this._nextCandleIn !== 0
      ) {
        this.closeCandleStick();
      }

      if (this._nextCandleIn === 60) {
        this._nextCandleIn = 0;
      }

      if (
        seconds < 10 &&
        this._nextCandleIn === 0 &&
        seconds >= this._nextCandleIn
      ) {
        this.closeCandleStick();
      }
    }
  };
}
