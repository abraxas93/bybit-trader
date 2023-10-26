import 'reflect-metadata';
import {initLogger} from './logger';
import {container} from 'tsyringe';
import {EventEmitter} from 'events';
import {createMongoClient} from './infrastructure/database/mongo/createMongoClient';
import {MongoClient} from 'mongodb';
import {
  WSClientConfigurableOptions,
  WebsocketClient,
  RestClientV5,
  OrderParamsV5,
  GetKlineParamsV5,
} from 'bybit-api';
import {bootstrapCtx} from './infrastructure/ctx';
import {OPEN_POSITION} from './constants';
import {Store} from './domain/entities/Store';
import {OpenStartPosition} from './application';

const logger = initLogger(__filename);

function bootstrapEvents() {
  const emitter = container.resolve<EventEmitter>('EventEmitter');

  emitter.on(OPEN_POSITION, () => console.log('...'));
}

function bootstrapSockets() {
  const ws = container.resolve<WebsocketClient>('WebsocketClient');
  const store = container.resolve<Store>('Store');
  const symbol = store.symbol;
  const category = store.category;

  // ws.subscribeV5([`publicTrade.${symbol}`], category).catch(err =>
  //   console.log(err)
  // );

  ws.subscribeV5(['order', 'position', 'execution'], 'linear', true).catch(
    err => console.log(err)
  );

  ws.on('update', data => {
    console.log(data);
  });

  // Optional: Listen to websocket connection open event (automatic after subscribing to one or more topics)
  ws.on('open', ({wsKey, event}) => {
    console.log('connection open for websocket with ID: ' + wsKey);
  });

  // Optional: Listen to responses to websocket queries (e.g. the response after subscribing to a topic)
  ws.on('response', response => {
    console.log('response', response);
  });

  // Optional: Listen to connection close event. Unexpected connection closes are automatically reconnected.
  ws.on('close', () => {
    console.log('connection closed');
  });

  // Optional: Listen to raw error events. Recommended.
  ws.on('error', err => {
    console.error('error', err);
  });
}

async function main() {
  logger.info('bootstrap app dependencies');
  await bootstrapCtx();
  // bootstrapSockets();

  const useCase = container.resolve<OpenStartPosition>('OpenStartPosition');
  console.log(useCase.execute());
}

main().catch(err => console.log(err));
