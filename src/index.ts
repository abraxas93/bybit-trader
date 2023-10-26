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
import {GET_LAST_KLINE_LOW_PRICE} from './constants';
import {Store} from './domain/entities/Store';

const logger = initLogger(__filename);

function bootstrapEvents() {
  const emitter = container.resolve<EventEmitter>('EventEmitter');
  const bybitClient = container.resolve<RestClientV5>('RestClientV5');

  emitter.on(GET_LAST_KLINE_LOW_PRICE, async () => {
    const request: GetKlineParamsV5 = {
      category: 'linear',
      symbol: 'BTCUSDT',
      interval: '1',
    };
    const response = await bybitClient.getKline(request);
    const [, , , , lowPrice] = response.result.list[0];
    // BUY 1 BTC for 20000
    const order: OrderParamsV5 = {
      symbol: 'BTCUSDT',
      side: 'Buy',
      orderType: 'Limit',
      qty: '1',
      price: '20000',
      category: 'linear',
    };
    const ordResponse = await bybitClient.submitOrder(order);
  });
}

function bootstrapSockets(ws: WebsocketClient) {
  ws.subscribeV5(['kline.1.BTCUSDT'], 'linear').catch(err => console.log(err));

  ws.subscribeV5('position', 'linear').catch(err => console.log(err));

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
  const ws = container.resolve<WebsocketClient>('WebsocketClient');
  const store = container.resolve<Store>('Store');
  console.log(store);
  bootstrapSockets(ws);
}

main().catch(err => console.log(err));
