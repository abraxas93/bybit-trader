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
  const symbol = process.argv[2];
  const userId = process.argv[3];
  const env = process.env.NODE_ENV || 'dev';
  if (!symbol) throw new Error(`Symbol required`);
  if (!userId) throw new Error(`UserId required`);
  try {
    const redis = new Redis();
    const baseKey = `${userId}:${env}:${symbol}`;

    await redis.set(`${baseKey}:${RKEYS.SYMBOL}`, symbol);
    await redis.set(`${baseKey}:${RKEYS.QUANTITY}`, BASE_QUANTITY);
    await redis.set(`${baseKey}:${RKEYS.PERIOD}`, TIME_FRAME);

    await redis.set(`${baseKey}:${RKEYS.PROFIT_RATE}`, TAKE_PROFIT_RATE);
    await redis.set(`${baseKey}:${RKEYS.AVG_RATE}`, AVG_BUY_RATE);

    await redis.set(`${baseKey}:${RKEYS.MAX_AVG_COUNT}`, MAX_AVG_ORDER_COUNT);
    await redis.set(`${baseKey}:${RKEYS.MIN_CANDLES}`, CANDLES_TO_WAIT);

    await redis.set(`${baseKey}:${RKEYS.DIGITS}`, DIGITS_AFTER_COMMA);
    await redis.set(`${baseKey}:${RKEYS.MARTINGALE}`, MARTIN_GALE);
    await redis.set(`${baseKey}:${RKEYS.CATEGORY}`, 'linear');
    await redis.set(`${baseKey}:${RKEYS.TRADE_CYCLES}`, TRADE_CYCLES);

    await redis.set(`${baseKey}:${RKEYS.POS_QTY}`, '0');
    await redis.set(`${baseKey}:${RKEYS.LAST_AVG_ORD_PRICE}`, '0');

    await redis.set(`${baseKey}:${RKEYS.AVG_ORDER_EXISTS}`, 'false');
    await redis.set(`${baseKey}:${RKEYS.POSITION_OPENED}`, 'false');
    await redis.set(`${baseKey}:${RKEYS.AVG_POS_PRICE}`, '0');
    await redis.set(`${baseKey}:${RKEYS.AVG_ORDER_COUNT}`, '0');
    await redis.set(`${baseKey}:${RKEYS.PROFIT_TAKES_COUNT}`, 0);
  } catch (error) {
    console.error(JSON.stringify(error));
  }
}

(async () => {
  await setupTradeOptions();
  console.log('>>> setup:redis:vars');
})().catch(err => console.error(err));
