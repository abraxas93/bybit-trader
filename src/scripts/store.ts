import {RKEYS} from '../constants';
import {Redis} from 'ioredis';

export async function setupTradeOptions() {
  try {
    const redis = new Redis();

    await redis.set(RKEYS.POS_QTY, '0');
    await redis.set(RKEYS.LAST_AVG_ORD_PRICE, '0');

    await redis.set(RKEYS.AVG_ORDER_EXISTS, 'false');
    await redis.set(RKEYS.POSITION_OPENED, 'false');
    await redis.set(RKEYS.AVG_POS_PRICE, '0');
    await redis.set(RKEYS.AVG_ORDER_COUNT, '0');
    await redis.set(RKEYS.PROFIT_TAKES_COUNT, '0');
  } catch (error) {
    console.error(JSON.stringify(error));
  }
}

(async () => {
  await setupTradeOptions();
  console.log('>>> dev:reset:store');
})().catch(err => console.error(err));
