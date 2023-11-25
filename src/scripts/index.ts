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
  TRADE_CYCLES,
} from '../config';
import {RKEYS} from '../constants';
import {Redis} from 'ioredis';

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
    await redis.set(RKEYS.MARTINGALE, MARTIN_GALE);
    await redis.set(RKEYS.CATEGORY, 'linear');
    await redis.set(RKEYS.TRADE_CYCLES, TRADE_CYCLES);

    await redis.set(RKEYS.POS_QTY, '0');
    await redis.set(RKEYS.LAST_AVG_ORD_PRICE, '0');

    await redis.set(RKEYS.AVG_ORDER_EXISTS, 'false');
    await redis.set(RKEYS.POSITION_OPENED, 'false');
    await redis.set(RKEYS.AVG_POS_PRICE, '0');
    await redis.set(RKEYS.AVG_ORDER_COUNT, '0');
    await redis.set(RKEYS.PROFIT_TAKES_COUNT, 0);
  } catch (error) {
    console.error(JSON.stringify(error));
  }
}

(async () => {
  await setupTradeOptions();
  console.log('>>> setup:redis:vars');
})().catch(err => console.error(err));
