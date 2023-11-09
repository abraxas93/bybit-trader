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

  private candleLowPrice = 0;
  private lastCandleLowPrice = 0;
  private readonly timeFrame = 10;
  private nextCandleTimeFrame = 0;

  private candlesCount = 0;
  private candlesToWait = 10;

  public quantity = '0.05';
  readonly category = 'linear';
  readonly orderBook: Record<string, OrderClass> = {};

  public avgFilledPrice = 0;

  constructor(
    private readonly _symbol: string,
    @inject('EventEmitter')
    private readonly _emitter: EventEmitter
  ) {}

  get symbol() {
    return this._symbol;
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

  recalcAvgPrice(newPrice: string) {
    if (!this.avgFilledPrice) {
      this.avgFilledPrice = Number(newPrice);
    } else {
      this.avgFilledPrice = (this.avgFilledPrice + Number(newPrice)) / 2;
    }
  }

  getAvgPositionPrice() {
    return this.avgFilledPrice;
  }

  getTakeProfitOrderPrice() {
    return this.avgFilledPrice * 1.01; // TODO: сhange this to const
  }

  getAverageOrderPrice() {
    return this.avgFilledPrice * 0.99; // TODO: change this to const
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
      this.candleLowPrice = Number(lastPrice);
      this.isNewCandle = false;
    }
    if (Number(lastPrice) && Number(lastPrice) < this.candleLowPrice) {
      this.candleLowPrice = Number(lastPrice);
    }
  }

  private updateLastCandleData() {
    this.lastCandleLowPrice = this.candleLowPrice;
    this.nextCandleTimeFrame += this.timeFrame;
    this.isNewCandle = true;
    this.candlesCount += 1;

    const data: CandleEvent = {
      count: this.candlesCount,
      isAverageOrderOpened: this.isAverageOrderOpened,
      lastCandleLowPrice: this.lastCandleLowPrice,
      nextCandleTimeFrame: this.nextCandleTimeFrame,
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
      this.nextCandleTimeFrame = nearest + this.timeFrame;
      console.log(
        `Candle started: ${this.candleLowPrice}, next candle in: ${this.nextCandleTimeFrame} and seconds: ${seconds}`
      );
    }

    if (this.started) {
      if (
        seconds >= 10 &&
        seconds >= this.nextCandleTimeFrame &&
        this.nextCandleTimeFrame !== 0
      ) {
        this.updateLastCandleData();
      }

      if (this.nextCandleTimeFrame === 60) {
        this.nextCandleTimeFrame = 0;
      }

      if (
        seconds < 10 &&
        this.nextCandleTimeFrame === 0 &&
        seconds >= this.nextCandleTimeFrame
      ) {
        this.updateLastCandleData();
      }
    }
  }
}
