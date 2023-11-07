import moment from 'moment';
import {OrderClass} from '../../types';
import {injectable} from 'tsyringe';

@injectable()
export class Store {
  id = Date.now();
  private _candleLowPrice = 0;
  private _lastCandleLowPrice = 0;
  private readonly _timeFrame = 10;
  private _nextCandleTimeFrame = null;
  public quantity = '0.05';
  readonly category = 'linear';
  readonly orderBook: Record<string, OrderClass> = {};
  constructor(private readonly _symbol: string) {}

  get symbol() {
    return this._symbol;
  }

  get lastCandleLowPrice() {
    return this._lastCandleLowPrice;
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
    if (this._candleLowPrice === 0 && lastPrice)
      this._candleLowPrice = Number(lastPrice);
    if (Number(lastPrice) && Number(lastPrice) < this._candleLowPrice) {
      this._candleLowPrice = Number(lastPrice);
      console.log(`CURRENT LOWEST PRICE: ${this._candleLowPrice}`);
    }
  }

  setLastCandleLowPrice(ts: number) {
    // if ts seconds more or equal then next candle frame ( then set lowest candle price)
    // set next candle shift
  }
}
