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
import {AppExit} from './application';
import {Redis} from 'ioredis';
import {API_SECRET, API_KEY} from './keys';

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

  await redis.set(`${USER}:${ENV}:${API_KEY}`, '');
  await redis.set(`${USER}:${ENV}:${API_SECRET}`, '');

  state.stop();

  wsHandler.setupEventListeners();
  subscriber.subscribeToChannels().catch(err => log.errs.error(err));
  eventListener.startListening(emitter);
  const options = container.resolve<Options>('Options');

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

process.on('uncaughtException', err => {
  const data = {
    message: JSON.stringify(err.message),
    stack: JSON.stringify(err.stack),
  };
  log.errs.error(JSON.stringify(data));
});

process.on('unhandledRejection', err => {
  log.errs.error(JSON.stringify(err));
});
