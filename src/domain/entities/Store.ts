/* eslint-disable @typescript-eslint/no-unsafe-call */
import moment from 'moment';
import BigJs from 'big.js';
import {EventEmitter} from 'events';
import {OrderClass} from '../../types';
import {inject, injectable} from 'tsyringe';
import {CANDLE_CLOSED} from '../../constants';
import {
  AVG_BUY_RATE,
  BASE_QUANTITY,
  CANDLES_TO_WAIT,
  DIGITS_AFTER_COMMA,
  MARTIN_GALE,
  MAX_AVG_ORDER_COUNT,
  TAKE_PROFIT_RATE,
  TIME_FRAME,
} from '../../config';

// остаток в сделке умножаем на мартинг гейл, чтобы получить количество
@injectable()
export class Store {
  private klineStarted = false;
  private isNewCandle = false;

  public isAverageOrderOpened = false;
  public isPositionOpened = false;

  private candleLowPrice = '0';
  public lastCandleLowPrice = '0';
  private readonly timeFrame = TIME_FRAME;
  private nextCandleTimeFrame = 0;

  private candlesCount = 0;

  public quantity: string[] = [];

  readonly category = 'linear'; // TODO: change to constant
  readonly orderBook: Record<string, OrderClass> = {};

  private avgPositionPrice = '0';
  public lastAvgOrderPrice = '0';
  private avgOrderCount = 0;

  constructor(
    private readonly _symbol: string,
    @inject('EventEmitter')
    private readonly _emitter: EventEmitter
  ) {}

  get symbol() {
    return this._symbol;
  }

  get avgOrderPrice() {
    return new BigJs(this.lastAvgOrderPrice)
      .mul(AVG_BUY_RATE)
      .toFixed(DIGITS_AFTER_COMMA);
  }

  get profitOrderPrice() {
    return new BigJs(this.avgPositionPrice)
      .mul(TAKE_PROFIT_RATE)
      .toFixed(DIGITS_AFTER_COMMA);
  }

  get canOpenAvgOrder(): boolean {
    return (
      !this.isAverageOrderOpened &&
      this.candlesCount >= CANDLES_TO_WAIT &&
      this.isPositionOpened &&
      this.avgOrderCount <= MAX_AVG_ORDER_COUNT
    );
  }

  get baseQty() {
    return BASE_QUANTITY;
  }

  get posQty() {
    const result = this.quantity.reduce((prev, cur) =>
      new BigJs(prev).add(cur).toFixed(DIGITS_AFTER_COMMA)
    );

    return result;
  }

  get avgQty() {
    return new BigJs(this.posQty).mul(MARTIN_GALE).toFixed(DIGITS_AFTER_COMMA);
    // return this.quantity.length > 1
    //   ? new BigJs(this.posQty).mul(MARTIN_GALE).toFixed(DIGITS_AFTER_COMMA)
    //   : this.posQty;
  }

  openPosition(avgPrice: string, qty: string) {
    this.isPositionOpened = true;
    this.avgPositionPrice = avgPrice;
    this.quantity = [qty];
    this.candlesCount = 0;
    this.lastAvgOrderPrice = avgPrice;
  }

  closePosition() {
    this.isPositionOpened = false;
    this.avgPositionPrice = '0';
    this.quantity = [];
    this.avgOrderCount = 0;
  }

  closeAvgOrder(price: string, qty: string, value: string) {
    this.isAverageOrderOpened = false;
    this.candlesCount = 0;
    const totalQty = this.quantity.reduce((prev: string, cur: string) =>
      new BigJs(prev).add(cur).toString()
    );
    const numerator = new BigJs(totalQty)
      .mul(this.avgPositionPrice)
      .plus(value);
    const denominator = new BigJs(totalQty).add(qty);
    this.quantity.push(qty);
    this.avgPositionPrice = new BigJs(numerator).div(denominator).toString();
    this.lastAvgOrderPrice = price;
    this.avgOrderCount += 1;
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
      ).toFixed(DIGITS_AFTER_COMMA);
    }
    this.candlesCount = 0;
  }

  // getAvgPositionPrice() {
  //   return this.avgPositionPrice;
  // }

  // getTakeProfitOrderPrice() {
  //   return (Number(this.avgPositionPrice) * 1.01).toFixed(DIGITS_AFTER_COMMA); // TODO: сhange this to const
  // }

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

  setLastLowCandlePrice(price: string) {
    this.candleLowPrice = price;
  }

  setLowPrice(lastPrice: string | undefined) {
    if (!this.klineStarted) return;
    if (this.isNewCandle && lastPrice) {
      this.candleLowPrice = lastPrice;
      this.isNewCandle = false;
    } else if (lastPrice && Number(lastPrice) < Number(this.candleLowPrice)) {
      this.candleLowPrice = lastPrice;
    }
  }

  private updateLastCandleData() {
    this.lastCandleLowPrice = this.candleLowPrice;
    this.nextCandleTimeFrame += this.timeFrame;
    this.isNewCandle = true;
    this.candlesCount += 1;
    console.log(
      `Candld closed: ${this.lastCandleLowPrice}, next candle: ${this.nextCandleTimeFrame}, count: ${this.candlesCount}`
    );
    this._emitter.emit(CANDLE_CLOSED);
  }

  setAverageOrderOpened() {
    this.isAverageOrderOpened = true;
  }

  updateLastCandleLowPrice(ts: number) {
    const seconds = moment(ts).seconds();
    if (!this.klineStarted && seconds % this.timeFrame === 0) {
      this.klineStarted = true;
      this.isNewCandle = true;
      const nearest = this.roundToNearestTen(seconds);
      this.nextCandleTimeFrame = nearest + this.timeFrame;
      console.log(
        `Candle klineStarted: ${this.candleLowPrice}, next candle in: ${this.nextCandleTimeFrame} and seconds: ${seconds}`
      );
    }

    if (this.klineStarted) {
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
