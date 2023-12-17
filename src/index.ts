/* eslint-disable no-process-exit */
import 'reflect-metadata';
import {EventEmitter} from 'events';
import {container} from 'tsyringe';
import {bootstrapCtx} from './ctx';
import {ENV, USER} from './config';
import {log} from './utils';
import {Options} from './domain/entities';

import {
  RedisSubscriber,
  EventListener,
  WebSocketHandler,
} from './infrastructure';
import {AppExit} from './application';
import {Redis} from 'ioredis';

const label = '[index.ts]';

main().catch(err => {
  log.errs.error(err);
});

async function main() {
  await bootstrapCtx();
  const subscriber = container.resolve<RedisSubscriber>('RedisSubscriber');
  const eventListener = container.resolve<EventListener>('EventListener');
  const emitter = container.resolve<EventEmitter>('EventEmitter');
  const wsHandler = container.resolve<WebSocketHandler>('WebSocketHandler');
  const redis = container.resolve<Redis>('Redis');

  wsHandler.setupEventListeners();
  subscriber.subscribeToChannels().catch(err => log.errs.error(err));
  eventListener.startListening(emitter);
  const options = container.resolve<Options>('Options');

  log.custom.info(
    `${label}:app started: -env:${ENV} -options: ${JSON.stringify(
      options.values
    )}`
  );
  await redis
    .publish(
      `${USER}:RESPONSE`,
      `*ByBitTrader:* started -env:${ENV} -options: ${JSON.stringify(
        options.values
      )}`
    )
    .catch(err => log.errs.error(err));
}

process.on('SIGINT', async () => {
  const appExit = container.resolve<AppExit>('AppExit');
  await appExit.execute().catch(err => log.errs.error(err));
});

// TODO: implement this
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
