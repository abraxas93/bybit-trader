import {NULL_KEY, RKEYS} from '../../constants';
import {Redis} from 'ioredis';
import {inject, injectable} from 'tsyringe';
import {CategoryV5} from 'bybit-api';

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

  private _tradeCycles = 10;

  constructor(
    @inject('Redis')
    private readonly redis: Redis
  ) {
    // this.loadVars().catch(err => log.error.error(err));
  }

  get values() {
    return {
      symbol: this._symbol,
      quantity: this.quantity,
      period: this._period,
      martinGale: this._martinGale,
      profitRate: this._profitRate,
      avgRate: this.avgRate,
      maxAvgCount: this._maxAvgCount,
      minCandles: this.minCandles,
      digits: this.digits,
      tradeCycles: this.tradeCycles,
    };
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

  get tradeCycles(): number {
    return this._tradeCycles;
  }

  async loadVars() {
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

    const cycles = await this.redis.get(RKEYS.TRADE_CYCLES);
    if (!cycles) throw new Error(`${NULL_KEY}:${RKEYS.TRADE_CYCLES}`);
    this._tradeCycles = parseInt(cycles) || 10;

    // TODO: add category setup
  }
}
