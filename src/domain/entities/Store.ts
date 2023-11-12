/* eslint-disable @typescript-eslint/no-unsafe-call */
import moment from 'moment';
import BigJs from 'big.js';
import {EventEmitter} from 'events';
import {CandleEvent, OrderClass} from '../../types';
import {inject, injectable} from 'tsyringe';
import {CANDLE_CLOSED} from '../../constants';
import {BASE_QUANTITY} from '../../config';

// остаток в сделке умножаем на мартинг гейл, чтобы получить количество
@injectable()
export class Store {
  private started = false;
  private isNewCandle = false;

  public isAverageOrderOpened = false;
  public isPositionOpened = false;

  private candleLowPrice = 0;
  public lastCandleLowPrice = '0';
  private readonly timeFrame = 10;
  private nextCandleTimeFrame = 0;

  private candlesCount = 0;
  private candlesToWait = 10;

  public quantity: string[] = [];

  public positionQty = BASE_QUANTITY;

  readonly category = 'linear'; // TODO: change to constant
  readonly orderBook: Record<string, OrderClass> = {};

  private avgPositionPrice = '0';

  constructor(
    private readonly _symbol: string,
    @inject('EventEmitter')
    private readonly _emitter: EventEmitter
  ) {}

  get symbol() {
    return this._symbol;
  }

  get avgOrderPrice() {
    return (Number(this.avgPositionPrice) * 0.99).toFixed(4); // TODO: change this to const
  }

  get canOpenAvgOrder(): boolean {
    return (
      !this.isAverageOrderOpened &&
      this.candlesCount >= 10 &&
      this.isPositionOpened
    );
  }

  openPosition(avgPrice: string, qty: string) {
    this.isPositionOpened = true;
    this.avgPositionPrice = avgPrice;
    this.quantity = [qty];
  }

  closePosition() {
    this.isPositionOpened = false;
    this.avgPositionPrice = '0';
  }

  closeAvgOrder(price: string, qty: string, value: string) {
    this.isAverageOrderOpened = false;
    const totalQty = this.quantity.reduce((prev: string, cur: string) =>
      new BigJs(prev).add(cur).toString()
    );
    const numerator = new BigJs(totalQty)
      .mul(this.avgPositionPrice)
      .plus(value);
    const denominator = new BigJs(totalQty).add(qty);
    this.quantity.push(qty);
    this.avgPositionPrice = new BigJs(numerator).div(denominator).toString();
  }

  openAvgOrder(orderId: string) {
    this.addOrder(orderId, 'AVERAGE_ORDER');
    this.isAverageOrderOpened = true;
  }

  getLastCandleLowPrice() {
    return this.lastCandleLowPrice;
  }

  private roundToNearestTen(number: number) {
    if (number < 10) {
      return 0;
    } else {
      return Math.floor(number / 10) * 10;
    }
  }

  resetAvgPrice() {
    this.avgPositionPrice = '0';
  }

  recalcAvgPrice(newPrice: string) {
    if (this.avgPositionPrice === '0') {
      this.avgPositionPrice = newPrice;
    } else {
      this.avgPositionPrice = (
        (Number(this.avgPositionPrice) + Number(newPrice)) /
        2
      ).toFixed(4);
    }
    this.candlesCount = 0;
  }

  getAvgPositionPrice() {
    return this.avgPositionPrice;
  }

  getTakeProfitOrderPrice() {
    return (Number(this.avgPositionPrice) * 1.01).toFixed(4); // TODO: сhange this to const
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

  getOrderIdbyClass = (ordClass: OrderClass) => {
    for (const orderId in this.orderBook) {
      if (this.orderBook[orderId] === ordClass) return orderId;
    }
    return null;
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
