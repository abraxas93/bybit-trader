import {Redis} from 'ioredis';
import {inject, injectable} from 'tsyringe';
import BigJs from 'big.js';
import {initLogger} from '../../utils/logger';
import {RKEYS} from '../../constants';
import {Options} from './Options';
import {normalizeFloat} from '../../utils';
import {ENV, USER} from '../../config';

const errLogger = initLogger('Position', 'errors.log');

@injectable()
export class Position {
  private _lastPrice = '0';
  public bid1Price = '0';
  public ask1Price = '0';
  private _posQty = '0';
  private _avgPosPrice = '0';
  private _lastAvgOrderPrice = '0';
  private _exists = false;
  public partiallyFilled = false;
  public lastAvgCumExecQty = '0';
  private lastProfitCumExecQty = '0';
  private symbol = '';

  constructor(
    @inject('Redids')
    private readonly redis: Redis,
    @inject('Options')
    private readonly options: Options
  ) {
    this.loadVars().catch(err => {
      // TODO: check or this error will stop app
      // TODO: this error should print to system telegram logs
      errLogger.error(JSON.stringify(err));
      throw new Error('REDIS:LOAD_VARS:ERROR');
    });
  }

  async loadVars() {
    const symbol = (await this.redis.get(`${USER}:${ENV}:SYMBOL`)) || '';
    this.symbol = symbol;
    const baseKey = `${USER}:${ENV}:${symbol}`;
    this._avgPosPrice =
      (await this.redis.get(`${baseKey}:${RKEYS.AVG_POS_PRICE}`)) || '0';
    this._lastAvgOrderPrice =
      (await this.redis.get(`${baseKey}:${RKEYS.LAST_AVG_ORD_PRICE}`)) || '0';

    const qty: string =
      (await this.redis.get(`${baseKey}:${RKEYS.POS_QTY}`)) || '0';
    this._posQty = qty;
    const positionExists = await this.redis.get(
      `${baseKey}:${RKEYS.POSITION_OPENED}`
    );
    this._exists = positionExists === 'true';
  }

  get posQty() {
    return this._posQty;
  }

  set posQty(val: string) {
    this._posQty = val;
    this.redis
      .set(`${USER}:${ENV}:${this.symbol}:${RKEYS.POS_QTY}`, this._posQty)
      .catch(err => errLogger.error(JSON.stringify(err)));
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
      .set(`${USER}:${ENV}:${this.symbol}:${RKEYS.LAST_AVG_ORD_PRICE}`, val)
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  get avgPosPrice() {
    return this._avgPosPrice;
  }

  set avgPosPrice(val: string) {
    this._avgPosPrice = val;
    this.redis
      .set(`${USER}:${ENV}:${this.symbol}:${RKEYS.AVG_POS_PRICE}`, val)
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
      .set(
        `${USER}:${ENV}:${this.symbol}:${RKEYS.POSITION_OPENED}`,
        String(val)
      )
      .catch(err => errLogger.error(JSON.stringify(err)));
  }

  handlePartiallyFilledProfitOrder = (qty: string) => {
    let newQty;
    if (this.lastProfitCumExecQty === '0') {
      this.lastProfitCumExecQty = qty;
      newQty = new BigJs(this.posQty).minus(qty).toFixed(this.options.digits);
    } else {
      const diffQty = new BigJs(qty).minus(this.lastProfitCumExecQty);
      newQty = new BigJs(this.posQty)
        .minus(diffQty)
        .toFixed(this.options.digits);
      this.lastProfitCumExecQty = qty;
    }
    this.posQty = normalizeFloat(newQty as string);
  };

  public handleFilledLongOrder = (qty: string, price: string) => {
    this.posQty = qty;
    this.avgPosPrice = price;
    this.lastAvgOrderPrice = price;
    this.exists = true;
    this.partiallyFilled = false;
  };

  public partiallyFillAvgOrder = (qty: string, value: string) => {
    const numerator = new BigJs(this.posQty).mul(this.avgPosPrice).plus(value);
    const denominator = new BigJs(this.posQty).add(qty);

    let newQty;
    if (this.lastAvgCumExecQty === '0') {
      newQty = new BigJs(this.posQty).add(qty).toFixed(this.options.digits);
      this.lastAvgCumExecQty = qty;
    } else {
      const diffQty = new BigJs(qty).minus(this.lastAvgCumExecQty);
      newQty = new BigJs(this.posQty).add(diffQty).toFixed(this.options.digits);
      console.log({
        qty,
        diffQty: diffQty.toString(),
        lastAvgCumExecQty: this.lastAvgCumExecQty,
        newQty: newQty as string,
      });
      this.lastAvgCumExecQty = qty;
    }

    this.posQty = normalizeFloat(newQty as string);
    this.avgPosPrice = new BigJs(numerator)
      .div(denominator)
      .toFixed(this.options.digits);
  };

  public handleFilledAvgOrder = (qty: string, value: string, price: string) => {
    this.partiallyFillAvgOrder(qty, value);
    this.lastAvgOrderPrice = price;
    this.lastAvgCumExecQty = '0';
  };

  public handleFilledProfitOrder = () => {
    this.posQty = '0';
    this.avgPosPrice = '0';
    this.lastAvgOrderPrice = '0';
    this.exists = false;

    this.lastProfitCumExecQty = '0';
    this.lastAvgCumExecQty = '0';
  };

  public closePosition() {
    this.posQty = '0';
    this.avgPosPrice = '0';
    this.lastAvgOrderPrice = '0';
    this.exists = false;
    this.lastProfitCumExecQty = '0';

    this.lastAvgCumExecQty = '0';
    this._lastPrice = '0';
    this.bid1Price = '0';
    this.ask1Price = '0';
    this.partiallyFilled = false;
  }
}
