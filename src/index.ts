/* eslint-disable no-process-exit */
import 'reflect-metadata';
import {EventEmitter} from 'events';
import {container} from 'tsyringe';
import {bootstrapCtx} from './ctx';
import {ENV, USER} from './config';
import {log} from './utils';
import {AppState, Options} from './domain/entities';

import {
  RedisSubscriber,
  EventListener,
  WebSocketHandler,
} from './infrastructure';
import {AppExit, AppStart} from './application';
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
  const state = container.resolve<AppState>('AppState');

  state.stop();

  wsHandler.setupEventListeners();
  subscriber.subscribeToChannels().catch(err => log.errs.error(err));
  eventListener.startListening(emitter);
  const options = container.resolve<Options>('Options');
  const appStart = container.resolve<AppStart>('AppStart');

  setTimeout(() => {
    appStart.execute().catch(err => console.error(err));
  }, 3000);

  log.custom.info(
    `${label}:app started: -env:${ENV} -options: ${JSON.stringify(
      options.values
    )} -user: ${USER}`
  );

  let msg = `${JSON.stringify(options.values)}`;
  msg = msg.replace('{', '');
  msg = msg.replace('}', '');
  msg = msg.replaceAll('.', ',');
  await redis
    .publish(
      `${USER}:RESPONSE`,
      `*ByBitTrader:* started \\-env:${ENV} \\-options: ${msg} \\-user: ${USER}`
    )
    .catch(err => log.errs.error(err));
}

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully');
  const appExit = container.resolve<AppExit>('AppExit');
  await appExit.execute().catch(err => log.errs.error(err));
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  const appExit = container.resolve<AppExit>('AppExit');
  await appExit.execute().catch(err => log.errs.error(err));
});

// TODO: implement this
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
