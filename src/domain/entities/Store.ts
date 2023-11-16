/* eslint-disable @typescript-eslint/no-unsafe-call */
import moment from 'moment';
import BigJs from 'big.js';
import {EventEmitter} from 'events';
import {OrderClass} from '../../types';
import {inject, injectable} from 'tsyringe';
import {CANDLE_CLOSED, LOG_EVENT} from '../../constants';
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
import {initLogger} from '../../utils/logger';

const logger = initLogger('Store', 'logs/logs.log');

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

  getSnapshot = (action: string) => {
    const snapshot = {
      action,
      posQty: this.posQty,
      avgQty: this.avgQty,
      candleLowPrice: this.candleLowPrice,
      lastCandleLowPrice: this.lastCandleLowPrice,
      avgPositionPrice: this.avgPositionPrice,
      lastAvgOrderPrice: this.lastAvgOrderPrice,
      avgOrderCount: this.avgOrderCount,
      avgOrderPrice: this.avgOrderPrice,
      profitOrderPrice: this.profitOrderPrice,
      canOpenAvgOrder: this.canOpenAvgOrder,
      isNewCandle: this.isNewCandle,
      isAverageOrderOpened: this.isAverageOrderOpened,
      isPositionOpened: this.isPositionOpened,
      nextCandleTimeFrame: this.nextCandleTimeFrame,
      candlesCount: this.candlesCount,
      quantity: this.quantity,
      orderBook: this.orderBook,
      klineStarted: this.klineStarted,
    };
    return snapshot;
  };

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
    if (!this.quantity.length) return 0;
    const result = this.quantity.reduce((prev, cur) =>
      new BigJs(prev).add(cur).toFixed(DIGITS_AFTER_COMMA)
    );

    return result;
  }

  get avgQty() {
    return new BigJs(this.posQty).mul(MARTIN_GALE).toFixed(DIGITS_AFTER_COMMA);
  }

  openPosition(avgPrice: string, qty: string) {
    this.isPositionOpened = true;
    this.avgPositionPrice = avgPrice;
    this.quantity = [qty];
    this.candlesCount = 0;
    this.lastAvgOrderPrice = avgPrice;
    this._emitter.emit(LOG_EVENT, this.getSnapshot('openPosition'));
  }

  closePosition() {
    this.isPositionOpened = false;
    this.avgPositionPrice = '0';
    this.quantity = [];
    this.avgOrderCount = 0;

    this._emitter.emit(LOG_EVENT, this.getSnapshot('closePosition'));
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

    this._emitter.emit(LOG_EVENT, this.getSnapshot('closeAvgOrder'));
  }

  openAvgOrder(orderId: string) {
    this.addOrder(orderId, 'AVERAGE_ORDER');
    this.isAverageOrderOpened = true;
    this._emitter.emit(LOG_EVENT, this.getSnapshot('openAvgOrder'));
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

  addOrder = (orderId: string, type: OrderClass) => {
    this.orderBook[orderId] = type;
    this._emitter.emit(LOG_EVENT, this.getSnapshot('addOrder'));
  };

  removeOrder = (orderId: string) => {
    delete this.orderBook[orderId];
    this._emitter.emit(LOG_EVENT, this.getSnapshot('removeOrder'));
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
    this._emitter.emit(LOG_EVENT, this.getSnapshot('setLastLowCandlePrice'));
  }

  setLowPrice(lastPrice: string | undefined) {
    if (!this.klineStarted) return;
    if (this.isNewCandle && lastPrice) {
      this.candleLowPrice = lastPrice;
      this.isNewCandle = false;
      this._emitter.emit(LOG_EVENT, this.getSnapshot('setLowPrice'));
    } else if (lastPrice && Number(lastPrice) < Number(this.candleLowPrice)) {
      this.candleLowPrice = lastPrice;
      this._emitter.emit(LOG_EVENT, this.getSnapshot('setLowPrice'));
    }
  }

  private updateLastCandleData() {
    this.lastCandleLowPrice = this.candleLowPrice;
    this.nextCandleTimeFrame += this.timeFrame;
    this.isNewCandle = true;
    this.candlesCount += 1;
    logger.info(
      `Candld closed: ${this.lastCandleLowPrice}, next candle: ${this.nextCandleTimeFrame}, count: ${this.candlesCount}`
    );
    this._emitter.emit(CANDLE_CLOSED);
    this._emitter.emit(LOG_EVENT, this.getSnapshot('updateLastCandleData'));
  }

  updateLastCandleLowPrice(ts: number) {
    const seconds = moment(ts).seconds();
    if (!this.klineStarted && seconds % this.timeFrame === 0) {
      this.klineStarted = true;
      this.isNewCandle = true;
      const nearest = this.roundToNearestTen(seconds);
      this.nextCandleTimeFrame = nearest + this.timeFrame;
      logger.info(
        `Candle klineStarted: ${this.candleLowPrice}, next candle in: ${this.nextCandleTimeFrame} and seconds: ${seconds}`
      );
      this._emitter.emit(
        LOG_EVENT,
        this.getSnapshot('updateLastCandleLowPrice')
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
