import moment from 'moment';
import {EventEmitter} from 'events';
import {CandleEvent, OrderClass} from '../../types';
import {inject, injectable} from 'tsyringe';
import {CANDLE_CLOSED} from '../../constants';

@injectable()
export class Store {
  id = Date.now();
  private started = false;
  private isNewCandle = false;

  private isAverageOrderOpened = false;

  private _candleLowPrice = 0;
  private _lastCandleLowPrice = 0;
  private readonly _timeFrame = 10;
  private _nextCandleTimeFrame = 0;

  private candlesCount = 0;
  private candlesToWait = 10;

  public quantity = '0.05';
  readonly category = 'linear';
  readonly orderBook: Record<string, OrderClass> = {};
  constructor(
    private readonly _symbol: string,
    @inject('EventEmitter')
    private readonly _emitter: EventEmitter
  ) {}

  get symbol() {
    return this._symbol;
  }

  get lastCandleLowPrice() {
    return this._lastCandleLowPrice;
  }

  resetCandlesCount() {
    this.candlesCount = 0;
  }

  private roundToNearestTen(number: number) {
    if (number < 10) {
      return 0;
    } else {
      return Math.floor(number / 10) * 10;
    }
  }

  addOrder = (orderId: string, type: OrderClass) => {
    this.orderBook[orderId] = type;
  };

  removeOrder = (orderId: string) => {
    delete this.orderBook[orderId];
  };

  getOrderClass = (orderId: string) => {
    return this.orderBook[orderId];
  };

  setLowPrice(lastPrice: string | undefined) {
    if (!this.started) return;
    if (this.isNewCandle && lastPrice) {
      this._candleLowPrice = Number(lastPrice);
      this.isNewCandle = false;
    }
    if (Number(lastPrice) && Number(lastPrice) < this._candleLowPrice) {
      this._candleLowPrice = Number(lastPrice);
    }
  }

  private updateLastCandleData() {
    this._lastCandleLowPrice = this._candleLowPrice;
    this._nextCandleTimeFrame += this._timeFrame;
    this.isNewCandle = true;
    this.candlesCount += 1;

    const data: CandleEvent = {
      count: this.candlesCount,
      isAverageOrderOpened: this.isAverageOrderOpened,
      lastCandleLowPrice: this._lastCandleLowPrice,
      nextCandleTimeFrame: this._nextCandleTimeFrame,
    };
    this._emitter.emit(CANDLE_CLOSED, data);
  }

  setAverageOrderOpened() {
    this.isAverageOrderOpened = true;
  }

  setLastCandleLowPrice(ts: number) {
    const seconds = moment(ts).seconds();
    if (!this.started && seconds === 0) {
      this.started = true;
      this.isNewCandle = true;
      const nearest = this.roundToNearestTen(seconds);
      this._nextCandleTimeFrame = nearest + this._timeFrame;
      console.log(
        `Candle started: ${this._candleLowPrice}, next candle in: ${this._nextCandleTimeFrame} and seconds: ${seconds}`
      );
    }

    if (this.started) {
      if (
        seconds >= 10 &&
        seconds >= this._nextCandleTimeFrame &&
        this._nextCandleTimeFrame !== 0
      ) {
        this.updateLastCandleData();
      }

      if (this._nextCandleTimeFrame === 60) {
        this._nextCandleTimeFrame = 0;
      }

      if (
        seconds < 10 &&
        this._nextCandleTimeFrame === 0 &&
        seconds >= this._nextCandleTimeFrame
      ) {
        this.updateLastCandleData();
      }
    }
  }
}
