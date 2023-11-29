import {Redis} from 'ioredis';
import {inject, injectable} from 'tsyringe';
import BigJs from 'big.js';
import {initLogger} from '../../utils/logger';
import {RKEYS} from '../../constants';
import {Options} from './Options';

const errLogger = initLogger('CandleState', 'errors.log');

@injectable()
export class PriceManager {
  private _lastPrice = '0';
  public _bid1Price = '0';
  public _ask1Price = '0';

  private _avgPosPrice = '0';
  private _lastAvgOrderPrice = '0';

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
    if (parseFloat(price) > parseFloat(this._lastPrice)) return this._bid1Price;
    return price;
  }

  get profitOrderPrice() {
    const price = new BigJs(this._avgPosPrice)
      .mul(this.options.profitRate)
      .toFixed(this.options.digits);
    if (parseFloat(price) < parseFloat(this._lastPrice)) return this._ask1Price;
    return price;
  }
}
