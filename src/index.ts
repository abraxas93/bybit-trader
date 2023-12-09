/* eslint-disable no-process-exit */
import 'reflect-metadata';
import {Redis} from 'ioredis';
import {EventEmitter} from 'events';
import {container} from 'tsyringe';
import {RestClientV5} from 'bybit-api';
import {bootstrapCtx} from './ctx';
import {ENV} from './config';
import {RKEYS} from './constants';
import {log} from './utils';
import {Options, Position} from './domain/entities';
import {bootstrapSockets} from './sockets';
import {RedisSubscriber, EventListener} from './infrastructure';

const label = '[index.ts]';

main().catch(err => {
  log.errs.error(err);
});
// TODO: first grab kline data but wait until first ticker and only then place open order in case of start
async function main() {
  log.custom.info(`${label}:app started: -env:${ENV}`);
  await bootstrapCtx();
  const subscriber = container.resolve<RedisSubscriber>('RedisSubscriber');
  const eventListener = container.resolve<EventListener>('EventListener');
  const emitter = container.resolve<EventEmitter>('EventEmitter');
  bootstrapSockets();

  subscriber.subscribeToChannels().catch(err => log.errs.error(err));
  eventListener.startListening(emitter);

  const options = container.resolve<Options>('Options');
  const position = container.resolve<Position>('Position');
  const redis = container.resolve<Redis>('Redis');

  // setTimeout(() => {
  //   redis
  //     .publish('284182203:COMMAND', 'APP_START:apikeysnvk')
  //     .catch(err => console.error(err));
  //   console.log('published');
  // }, 5000);

  log.custom.info(`${label}:` + JSON.stringify(options.values));
}
// TODO: move this callback to separate use case
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
