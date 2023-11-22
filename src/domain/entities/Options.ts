import {initLogger} from '../../utils/logger';
import {NULL_KEY, RKEYS} from '../../constants';
import {Redis} from 'ioredis';
import {inject, injectable} from 'tsyringe';
import {CategoryV5} from 'bybit-api';

const errLogger = initLogger('Options', 'logs/errors.log');

@injectable()
export class Options {
  private _symbol = '';
  private _quantity = '';
  private _period = 0;
  private _martinGale = '';
  private _profitRate = '';
  private _avgRate = '';
  private _maxAvgCount = 0;
  private _minCandles = 0;
  private _digits = 0;
  private _category: CategoryV5 = 'linear';

  constructor(
    @inject('Redis')
    private readonly redis: Redis
  ) {
    this.loadVars().catch(err => errLogger.error(err));
  }

  // Getters for private variables
  get symbol(): string {
    return this._symbol;
  }

  get category(): CategoryV5 {
    return this._category;
  }

  get quantity(): string {
    return this._quantity;
  }

  get period(): number {
    return this._period;
  }

  get martinGale(): string {
    return this._martinGale;
  }

  get profitRate(): string {
    return this._profitRate;
  }

  get avgRate(): string {
    return this._avgRate;
  }

  get maxAvgCount(): number {
    return this._maxAvgCount;
  }

  get minCandles(): number {
    return this._minCandles;
  }

  get digits(): number {
    return this._digits;
  }

  private async loadVars() {
    // upload data from redis
    const symbol = await this.redis.get(RKEYS.SYMBOL);
    if (!symbol) throw new Error(`${NULL_KEY}:${RKEYS.SYMBOL}`);
    this._symbol = symbol;

    this._quantity = (await this.redis.get(RKEYS.QUANTITY)) || '';
    if (!this._quantity) throw new Error(`${NULL_KEY}:${RKEYS.QUANTITY}`);

    const period = await this.redis.get(RKEYS.PERIOD);
    if (!period) throw new Error(`${NULL_KEY}:${RKEYS.PERIOD}`);
    this._period = parseInt(period);

    this._martinGale = (await this.redis.get(RKEYS.MARTINGALE)) || '';
    if (!this._martinGale) throw new Error(`${NULL_KEY}:${RKEYS.MARTINGALE}`);

    this._profitRate = (await this.redis.get(RKEYS.PROFIT_RATE)) || '';
    if (!this._profitRate) throw new Error(`${NULL_KEY}:${RKEYS.PROFIT_RATE}`);

    this._avgRate = (await this.redis.get(RKEYS.AVG_RATE)) || '';
    if (!this._avgRate) throw new Error(`${NULL_KEY}:${RKEYS.AVG_RATE}`);

    const maxAvgCount = await this.redis.get(RKEYS.MAX_AVG_COUNT);
    if (!maxAvgCount) throw new Error(`${NULL_KEY}:${RKEYS.MAX_AVG_COUNT}`);
    this._maxAvgCount = parseInt(maxAvgCount);

    const minCandles = await this.redis.get(RKEYS.MIN_CANDLES);
    if (!minCandles) throw new Error(`${NULL_KEY}:${RKEYS.MIN_CANDLES}`);
    this._minCandles = parseInt(minCandles);

    const digits = await this.redis.get(RKEYS.DIGITS);
    if (!digits) throw new Error(`${NULL_KEY}:${RKEYS.DIGITS}`);
    this._digits = parseInt(digits);

    // TODO: add category setup
  }
}