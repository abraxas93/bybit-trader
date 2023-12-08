/* eslint-disable no-process-exit */
import 'reflect-metadata';
import {Redis} from 'ioredis';
import {container} from 'tsyringe';
import {RestClientV5} from 'bybit-api';
import {bootstrapCtx} from './ctx';
import {ENV} from './config';
import {RKEYS} from './constants';
import {SubmitOpenOrder, SubmitProfitOrder} from './application';
import {log} from './utils';
import {Options, Position} from './domain/entities';
import {bootstrapEvents} from './events';
import {bootstrapSockets} from './sockets';
import {bootstratTopicks} from './topics';

const label = '[index.ts]';

main().catch(err => {
  log.errs.error(err);
});
// TODO: first grab kline data but wait until first ticker and only then place open order in case of start
async function main() {
  log.custom.info(`${label}:app started: -env:${ENV}`);
  await bootstrapCtx();
  bootstrapSockets();
  bootstrapEvents();
  bootstratTopicks();

  const options = container.resolve<Options>('Options');
  const position = container.resolve<Position>('Position');
  const redis = container.resolve<Redis>('Redis');

  setTimeout(() => {
    redis
      .publish('284182203:COMMAND', 'SOCKETS_SUBSCRIBE')
      .catch(err => console.error(err));
    console.log('published');
  }, 5000);

  // setTimeout(async () => {
  //   if (!position.exists) {
  //     const useCase = container.resolve<SubmitOpenOrder>('SubmitOpenOrder');
  //     await useCase.execute();
  //   } else {
  //     const useCase = container.resolve<SubmitProfitOrder>('SubmitProfitOrder');
  //     await useCase.execute();
  //   }
  // }, START_TIME);

  log.custom.info(`${label}:` + JSON.stringify(options.values));
}

const cb = async () => {
  try {
    const client = container.resolve<RestClientV5>('RestClientV5');
    const options = container.resolve<Options>('Options');
    const redis = container.resolve<Redis>('Redis');

    const symbol = options.symbol;
    const category = options.category;

    const response = await client.cancelAllOrders({symbol, category});
    log.api.info(response);
    if (response.retCode) {
      log.errs.error(`${label}:` + JSON.stringify(response));
    } else {
      await redis.set(RKEYS.AVG_ORDER_EXISTS, 'false');
      await redis.set(RKEYS.PROFIT_TAKES_COUNT, '0');
    }
  } catch (error) {
    log.errs.error(`${label}:` + JSON.stringify(error));
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', async () => {
  await cb().catch(err => log.errs.error(err));
});
