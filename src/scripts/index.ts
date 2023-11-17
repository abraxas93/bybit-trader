import {initLogger} from '../utils/logger';
import {
  AVG_BUY_RATE,
  BASE_QUANTITY,
  CANDLES_TO_WAIT,
  DIGITS_AFTER_COMMA,
  MARTIN_GALE,
  MAX_AVG_ORDER_COUNT,
  SYMBOL,
  TAKE_PROFIT_RATE,
  TIME_FRAME,
} from '../config';
import {RKEYS} from '../constants';
import {Redis} from 'ioredis';

const errLogger = initLogger('index.ts', 'logs/errors.log');

/**
 * export const SYMBOL = 'TOKENUSDT';
export const BASE_QUANTITY = '10';
export const TIME_FRAME = 10;
export const MARTIN_GALE = 2;
export const TAKE_PROFIT_RATE = 1.007;
export const AVG_BUY_RATE = 0.995;
export const MAX_AVG_ORDER_COUNT = 10;
export const CANDLES_TO_WAIT = 10;
export const DIGITS_AFTER_COMMA = 6;
 */

/**
 * SYMBOL: 'cfg:symbol',
  QUANTITY: 'cfg:quantity',
  PERIOD: 'cfg:period',
  MARTINGALE: 'cfg:martingale',
  PROFIT_RATE: 'cfg:profit_rate',
  AVG_RATE: 'cfg:avg_rate',
  MAX_AVG_COUNT: 'cfg:max_avg_count',
  MIN_CANDLES: 'cfg:min_candles',
  DIGITS: 'cfg:digits',
 */

export async function setupTradeOptions() {
  try {
    const redis = new Redis();
    await redis.set(RKEYS.SYMBOL, SYMBOL);
    await redis.set(RKEYS.QUANTITY, BASE_QUANTITY);
    await redis.set(RKEYS.PERIOD, TIME_FRAME);
    await redis.set(RKEYS.MARTIN_GALE, MARTIN_GALE);

    await redis.set(RKEYS.PROFIT_RATE, TAKE_PROFIT_RATE);
    await redis.set(RKEYS.AVG_RATE, AVG_BUY_RATE);

    await redis.set(RKEYS.MAX_AVG_COUNT, MAX_AVG_ORDER_COUNT);
    await redis.set(RKEYS.MIN_CANDLES, CANDLES_TO_WAIT);

    await redis.set(RKEYS.DIGITS, DIGITS_AFTER_COMMA);
  } catch (error) {
    errLogger.error(JSON.stringify(error));
  }
}
