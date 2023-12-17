import {RKEYS} from '../constants';
import {Redis} from 'ioredis';

export async function setupTradeOptions() {
  const symbol = process.argv[2];
  const userId = process.argv[3];
  const env = process.env.NODE_ENV || 'dev';
  console.log({symbol, userId});
  if (!symbol) throw new Error(`Symbol required`);
  if (!userId) throw new Error(`UserId required`);
  const baseKey = `${userId}:${env}:${symbol}`;
  const redis = new Redis();

  await redis.set(`${baseKey}:${RKEYS.POS_QTY}`, '0');
  await redis.set(RKEYS.LAST_AVG_ORD_PRICE, '0');

  await redis.set(`${baseKey}:${RKEYS.AVG_ORDER_EXISTS}`, 'false');
  await redis.set(`${baseKey}:${RKEYS.POSITION_OPENED}`, 'false');
  await redis.set(`${baseKey}:${RKEYS.AVG_POS_PRICE}`, '0');
  await redis.set(`${baseKey}:${RKEYS.AVG_ORDER_COUNT}`, '0');
  await redis.set(`${baseKey}:${RKEYS.PROFIT_TAKES_COUNT}`, '0');
  await redis.set(`${baseKey}:${RKEYS.LAST_AVG_ORD_PRICE}`, '0');
}

(async () => {
  await setupTradeOptions();
  console.log('>>> dev:reset:store');
})().catch(err => console.error(err));
