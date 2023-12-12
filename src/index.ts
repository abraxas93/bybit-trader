/* eslint-disable no-process-exit */
import 'reflect-metadata';
import {EventEmitter} from 'events';
import {container} from 'tsyringe';
import {bootstrapCtx} from './ctx';
import {ENV} from './config';
import {log} from './utils';
import {Options} from './domain/entities';

import {
  RedisSubscriber,
  EventListener,
  WebSocketHandler,
} from './infrastructure';
import {AppExit} from './application';

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

  wsHandler.setupEventListeners();
  subscriber.subscribeToChannels().catch(err => log.errs.error(err));
  eventListener.startListening(emitter);
  const options = container.resolve<Options>('Options');

  log.custom.info(
    `${label}:app started: -env:${ENV} -options: ${JSON.stringify(
      options.values
    )}`
  );
}

process.on('SIGINT', async () => {
  const appExit = container.resolve<AppExit>('AppExit');
  await appExit.execute().catch(err => log.errs.error(err));
});
