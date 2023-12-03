import {Redis} from 'ioredis';
import {inject, injectable} from 'tsyringe';
import BigJs from 'big.js';
import {initLogger} from '../../utils/logger';
import {RKEYS} from '../../constants';
import {Options} from './Options';
import {normalizeFloat} from '../../utils';

const errLogger = initLogger('Position', 'errors.log');

@injectable()
export class Position {
  private _lastPrice = '0';
  public bid1Price = '0';
  public ask1Price = '0';
  private quantity: string[] = [];
  private _avgPosPrice = '0';
  private _lastAvgOrderPrice = '0';
  private _exists = false;
  public partiallyFilled = false;

  constructor(
    @inject('Redids')
    private readonly redis: Redis,
    @inject('Options')
    private readonly options: Options
  ) {
    this.init().catch(err => {
      // TODO: check or this error will stop app
      // TODO: this error should print to system telegram logs
      errLogger.error(JSON.stringify(err));
      throw new Error('REDIS:LOAD_VARS:ERROR');
    });
  }

  private async init() {
    this._avgPosPrice = (await this.redis.get(RKEYS.AVG_POS_PRICE)) || '0';
    this._lastAvgOrderPrice =
      (await this.redis.get(RKEYS.LAST_AVG_ORD_PRICE)) || '0';

    const qty: string[] = JSON.parse(
      (await this.redis.get(RKEYS.POS_QTY)) || '[]'
    ) as string[];
    this.quantity = qty;
    const positionExists = await this.redis.get(RKEYS.POSITION_OPENED);
    this._exists = positionExists === 'true';
  }

  get posQty() {
    if (!this.quantity.length) return '0';
    const qty = this.quantity.reduce((prev, cur) =>
      new BigJs(prev).add(cur).toFixed(this.options.digits)
    );

    return normalizeFloat(qty);
  }

  get avgQty() {
    const qty = new BigJs(this.posQty)
      .mul(this.options.martinGale)
      .toFixed(this.options.digits);
    return normalizeFloat(qty);
  }

  get lastAvgOrderPrice() {
    return this._lastAvgOrderPrice;
  }

  set lastAvgOrderPrice(val: string) {
    this._lastAvgOrderPrice = val;
    this.redis
      .set(RKEYS.LAST_AVG_ORD_PRICE, val)
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  get avgPosPrice() {
    return this._avgPosPrice;
  }

  set avgPosPrice(val: string) {
    this._avgPosPrice = val;
    this.redis
      .set(RKEYS.AVG_POS_PRICE, val)
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  get lastPrice() {
    return this._lastPrice;
  }

  set lastPrice(value: string | undefined) {
    if (value) this._lastPrice = value;
  }

  get avgOrderPrice() {
    const price = new BigJs(this._lastAvgOrderPrice)
      .mul(this.options.avgRate)
      .toFixed(this.options.digits);
    if (parseFloat(price) >= parseFloat(this._lastPrice)) return this.bid1Price;
    return price;
  }

  get profitOrderPrice() {
    const price = new BigJs(this._avgPosPrice)
      .mul(this.options.profitRate)
      .toFixed(this.options.digits);
    if (parseFloat(price) <= parseFloat(this._lastPrice)) return this.ask1Price;
    return price;
  }

  get exists(): boolean {
    return this._exists;
  }

  set exists(val: boolean) {
    this._exists = val;
    this.redis
      .set(RKEYS.POSITION_OPENED, String(val))
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  // setQtyByIdx(idx: number, val: string) {
  //   this.quantity[idx] = val;
  //   this.redis
  //     .set(RKEYS.POS_QTY, JSON.stringify(this.quantity))
  //     .catch(err => errLogger.error(JSON.stringify(err)));
  // }

  setLeavesQty(leavesQty: string) {
    this.quantity = [leavesQty];
    this.redis
      .set(RKEYS.POS_QTY, JSON.stringify(this.quantity))
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  setBaseQty(qty: string) {
    this.quantity = [qty];
    this.redis
      .set(RKEYS.POS_QTY, JSON.stringify([qty]))
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  private clearQty() {
    this.quantity = [];
    this.redis
      .set(RKEYS.POS_QTY, JSON.stringify([]))
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  public fillLongOrder = (qty: string, price: string) => {
    this.setBaseQty(qty);
    this.avgPosPrice = price;
    this.lastAvgOrderPrice = price;
    this.exists = true;
    this.partiallyFilled = false;
  };

  public partiallyFillAvgOrder = (idx: number, qty: string, value: string) => {
    const totalQty = this.quantity.reduce((prev: string, cur: string) =>
      new BigJs(prev).add(cur).toString()
    );
    const numerator = new BigJs(totalQty).mul(this.avgPosPrice).plus(value);
    const denominator = new BigJs(totalQty).add(qty);
    this.quantity[idx] = qty;
    this.redis
      .set(RKEYS.POS_QTY, JSON.stringify(this.quantity))
      .catch(err => errLogger.error(JSON.stringify(err)));

    this.avgPosPrice = new BigJs(numerator)
      .div(denominator)
      .toFixed(this.options.digits);
  };

  public fillAvgOrder = (
    idx: number,
    qty: string,
    value: string,
    price: string
  ) => {
    this.partiallyFillAvgOrder(idx, qty, value);
    this.lastAvgOrderPrice = price;
  };

  public handleFilledProfitOrder = () => {
    this.clearQty();
    this.avgPosPrice = '0';
    this.lastAvgOrderPrice = '0';
    this.exists = false;
  };
}
